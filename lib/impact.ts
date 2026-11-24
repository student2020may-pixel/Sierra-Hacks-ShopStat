import type { AnomalyResult } from "./anomaly";
import { meetsTarget } from "./format";
import { kpiStatus, type Status } from "./status";
import { kpiById, type KpiKind } from "./kpis";
import { isScored, type Estimate, type Kpi, type KpiUnit, type PhotoReview, type ScoredKpi } from "./types";

/**
 * How one estimate would move one insurer's KPIs (the list in lib/kpis.ts). Each KPI is an average over
 * the insurer's claims, so adding this claim moves it to (value × n + this claim) / (n + 1).
 *
 * "estimate" KPIs come straight from the estimate's numbers (labor $, parts %, paint hours...). Days in
 * the shop and supplements are predictions: from the shop's own past jobs on the Last cars page,
 * otherwise from simple rules. "reference" KPIs (surveys, audits, timing) aren't moved by one estimate.
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
  days: number | null;
  /** True when the days come from the shop's own past jobs (the Last cars page). */
  daysFromHistory: boolean;
  /** Chance this job needs a supplement, 0–1. */
  supplementChance: number;
  /** Chance this job is delivered late, 0–1. */
  lateChance: number;
}

export interface KpiImpact {
  id: string;
  label: string;
  unit: KpiUnit;
  kind: KpiKind;
  confirmed: boolean;
  /** This claim on its own, in the KPI's unit; null when it doesn't apply (see `skip`). */
  jobValue: number | null;
  /** Why there's no claim value: a reference KPI, a repair-size band this estimate isn't in, or the estimate doesn't show it. */
  skip: "reference" | "other-size" | "not-shown" | null;
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

function supplementChance(e: Estimate, history: AnomalyResult | null, missedItems: number): number {
  // The shop's own share of jobs that needed a supplement, from the Last cars page.
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
    days: days === null ? null : Math.round(days * 10) / 10,
    daysFromHistory: Boolean(history) && hours !== null,
    supplementChance: supplement,
    lateChance: late,
  };
}

/** Parts dollars: the printed total, or the part lines when every line has a price. */
function partsAmount(e: Estimate): number | null {
  if (e.partsAmount !== null) return e.partsAmount;
  return e.parts.length && e.parts.every((p) => p.price !== null) ? sum(e.parts.map((p) => p.price)) : null;
}

/** `part` as a percentage of `whole`, or null when either is missing. */
const pct = (part: number | null, whole: number | null) => (part !== null && whole ? (part / whole) * 100 : null);

/** This claim's own value for a KPI, in the KPI's unit. */
function jobValue(k: Kpi, e: Estimate, job: JobPrediction): { value: number | null; skip: KpiImpact["skip"] } {
  if (k.kind === "reference") return { value: null, skip: "reference" };
  const band = kpiById(k.id)?.band;
  if (band) {
    if (e.total === null) return { value: null, skip: "not-shown" };
    const [min, max] = band;
    if (e.total < min || (max !== null && e.total >= max)) return { value: null, skip: "other-size" };
  }
  const parts = partsAmount(e);
  const value = (() => {
    switch (k.id) {
      case "labor_amount":
        return e.laborAmount;
      case "part_amount":
        return parts;
      case "part_price":
        return parts !== null && e.parts.length ? parts / e.parts.length : null;
      case "labor_pct":
        return pct(e.laborAmount, e.total);
      case "part_pct":
        return pct(parts, e.total);
      case "paint_pct":
        return pct(e.paintMaterialsAmount, e.total);
      case "misc_pct":
        return pct(e.miscAmount ?? 0, e.total);
      case "overwrite_pct":
        return pct(e.overwriteAmount ?? 0, e.total);
      case "paint_hours":
        return e.refinishHours;
      case "repair_hours_claim":
      case "repair_hours_appraisal":
        return e.bodyRepairHours;
      case "repair_pct_sheet_metal_a":
      case "repair_pct_sheet_metal_b":
        return pct(e.bodyRepairHours ?? 0, e.bodyHours);
      case "true_supplements":
        return job.supplementChance;
      case "claims_true_supplement_pct":
      case "claims_supplement_request_pct":
        return job.supplementChance * 100;
      default:
        // The cycle time KPIs, overall and by repair size.
        return k.id.startsWith("vivo_") ? job.days : null;
    }
  })();
  return { value, skip: value === null ? "not-shown" : null };
}

const GRADES: [number, Impact["grade"]][] = [
  [1, "A"],
  [0.75, "B"],
  [0.5, "C"],
  [0.25, "D"],
];

function suggestionsFor(e: Estimate, job: JobPrediction, impacts: KpiImpact[]): Suggestion[] {
  // KPIs where this claim on its own misses the insurer's target.
  const misses = (id: string | ((id: string) => boolean)) =>
    impacts.find(
      (i) =>
        (typeof id === "string" ? i.id === id : id(i.id)) &&
        i.jobValue !== null &&
        !meetsTarget({ value: i.jobValue, target: i.target, higherIsBetter: kpiById(i.id)?.higherIsBetter ?? false }),
    );
  const out: Suggestion[] = [];
  if (job.supplementChance >= 0.4) {
    out.push({
      title: "Tear down before you finalize",
      detail: e.preliminary
        ? "This estimate looks preliminary. A full teardown first catches hidden damage now instead of as a supplement later."
        : "Signs of hidden damage here usually turn into a supplement. Tear down and add what you find before ordering parts.",
    });
  }
  const slow = misses((id) => id.startsWith("vivo_"));
  if (slow && job.days !== null) {
    out.push({
      title: "Order every part at teardown",
      detail: `This claim is predicted at about ${job.days} days against a ${slow.target}-day target. Ordering all parts at once and booking sublets for day one keeps it from waiting.`,
    });
  }
  if (misses((id) => id.startsWith("repair_pct_sheet_metal"))) {
    out.push({
      title: "Repair instead of replace where it's safe",
      detail: "Repair makes up less of the sheet-metal labor than this insurer wants. Where the carmaker's procedures allow a repair, it raises this KPI. Never repair a part that should be replaced.",
    });
  }
  if (misses("overwrite_pct")) {
    out.push({
      title: "Keep manual overrides to what's needed",
      detail: "Manual price and labor overrides count against this insurer's overwrite KPI. Use the database values where they're right, and note why when you change one.",
    });
  }
  if (misses("labor_amount") || misses("labor_pct")) {
    out.push({
      title: "Check for overlapping labor",
      detail: "Labor is above this insurer's target. Look for included or duplicated operations before you send it. Never remove a repair the car needs.",
    });
  }
  return out;
}

export function estimateImpact(kpis: Kpi[], e: Estimate, history: AnomalyResult | null, repairCount: number, photoReview?: PhotoReview): Impact {
  const n = Math.max(1, Math.round(repairCount));
  const missed = photoReview?.findings.filter((f) => f.kind === "missing").length ?? 0;
  const job = predictJob(e, history, missed);
  const scored = kpis.filter(isScored);

  let meets = 0;
  let checked = 0;
  const impacts: KpiImpact[] = scored.map((k: ScoredKpi) => {
    const { value, skip } = jobValue(k, e, job);
    const after = value === null ? k.value : (k.value * n + value) / (n + 1);
    if (value !== null) {
      checked++;
      if (meetsTarget({ value, target: k.target, higherIsBetter: k.higherIsBetter })) meets++;
    }
    const delta = after - k.value;
    const better = k.higherIsBetter ? delta > 0 : delta < 0;
    return {
      id: k.id,
      label: k.label,
      unit: k.unit,
      kind: k.kind,
      confirmed: k.confirmed,
      jobValue: value,
      skip,
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
  const suggestions = [...addMissed, ...suggestionsFor(e, job, impacts)].slice(0, 3);
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
