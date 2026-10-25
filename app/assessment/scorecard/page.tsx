"use client";

import { useEffect, useRef, useState } from "react";
import Progress from "@/components/assessment/Progress";
import StepNav from "@/components/assessment/StepNav";
import GradeExplainer from "@/components/GradeExplainer";
import MetricCard from "@/components/MetricCard";
import Notice from "@/components/Notice";
import OtherMetrics from "@/components/OtherMetrics";
import StatSheet from "@/components/StatSheet";
import Skeleton from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import scorecardData from "@/data/scorecard.json";
import { shrinkImage } from "@/lib/image";
import { isScoreResult, load, loadValid, save, SCORE_FILE_KEY, SCORE_KEY } from "@/lib/storage";
import type { Metric, Scorecard, ScoreResponse } from "@/lib/types";

/** Matches the server limit; Vercel rejects bigger bodies before our code runs. */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
/** A little longer than the server's own 40s AI timeout. */
const CLIENT_TIMEOUT_MS = 55_000;

const sampleResult = (notice: string): ScoreResponse => ({
  source: "sample",
  metrics: (scorecardData as Scorecard).metrics,
  other_metrics: [],
  period: (scorecardData as Scorecard).period,
  notice,
});

export default function ScorecardStep() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  /** Name of the scorecard behind `result`, so it still shows after Back from step 2. */
  const [resultName, setResultName] = useState<string | null>(null);
  /** A sample (or fallback) result from an earlier visit: counts as done, but isn't shown until scored again. */
  const [savedSample, setSavedSample] = useState(false);
  // Ignores responses from a request the user has since replaced (picked a new file mid-upload).
  const requestId = useRef(0);

  // Coming back to this step: restore the last result instead of starting over.
  useEffect(() => {
    const saved = loadValid(SCORE_KEY, isScoreResult) as ScoreResponse | null;
    if (!saved) return;
    setResultName(load<string>(SCORE_FILE_KEY));
    if (saved.source === "sample") setSavedSample(true);
    else setResult({ ...saved, other_metrics: Array.isArray(saved.other_metrics) ? saved.other_metrics : [] });
  }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    requestId.current++;
    setFile(f);
    setLoading(false);
    setError(null);
    setResult(null);
    setResultName(null);
    setSavedSample(false);
  }

  function show(data: ScoreResponse, name: string) {
    setResult(data);
    setResultName(name);
    save(SCORE_KEY, data);
    save(SCORE_FILE_KEY, name);
  }

  /** A hand correction from a metric card: swap it in and keep it for the next steps. */
  function updateMetric(updated: Metric) {
    if (!result) return;
    const next = { ...result, metrics: result.metrics.map((m) => (m.key === updated.key ? updated : m)) };
    setResult(next);
    save(SCORE_KEY, next);
  }

  function useSample() {
    requestId.current++;
    setFile(null);
    setLoading(false);
    setError(null);
    show(sampleResult("This is the sample scorecard for Valley Auto Body, a fictional shop."), "Sample scorecard");
  }

  async function submit() {
    if (!file || loading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const upload = await shrinkImage(file);
      if (upload.size > MAX_UPLOAD_BYTES) {
        setError("That file is over 4.5 MB. Try a screenshot of the scorecard or a smaller PDF.");
        return;
      }
      const body = new FormData();
      body.append("file", upload);
      const res = await fetch("/api/score", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
      const data = await res.json().catch(() => null);
      if (id !== requestId.current) return;
      if (res.status === 400 && data?.error) {
        setError(data.error); // Something the user can fix, like the wrong file type.
      } else if (res.ok && Array.isArray(data?.metrics)) {
        show({ ...data, other_metrics: Array.isArray(data.other_metrics) ? data.other_metrics : [] } as ScoreResponse, file.name);
      } else {
        // The host timed out or rejected the request (e.g. an HTML 504/413 page), so keep the demo going.
        show(sampleResult("Scoring took too long or the server had a problem, so we're showing the sample scorecard."), "Sample scorecard");
      }
    } catch {
      if (id !== requestId.current) return;
      show(sampleResult("We couldn't reach the server, so we're showing the sample scorecard. Check your connection and try again."), "Sample scorecard");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={1} />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Upload your insurer scorecard</h1>
      <p className="mt-2 text-bone/70">
        Drop in your scorecard in any format. We&apos;ll score each metric and explain it in plain
        English.
      </p>
      <p className="mt-2 text-sm text-muted">
        Insurers send these as a PDF or through their online portal. A photo, screenshot, spreadsheet or Word document works too.
      </p>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-bone/70">Your file:</span> sent to OpenAI (or Google Gemini as a backup) only to read the
        numbers, and not saved by ShopStats. Your results stay in this browser tab.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`pressable mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-12 text-center active:scale-[0.99] ${
          dragging ? "border-gold bg-gold/10" : "border-white/20 bg-night-2 hover:border-gold/60"
        }`}
      >
        <input
          type="file"
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // lets the same file be picked again after an error
          }}
        />
        {file ? (
          <>
            <p className="max-w-full font-medium [overflow-wrap:anywhere] text-bone">{file.name}</p>
            <p className="mt-1 text-sm text-muted">
              {file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`} ·{" "}
              tap to choose another
            </p>
          </>
        ) : resultName ? (
          <>
            <p className="max-w-full font-medium [overflow-wrap:anywhere] text-bone">{resultName}</p>
            <p className="mt-1 text-sm text-muted">Scored · tap to choose a different file</p>
          </>
        ) : (
          <>
            <p className="font-medium text-bone">Tap to choose a file, or drag it here</p>
            <p className="mt-1 text-sm text-muted">PDF, photo, screenshot, Excel, Word or any other file · up to 4.5 MB</p>
          </>
        )}
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          onClick={submit}
          disabled={!file || loading}
          className="pressable rounded-full bg-gold px-5 py-3 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10"
        >
          Score my scorecard
        </button>
        <button
          type="button"
          onClick={useSample}
          disabled={loading}
          className="pressable rounded-full border border-white/20 bg-transparent px-5 py-3 font-semibold text-bone/85 hover:bg-white/[0.03] disabled:opacity-50"
        >
          Try with sample scorecard
        </button>
        {loading && <Spinner label="Reading your scorecard… about 10–20 seconds." />}
      </div>

      {error && (
        <div className="mt-6 animate-enter">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {loading && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      )}

      {result && (
        <section className="mt-10">
          {result.notice && (
            <div className="mb-6 animate-enter">
              <Notice kind="info">{result.notice}</Notice>
            </div>
          )}
          <h2 className="font-serif text-3xl font-normal text-bone">Your scores</h2>
          <p className="mt-1 text-sm text-bone/70">
            Check the numbers we read. If one is wrong, tap <span className="font-semibold text-gold">Edit</span> to fix it and the
            score updates.
          </p>
          <div className="mt-4 animate-enter">
            <StatSheet metrics={result.metrics} />
          </div>
          <div className="mt-3">
            <GradeExplainer metrics={result.metrics} />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.metrics.map((m, i) => (
              <div key={m.key} className="animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
                <MetricCard metric={m} onChange={updateMetric} />
              </div>
            ))}
          </div>
          <OtherMetrics metrics={result.other_metrics} />
        </section>
      )}

      <StepNav
        next={{
          href: "/assessment/jobs",
          label: "Next",
          ready: (result !== null || savedSample) && !loading,
          hint: "Score a scorecard or try the sample to continue.",
        }}
      />
    </main>
  );
}
