// Turns spreadsheet rows into CSV text so the existing jobs parser (lib/csv.ts) can read them.

type Cell = string | number | boolean | Date | null | undefined | object;

function cellText(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return String(value);
}

/** Quotes a cell when it holds a comma, quote or line break. */
export const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function rowsToCsv(rows: Cell[][]): string {
  return rows.map((row) => row.map((c) => csvCell(cellText(c))).join(",")).join("\n");
}
