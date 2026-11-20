// Typed view of the fictional sample numbers (data/sample-scorecards.json). JSON imports type each
// insurer's KPIs as a different object shape, so they're cast once here.
import sample from "@/data/sample-scorecards.json";
import type { KpiValue } from "./types";

export interface SampleInsurer {
  insurer: string;
  claims: number;
  values: Record<string, KpiValue>;
}

export const SAMPLE = sample as unknown as { shop: string; title: string; period: string; insurers: SampleInsurer[] };
