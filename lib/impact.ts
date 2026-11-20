import type { AnomalyResult } from "./anomaly";
import { meetsTarget } from "./format";
import { kpiStatus, type Status } from "./status";
import { isScored, type Estimate, type Kpi, type KpiMeasure, type KpiUnit, type PhotoReview, type ScoredKpi } from "./types";

/**
 * How one estimate would move one insurer's scorecard. Each KPI is an average over the repairs the
 * card covers, so adding this job moves it to (value × n + this job) / (n + 1). Which KPIs an
 * estimate can move comes from what each KPI measures (its `measure`), whatever the insurer calls it.
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
  aftermarketShare: number | null;
  recycledShare: number | null;
  days: number | null;
  /** True when the days come from the shop's own past jobs (step 2). */
  daysFromHistory: boolean;
  /** Chance this job needs a supplement, 0–1. */
  supplementChance: number;
  /** Chance this job is delivered late, 0–1. */
  lateChance: number;
}

export interface KpiImpact {
  label: string;
  unit: KpiUnit;
  /** This job on its own, in the KPI's unit; null when one estimate can't move it (CSI, quality). */
  jobValue: number | null;
  before: number;
  after: number;
  target: number;
  statusBefore: Status;
  statusAfter: Status;
  /** "better", "worse" or "same", in the direction that matters for this KPI. */
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
  kpis: KpiImpact[];
  suggestions: Suggestion[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);

function laborHours(e: Estimate): number | null {
  const hours = [e.bodyHours, e.refinishHours, e.frameHours, e.mechanicalHours];
  return hours.every((h) => h === null) ? null : sum(hours);
}

/** Share of the estimate's parts (0–100) that match `isType`. */
function partsShare(e: Estimate, isType: (type: Estimate["parts"][number]["type"]) => boolean): number | null {
  const known = e.parts.filter((p) => p.type !== "unknown");
  if (known.length === 0) return null;
  const priced = known.filter((p) => p.price !== null && p.price > 0);
  // By dollars when every known part has a price, otherwise by count.
  if (priced.length === known.length) {
    const total = sum(priced.map((p) => p.price));
    return total > 0 ? (sum(priced.filter((p) => isType(p.type)).map((p) => p.price)) / total) * 100 : null;
  }
  return (known.filter((p) => isType(p.type)).length / known.length) * 100;
}

function supplementChance(e: Estimate, history: AnomalyResult | null, missedItems: number): number {
  // The shop's own share of jobs that needed a supplement, when step 2 has it.
  const withSupplements = history?.jobs.filter((j) => j.supplements > 0).length ?? 0;
  let chance = history && history.jobs.length >= 10 ? withSupplements / history.jobs.length : 0.25;
  if (e.preliminary) chance += 0.3;
  chance += Math.min(0.3, e.hiddenDamageSigns.length * 0.1);
  if ((e.frameHours ?? 0) > 0) chance += 0.1;
  // Damage the photos show but the estimate doesn't is a supplement waiting to happen.
  chance += Math.min(0.45, missedItems * 0.15);
  return clamp(chance, 0.05, 0.9);
}

export function predictJob(e: Estimate, history: AnomalyResult | null, missedItems = 0): JobPrediction {
  const hours = laborHours(e);
  const subletDays = Math.min(MAX_SUBLET_DAYS, e.sublets.length * DAYS_PER_SUBLET);
  const days =
    hours === null
      ? null
      : (history
          ? history.fit.baseDays + history.fit.daysPerLaborHour * hours
          : FALLBACK_DAYS_BASE + hours / FALLBACK_HOURS_PER_DAY) + subletDays;
  const supplement = supplementChance(e, history, missedItems);
  const late = clamp(0.1 + Math.min(0.3, e.sublets.length * 0.1) + (e.parts.length > 15 ? 0.1 : 0) + supplement * 0.3, 0.05, 0.9);
  return {
    laborHours: hours,
    altPartsShare: partsShare(e, (t) => t !== "oem"),
    aftermarketShare: partsShare(e, (t) => t === "aftermarket"),
    recycledShare: partsShare(e, (t) => t === "used"),
    days: days === null ? null : Math.round(days * 10) / 10,
    daysFromHistory: Boolean(history) && hours !== null,
    supplementChance: supplement,
    lateChance: late,
  };
}

/** What each measure is counted in. A KPI in some other unit isn't compared, rather than compared wrongly. */
const MEASURE_UNIT: Partial<Record<KpiMeasure, KpiUnit>> = {
  repair_cost: "$",
  cycle_time: "days",
  supplement_rate: "%",
  alt_parts: "%",
  aftermarket_parts: "%",
  recycled_parts: "%",
  on_time: "%",
  labor_hours: "hours",
  refinish_hours: "hours",
};

/** This job's own value for a KPI, in the KPI's unit; null when one estimate can't move it. */
function jobValue(k: Kpi, e: Estimate, job: JobPrediction): number | null {
  if (MEASURE_UNIT[k.measure] !== k.unit) return null;
  switch (k.measure) {
    case "repair_cost":
      return e.total;
    case "cycle_time":
      return job.days;
    case "supplement_rate":
      return job.supplementChance * 100;
    case "alt_parts":
      return job.altPartsShare;
    case "aftermarket_parts":
      return job.aftermarketShare;
    case "recycled_parts":
      return job.recycledShare;
    case "on_time":
      return (1 - job.lateChance) * 100;
    case "labor_hours":
      return job.laborHours;
    case "refinish_hours":
      return e.refinishHours;
    default:
      return null;
  }
}

const GRADES: [number, Impact["grade"]][] = [
  [1, "A"],
  [0.75, "B"],
  [0.5, "C"],
  [0.25, "D"],
];

function suggestionsFor(e: Estimate, job: JobPrediction, kpis: ScoredKpi[]): Suggestion[] {
  const target = (measure: KpiMeasure) => kpis.find((k) => k.measure === measure && MEASURE_UNIT[measure] === k.unit)?.target;
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
  // Whichever parts-mix KPI this insurer tracks.
  const parts = (["alt_parts", "aftermarket_parts", "recycled_parts"] as const)
    .map((m) => ({ target: target(m), share: m === "alt_parts" ? job.altPartsShare : m === "aftermarket_parts" ? job.aftermarketShare : job.recycledShare }))
    .find((p) => p.target !== undefined && p.share !== null && p.share < p.target);
  if (parts && e.parts.some((p) => p.type === "oem")) {
    out.push({
      title: "Offer alternate parts where allowed",
      detail: "Where the insurer allows it, the carmaker's repair procedures permit it, and the customer agrees in writing, an alternate part raises your parts mix. Disclose non-OEM parts as your state requires.",
    });
  }
  const costTarget = target("repair_cost");
  if (e.total !== null && costTarget !== undefined && e.total > costTarget && out.length < 3) {
    out.push({
      title: "Check for overlapping labor",
      detail: "Look for included or duplicated operations before you send it. Never remove a repair the car needs.",
    });
  }
  return out.slice(0, 3);
}

export function estimateImpact(kpis: Kpi[], e: Estimate, history: AnomalyResult | null, repairCount: number, photoReview?: PhotoReview): Impact {
  const n = Math.max(1, Math.round(repairCount));
  const missed = photoReview?.findings.filter((f) => f.kind === "missing").length ?? 0;
  const job = predictJob(e, history, missed);
  const scored = kpis.filter(isScored);

  let meets = 0;
  let checked = 0;
  const impacts: KpiImpact[] = scored.map((k) => {
    const value = jobValue(k, e, job);
    const after = value === null ? k.value : (k.value * n + value) / (n + 1);
    if (value !== null) {
      checked++;
      if (meetsTarget({ value, target: k.target, higherIsBetter: k.higherIsBetter })) meets++;
    }
    const delta = after - k.value;
    const better = k.higherIsBetter ? delta > 0 : delta < 0;
    return {
      label: k.label,
      unit: k.unit,
      jobValue: value,
      before: k.value,
      after,
      target: k.target,
      statusBefore: kpiStatus(k),
      statusAfter: kpiStatus({ ...k, value: after }),
      direction: Math.abs(delta) < 1e-6 ? "same" : better ? "better" : "worse",
    };
  });

  const ratio = checked ? meets / checked : 0;
  const grade = GRADES.find(([min]) => ratio >= min)?.[1] ?? "F";
  // Damage the photos show but the estimate misses is the most direct fix, so it goes first.
  const addMissed: Suggestion[] = missed
    ? [
        {
          title: "Add what the photos show",
          detail: `The photos show ${missed} item${missed === 1 ? "" : "s"} the estimate doesn't cover (see the photo check). Adding ${missed === 1 ? "it" : "them"} now avoids a supplement later.`,
        },
      ]
    : [];
  const suggestions = [...addMissed, ...suggestionsFor(e, job, scored)].slice(0, 3);
  return { grade, meets, checked, repairCount: n, job, kpis: impacts, suggestions };
}

/**
 * Accuracy grade from the photo check: each finding costs points by kind and severity. Missed damage
 * costs most, because it turns into a supplement and a late car. Null when the photos didn't show the
 * damage clearly enough to compare.
 */
const FINDING_POINTS = {
  missing: { high: 3, medium: 2, low: 1 },
  unsupported: { high: 2, medium: 1, low: 0.5 },
  repair_or_replace: { high: 1.5, medium: 1, low: 0.5 },
} as const;
const ACCURACY_GRADES: [number, Impact["grade"]][] = [
  [0, "A"],
  [2, "B"],
  [4, "C"],
  [7, "D"],
];

export function photoGrade(review: PhotoReview): { grade: Impact["grade"]; points: number } | null {
  if (!review.photosShowDamage) return null;
  const points = review.findings.reduce((sum, f) => sum + FINDING_POINTS[f.kind][f.severity], 0);
  return { grade: ACCURACY_GRADES.find(([max]) => points <= max)?.[1] ?? "F", points };
}
