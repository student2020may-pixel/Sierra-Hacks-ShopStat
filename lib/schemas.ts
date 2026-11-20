import { z } from "zod";

/** Units a KPI can be in. Anything else on a scorecard is read as a plain "number". */
export const KPI_UNITS = ["days", "$", "%", "hours", "/100", "number"] as const;

/**
 * What a KPI measures, whatever the insurer calls it. The estimate math uses this to know which KPIs
 * one estimate can move; satisfaction, quality and "other" can't be predicted from an estimate.
 */
export const KPI_MEASURES = [
  "repair_cost",
  "cycle_time",
  "supplement_rate",
  "alt_parts",
  "aftermarket_parts",
  "recycled_parts",
  "on_time",
  "labor_hours",
  "refinish_hours",
  "satisfaction",
  "quality",
  "other",
] as const;

export const KpiSchema = z.object({
  /** The insurer's own name for it, as printed: "Keys-to-keys cycle time", "Severity", "Quality". */
  label: z.string(),
  /** The shop's number; null when the document doesn't show it. */
  value: z.number().nullable(),
  /** The insurer's target or goal; null when none is shown. */
  target: z.number().nullable(),
  unit: z.enum(KPI_UNITS),
  higherIsBetter: z.boolean(),
  measure: z.enum(KPI_MEASURES),
  /** One plain sentence on what it means for the shop. */
  note: z.string(),
  /** True when the shop owner corrected the value or target by hand. */
  edited: z.boolean().optional(),
});

/** One insurer's section of a scorecard document. */
export const InsurerScorecardSchema = z.object({
  /** The insurer as printed, e.g. "GEICO" or "Farmers Insurance"; null if the document doesn't say. */
  insurer: z.string().nullable(),
  period: z.string().nullable(),
  /** How many repairs this insurer's numbers cover, if printed. One estimate's impact depends on it. */
  repair_count: z.number().nullable(),
  kpis: z.array(KpiSchema),
});

/** What the model must return for /api/score: one entry per insurer in the document. */
export const ScorecardsOutputSchema = z.object({
  scorecards: z.array(InsurerScorecardSchema),
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

export const FINDING_KINDS = ["missing", "unsupported", "repair_or_replace"] as const;
export const SEVERITIES = ["high", "medium", "low"] as const;

/** /api/estimate with damage photos: the estimate plus what the photos show that it doesn't (or vice versa). */
export const EstimatePhotoReviewSchema = EstimateExtractSchema.extend({
  /** False when the photos don't clearly show the damaged area, so there's nothing to compare. */
  photosShowDamage: z.boolean(),
  photoFindings: z.array(
    z.object({
      kind: z.enum(FINDING_KINDS),
      /** The part or operation, e.g. "Left headlamp" or "Blend right front door". */
      item: z.string(),
      /** Which photo shows it, 1-based; null if it isn't tied to one photo. */
      photo: z.number().nullable(),
      severity: z.enum(SEVERITIES),
      detail: z.string(),
    }),
  ),
});
