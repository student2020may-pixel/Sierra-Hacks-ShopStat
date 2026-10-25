import { METRIC_DEFS, METRIC_KEYS } from "./schemas";
import { scoreMetric } from "./scoring";
import type { Metric } from "./types";

/**
 * Illustration for the landing hero only: a made-up shop, deliberately different from the sample
 * report (Valley Auto Body) so the hero doesn't look like the mock data. Scored with the real formula.
 */
const VALUES: Record<(typeof METRIC_KEYS)[number], [shop: number, target: number]> = {
  cycle_time: [8.2, 7.5],
  customer_satisfaction: [93, 90],
  avg_repair_cost: [3480, 3550],
  supplement_rate: [36, 28],
  alt_parts_usage: [44, 38],
  on_time_delivery: [86, 92],
};

export const heroMetrics: Metric[] = METRIC_KEYS.map((key) => {
  const d = METRIC_DEFS[key];
  const [shopValue, target] = VALUES[key];
  return { key, ...d, shopValue, target, score: scoreMetric(shopValue, target, d.higherIsBetter), explanation: "" };
});
