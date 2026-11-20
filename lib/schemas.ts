import { z } from "zod";
import { KPI_NAMES } from "./kpis";

/** Units a KPI can be in. Anything else on a scorecard is read as a plain "number". */
export const KPI_UNITS = ["days", "$", "%", "hours", "/100", "number"] as const;

/**
 * What the AI reads off an insurer's CCC dashboard screenshots for /api/score: the insurer shown, and
 * value / target pairs for KPIs on our list (lib/kpis.ts), matched by name.
 */
export const ScorecardReadSchema = z.object({
  insurer: z.string().nullable(),
  period: z.string().nullable(),
  /** Number of claims for this insurer, if shown. */
  claims: z.number().nullable(),
  readings: z.array(
    z.object({
      kpi: z.enum(KPI_NAMES),
      value: z.number().nullable(),
      target: z.number().nullable(),
    }),
  ),
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
  /** Labor dollars, all labor types together. */
  laborAmount: z.number().nullable(),
  /** Parts dollars. */
  partsAmount: z.number().nullable(),
  /** Paint and materials dollars. */
  paintMaterialsAmount: z.number().nullable(),
  /** Miscellaneous / other charges in dollars (not labor, parts, paint materials or sublet). */
  miscAmount: z.number().nullable(),
  bodyHours: z.number().nullable(),
  /** Body (sheet-metal) labor hours on repair operations, as opposed to replace, R&I or overhaul. */
  bodyRepairHours: z.number().nullable(),
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
  /** Dollars on lines marked as manually entered or overriding the database (CCC marks these). */
  overwriteAmount: z.number().nullable(),
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
