import type { KpiUnit } from "./types";

const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const fixedOneDecimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case "$":
      return wholeDollars.format(value);
    case "%":
      return `${oneDecimal.format(value)}%`;
    case "days":
      return `${fixedOneDecimal.format(value)} days`;
    case "hours":
      return `${fixedOneDecimal.format(value)} hrs`;
    case "/100":
      return `${oneDecimal.format(value)} / 100`;
    case "number":
      return oneDecimal.format(value);
  }
}

/** Signed gap from target in the KPI's unit: "+4.3 days", "−$140", "+5 pts". */
export function formatVariance(value: number, target: number, unit: KpiUnit): string {
  const diff = Math.round((value - target) * 10) / 10;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const abs = Math.abs(diff);
  if (unit === "$") return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  if (unit === "%") return `${sign}${oneDecimal.format(abs)} pts`;
  if (unit === "days") return `${sign}${abs.toFixed(1)} days`;
  if (unit === "hours") return `${sign}${abs.toFixed(1)} hrs`;
  return `${sign}${oneDecimal.format(abs)}`;
}

/** "1,284" — counts shown to people get a thousands separator. */
export const formatCount = (n: number) => n.toLocaleString("en-US");

export function meetsTarget(k: { value: number; target: number; higherIsBetter: boolean }): boolean {
  return k.higherIsBetter ? k.value >= k.target : k.value <= k.target;
}
