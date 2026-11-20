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
  /** True when the shop owner corrected the value or target by hand. */
  edited: z.boolean().optional(),
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

/**
 * What the model extracts for each of the six metrics. It only reads numbers and writes the
 * explanation; the 0–100 score is computed in code (lib/scoring.ts).
 */
export const ExtractedMetricSchema = z.object({
  key: z.enum(METRIC_KEYS),
  /** null when the metric isn't on the scorecard. */
  shopValue: z.number().nullable(),
  target: z.number().nullable(),
  explanation: z.string(),
});

/** What the model must return for /api/score. */
export const ScoreOutputSchema = z.object({
  /** The reporting period as printed (e.g. "Q3 2026"), or null if the scorecard doesn't show one. */
  period: z.string().nullable(),
  /** How many repairs the scorecard covers, if printed. One estimate's impact depends on it. */
  repair_count: z.number().nullable(),
  /** The insurance company that issued the scorecard, if shown. */
  insurer: z.string().nullable(),
  metrics: z.array(ExtractedMetricSchema),
  other_metrics: z.array(OtherMetricSchema),
});

/** What the AI reads off a jobs PDF, photo or document. Missing numbers stay null, never guessed. */
export const JobsExtractSchema = z.object({
  jobs: z.array(
    z.object({
      jobId: z.string(),
      laborHours: z.number().nullable(),
      daysInShop: z.number().nullable(),
      dateIn: z.string().nullable(),
      dateOut: z.string().nullable(),
      supplements: z.number().nullable(),
    }),
  ),
});

export const PART_TYPES = ["oem", "aftermarket", "used", "reman", "unknown"] as const;

/**
 * What the AI reads off an estimate for /api/estimate. Customer details (name, phone, address, VIN,
 * plate) are deliberately not part of it.
 */
export const EstimateExtractSchema = z.object({
  vehicle: z.string().nullable(),
  insurer: z.string().nullable(),
  /** Grand total of the estimate in dollars. */
  total: z.number().nullable(),
  bodyHours: z.number().nullable(),
  refinishHours: z.number().nullable(),
  frameHours: z.number().nullable(),
  mechanicalHours: z.number().nullable(),
  parts: z.array(
    z.object({
      description: z.string(),
      price: z.number().nullable(),
      type: z.enum(PART_TYPES),
    }),
  ),
  sublets: z.array(z.object({ description: z.string(), price: z.number().nullable() })),
  /** True when the estimate is preliminary or written from photos only (no teardown yet). */
  preliminary: z.boolean(),
  /** Short phrases for signs of damage that usually isn't visible until teardown. */
  hiddenDamageSigns: z.array(z.string()),
});
