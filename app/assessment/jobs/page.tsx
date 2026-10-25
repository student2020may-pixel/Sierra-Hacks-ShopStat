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
import { shrinkImage } from "@/lib/image";
import { rowsToCsv } from "@/lib/sheet";
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

const SAMPLE_LABEL = "sample jobs (Valley Auto Body)";
const MAX_CSV_BYTES = 5 * 1024 * 1024;
/** Vercel rejects bigger request bodies before our code runs. */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const CLIENT_TIMEOUT_MS = 55_000;
/** Read right here in the browser; everything else (PDFs, photos, documents) goes to the AI. */
const TEXT_FILE = /\.(csv|tsv|txt)$/i;
const EXCEL_FILE = /\.(xlsx|xlsm)$/i;
const OLD_SPREADSHEET = /\.(xls|ods|numbers)$/i;

export default function JobsStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [manual, setManual] = useState(false);
  /** Sample jobs from an earlier visit: counts as done, but isn't shown until loaded again. */
  const [savedSample, setSavedSample] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  // Coming back to this step: restore the last result instead of starting over.
  useEffect(() => {
    const saved = loadValid(JOBS_KEY, isJobsResult) as AnomalyResult | null;
    if (!saved) return;
    const label = load<string>(JOBS_SOURCE_KEY) ?? "your last upload";
    if (label === SAMPLE_LABEL) {
      setSavedSample(true);
      return;
    }
    setResult(saved);
    setSource(label);
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
    if (!file || reading) return;
    setResult(null);
    setNotice(null);
    setError(null);
    if (OLD_SPREADSHEET.test(file.name)) {
      setError("Please save that spreadsheet as .xlsx or .csv and upload it again.");
      return;
    }
    if (TEXT_FILE.test(file.name) || EXCEL_FILE.test(file.name) || file.type === "text/csv") {
      if (file.size > MAX_CSV_BYTES) {
        setError("That file is over 5 MB. Export just one quarter of jobs and try again.");
        return;
      }
      try {
        if (EXCEL_FILE.test(file.name)) {
          const { readSheet } = await import("read-excel-file/browser");
          analyze(rowsToCsv(await readSheet(file)), file.name);
        } else {
          analyze(await file.text(), file.name);
        }
      } catch {
        setError("We couldn't open that file. Please try again, or export it as a CSV.");
      }
      return;
    }
    await readWithAi(file);
  }

  /** PDFs, photos, screenshots and documents: the AI reads the job list and sends it back as CSV. */
  async function readWithAi(file: File) {
    setReading(true);
    try {
      const upload = await shrinkImage(file);
      if (upload.size > MAX_UPLOAD_BYTES) {
        setError("That file is over 4.5 MB. Try a screenshot of the job list or a smaller file.");
        return;
      }
      const body = new FormData();
      body.append("file", upload);
      const res = await fetch("/api/jobs", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
      const data = await res.json().catch(() => null);
      if (res.status === 400 && data?.error) {
        setError(data.error);
      } else if (res.ok && data?.source === "ai" && typeof data.csv === "string") {
        analyze(data.csv, file.name);
      } else {
        await loadSample(data?.notice ?? "Reading that file took too long or the server had a problem, so we're showing the sample jobs.");
      }
    } catch {
      await loadSample("We couldn't reach the server, so we're showing the sample jobs. Check your connection and try again.");
    } finally {
      setReading(false);
    }
  }

  async function loadSample(why?: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setNotice(typeof why === "string" ? why : null);
    try {
      const res = await fetch("/api/sample-jobs");
      if (!res.ok) throw new Error();
      analyze(await res.text(), SAMPLE_LABEL);
    } catch {
      setError("We couldn't load the sample jobs. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={2} />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Find the jobs that dragged on</h1>
      <p className="mt-2 text-bone/70">
        Upload your recent repair jobs. We compare each job&apos;s days in the shop to what its labor hours
        predict and flag the ones that took far longer.
      </p>
      <p className="mt-2 text-sm text-muted">
        Any file works: a CSV or Excel export from your shop management software, a PDF report, or a photo or screenshot of
        your job list. It needs job IDs, labor hours, and days in the shop (or dates in and out).
      </p>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-bone/70">Your file:</span> CSV and Excel files are read right here in your browser, not
        uploaded. PDFs, photos and other files are sent to OpenAI (or Google Gemini as a backup) only to read the job list, and
        aren&apos;t saved by ShopStats. Only the slow jobs&apos; numbers are sent on to write your fix list and answer your questions.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label
          className={`pressable cursor-pointer rounded-full bg-gold px-5 py-3 font-semibold text-night hover:bg-bone ${reading ? "pointer-events-none opacity-50" : ""}`}
        >
          Upload jobs file
          <input
            type="file"
            disabled={reading}
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={() => loadSample()}
          disabled={loading || reading}
          className="pressable rounded-full border border-white/20 bg-transparent px-5 py-3 font-semibold text-bone/85 hover:bg-white/[0.03] disabled:opacity-50"
        >
          Use sample jobs
        </button>
        {loading && <Spinner label="Loading sample jobs…" />}
        {reading && <Spinner label="Reading your file… about 10–30 seconds." />}
      </div>
      <p className="mt-2 text-xs text-muted">
        For CSV and Excel, columns: job_id, estimate_labor_hours, and days_in_shop or date_in and date_out (supplements optional).
      </p>
      <button
        type="button"
        onClick={() => setManual((m) => !m)}
        aria-expanded={manual}
        className="pressable mt-3 text-sm font-semibold text-gold"
      >
        {manual ? "Hide hand entry" : "No export? Enter jobs by hand"}
      </button>
      {manual && (
        <ManualJobs
          onSubmit={(csv) => {
            setNotice(null);
            analyze(csv, "jobs entered by hand");
          }}
        />
      )}

      {error && (
        <div className="mt-6 animate-enter">
          <Notice kind="error">
            {error}{" "}
            <button onClick={() => loadSample()} className="pressable font-semibold underline">
              Use the sample jobs instead
            </button>
          </Notice>
        </div>
      )}

      {notice && result && (
        <div className="mt-6 animate-enter">
          <Notice kind="info">{notice}</Notice>
        </div>
      )}

      {result && (
        <section key={source + String(result.jobs.length)} className="mt-10 space-y-8">
          <div className="animate-enter">
            <p className="text-sm [overflow-wrap:anywhere] text-muted">
              Analyzed {formatCount(result.jobs.length)} jobs from {source}
              {skipped > 0 && ` · skipped ${skipped} row${skipped === 1 ? "" : "s"} with missing or impossible numbers`}
            </p>
            <p className="mt-1 text-2xl font-bold text-bone">{summary(result)}</p>
            <p className="mt-1 text-sm text-bone/70">
              A typical job here takes about {result.fit.baseDays} days plus{" "}
              {(result.fit.daysPerLaborHour * 10).toFixed(1)} days for every 10 labor hours.
            </p>
          </div>

          <div className="animate-enter rounded-xl border border-line bg-night-2 p-3  [animation-delay:60ms] sm:p-4">
            <h2 className="px-2 font-serif text-2xl font-normal text-bone">Labor hours vs. days in shop</h2>
            <JobsScatter result={result} />
          </div>

          {result.flagged.length > 0 && (
            <div className="animate-enter rounded-xl border border-line bg-night-2  [animation-delay:120ms]">
              <h2 className="px-4 pt-4 font-serif text-2xl font-normal text-bone">Flagged jobs</h2>
              <ul className="divide-y divide-line sm:hidden">
                {result.flagged.map((j, i) => (
                  <li key={`${j.jobId}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium [overflow-wrap:anywhere] text-bone">{j.jobId}</p>
                      <p className="text-bone/70 tabular-nums">
                        {j.laborHours} hrs · {j.daysInShop} days (expected {j.expectedDays.toFixed(1)})
                      </p>
                    </div>
                    <p className="shrink-0 text-right font-semibold text-danger-soft tabular-nums">
                      +{j.extraDays.toFixed(1)}
                      <span className="block text-xs font-normal text-muted">extra days</span>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted uppercase">
                      <th className="px-4 py-3 font-semibold">Job ID</th>
                      <th className="px-4 py-3 text-right font-semibold">Labor hours</th>
                      <th className="px-4 py-3 text-right font-semibold">Days in shop</th>
                      <th className="px-4 py-3 text-right font-semibold">Expected days</th>
                      <th className="px-4 py-3 text-right font-semibold">Extra days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.flagged.map((j, i) => (
                      <tr key={`${j.jobId}-${i}`} className="border-b border-line last:border-0">
                        <td className="max-w-64 px-4 py-3 font-medium [overflow-wrap:anywhere] text-bone">{j.jobId}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{j.laborHours}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{j.daysInShop}</td>
                        <td className="px-4 py-3 text-right text-bone/70 tabular-nums">{j.expectedDays.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-danger-soft tabular-nums">+{j.extraDays.toFixed(1)}</td>
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
        next={{ href: "/results", label: "See results", ready: (result !== null || savedSample) && !loading && !reading, hint: "Add your jobs or use the sample to continue." }}
      />
    </main>
  );
}
