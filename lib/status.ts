import { meetsTarget } from "./format";
import { scoreMetric } from "./scoring";
import { isScored, type Kpi } from "./types";

export type Status = "meets" | "close" | "below" | "missing";

/** A score of 65+ while missing target means a miss of about 13% or less (see lib/scoring.ts). */
const CLOSE_SCORE = 65;

export function kpiStatus(k: Kpi): Status {
  if (!isScored(k)) return "missing";
  if (meetsTarget(k)) return "meets";
  return scoreMetric(k.value, k.target, k.higherIsBetter) >= CLOSE_SCORE ? "close" : "below";
}

// Chips sit on the dark app surfaces, so their text uses the lighter "-soft" status colors.
export const STATUS_STYLES: Record<Status, { label: string; chip: string }> = {
  meets: { label: "Meets target", chip: "bg-success/15 text-success-soft" },
  close: { label: "Close", chip: "bg-warning/15 text-warning" },
  below: { label: "Below target", chip: "bg-danger/15 text-danger-soft" },
  missing: { label: "Not shown", chip: "bg-white/10 text-muted" },
};
