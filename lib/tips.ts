import type { MetricKey } from "./types";

/**
 * Standard body-shop practices, shown (labeled "General tip") for a weak metric when none of the
 * AI's three fixes targets it. Not specific to the shop's data.
 */
export const GENERAL_TIPS: Record<MetricKey, string> = {
  cycle_time: "Review every car past its promised date each morning and clear whatever is blocking it.",
  customer_satisfaction: "Text customers when their car's status changes, and call before a delivery date slips.",
  avg_repair_cost: "Compare each estimate's parts and labor lines with similar past jobs before sending it.",
  supplement_rate: "Do a full teardown and photograph hidden damage before writing the first estimate.",
  alt_parts_usage: "Check alternate and recycled part availability at estimate time, before ordering new OEM parts.",
  on_time_delivery: "Set promise dates from labor hours plus a buffer, and tell the customer as soon as one slips.",
};
