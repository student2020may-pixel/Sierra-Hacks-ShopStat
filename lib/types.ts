import type { z } from "zod";
import type { FixesRequestSchema, FixSchema, MetricSchema, OtherMetricSchema } from "./schemas";

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
  /** Friendly note shown when source is "sample". */
  notice?: string;
}

export type Fix = z.infer<typeof FixSchema>;
export type FixesRequest = z.infer<typeof FixesRequestSchema>;

/** Response body of POST /api/fixes. */
export interface FixesResponse {
  source: "ai" | "sample";
  fixes: Fix[];
  notice?: string;
}
