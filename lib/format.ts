import type { Metric, ScoredMetric } from "./types";

const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatValue(value: number, unit: Metric["unit"]): string {
  switch (unit) {
    case "$":
      return wholeDollars.format(value);
    case "%":
      return `${oneDecimal.format(value)}%`;
    case "days":
      return `${value.toFixed(1)} days`;
    case "/100":
      return `${oneDecimal.format(value)} / 100`;
  }
}

/** "1,284" — counts shown to people get a thousands separator. */
export const formatCount = (n: number) => n.toLocaleString("en-US");

/** Formats an "Also found" value using whatever unit the scorecard printed. */
export function formatOther(value: number, unit: string): string {
  const u = unit.trim();
  if (u === "$") return wholeDollars.format(value);
  if (u === "%") return `${oneDecimal.format(value)}%`;
  return `${oneDecimal.format(value)}${u ? ` ${u}` : ""}`;
}

export function meetsTarget(m: Pick<ScoredMetric, "shopValue" | "target" | "higherIsBetter">): boolean {
  return m.higherIsBetter ? m.shopValue >= m.target : m.shopValue <= m.target;
}
