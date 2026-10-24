import type { Job } from "./anomaly";

// Accepts a few common spellings for each column so real shop exports work too.
const COLUMNS: Record<keyof Job, string[]> = {
  jobId: ["job_id", "jobid", "job", "id", "ro", "ro_number", "repair_order"],
  laborHours: ["estimate_labor_hours", "labor_hours", "laborhours", "hours", "estimated_hours"],
  daysInShop: ["days_in_shop", "daysinshop", "days", "cycle_days", "cycle_time"],
  supplements: ["supplements", "number_of_supplements", "num_supplements", "supplement_count"],
  dateIn: ["date_in", "datein", "in_date", "arrived"],
  dateOut: ["date_out", "dateout", "out_date", "delivered"],
};
const REQUIRED: (keyof Job)[] = ["jobId", "laborHours", "daysInShop"];
/** Keeps the outlier math and the chart responsive; real quarterly exports are far smaller. */
export const MAX_ROWS = 5000;
/** A single repair beyond these is a typo or a unit mix-up (minutes as hours), and would wreck the chart's scale. */
const MAX_LABOR_HOURS = 1000;
const MAX_DAYS_IN_SHOP = 365;

const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Excel in many European locales exports with ";" (and decimal commas); some systems use tabs. */
function detectDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, headerLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Splits CSV text into rows of cells, honoring quoted fields ("Smith, John", "say ""hi"""). */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export type ParseResult = { ok: true; jobs: Job[]; skipped: number } | { ok: false; error: string };

export function parseJobsCsv(text: string): ParseResult {
  const clean = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(clean.slice(0, clean.search(/\r?\n|$/)));
  const rows = parseRows(clean, delimiter);
  if (rows.length < 2) return { ok: false, error: "That file looks empty. It needs a header row and at least one job." };
  if (rows.length - 1 > MAX_ROWS) {
    return { ok: false, error: `That file has ${(rows.length - 1).toLocaleString("en-US")} jobs. Please upload ${MAX_ROWS.toLocaleString("en-US")} or fewer, such as one quarter.` };
  }

  const headers = rows[0].map(norm);
  const idx = Object.fromEntries(
    (Object.keys(COLUMNS) as (keyof Job)[]).map((k) => [k, headers.findIndex((h) => COLUMNS[k].includes(h))]),
  ) as Record<keyof Job, number>;

  const missing = REQUIRED.filter((k) => idx[k] < 0);
  if (missing.length === REQUIRED.length) {
    return {
      ok: false,
      error: "That doesn't look like a jobs file. The first row needs column names like job_id, estimate_labor_hours, days_in_shop.",
    };
  }
  if (missing.length) {
    return { ok: false, error: `That file is missing a column for ${missing.map((k) => COLUMNS[k][0]).join(" and ")}.` };
  }

  // "12,5" means 12.5 in semicolon-delimited files; elsewhere strip thousands separators ("1,284").
  const toNumber = (s: string) =>
    parseFloat(delimiter === ";" ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""));

  const jobs: Job[] = [];
  let skipped = 0;
  for (const cells of rows.slice(1)) {
    const cell = (k: keyof Job) => (idx[k] >= 0 ? (cells[idx[k]] ?? "") : "");
    const laborHours = toNumber(cell("laborHours"));
    const daysInShop = toNumber(cell("daysInShop"));
    if (
      !cell("jobId") ||
      !(laborHours > 0 && laborHours <= MAX_LABOR_HOURS) ||
      !(daysInShop >= 0 && daysInShop <= MAX_DAYS_IN_SHOP)
    ) {
      skipped++;
      continue;
    }
    jobs.push({
      jobId: cell("jobId"),
      laborHours,
      daysInShop,
      supplements: parseInt(cell("supplements")) || 0,
      dateIn: cell("dateIn"),
      dateOut: cell("dateOut"),
    });
  }

  if (jobs.length === 0) return { ok: false, error: "We couldn't read any jobs from that file. Check the numbers in each row." };
  return { ok: true, jobs, skipped };
}
