export type MetricKey =
  | "cycle_time"
  | "customer_satisfaction"
  | "avg_repair_cost"
  | "supplement_rate"
  | "alt_parts_usage"
  | "on_time_delivery";

export interface Metric {
  key: MetricKey;
  label: string;
  unit: "days" | "/100" | "$" | "%";
  shopValue: number;
  target: number;
  higherIsBetter: boolean;
  /** 0–100, how close the shop is to (or beyond) target. */
  score: number;
  /** One plain-language sentence. */
  explanation: string;
}

export interface Scorecard {
  shop: { name: string; shopId: string; address: string; region: string };
  insurer: { name: string; program: string };
  period: string;
  issuedOn: string;
  repairsReviewed: number;
  regionalRank: { rank: number; of: number };
  metrics: Metric[];
}
