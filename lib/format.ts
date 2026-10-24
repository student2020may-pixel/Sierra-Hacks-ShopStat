import type { Metric } from "./types";

export function formatValue(value: number, unit: Metric["unit"]): string {
  switch (unit) {
    case "$":
      return `$${value.toLocaleString("en-US")}`;
    case "%":
      return `${value}%`;
    case "days":
      return `${value.toFixed(1)} days`;
    case "/100":
      return `${value} / 100`;
  }
}

export function meetsTarget(m: Pick<Metric, "shopValue" | "target" | "higherIsBetter">): boolean {
  return m.higherIsBetter ? m.shopValue >= m.target : m.shopValue <= m.target;
}
