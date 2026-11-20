import type { z } from "zod";
import type { EstimateExtractSchema, EstimatePhotoReviewSchema, MetricSchema, OtherMetricSchema } from "./schemas";

export type Metric = z.infer<typeof MetricSchema>;
export type MetricKey = Metric["key"];
/** A metric that was on the scorecard, so it has numbers. */
export type ScoredMetric = Metric & { shopValue: number; target: number; score: number };
export type OtherMetric = z.infer<typeof OtherMetricSchema>;

export const isScored = (m: Metric): m is ScoredMetric =>
  m.shopValue !== null && m.target !== null && m.score !== null;

export interface Scorecard {
  shop: { name: string; shopId: string; address: string; region: string };
  insurer: { name: string; program: string };
  period: string;
  issuedOn: string;
  repairsReviewed: number;
  regionalRank: { rank: number; of: number };
  metrics: ScoredMetric[];
}

/** Response body of POST /api/score. */
export interface ScoreResponse {
  /** "ai" when the model read the upload, "sample" when we fell back to data/scorecard.json. */
  source: "ai" | "sample";
  /** Always the six metrics in canonical order; ones not on the scorecard have null numbers. */
  metrics: Metric[];
  other_metrics: OtherMetric[];
  /** Reporting period printed on the scorecard, if any. */
  period?: string | null;
  /** Number of repairs the scorecard covers, if printed. */
  repair_count?: number | null;
  /** Insurance company that issued the scorecard, if shown. */
  insurer?: string | null;
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
