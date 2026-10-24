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

// Amber is too light for text on white, so the "close" chip uses ink text on an amber tint.
export const STATUS_STYLES: Record<Status, { label: string; bar: string; chip: string }> = {
  meets: { label: "Meets target", bar: "bg-success", chip: "bg-success/10 text-success" },
  close: { label: "Close", bar: "bg-warning", chip: "bg-warning/20 text-ink" },
  below: { label: "Below target", bar: "bg-danger", chip: "bg-danger/10 text-danger" },
  missing: { label: "Not on this scorecard", bar: "bg-slate-200", chip: "bg-slate-200/70 text-slate-600" },
};
