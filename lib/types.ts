import type { z } from "zod";
import type { EstimateExtractSchema, EstimatePhotoReviewSchema, InsurerScorecardSchema, KPI_MEASURES, KPI_UNITS, KpiSchema } from "./schemas";

export type Kpi = z.infer<typeof KpiSchema>;
export type KpiUnit = (typeof KPI_UNITS)[number];
export type KpiMeasure = (typeof KPI_MEASURES)[number];
/** A KPI with both a value and a target, so it can be judged. */
export type ScoredKpi = Kpi & { value: number; target: number };

export const isScored = (k: Kpi): k is ScoredKpi => k.value !== null && k.target !== null;

export type InsurerScorecard = z.infer<typeof InsurerScorecardSchema>;

/** One DRP slot's scorecard, as stored in the tab. */
export interface SlotCard extends InsurerScorecard {
  /** "ai" when the model read an upload, "sample" for the fictional sample data. */
  source: "ai" | "sample";
}

/** Response body of POST /api/score: every insurer section found in the document. */
export interface ScorecardsResponse {
  source: "ai" | "sample";
  scorecards: InsurerScorecard[];
  /** Friendly note shown when source is "sample". */
  notice?: string;
}

export type Estimate = z.infer<typeof EstimateExtractSchema>;
export type PhotoFinding = z.infer<typeof EstimatePhotoReviewSchema>["photoFindings"][number];

/** What the damage photos showed against the estimate (step 3 with photos). */
export interface PhotoReview {
  photoCount: number;
  photosShowDamage: boolean;
  findings: PhotoFinding[];
}

/** Response body of POST /api/estimate. */
export interface EstimateResponse {
  source: "ai" | "sample";
  estimate: Estimate;
  /** Present when damage photos were sent with the estimate and the AI read them. */
  photoReview?: PhotoReview;
  notice?: string;
}
