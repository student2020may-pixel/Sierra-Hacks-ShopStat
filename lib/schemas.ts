import { z } from "zod";

export const METRIC_KEYS = [
  "cycle_time",
  "customer_satisfaction",
  "avg_repair_cost",
  "supplement_rate",
  "alt_parts_usage",
  "on_time_delivery",
] as const;

export type MetricUnit = "days" | "/100" | "$" | "%";

/** Canonical label, unit, and direction for each of the six metrics. Used in the prompt and to fill gaps. */
export const METRIC_DEFS: Record<(typeof METRIC_KEYS)[number], { label: string; unit: MetricUnit; higherIsBetter: boolean }> = {
  cycle_time: { label: "Cycle Time", unit: "days", higherIsBetter: false },
  customer_satisfaction: { label: "Customer Satisfaction (CSI)", unit: "/100", higherIsBetter: true },
  avg_repair_cost: { label: "Average Repair Cost", unit: "$", higherIsBetter: false },
  supplement_rate: { label: "Supplement Rate", unit: "%", higherIsBetter: false },
  alt_parts_usage: { label: "Alternate Parts Usage", unit: "%", higherIsBetter: true },
  on_time_delivery: { label: "On-Time Delivery", unit: "%", higherIsBetter: true },
};

export const MetricSchema = z.object({
  key: z.enum(METRIC_KEYS),
  label: z.string(),
  unit: z.enum(["days", "/100", "$", "%"]),
  /** null when the metric isn't on the uploaded scorecard (shopValue, target, and score are null together). */
  shopValue: z.number().nullable(),
  target: z.number().nullable(),
  higherIsBetter: z.boolean(),
  score: z.number().nullable(),
  explanation: z.string(),
});

/** A relevant metric on the scorecard that isn't one of the six (touch time, comeback rate, ...). */
export const OtherMetricSchema = z.object({
  label: z.string(),
  value: z.number().nullable(),
  target: z.number().nullable(),
  /** Free text as printed on the scorecard: "%", "$", "hours", "per day", or "". */
  unit: z.string(),
  note: z.string(),
});

/** What the model must return for /api/score. */
export const ScoreOutputSchema = z.object({
  metrics: z.array(MetricSchema),
  other_metrics: z.array(OtherMetricSchema),
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
