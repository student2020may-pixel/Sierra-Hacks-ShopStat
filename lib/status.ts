import { meetsTarget } from "./format";
import { isScored, type Metric } from "./types";

export type Status = "meets" | "close" | "below" | "missing";

/** A score of 65+ while missing target means a miss of about 13% or less (see lib/scoring.ts). */
const CLOSE_SCORE = 65;

export function metricStatus(m: Metric): Status {
  if (!isScored(m)) return "missing";
  if (meetsTarget(m)) return "meets";
  return m.score >= CLOSE_SCORE ? "close" : "below";
}

// Chips sit on the dark app surfaces, so their text uses the lighter "-soft" status colors.
export const STATUS_STYLES: Record<Status, { label: string; bar: string; chip: string }> = {
  meets: { label: "Meets target", bar: "bg-success", chip: "bg-success/15 text-success-soft" },
  close: { label: "Close", bar: "bg-warning", chip: "bg-warning/15 text-warning" },
  below: { label: "Below target", bar: "bg-danger", chip: "bg-danger/15 text-danger-soft" },
  missing: { label: "Not on this scorecard", bar: "bg-white/10", chip: "bg-white/10 text-muted" },
};
