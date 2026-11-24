"use client";

import { useEffect, useRef, useState } from "react";
import KpiTable from "@/components/KpiTable";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";
import { loadCards, programFor, programName, PROGRAMS, removeCard, saveCard, slotKpis, type ProgramId, type SavedCard } from "@/lib/drp";
import { shrinkImage } from "@/lib/image";
import { KIND_LABEL, type KpiKind } from "@/lib/kpis";
import { SAMPLE } from "@/lib/sample";
import type { Kpi, ScorecardReadResponse, SlotCard } from "@/lib/types";

/** Matches the server limit; Vercel rejects bigger bodies before our code runs. */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const MAX_FILES = 10;
/** A little longer than the server's own AI timeouts. */
const CLIENT_TIMEOUT_MS = 55_000;
/** Screenshots are shrunk so several fit in one request. */
const SCREENSHOT_LIMITS = { maxDimension: 1800, resizeAbove: 500 * 1024 };

const KINDS: KpiKind[] = ["estimate", "predicted", "reference"];

const emptyCard = (): SlotCard => ({ source: "manual", insurer: null, period: null, claims: null, values: {} });

/** The sample numbers for one DRP, from the fictional sample data. */
function sampleCard(id: ProgramId): SlotCard | null {
  const ins = SAMPLE.insurers.find((i) => programFor(i.insurer) === id);
  return ins ? { source: "sample", insurer: ins.insurer, period: SAMPLE.period, claims: ins.claims, values: ins.values } : null;
}

export default function ScorecardStep() {
  const [cards, setCards] = useState<Partial<Record<ProgramId, SavedCard>>>({});
  const [selected, setSelected] = useState<ProgramId>("csaa");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The screenshots named another of the DRPs: offer to file them there instead. */
  const [otherInsurer, setOtherInsurer] = useState<{ id: ProgramId; read: ScorecardReadResponse; file: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  // Ignores responses from a request the user has since replaced.
  const requestId = useRef(0);

  // Coming back to this page: show the saved KPIs instead of starting over.
  useEffect(() => {
    const saved = loadCards();
    setCards(saved);
    setSelected((Object.keys(saved) as ProgramId[])[0] ?? "csaa");
  }, []);

  function select(id: ProgramId) {
    requestId.current++;
    setLoading(false);
    setSelected(id);
    setFiles([]);
    setError(null);
    setNotice(null);
    setOtherInsurer(null);
  }

  const saved = cards[selected];
  const card = saved?.card ?? null;

  function store(id: ProgramId, next: SlotCard, file?: string | null) {
    saveCard(id, next, file);
    setCards(loadCards());
  }

  /** Merges what was read into a slot: KPIs read replace those KPIs only; everything else is kept. */
  function merge(id: ProgramId, read: ScorecardReadResponse, file: string) {
    const base = cards[id]?.card;
    const keep = base && base.source !== "sample" ? base : emptyCard();
    store(
      id,
      {
        source: "ai",
        insurer: read.insurer ?? keep.insurer,
        period: read.period ?? keep.period,
        claims: read.claims ?? keep.claims,
        values: { ...keep.values, ...read.values },
      },
      file,
    );
    const n = Object.keys(read.values).length;
    setNotice(`Read ${n} KPI${n === 1 ? "" : "s"}${read.claims ? ` and ${read.claims} claims` : ""} into ${programName(id)}.`);
  }

  function loadSamples(why?: string) {
    requestId.current++;
    setLoading(false);
    setFiles([]);
    setError(null);
    setOtherInsurer(null);
    for (const p of PROGRAMS) {
      const c = sampleCard(p.id);
      if (c) saveCard(p.id, c, "Sample numbers");
    }
    setCards(loadCards());
    setNotice(why ?? "These are sample numbers for a fictional shop, not real insurer data.");
  }

  async function read() {
    if (!files.length || loading) return;
    const id = ++requestId.current;
    const slot = selected;
    setLoading(true);
    setError(null);
    setNotice(null);
    setOtherInsurer(null);
    try {
      const shrunk = await Promise.all(files.map((f) => shrinkImage(f, SCREENSHOT_LIMITS)));
      if (shrunk.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES) {
        setError("Those files are over 4.5 MB together. Try fewer screenshots at a time.");
        return;
      }
      const body = new FormData();
      shrunk.forEach((f) => body.append("files", f));
      const res = await fetch("/api/score", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
      const data = (await res.json().catch(() => null)) as (ScorecardReadResponse & { error?: string }) | null;
      if (id !== requestId.current) return;
      const name = files.length === 1 ? files[0].name : `${files.length} files`;
      if (res.status === 400 && data?.error) {
        setError(data.error);
      } else if (res.ok && data?.source === "ai") {
        const detected = programFor(data.insurer);
        if (detected && detected !== slot) setOtherInsurer({ id: detected, read: data, file: name });
        else merge(slot, data, name);
        setFiles([]);
      } else {
        loadSamples(data?.notice ?? "Reading took too long or the server had a problem, so we're showing sample numbers.");
      }
    } catch {
      if (id === requestId.current) loadSamples("We couldn't reach the server, so we're showing sample numbers. Check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  /** A typed value or correction from the table. Clearing both numbers makes the KPI inactive again. */
  function updateKpi(k: Kpi) {
    const base = card ?? emptyCard();
    const values = { ...base.values };
    if (k.value === null && k.target === null) delete values[k.id];
    else values[k.id] = { value: k.value, target: k.target, edited: true };
    store(selected, { ...base, source: base.source === "sample" ? "manual" : base.source, values });
  }

  function updateClaims(text: string) {
    const n = Math.round(Number(text));
    const base = card ?? emptyCard();
    store(selected, { ...base, claims: text.trim() && Number.isFinite(n) && n >= 1 && n <= 100_000 ? n : null });
  }

  const kpis = slotKpis(card);
  const activeCount = kpis.filter((k) => k.value !== null || k.target !== null).length;

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8 pb-24">
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Your DRP KPIs</h1>
      <p className="mt-2 text-bone/70">
        Pick an insurer, then upload screenshots from its CCC dashboard: the main view and the hover boxes that show each KPI&apos;s
        value and target. Or type the numbers in. KPIs left blank count as inactive for that insurer.
      </p>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-bone/70">Your files:</span> sent to OpenAI (or Google Gemini as a backup) only to read the
        numbers, and not saved by ShopStats. Your numbers stay in this browser tab.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="DRP">
        {PROGRAMS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={selected === p.id}
            onClick={() => select(p.id)}
            className={`pressable rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              selected === p.id ? "border-gold bg-gold/15 text-gold" : "border-white/15 text-bone/75 hover:border-white/30"
            }`}
          >
            {p.name}
            {cards[p.id] && <span className="ml-1.5 text-success-soft">✓</span>}
          </button>
        ))}
      </div>

      <label className="pressable mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-night-2 px-4 py-8 text-center hover:border-gold/60">
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
            if (picked.length) {
              requestId.current++;
              setLoading(false);
              setFiles(picked);
              setError(null);
              setNotice(null);
              setOtherInsurer(null);
            }
            e.target.value = "";
          }}
        />
        <p className="max-w-full font-medium [overflow-wrap:anywhere] text-bone">
          {files.length ? files.map((f) => f.name).join(", ") : `Tap to choose ${programName(selected)} screenshots or files`}
        </p>
        <p className="mt-1 text-sm text-muted">
          {files.length ? "Tap to choose different ones" : `Up to ${MAX_FILES} at once · numbers read are added to ${programName(selected)}, nothing else changes`}
        </p>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          onClick={read}
          disabled={!files.length || loading}
          className="pressable rounded-full bg-gold px-5 py-3 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
        >
          Read into {programName(selected)}
        </button>
        <button
          type="button"
          onClick={() => loadSamples()}
          disabled={loading}
          className="pressable rounded-full border border-white/20 bg-transparent px-5 py-3 font-semibold text-bone/85 hover:bg-white/[0.03] disabled:opacity-50"
        >
          Try with sample numbers
        </button>
        {loading && <Spinner label="Reading the KPIs… about 10–30 seconds." />}
      </div>

      {error && (
        <div className="mt-6 animate-enter">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      {notice && (
        <div className="mt-6 animate-enter">
          <Notice kind="info">{notice}</Notice>
        </div>
      )}
      {otherInsurer && (
        <div className="mt-6 animate-enter">
          <Notice kind="info">
            These screenshots are for {otherInsurer.read.insurer ?? programName(otherInsurer.id)}, not {programName(selected)}.{" "}
            <button
              type="button"
              onClick={() => {
                merge(otherInsurer.id, otherInsurer.read, otherInsurer.file);
                setSelected(otherInsurer.id);
                setOtherInsurer(null);
              }}
              className="pressable font-semibold text-gold underline"
            >
              Add them to {programName(otherInsurer.id)}
            </button>{" "}
            or{" "}
            <button
              type="button"
              onClick={() => {
                merge(selected, otherInsurer.read, otherInsurer.file);
                setOtherInsurer(null);
              }}
              className="pressable font-semibold text-bone/80 underline"
            >
              keep them in {programName(selected)}
            </button>
          </Notice>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 className="font-serif text-3xl font-normal text-bone">{programName(selected)} KPIs</h2>
          {card && (
            <button
              type="button"
              onClick={() => {
                removeCard(selected);
                setCards(loadCards());
              }}
              className="pressable text-xs text-muted underline"
            >
              Clear {programName(selected)}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-bone/70">
          {card
            ? [card.source === "sample" ? "Sample numbers" : card.insurer && `As read: ${card.insurer}`, card.period, saved?.file && card.source !== "sample" && `from ${saved.file}`]
                .filter(Boolean)
                .join(" · ") || "Typed in"
            : "Nothing yet."}{" "}
          {activeCount} of {kpis.length} KPIs active.
        </p>

        <label className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bone/80">
          {programName(selected)} claims this period
          <input
            key={`${selected}-${card?.claims ?? "none"}`}
            defaultValue={card?.claims ?? ""}
            placeholder="e.g. 45"
            inputMode="numeric"
            onBlur={(e) => updateClaims(e.target.value)}
            className="w-24 rounded-md border border-white/20 bg-night px-2.5 py-1.5 text-base text-bone tabular-nums focus:border-gold focus:outline-none"
          />
          <span className="text-xs text-muted">The # Claims on the dashboard. Used to work out how much one estimate moves the averages.</span>
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm text-bone/80">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" />
          Show inactive KPIs too, to add numbers by hand
        </label>

        {KINDS.map((kind) => {
          const rows = kpis.filter((k) => k.kind === kind && (showInactive || k.value !== null || k.target !== null));
          if (!rows.length) return null;
          return (
            <div key={kind} className="mt-6">
              <h3 className="text-sm font-semibold text-bone">{KIND_LABEL[kind]}</h3>
              <div className="mt-2">
                <KpiTable kpis={rows} onChange={updateKpi} />
              </div>
            </div>
          );
        })}
        {activeCount === 0 && !showInactive && (
          <p className="mt-4 text-sm text-muted">No {programName(selected)} numbers yet. Upload screenshots above, or tick the box to type them in.</p>
        )}
      </section>

    </main>
  );
}
