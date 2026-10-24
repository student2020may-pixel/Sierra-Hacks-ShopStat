"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import ManualJobs from "@/components/assessment/ManualJobs";
import Progress from "@/components/assessment/Progress";
import StepNav from "@/components/assessment/StepNav";
import Notice from "@/components/Notice";
import Skeleton from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import { detectOutliers, type AnomalyResult, type Job } from "@/lib/anomaly";
import { parseJobsCsv } from "@/lib/csv";
import { formatCount } from "@/lib/format";
import { isJobsResult, JOBS_KEY, JOBS_SOURCE_KEY, load, loadValid, save } from "@/lib/storage";

// Recharts measures the DOM, so render it on the client only.
const JobsScatter = dynamic(() => import("@/components/JobsScatter"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 sm:h-80" />,
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
  const jobs = n === 1 ? "1 job" : `${formatCount(n)} jobs`;
  const days = result.totalExtraDays === 1 ? "1 extra day" : `${formatCount(result.totalExtraDays)} extra days`;
  return `${jobs} added ${days} in the shop ${periodPhrase(result.jobs)}.`;
}

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export default function JobsStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [manual, setManual] = useState(false);

  // Coming back to this step: restore the last result instead of starting over.
  useEffect(() => {
    const saved = loadValid(JOBS_KEY, isJobsResult) as AnomalyResult | null;
    if (saved) {
      setResult(saved);
      setSource(load<string>(JOBS_SOURCE_KEY) ?? "your last upload");
    }
  }, []);

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
      save(JOBS_SOURCE_KEY, label);
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
    if (file.size > MAX_CSV_BYTES) {
      setError("That file is over 5 MB. Export just one quarter of jobs and try again.");
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
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={2} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-primary">Find the jobs that dragged on</h1>
      <p className="mt-2 text-slate-600">
        Upload a CSV of recent repair jobs. We compare each job&apos;s days in the shop to what its labor hours
        predict and flag the ones that took far longer.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Export last quarter&apos;s repair orders from your shop management software as a CSV, with job ID, labor hours,
        and dates in and out.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        <span className="font-semibold text-slate-600">Your file:</span> read right here in your browser, not uploaded. Only the slow
        jobs&apos; numbers are sent to OpenAI, to write your fix list and answer your questions.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="pressable cursor-pointer rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">
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
          className="pressable rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Use sample jobs
        </button>
        {loading && <Spinner label="Loading sample jobs…" />}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Columns: job_id, estimate_labor_hours, and days_in_shop or date_in and date_out (supplements optional).
      </p>
      <button
        type="button"
        onClick={() => setManual((m) => !m)}
        aria-expanded={manual}
        className="pressable mt-3 text-sm font-semibold text-primary"
      >
        {manual ? "Hide hand entry" : "No export? Enter jobs by hand"}
      </button>
      {manual && <ManualJobs onSubmit={(csv) => analyze(csv, "jobs entered by hand")} />}

      {error && (
        <div className="mt-6 animate-enter">
          <Notice kind="error">
            {error}{" "}
            <button onClick={useSample} className="pressable font-semibold underline">
              Use the sample jobs instead
            </button>
          </Notice>
        </div>
      )}

      {result && (
        <section key={source + String(result.jobs.length)} className="mt-10 space-y-8">
          <div className="animate-enter">
            <p className="text-sm [overflow-wrap:anywhere] text-slate-500">
              Analyzed {formatCount(result.jobs.length)} jobs from {source}
              {skipped > 0 && ` · skipped ${skipped} row${skipped === 1 ? "" : "s"} with missing or impossible numbers`}
            </p>
            <p className="mt-1 text-2xl font-bold text-ink">{summary(result)}</p>
            <p className="mt-1 text-sm text-slate-600">
              A typical job here takes about {result.fit.baseDays} days plus{" "}
              {(result.fit.daysPerLaborHour * 10).toFixed(1)} days for every 10 labor hours.
            </p>
          </div>

          <div className="animate-enter rounded-xl border border-slate-200 bg-white p-3 shadow-sm [animation-delay:60ms] sm:p-4">
            <h2 className="px-2 font-semibold text-primary">Labor hours vs. days in shop</h2>
            <JobsScatter result={result} />
          </div>

          {result.flagged.length > 0 && (
            <div className="animate-enter rounded-xl border border-slate-200 bg-white shadow-sm [animation-delay:120ms]">
              <h2 className="px-4 pt-4 font-semibold text-primary">Flagged jobs</h2>
              <ul className="divide-y divide-slate-100 sm:hidden">
                {result.flagged.map((j, i) => (
                  <li key={`${j.jobId}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium [overflow-wrap:anywhere] text-ink">{j.jobId}</p>
                      <p className="text-slate-600 tabular-nums">
                        {j.laborHours} hrs · {j.daysInShop} days (expected {j.expectedDays.toFixed(1)})
                      </p>
                    </div>
                    <p className="shrink-0 text-right font-semibold text-danger tabular-nums">
                      +{j.extraDays.toFixed(1)}
                      <span className="block text-xs font-normal text-slate-500">extra days</span>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
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
                    {result.flagged.map((j, i) => (
                      <tr key={`${j.jobId}-${i}`} className="border-b border-slate-100 last:border-0">
                        <td className="max-w-64 px-4 py-3 font-medium [overflow-wrap:anywhere] text-ink">{j.jobId}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{j.laborHours}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{j.daysInShop}</td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{j.expectedDays.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-danger tabular-nums">+{j.extraDays.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      )}

      <StepNav
        back="/assessment/scorecard"
        next={{ href: "/results", label: "See results", ready: result !== null && !loading, hint: "Add your jobs or use the sample to continue." }}
      />
    </main>
  );
}
