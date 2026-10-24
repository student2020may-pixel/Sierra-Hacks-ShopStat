"use client";

import { useState } from "react";

const MAX_ROWS = 10;
/** The outlier math needs at least this many jobs to tell normal from slow. */
const MIN_JOBS = 5;

interface Row {
  jobId: string;
  laborHours: string;
  daysInShop: string;
}
const emptyRow = (): Row => ({ jobId: "", laborHours: "", daysInShop: "" });
const isComplete = (r: Row) => r.jobId.trim() !== "" && Number(r.laborHours) > 0 && r.daysInShop.trim() !== "" && Number(r.daysInShop) >= 0;
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** A small hand-entry table for shops without an export. Produces the same CSV the upload accepts. */
export default function ManualJobs({ onSubmit }: { onSubmit: (csv: string) => void }) {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: MIN_JOBS }, emptyRow));
  const complete = rows.filter(isComplete);

  function update(i: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  }

  function submit() {
    const lines = ["job_id,estimate_labor_hours,days_in_shop", ...complete.map((r) => [csvCell(r.jobId.trim()), r.laborHours, r.daysInShop].join(","))];
    onSubmit(lines.join("\n"));
  }

  return (
    <div className="animate-enter mt-4 rounded-xl border border-line bg-night-2 p-4 ">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-xs font-semibold text-muted">
        <span>Job ID</span>
        <span>Labor hours</span>
        <span>Days in shop</span>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            {(["jobId", "laborHours", "daysInShop"] as const).map((field) => (
              <input
                key={field}
                aria-label={`Row ${i + 1} ${field === "jobId" ? "job ID" : field === "laborHours" ? "labor hours" : "days in shop"}`}
                value={r[field]}
                onChange={(e) => update(i, field, e.target.value)}
                inputMode={field === "jobId" ? "text" : "decimal"}
                autoCapitalize={field === "jobId" ? "characters" : "off"}
                autoComplete="off"
                placeholder={field === "jobId" ? `RO-${101 + i}` : field === "laborHours" ? "12.5" : "4"}
                className="w-full min-w-0 rounded-md border border-white/20 px-2.5 py-2 text-bone placeholder:text-muted/60 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {rows.length < MAX_ROWS && (
          <button type="button" onClick={() => setRows((prev) => [...prev, emptyRow()])} className="pressable text-sm font-semibold text-gold">
            + Add a row
          </button>
        )}
        <span className="text-sm text-muted">
          {complete.length} of {rows.length} rows filled · up to {MAX_ROWS}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={complete.length < MIN_JOBS}
          className="pressable ml-auto rounded-full bg-gold px-4 py-2.5 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10"
        >
          Check these jobs
        </button>
      </div>
      {complete.length < MIN_JOBS && <p className="mt-2 text-xs text-muted">Fill in at least {MIN_JOBS} jobs so we can tell normal from slow.</p>}
    </div>
  );
}
