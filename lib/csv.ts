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

const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export type ParseResult = { ok: true; jobs: Job[]; skipped: number } | { ok: false; error: string };

export function parseJobsCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: "That file looks empty. It needs a header row and at least one job." };

  const headers = lines[0].split(",").map(norm);
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

  const jobs: Job[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((c) => c.trim());
    const cell = (k: keyof Job) => (idx[k] >= 0 ? (cells[idx[k]] ?? "") : "");
    const laborHours = parseFloat(cell("laborHours"));
    const daysInShop = parseFloat(cell("daysInShop"));
    if (!cell("jobId") || !(laborHours > 0) || !(daysInShop >= 0)) {
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
