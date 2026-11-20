// Every KPI on the shop's CCC DRP dashboard (all insurers, active or not), with its unit, which way is
// better, and how an estimate relates to it. Values and targets are per insurer and entered by the
// shop each period; this file only describes the KPIs.
//
// `confirmed: false` marks a unit or direction we guessed from the name. Fix it here if it's wrong.

import type { KpiUnit } from "./types";

/**
 * - "estimate": the estimate itself sets this claim's number (labor $, parts %, paint hours...).
 * - "predicted": the app predicts it from the estimate (days in the shop, supplements); not certain.
 * - "reference": one estimate can't move it (surveys, audits, process timing). Shown, never graded.
 */
export type KpiKind = "estimate" | "predicted" | "reference";

export interface KpiDef {
  id: string;
  /** Exactly as CCC shows it, so screenshots can be matched. */
  name: string;
  unit: KpiUnit;
  higherIsBetter: boolean;
  kind: KpiKind;
  confirmed: boolean;
  /** Repair-size bands for the cycle time KPIs: the estimate total must fall in [min, max). */
  band?: [number, number | null];
}

const k = (id: string, name: string, unit: KpiUnit, higherIsBetter: boolean, kind: KpiKind, confirmed = false, band?: KpiDef["band"]): KpiDef => ({
  id,
  name,
  unit,
  higherIsBetter,
  kind,
  confirmed,
  band,
});

export const KPIS: KpiDef[] = [
  // Set by the estimate itself.
  k("labor_amount", "Avg Labor Amount Per Claim", "$", false, "estimate", true),
  k("part_amount", "Avg Part Amount per Claim", "$", false, "estimate"),
  k("part_price", "Average Part Price per Appraisal", "$", false, "estimate"),
  k("labor_pct", "Average Labor Amount % Total Repair Cost", "%", false, "estimate"),
  k("part_pct", "Average Part Amount % of Total Repair Cost", "%", false, "estimate"),
  k("paint_pct", "Average Paint Amount % Total Repair Cost", "%", false, "estimate"),
  k("misc_pct", "Average Misc Amount % Total Repair Cost", "%", false, "estimate"),
  k("paint_hours", "Avg Paint Labor Hrs per Claim", "hours", false, "estimate"),
  k("repair_hours_claim", "Avg Repair Labor Hours per Claim", "hours", false, "estimate"),
  k("repair_hours_appraisal", "Avg Repair Labor Hrs per Appraisal", "hours", false, "estimate"),
  k("repair_pct_sheet_metal_a", "Repair % of Total Sheet-metal Labor Amount", "%", true, "estimate"),
  k("repair_pct_sheet_metal_b", "Repair % of Total Sheet Metal Labor Amount", "%", true, "estimate"),
  k("overwrite_pct", "Avg Overwrite % of TCOR", "%", false, "estimate"),

  // Predicted from the estimate.
  k("vivo_days", "Vehicle In to Vehicle Out Days Avg", "days", false, "predicted"),
  k("vivo_0_2k", "Vehicle In to Vehicle Out Days Avg $0 to $2k", "days", false, "predicted", false, [0, 2_000]),
  k("vivo_0_3k", "Vehicle In to Vehicle Out Days Avg $0 to $3k", "days", false, "predicted", false, [0, 3_000]),
  k("vivo_2_4k", "Vehicle In to Vehicle Out Days Avg $2k to $4k", "days", false, "predicted", false, [2_000, 4_000]),
  k("vivo_3_6k", "Vehicle In to Vehicle Out Days Avg $3k to $6k", "days", false, "predicted", false, [3_000, 6_000]),
  k("vivo_4_6k", "Vehicle In to Vehicle Out Days Avg $4k - $6k", "days", false, "predicted", false, [4_000, 6_000]),
  k("vivo_6_9k", "Vehicle In to Vehicle Out Days Avg $6K to $9K", "days", false, "predicted", false, [6_000, 9_000]),
  k("vivo_6k_plus", "Vehicle In to Vehicle Out Days Avg $6k+", "days", false, "predicted", false, [6_000, null]),
  k("vivo_9_20k", "Vehicle In to Vehicle Out Days Avg $9K to $20K", "days", false, "predicted", false, [9_000, 20_000]),
  k("true_supplements", "Avg # of True Supplements per Claim", "number", false, "predicted"),
  k("claims_true_supplement_pct", "% of Claims with True Supplement", "%", false, "predicted"),
  k("claims_supplement_request_pct", "% of Claims with Supplement Change Requested", "%", false, "predicted"),

  // One estimate can't move these.
  k("supplement_change_pct_tcor", "Average Supplement Change Request % of TCOR", "%", false, "reference"),
  k("assignment_to_estimate", "Assignment Sent to Estimate Sent", "days", false, "reference"),
  k("last_assignment_to_estimate_days", "Last Estimate Assignment Sent to EstSent Days Avg", "days", false, "reference"),
  k("last_assignment_to_vehicle_in_days", "Last Estimate Assignment Sent to Veh In Days Avg", "days", false, "reference"),
  k("estimate_accuracy", "Estimate Accuracy", "%", true, "reference"),
  k("accuracy_pct", "Accuracy %", "%", true, "reference"),
  k("audit_score", "Avg Last Audit Score per Claim", "number", true, "reference"),
  k("audit_exceptions", "Avg # of Exceptions per Last Audit", "number", false, "reference"),
  k("audit_guideline_exceptions", "Avg # of Guideline Exceptions on Last Audit", "number", false, "reference"),
  k("quality_score", "Avg Quality Score", "number", true, "reference"),
  k("customer_service_score", "Avg Customer Service Score", "number", true, "reference"),
  k("service_score", "Avg Service Score", "number", true, "reference"),
  k("recommended_shop_score", "Avg Recommended Shop Score", "number", true, "reference"),
  k("kept_informed_pct", "Kept Informed %", "%", true, "reference"),
  k("net_promoter_score", "Net Promoter Score", "number", true, "reference"),
  k("survey_on_time_pct", "Survey % of On Time Delivery", "%", true, "reference"),
  k("surveys_requested_pct", "% of Repairs with Surveys Requested", "%", true, "reference"),
];

export const KPI_IDS = KPIS.map((d) => d.id) as [string, ...string[]];
export const KPI_NAMES = KPIS.map((d) => d.name) as [string, ...string[]];

export const kpiById = (id: string) => KPIS.find((d) => d.id === id);
export const kpiByName = (name: string) => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$#+]+/g, "");
  return KPIS.find((d) => norm(d.name) === norm(name));
};

export const KIND_LABEL: Record<KpiKind, string> = {
  estimate: "Set by the estimate",
  predicted: "Predicted from the estimate",
  reference: "Reference only",
};
