import type { z } from "zod";
import type { MetricSchema } from "./schemas";

export type Metric = z.infer<typeof MetricSchema>;
export type MetricKey = Metric["key"];

export interface Scorecard {
  shop: { name: string; shopId: string; address: string; region: string };
  insurer: { name: string; program: string };
  period: string;
  issuedOn: string;
  repairsReviewed: number;
  regionalRank: { rank: number; of: number };
  metrics: Metric[];
}

/** Response body of POST /api/score. */
export interface ScoreResponse {
  /** "ai" when the model read the upload, "sample" when we fell back to data/scorecard.json. */
  source: "ai" | "sample";
  metrics: Metric[];
  /** Friendly note shown when source is "sample". */
  notice?: string;
}
