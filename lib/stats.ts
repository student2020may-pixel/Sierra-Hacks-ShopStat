import { isScored, type Metric, type MetricKey, type ScoredMetric } from "./types";

/** Game-style stat names for the "shop stat sheet" radar. */
export const STAT_LABELS: Record<MetricKey, { short: string; full: string }> = {
  cycle_time: { short: "SPD", full: "Cycle Time" },
  customer_satisfaction: { short: "HAP", full: "Customer Satisfaction" },
  avg_repair_cost: { short: "COST", full: "Repair Cost" },
  supplement_rate: { short: "SUPP", full: "Supplement Rate" },
  alt_parts_usage: { short: "PART", full: "Alternate Parts" },
  on_time_delivery: { short: "TIME", full: "On-Time Delivery" },
};

/** Score a metric gets for exactly meeting its target (see lib/scoring.ts). */
export const TARGET_SCORE = 85;

export function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/** Average of the metrics that were on the scorecard; missing ones don't count. */
export function shopLevel(metrics: Metric[]): number | null {
  const scored = metrics.filter(isScored);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, m) => sum + m.score, 0) / scored.length);
}

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");

/** Plain-language gap to target, e.g. "cars wait 4.3 days too long". */
function gapPhrase(m: ScoredMetric): string {
  const gap = Math.abs(m.shopValue - m.target);
  switch (m.key) {
    case "cycle_time":
      return `cars wait ${one(gap)} day${gap === 1 ? "" : "s"} too long`;
    case "on_time_delivery":
      return `on-time delivery is ${one(gap)} points under target`;
    case "customer_satisfaction":
      return `satisfaction is ${one(gap)} points under target`;
    case "avg_repair_cost":
      return `repairs cost $${Math.round(gap).toLocaleString("en-US")} more than the target`;
    case "supplement_rate":
      return `${one(gap)}% more jobs need a revised estimate than the target`;
    case "alt_parts_usage":
      return `alternate parts use is ${one(gap)} points under target`;
  }
}

/** The lowest-scoring stat and why, or null if nothing was scored. */
export function weakestStat(metrics: Metric[]): { metric: ScoredMetric; text: string } | null {
  const scored = metrics.filter(isScored);
  if (scored.length === 0) return null;
  const weakest = scored.reduce((a, b) => (b.score < a.score ? b : a));
  const meets = weakest.higherIsBetter ? weakest.shopValue >= weakest.target : weakest.shopValue <= weakest.target;
  const label = STAT_LABELS[weakest.key].short;
  return { metric: weakest, text: `${label} — ${meets ? "still meets the target" : gapPhrase(weakest)}.` };
}
