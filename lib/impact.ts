import type { AnomalyResult } from "./anomaly";
import { meetsTarget } from "./format";
import { scoreMetric } from "./scoring";
import { metricStatus, type Status } from "./status";
import { isScored, type Estimate, type Metric, type MetricKey, type ScoredMetric } from "./types";

/**
 * How one estimate would move the shop's scorecard. Each scorecard metric is an average over the
 * repairs it covers, so adding this job moves it to (value × n + this job) / (n + 1).
 *
 * Repair cost and the parts mix come straight from the estimate. Days in the shop, the chance of a
 * supplement and the chance of a late delivery are predictions: from the shop's own past jobs when
 * step 2 has them, otherwise from simple rules.
 */

/** Used when the scorecard doesn't say how many repairs it covers and the shop hasn't entered it. */
export const DEFAULT_REPAIR_COUNT = 40;
/** Without past jobs: about 6 billed hours of progress per day, plus a day to check in and deliver. */
const FALLBACK_DAYS_BASE = 1;
const FALLBACK_HOURS_PER_DAY = 6;
const DAYS_PER_SUBLET = 0.5;
const MAX_SUBLET_DAYS = 2;

export interface JobPrediction {
  laborHours: number | null;
  /** Share of parts (by dollars when prices are shown) that aren't new OEM, 0–100. */
  altPartsShare: number | null;
  days: number | null;
  /** True when the days come from the shop's own past jobs (step 2). */
  daysFromHistory: boolean;
  /** Chance this job needs a supplement, 0–1. */
  supplementChance: number;
  /** Chance this job is delivered late, 0–1. */
  lateChance: number;
}

export interface MetricImpact {
  key: MetricKey;
  label: string;
  unit: Metric["unit"];
  /** This job on its own, in the metric's unit; null when the estimate can't say (e.g. CSI). */
  jobValue: number | null;
  before: number;
  after: number;
  target: number;
  statusBefore: Status;
  statusAfter: Status;
  /** "better", "worse" or "same", in the direction that matters for this metric. */
  direction: "better" | "worse" | "same";
}

export interface Suggestion {
  title: string;
  detail: string;
}

export interface Impact {
  grade: "A" | "B" | "C" | "D" | "F";
  /** How many of the job's own numbers meet the insurer's targets, out of how many could be checked. */
  meets: number;
  checked: number;
  repairCount: number;
  job: JobPrediction;
  metrics: MetricImpact[];
  suggestions: Suggestion[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);

function laborHours(e: Estimate): number | null {
  const hours = [e.bodyHours, e.refinishHours, e.frameHours, e.mechanicalHours];
  return hours.every((h) => h === null) ? null : sum(hours);
}

function altPartsShare(e: Estimate): number | null {
  const known = e.parts.filter((p) => p.type !== "unknown");
  if (known.length === 0) return null;
  const priced = known.filter((p) => p.price !== null && p.price > 0);
  // By dollars when every known part has a price, otherwise by count.
  if (priced.length === known.length) {
    const total = sum(priced.map((p) => p.price));
    return total > 0 ? (sum(priced.filter((p) => p.type !== "oem").map((p) => p.price)) / total) * 100 : null;
  }
  return (known.filter((p) => p.type !== "oem").length / known.length) * 100;
}

function supplementChance(e: Estimate, history: AnomalyResult | null): number {
  // The shop's own share of jobs that needed a supplement, when step 2 has it.
  const withSupplements = history?.jobs.filter((j) => j.supplements > 0).length ?? 0;
  let chance = history && history.jobs.length >= 10 ? withSupplements / history.jobs.length : 0.25;
  if (e.preliminary) chance += 0.3;
  chance += Math.min(0.3, e.hiddenDamageSigns.length * 0.1);
  if ((e.frameHours ?? 0) > 0) chance += 0.1;
  return clamp(chance, 0.05, 0.9);
}

export function predictJob(e: Estimate, history: AnomalyResult | null): JobPrediction {
  const hours = laborHours(e);
  const subletDays = Math.min(MAX_SUBLET_DAYS, e.sublets.length * DAYS_PER_SUBLET);
  const days =
    hours === null
      ? null
      : (history
          ? history.fit.baseDays + history.fit.daysPerLaborHour * hours
          : FALLBACK_DAYS_BASE + hours / FALLBACK_HOURS_PER_DAY) + subletDays;
  const supplement = supplementChance(e, history);
  const late = clamp(0.1 + Math.min(0.3, e.sublets.length * 0.1) + (e.parts.length > 15 ? 0.1 : 0) + supplement * 0.3, 0.05, 0.9);
  return {
    laborHours: hours,
    altPartsShare: altPartsShare(e),
    days: days === null ? null : Math.round(days * 10) / 10,
    daysFromHistory: Boolean(history) && hours !== null,
    supplementChance: supplement,
    lateChance: late,
  };
}

/** The job's own value for each metric, in the metric's unit. */
function jobValue(key: MetricKey, e: Estimate, job: JobPrediction): number | null {
  switch (key) {
    case "avg_repair_cost":
      return e.total;
    case "alt_parts_usage":
      return job.altPartsShare;
    case "cycle_time":
      return job.days;
    case "supplement_rate":
      return job.supplementChance * 100;
    case "on_time_delivery":
      return (1 - job.lateChance) * 100;
    case "customer_satisfaction":
      return null;
  }
}

function withValue(m: ScoredMetric, value: number): ScoredMetric {
  return { ...m, shopValue: value, score: scoreMetric(value, m.target, m.higherIsBetter) };
}

const GRADES: [number, Impact["grade"]][] = [
  [1, "A"],
  [0.75, "B"],
  [0.5, "C"],
  [0.25, "D"],
];

function suggestionsFor(e: Estimate, job: JobPrediction, metrics: ScoredMetric[]): Suggestion[] {
  const target = (key: MetricKey) => metrics.find((m) => m.key === key)?.target;
  const out: Suggestion[] = [];
  if (job.supplementChance >= 0.4) {
    out.push({
      title: "Tear down before you finalize",
      detail: e.preliminary
        ? "This estimate looks preliminary. A full teardown first catches hidden damage now instead of as a supplement later."
        : "Signs of hidden damage here usually turn into a supplement. Tear down and add what you find before ordering parts.",
    });
  }
  const daysTarget = target("cycle_time");
  if (job.days !== null && daysTarget !== undefined && job.days > daysTarget) {
    out.push({
      title: "Order every part at teardown",
      detail: `This job is predicted at about ${job.days} days against a ${daysTarget}-day target. Ordering all parts at once and booking sublets for day one keeps it from waiting.`,
    });
  }
  const altTarget = target("alt_parts_usage");
  if (job.altPartsShare !== null && altTarget !== undefined && job.altPartsShare < altTarget && e.parts.some((p) => p.type === "oem")) {
    out.push({
      title: "Offer alternate parts where allowed",
      detail: "Where the insurer allows it, the carmaker's repair procedures permit it, and the customer agrees in writing, an alternate part raises your parts mix. Disclose non-OEM parts as your state requires.",
    });
  }
  const costTarget = target("avg_repair_cost");
  if (e.total !== null && costTarget !== undefined && e.total > costTarget && out.length < 3) {
    out.push({
      title: "Check for overlapping labor",
      detail: "Look for included or duplicated operations before you send it. Never remove a repair the car needs.",
    });
  }
  return out.slice(0, 3);
}

export function estimateImpact(metrics: Metric[], e: Estimate, history: AnomalyResult | null, repairCount: number): Impact {
  const n = Math.max(1, Math.round(repairCount));
  const job = predictJob(e, history);
  const scored = metrics.filter(isScored);

  let meets = 0;
  let checked = 0;
  const impacts: MetricImpact[] = scored.map((m) => {
    const value = jobValue(m.key, e, job);
    const after = value === null ? m.shopValue : (m.shopValue * n + value) / (n + 1);
    if (value !== null) {
      checked++;
      if (meetsTarget({ shopValue: value, target: m.target, higherIsBetter: m.higherIsBetter })) meets++;
    }
    const delta = after - m.shopValue;
    const better = m.higherIsBetter ? delta > 0 : delta < 0;
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      jobValue: value,
      before: m.shopValue,
      after,
      target: m.target,
      statusBefore: metricStatus(m),
      statusAfter: metricStatus(withValue(m, after)),
      direction: Math.abs(delta) < 1e-6 ? "same" : better ? "better" : "worse",
    };
  });

  const ratio = checked ? meets / checked : 0;
  const grade = GRADES.find(([min]) => ratio >= min)?.[1] ?? "F";
  return { grade, meets, checked, repairCount: n, job, metrics: impacts, suggestions: suggestionsFor(e, job, scored) };
}
