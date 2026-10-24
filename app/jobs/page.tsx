"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";
import { detectOutliers, type AnomalyResult, type Job } from "@/lib/anomaly";
import { parseJobsCsv } from "@/lib/csv";
import { JOBS_KEY, save } from "@/lib/storage";

// Recharts measures the DOM, so render it on the client only.
const JobsScatter = dynamic(() => import("@/components/JobsScatter"), {
  ssr: false,
  loading: () => <div className="flex h-80 items-center justify-center"><Spinner label="Drawing chart…" /></div>,
});

/** "this quarter" when jobs came in over about three months, otherwise a neutral phrase. */
function periodPhrase(jobs: Job[]): string {
  // Use arrival dates only: a slow job that came in late in the quarter can finish weeks after it ends.
  const times = jobs.map((j) => Date.parse(j.dateIn)).filter((t) => !Number.isNaN(t));
  if (times.length < 2) return "in this data";
  const spanDays = (Math.max(...times) - Math.min(...times)) / 864e5;
  return spanDays <= 100 ? "this quarter" : "in this period";
}

function summary(result: AnomalyResult): string {
  const n = result.flagged.length;
  if (n === 0) return "No jobs stood out. Every job finished close to what its labor hours predict.";
  const jobs = n === 1 ? "1 job" : `${n} jobs`;
  const days = result.totalExtraDays === 1 ? "1 extra day" : `${result.totalExtraDays} extra days`;
  return `${jobs} added ${days} in the shop ${periodPhrase(result.jobs)}.`;
}

export default function JobsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);

  function analyze(text: string, label: string) {
    const parsed = parseJobsCsv(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    try {
      const r = detectOutliers(parsed.jobs);
      setResult(r);
      setSource(label);
      setSkipped(parsed.skipped);
      setError(null);
      save(JOBS_KEY, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong analyzing those jobs.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("Please upload a .csv file (export your jobs from your shop system as CSV).");
      return;
    }
    try {
      analyze(await file.text(), file.name);
    } catch {
      setError("We couldn't open that file. Please try again.");
    }
  }

  async function useSample() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sample-jobs");
      if (!res.ok) throw new Error();
      analyze(await res.text(), "sample jobs (Valley Auto Body)");
    } catch {
      setError("We couldn't load the sample jobs. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Find the jobs that dragged on</h1>
      <p className="mt-2 text-slate-600">
        Upload a CSV of recent repair jobs. We compare each job&apos;s days in the shop to what its labor hours
        predict and flag the ones that took far longer.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-hover">
          Upload jobs.csv
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={useSample}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Use sample jobs
        </button>
        {loading && <Spinner label="Loading sample jobs…" />}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Needs columns: job_id, estimate_labor_hours, days_in_shop (supplements, date_in, date_out optional).
      </p>

      {error && (
        <div className="mt-6">
          <Notice kind="error">
            {error}{" "}
            <button onClick={useSample} className="font-semibold underline">
              Use the sample jobs instead
            </button>
          </Notice>
        </div>
      )}

      {result && (
        <section className="mt-10 space-y-8">
          <div>
            <p className="text-sm text-slate-500">
              Analyzed {result.jobs.length} jobs from {source}
              {skipped > 0 && ` · skipped ${skipped} row${skipped === 1 ? "" : "s"} with missing numbers`}
            </p>
            <p className="mt-1 text-2xl font-bold text-ink">{summary(result)}</p>
            <p className="mt-1 text-sm text-slate-600">
              A typical job here takes about {result.fit.baseDays} days plus{" "}
              {(result.fit.daysPerLaborHour * 10).toFixed(1)} days for every 10 labor hours.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="px-2 font-semibold text-primary">Labor hours vs. days in shop</h2>
            <JobsScatter result={result} />
          </div>

          {result.flagged.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <caption className="px-4 pt-4 text-left font-semibold text-primary">Flagged jobs</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-3 font-semibold">Job ID</th>
                    <th className="px-4 py-3 text-right font-semibold">Labor hours</th>
                    <th className="px-4 py-3 text-right font-semibold">Days in shop</th>
                    <th className="px-4 py-3 text-right font-semibold">Expected days</th>
                    <th className="px-4 py-3 text-right font-semibold">Extra days</th>
                  </tr>
                </thead>
                <tbody>
                  {result.flagged.map((j) => (
                    <tr key={j.jobId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{j.jobId}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{j.laborHours}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{j.daysInShop}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{j.expectedDays.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-danger">
                        +{j.extraDays.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Link href="/results" className="text-sm font-semibold text-primary hover:text-primary-hover">
              Next: see your results →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
