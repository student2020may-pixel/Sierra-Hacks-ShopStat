"use client";

import { useEffect, useRef, useState } from "react";
import Progress from "@/components/assessment/Progress";
import StepNav from "@/components/assessment/StepNav";
import MetricTable from "@/components/MetricTable";
import Notice from "@/components/Notice";
import OtherMetrics from "@/components/OtherMetrics";
import Skeleton from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import scorecardData from "@/data/scorecard.json";
import { shrinkImage } from "@/lib/image";
import { loadCard, loadCards, programFor, programName, PROGRAMS, removeCard, saveCard, type ProgramId } from "@/lib/drp";
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
  repair_count: (scorecardData as Scorecard).repairsReviewed,
  insurer: (scorecardData as Scorecard).insurer.name,
  notice,
});

export default function ScorecardStep() {
  const [program, setProgram] = useState<ProgramId>("state-farm");
  /** Programs with a scorecard in this tab, for the check marks and the Next button. */
  const [done, setDone] = useState<Set<ProgramId>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  /** Name of the scorecard behind `result`, so it still shows after Back from step 2. */
  const [resultName, setResultName] = useState<string | null>(null);
  /** The scorecard names a different DRP's insurer than the one selected: offer to file it there. */
  const [moveTo, setMoveTo] = useState<ProgramId | null>(null);
  // Ignores responses from a request the user has since replaced (picked a new file or DRP mid-upload).
  const requestId = useRef(0);

  function restore(id: ProgramId) {
    const card = loadCard(id);
    setFile(null);
    setError(null);
    setMoveTo(null);
    setResultName(card?.file ?? null);
    // A sample from an earlier visit counts as done but isn't shown until it's loaded again.
    setResult(card && card.result.source !== "sample" ? card.result : null);
  }

  // Coming back to this step: restore the saved scorecards instead of starting over.
  useEffect(() => {
    const ids = Object.keys(loadCards()) as ProgramId[];
    setDone(new Set(ids));
    const first = ids[0] ?? "state-farm";
    setProgram(first);
    restore(first);
  }, []);

  function selectProgram(id: ProgramId) {
    requestId.current++;
    setLoading(false);
    setProgram(id);
    restore(id);
  }

  function pick(f: File | undefined) {
    if (!f) return;
    requestId.current++;
    setFile(f);
    setLoading(false);
    setError(null);
    setResult(null);
    setResultName(null);
    setMoveTo(null);
  }

  function show(id: ProgramId, data: ScoreResponse, name: string) {
    setResult(data);
    setResultName(name);
    saveCard(id, data, name);
    setDone((d) => new Set(d).add(id));
    const detected = programFor(data.insurer);
    setMoveTo(data.source === "ai" && detected && detected !== id ? detected : null);
  }

  /** Files the scorecard under the DRP its insurer belongs to. */
  function moveCard() {
    if (!moveTo || !result) return;
    saveCard(moveTo, result, resultName);
    removeCard(program);
    setDone((d) => {
      const next = new Set(d);
      next.delete(program);
      return next.add(moveTo);
    });
    setProgram(moveTo);
    setMoveTo(null);
  }

  function removeCurrent() {
    removeCard(program);
    setDone((d) => {
      const next = new Set(d);
      next.delete(program);
      return next;
    });
    restore(program);
  }

  function updateRepairCount(text: string) {
    if (!result) return;
    const n = Math.round(Number(text));
    const next = { ...result, repair_count: Number.isFinite(n) && n >= 1 && n <= 100_000 ? n : null };
    setResult(next);
    saveCard(program, next);
  }

  /** A hand correction from the metrics table: swap it in and keep it for the next steps. */
  function updateMetric(updated: Metric) {
    if (!result) return;
    const next = { ...result, metrics: result.metrics.map((m) => (m.key === updated.key ? updated : m)) };
    setResult(next);
    saveCard(program, next);
  }

  function loadSample() {
    requestId.current++;
    setFile(null);
    setLoading(false);
    setError(null);
    show(program, sampleResult("This is the sample scorecard for Valley Auto Body, a fictional shop."), "Sample scorecard");
  }

  async function submit() {
    if (!file || loading) return;
    const id = ++requestId.current;
    const target = program;
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
        show(target, { ...data, other_metrics: Array.isArray(data.other_metrics) ? data.other_metrics : [] } as ScoreResponse, file.name);
      } else {
        // The host timed out or rejected the request (e.g. an HTML 504/413 page), so keep going on the sample.
        show(target, sampleResult("Reading took too long or the server had a problem, so we're showing the sample scorecard."), "Sample scorecard");
      }
    } catch {
      if (id !== requestId.current) return;
      show(target, sampleResult("We couldn't reach the server, so we're showing the sample scorecard. Check your connection and try again."), "Sample scorecard");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={1} />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Upload your DRP scorecards</h1>
      <p className="mt-2 text-bone/70">
        One per insurer. Pick the DRP, then upload its latest scorecard in any format. Each estimate is graded against the
        scorecard of the insurer it&apos;s written for.
      </p>
      <p className="mt-2 text-sm text-muted">
        Insurers send these as a PDF or through their online portal. A photo, screenshot, spreadsheet or Word document works too.
      </p>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-bone/70">Your file:</span> sent to OpenAI (or Google Gemini as a backup) only to read the
        numbers, and not saved by ShopStats. Your results stay in this browser tab.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="DRP">
        {PROGRAMS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={program === p.id}
            onClick={() => selectProgram(p.id)}
            className={`pressable rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              program === p.id ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-bone/75 hover:border-white/30"
            }`}
          >
            {p.name}
            {done.has(p.id) && <span className="ml-1.5 text-success-soft">✓</span>}
          </button>
        ))}
      </div>

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
            <p className="mt-1 text-sm text-muted">Read · tap to choose a different file</p>
          </>
        ) : (
          <>
            <p className="font-medium text-bone">Tap to choose your {programName(program)} scorecard, or drag it here</p>
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
          Read my scorecard
        </button>
        <button
          type="button"
          onClick={loadSample}
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
          {moveTo && (
            <div className="mb-6 animate-enter">
              <Notice kind="info">
                This looks like a {programName(moveTo)} scorecard{result.insurer ? ` (${result.insurer})` : ""}.{" "}
                <button type="button" onClick={moveCard} className="pressable font-semibold text-gold underline">
                  Save it under {programName(moveTo)}
                  {done.has(moveTo) ? ", replacing the one there" : ""}
                </button>
              </Notice>
            </div>
          )}
          {result.notice && (
            <div className="mb-6 animate-enter">
              <Notice kind="info">{result.notice}</Notice>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-serif text-3xl font-normal text-bone">Your {programName(program)} scorecard</h2>
            <button type="button" onClick={removeCurrent} className="pressable text-xs text-muted underline">
              Remove
            </button>
          </div>
          <p className="mt-1 text-sm text-bone/70">
            Check the numbers we read. If one is wrong, tap <span className="font-semibold text-gold">Edit</span> to fix it.
            {result.period && <> Period: <span className="text-bone">{result.period}</span>.</>}
          </p>
          <div className="mt-4">
            <MetricTable metrics={result.metrics} onChange={updateMetric} />
          </div>
          <label className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bone/80">
            Repairs this scorecard covers
            <input
              key={result.repair_count ?? "none"}
              defaultValue={result.repair_count ?? ""}
              placeholder="e.g. 40"
              inputMode="numeric"
              onBlur={(e) => updateRepairCount(e.target.value)}
              className="w-24 rounded-md border border-white/20 bg-night px-2.5 py-1.5 text-base text-bone tabular-nums focus:border-gold focus:outline-none"
            />
            <span className="text-xs text-muted">Used to work out how much one estimate moves your averages.</span>
          </label>
          <OtherMetrics metrics={result.other_metrics} />
        </section>
      )}

      <StepNav
        next={{
          href: "/assessment/jobs",
          label: "Next",
          ready: done.size > 0 && !loading,
          hint: "Upload a scorecard or try the sample to continue.",
        }}
      />
    </main>
  );
}
