"use client";

import { useEffect, useRef, useState } from "react";
import Progress from "@/components/assessment/Progress";
import StepNav from "@/components/assessment/StepNav";
import KpiTable from "@/components/KpiTable";
import Notice from "@/components/Notice";
import Skeleton from "@/components/Skeleton";
import Spinner from "@/components/Spinner";
import sample from "@/data/sample-scorecards.json";
import { loadCards, programFor, programName, PROGRAMS, removeCard, saveCard, type ProgramId, type SavedCard } from "@/lib/drp";
import { shrinkImage } from "@/lib/image";
import type { InsurerScorecard, Kpi, ScorecardsResponse, SlotCard } from "@/lib/types";

/** Matches the server limit; Vercel rejects bigger bodies before our code runs. */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
/** A little longer than the server's own AI timeouts. */
const CLIENT_TIMEOUT_MS = 55_000;

const SAMPLE_SCORECARDS = sample.scorecards as InsurerScorecard[];

/** What the last read did: which slots it filled, and sections for insurers without a slot. */
interface ReadSummary {
  filed: ProgramId[];
  unmatched: InsurerScorecard[];
  source: SlotCard["source"];
  file: string;
  notice?: string;
}

export default function ScorecardStep() {
  const [cards, setCards] = useState<Partial<Record<ProgramId, SavedCard>>>({});
  const [selected, setSelected] = useState<ProgramId>("csaa");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReadSummary | null>(null);
  /** Sample scorecards from an earlier visit count as done, but their tables show only once the sample is loaded again. */
  const [revealed, setRevealed] = useState(false);
  // Ignores responses from a request the user has since replaced (picked a new file mid-upload).
  const requestId = useRef(0);

  // Coming back to this step: show the saved scorecards instead of starting over.
  useEffect(() => {
    const saved = loadCards();
    setCards(saved);
    setSelected((Object.keys(saved) as ProgramId[])[0] ?? "csaa");
  }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    requestId.current++;
    setFile(f);
    setLoading(false);
    setError(null);
    setSummary(null);
  }

  /** Files each insurer's section into its DRP slot; sections for other insurers wait to be placed. */
  function fileSections(sections: InsurerScorecard[], source: SlotCard["source"], name: string, notice?: string) {
    const filed: ProgramId[] = [];
    const unmatched: InsurerScorecard[] = [];
    for (const section of sections) {
      const id = programFor(section.insurer);
      if (id) {
        saveCard(id, { ...section, source }, name);
        filed.push(id);
      } else {
        unmatched.push(section);
      }
    }
    setCards(loadCards());
    setRevealed(true);
    setSummary({ filed, unmatched, source, file: name, notice });
    if (filed.length) setSelected(filed[0]);
  }

  function fileUnmatched(index: number, id: ProgramId) {
    if (!summary) return;
    const section = summary.unmatched[index];
    saveCard(id, { ...section, insurer: section.insurer ?? programName(id), source: summary.source }, summary.file);
    setCards(loadCards());
    setSummary({ ...summary, filed: [...summary.filed, id], unmatched: summary.unmatched.filter((_, i) => i !== index) });
    setSelected(id);
  }

  function loadSample(notice = "These are sample scorecards for a fictional shop, not real insurer numbers.") {
    requestId.current++;
    setFile(null);
    setLoading(false);
    setError(null);
    fileSections(SAMPLE_SCORECARDS, "sample", "Sample scorecards", notice);
  }

  async function submit() {
    if (!file || loading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const upload = await shrinkImage(file);
      if (upload.size > MAX_UPLOAD_BYTES) {
        setError("That file is over 4.5 MB. Try a screenshot of the scorecard or a smaller PDF.");
        return;
      }
      const body = new FormData();
      body.append("file", upload);
      const res = await fetch("/api/score", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
      const data = (await res.json().catch(() => null)) as (ScorecardsResponse & { error?: string }) | null;
      if (id !== requestId.current) return;
      if (res.status === 400 && data?.error) {
        setError(data.error); // Something the user can fix, like the wrong file type.
      } else if (res.ok && Array.isArray(data?.scorecards)) {
        fileSections(data.scorecards, data.source, data.source === "ai" ? file.name : "Sample scorecards", data.notice);
      } else {
        // The host timed out or rejected the request (e.g. an HTML 504/413 page), so keep going on the sample.
        loadSample("Reading took too long or the server had a problem, so we're showing the sample scorecards.");
      }
    } catch {
      if (id === requestId.current) loadSample("We couldn't reach the server, so we're showing the sample scorecards. Check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  const saved = cards[selected];
  const card = saved && (saved.card.source !== "sample" || revealed) ? saved.card : null;

  function update(next: SlotCard) {
    saveCard(selected, next);
    setCards(loadCards());
  }

  /** A hand correction from the KPI table: swap it in and keep it for the next steps. */
  function updateKpi(index: number, kpi: Kpi) {
    if (card) update({ ...card, kpis: card.kpis.map((k, i) => (i === index ? kpi : k)) });
  }

  function updateRepairCount(text: string) {
    if (!card) return;
    const n = Math.round(Number(text));
    update({ ...card, repair_count: Number.isFinite(n) && n >= 1 && n <= 100_000 ? n : null });
  }

  function removeSelected() {
    removeCard(selected);
    setCards(loadCards());
  }

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={1} />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Upload your DRP scorecards</h1>
      <p className="mt-2 text-bone/70">
        Upload your scorecard document in any format. If it covers several insurers, each insurer&apos;s section is filed into
        its own slot, with that insurer&apos;s own KPIs and targets.
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
        className={`pressable mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center active:scale-[0.99] ${
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
        <p className="max-w-full font-medium [overflow-wrap:anywhere] text-bone">{file ? file.name : "Tap to choose your scorecard document, or drag it here"}</p>
        <p className="mt-1 text-sm text-muted">
          {file ? "Tap to choose another" : "One file for all your DRPs, or one per insurer · PDF, photo, screenshot, Excel or Word · up to 4.5 MB"}
        </p>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          onClick={submit}
          disabled={!file || loading}
          className="pressable rounded-full bg-gold px-5 py-3 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
        >
          Read scorecards
        </button>
        <button
          type="button"
          onClick={() => loadSample()}
          disabled={loading}
          className="pressable rounded-full border border-white/20 bg-transparent px-5 py-3 font-semibold text-bone/85 hover:bg-white/[0.03] disabled:opacity-50"
        >
          Try with sample scorecards
        </button>
        {loading && <Spinner label="Reading every insurer's KPIs… about 10–30 seconds." />}
      </div>

      {error && (
        <div className="mt-6 animate-enter">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {summary && (
        <div className="mt-6 space-y-3 animate-enter">
          {summary.notice && <Notice kind="info">{summary.notice}</Notice>}
          {summary.filed.length > 0 && (
            <p className="text-sm text-bone/80">
              Filed {summary.filed.length === 1 ? "1 insurer" : `${summary.filed.length} insurers`}:{" "}
              <span className="text-bone">{summary.filed.map(programName).join(", ")}</span>.
            </p>
          )}
          {summary.unmatched.map((section, i) => (
            <UnmatchedSection key={`${section.insurer}-${i}`} section={section} onFile={(id) => fileUnmatched(i, id)} />
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-10 space-y-3" aria-hidden>
          <Skeleton className="h-10" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && (
        <section className="mt-10">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="DRP">
            {PROGRAMS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selected === p.id}
                onClick={() => setSelected(p.id)}
                className={`pressable rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  selected === p.id ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-bone/75 hover:border-white/30"
                }`}
              >
                {p.name}
                {cards[p.id] && <span className="ml-1.5 text-success-soft">✓</span>}
              </button>
            ))}
          </div>

          {card ? (
            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-serif text-3xl font-normal text-bone">{programName(selected)} KPIs</h2>
                <button type="button" onClick={removeSelected} className="pressable text-xs text-muted underline">
                  Remove
                </button>
              </div>
              <p className="mt-1 text-sm text-bone/70">
                {[card.insurer && `As printed: ${card.insurer}`, card.period, saved?.file && `from ${saved.file}`].filter(Boolean).join(" · ")}. If a
                number is wrong, tap <span className="font-semibold text-gold">Edit</span>.
              </p>
              <div className="mt-4">
                <KpiTable kpis={card.kpis} onChange={updateKpi} />
              </div>
              <label className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bone/80">
                {programName(selected)} repairs this scorecard covers
                <input
                  key={`${selected}-${card.repair_count ?? "none"}`}
                  defaultValue={card.repair_count ?? ""}
                  placeholder="e.g. 40"
                  inputMode="numeric"
                  onBlur={(e) => updateRepairCount(e.target.value)}
                  className="w-24 rounded-md border border-white/20 bg-night px-2.5 py-1.5 text-base text-bone tabular-nums focus:border-gold focus:outline-none"
                />
                <span className="text-xs text-muted">Used to work out how much one estimate moves these averages.</span>
              </label>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">
              {saved
                ? `A sample ${programName(selected)} scorecard is saved here. Load the sample again to see it.`
                : `No ${programName(selected)} scorecard yet. Upload a document that includes ${programName(selected)}.`}
            </p>
          )}
        </section>
      )}

      <StepNav
        next={{
          href: "/assessment/jobs",
          label: "Next",
          ready: Object.keys(cards).length > 0 && !loading,
          hint: "Upload a scorecard or try the sample to continue.",
        }}
      />
    </main>
  );
}

/** A section for an insurer that isn't one of the four DRPs: file it under one, or leave it out. */
function UnmatchedSection({ section, onFile }: { section: InsurerScorecard; onFile: (id: ProgramId) => void }) {
  const [target, setTarget] = useState<ProgramId>("csaa");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-night-2 px-4 py-3 text-sm">
      <span className="text-bone/80">
        <span className="font-semibold [overflow-wrap:anywhere] text-bone">{section.insurer ?? "A section with no insurer name"}</span> (
        {section.kpis.length} KPI{section.kpis.length === 1 ? "" : "s"}) isn&apos;t one of your DRPs. File it under
      </span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value as ProgramId)}
        className="rounded-md border border-white/20 bg-night px-2 py-1 text-base text-bone focus:border-gold focus:outline-none"
      >
        {PROGRAMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onFile(target)} className="pressable font-semibold text-gold underline">
        File it
      </button>
    </div>
  );
}
