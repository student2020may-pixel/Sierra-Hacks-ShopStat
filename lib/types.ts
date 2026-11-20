import type { z } from "zod";
import type { KpiKind } from "./kpis";
import type { EstimateExtractSchema, EstimatePhotoReviewSchema, KPI_UNITS, ScorecardReadSchema } from "./schemas";

export type KpiUnit = (typeof KPI_UNITS)[number];

/** One KPI for one insurer: its definition from lib/kpis.ts with this insurer's value and target. */
export interface Kpi {
  id: string;
  label: string;
  unit: KpiUnit;
  higherIsBetter: boolean;
  kind: KpiKind;
  /** False when the unit or direction is a guess (lib/kpis.ts). */
  confirmed: boolean;
  value: number | null;
  target: number | null;
  /** True when the shop owner typed or corrected it. */
  edited?: boolean;
}
/** A KPI with both a value and a target, so it can be judged. */
export type ScoredKpi = Kpi & { value: number; target: number };

export const isScored = (k: Kpi): k is ScoredKpi => k.value !== null && k.target !== null;

/** This insurer's numbers for one KPI. */
export interface KpiValue {
  value: number | null;
  target: number | null;
  edited?: boolean;
}

/** One DRP slot, as stored in the tab: this insurer's KPI values, by KPI id. KPIs not here are inactive. */
export interface SlotCard {
  /** "ai" or "manual" for the shop's own numbers, "sample" for the fictional sample data. */
  source: "ai" | "manual" | "sample";
  /** The insurer as printed on the screenshots, if read. */
  insurer: string | null;
  period: string | null;
  /** Claims this insurer's averages cover. One estimate's impact depends on it. */
  claims: number | null;
  values: Record<string, KpiValue>;
}

export type ScorecardRead = z.infer<typeof ScorecardReadSchema>;

/** Response body of POST /api/score. */
export interface ScorecardReadResponse {
  source: "ai" | "sample";
  insurer: string | null;
  period: string | null;
  claims: number | null;
  /** By KPI id. */
  values: Record<string, KpiValue>;
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
