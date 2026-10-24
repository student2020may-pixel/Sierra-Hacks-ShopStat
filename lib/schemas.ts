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

export const FixSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  /** Estimated days off the shop's average cycle time per car. */
  daysSaved: z.number(),
  /** The flagged jobs or weak metrics this fix is based on, e.g. "VAB-1038, VAB-1022 · Supplement rate". */
  basedOn: z.string(),
});

/** What the model must return for /api/fixes. */
export const FixesOutputSchema = z.object({
  fixes: z.array(FixSchema),
});

const FlaggedJobSchema = z.object({
  jobId: z.string(),
  laborHours: z.number(),
  daysInShop: z.number(),
  expectedDays: z.number(),
  extraDays: z.number(),
  supplements: z.number(),
});

/** Body of POST /api/fixes. */
export const FixesRequestSchema = z.object({
  metrics: z.array(MetricSchema).min(1).max(12),
  flagged: z.array(FlaggedJobSchema).max(100),
  totalExtraDays: z.number(),
  jobCount: z.number(),
});
