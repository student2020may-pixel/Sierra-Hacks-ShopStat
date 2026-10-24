import { z } from "zod";

export const METRIC_KEYS = [
  "cycle_time",
  "customer_satisfaction",
  "avg_repair_cost",
  "supplement_rate",
  "alt_parts_usage",
  "on_time_delivery",
] as const;

export const MetricSchema = z.object({
  key: z.enum(METRIC_KEYS),
  label: z.string(),
  unit: z.enum(["days", "/100", "$", "%"]),
  shopValue: z.number(),
  target: z.number(),
  higherIsBetter: z.boolean(),
  score: z.number(),
  explanation: z.string(),
});

/** What the model must return for /api/score. */
export const ScoreOutputSchema = z.object({
  metrics: z.array(MetricSchema),
});
