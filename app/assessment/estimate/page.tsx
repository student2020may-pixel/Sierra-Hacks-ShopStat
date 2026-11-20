"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Progress from "@/components/assessment/Progress";
import StepNav from "@/components/assessment/StepNav";
import Notice from "@/components/Notice";
import Spinner from "@/components/Spinner";
import sampleEstimate from "@/data/sample-estimate.json";
import type { AnomalyResult } from "@/lib/anomaly";
import { formatValue } from "@/lib/format";
import { shrinkImage } from "@/lib/image";
import { DEFAULT_REPAIR_COUNT, estimateImpact, photoGrade, type Impact, type KpiImpact } from "@/lib/impact";
import { STATUS_STYLES } from "@/lib/status";
import { loadCards, programFor, programName, PROGRAMS, type ProgramId, type SavedCard } from "@/lib/drp";
import { isJobsResult, JOBS_KEY, loadValid } from "@/lib/storage";
import type { Estimate, EstimateResponse, PhotoFinding, PhotoReview } from "@/lib/types";

const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const CLIENT_TIMEOUT_MS = 55_000;
const MAX_PHOTOS = 8;
/** Damage photos are shrunk harder than documents so several fit in one request with the estimate. */
const PHOTO_LIMITS = { maxDimension: 1600, resizeAbove: 400 * 1024 };

const FINDING_GROUPS: { kind: PhotoFinding["kind"]; title: string; empty: string }[] = [
  { kind: "missing", title: "Missing from the estimate", empty: "Nothing visible in the photos is missing." },
  { kind: "unsupported", title: "No visible damage for", empty: "Every line has visible damage to back it up, where the photos show it." },
  { kind: "repair_or_replace", title: "Repair or replace?", empty: "The repair and replace calls match the photos." },
];

const SEVERITY_STYLE: Record<PhotoFinding["severity"], string> = {
  high: "bg-danger/15 text-danger-soft",
  medium: "bg-warning/15 text-warning",
  low: "bg-white/10 text-bone/70",
};

/** Numbered thumbnails, so findings can point at "Photo 3". */
function PhotoStrip({ urls, onRemove }: { urls: string[]; onRemove?: (i: number) => void }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <li key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-night-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs */}
          <img src={url} alt={`Damage photo ${i + 1}`} className="h-full w-full object-cover" />
          <span className="absolute bottom-1 left-1 rounded bg-night/80 px-1.5 text-xs font-semibold text-bone">{i + 1}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="pressable absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-night/80 text-sm text-bone"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function PhotoCheck({ review, urls }: { review: PhotoReview; urls: string[] }) {
  const graded = photoGrade(review);
  return (
    <div>
      <h2 className="font-serif text-2xl text-bone">Photo check</h2>
      {!graded ? (
        <p className="mt-2 text-sm text-bone/70">
          The photos don&apos;t clearly show the damaged area, so there was nothing to compare. Try closer, well-lit photos of the damage.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[11px] tracking-[0.15em] text-muted uppercase">Photo accuracy</p>
              <p className={`mt-1 font-serif text-5xl leading-none ${GRADE_COLOR[graded.grade]}`} aria-label={`Photo accuracy grade ${graded.grade}`}>
                {graded.grade}
              </p>
            </div>
            <p className="text-sm text-bone/70">
              {review.findings.length === 0
                ? `The estimate matches what ${review.photoCount === 1 ? "the photo shows" : `the ${review.photoCount} photos show`}.`
                : `${review.findings.length} thing${review.findings.length === 1 ? "" : "s"} to check against ${review.photoCount === 1 ? "the photo" : `the ${review.photoCount} photos`}.`}
            </p>
          </div>
          {urls.length > 0 && (
            <div className="mt-4">
              <PhotoStrip urls={urls} />
            </div>
          )}
          <div className="mt-4 space-y-4">
            {FINDING_GROUPS.map((g) => {
              const items = review.findings.filter((f) => f.kind === g.kind);
              return (
                <div key={g.kind}>
                  <h3 className="text-sm font-semibold text-bone">{g.title}</h3>
                  {items.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">{g.empty}</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {items.map((f, i) => (
                        <li key={`${f.item}-${i}`} className="rounded-xl border border-line bg-night-2 p-3 text-sm">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold [overflow-wrap:anywhere] text-bone">{f.item}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLE[f.severity]}`}>{f.severity}</span>
                            {f.photo !== null && <span className="text-xs text-muted">Photo {f.photo}</span>}
                          </p>
                          <p className="mt-1 leading-relaxed text-bone/75">{f.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">The AI only judges what the photos show. Damage hidden behind panels still needs a teardown.</p>
        </>
      )}
    </div>
  );
}

const GRADE_COLOR: Record<Impact["grade"], string> = {
  A: "text-success-soft",
  B: "text-success-soft",
  C: "text-warning",
  D: "text-danger-soft",
  F: "text-danger-soft",
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** One job barely moves an average over many repairs, so the change gets more precision than the values. */
function formatDelta(delta: number, unit: KpiImpact["unit"]): string {
  if (Math.abs(delta) < 0.005) return "no change";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (unit === "$") return `${sign}$${abs < 1 ? abs.toFixed(2) : Math.round(abs).toLocaleString("en-US")}`;
  if (unit === "days") return `${sign}${abs.toFixed(2)} days`;
  if (unit === "hours") return `${sign}${abs.toFixed(2)} hrs`;
  if (unit === "%") return `${sign}${abs.toFixed(2)} pts`;
  return `${sign}${abs.toFixed(2)}`;
}

function ImpactRow({ m }: { m: KpiImpact }) {
  const changed = m.statusAfter !== m.statusBefore;
  const color = m.direction === "worse" ? "text-danger-soft" : m.direction === "better" ? "text-success-soft" : "text-bone/70";
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <span className="font-medium text-bone">{m.label}</span>
        {/* Phones: the target sits under the name instead of in its own column. */}
        <span className="mt-0.5 block text-xs text-muted sm:hidden">Target {formatValue(m.target, m.unit)}</span>
        {changed && (
          <span className="mt-1 block text-xs text-warning">
            {STATUS_STYLES[m.statusBefore].label} → {STATUS_STYLES[m.statusAfter].label}
          </span>
        )}
      </td>
      <td className="hidden px-3 py-3 text-right whitespace-nowrap text-bone/70 tabular-nums sm:table-cell">
        {m.jobValue === null ? "—" : formatValue(m.jobValue, m.unit)}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
        <span className="text-bone/70">{formatValue(m.before, m.unit)}</span>
        <span className="text-muted"> → </span>
        <span className="font-semibold text-bone">{formatValue(m.after, m.unit)}</span>
        <span className={`block text-xs ${color}`}>{m.jobValue === null ? "not affected" : formatDelta(m.after - m.before, m.unit)}</span>
      </td>
      <td className="hidden px-4 py-3 text-right whitespace-nowrap text-bone/70 tabular-nums sm:table-cell">{formatValue(m.target, m.unit)}</td>
    </tr>
  );
}

export default function EstimateStep() {
  /** Scorecards by DRP from step 1; undefined until read from storage. */
  const [cards, setCards] = useState<Partial<Record<ProgramId, SavedCard>> | undefined>(undefined);
  /** The DRP picked by hand; otherwise the estimate's insurer decides. */
  const [chosen, setChosen] = useState<ProgramId | null>(null);
  const [history, setHistory] = useState<AnomalyResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ data: Estimate; name: string; notice?: string; photoReview?: PhotoReview; photoUrls: string[] } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const requestId = useRef(0);

  // Previews for the picked photos; the old ones are released when the list changes.
  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p));
    setPhotoUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (picked.length < list.length) setError("Only photos can be added as damage photos.");
    else setError(null);
    requestId.current++;
    setLoading(false);
    setEstimate(null);
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  }

  function removePhoto(i: number) {
    requestId.current++;
    setLoading(false);
    setEstimate(null);
    setPhotos((prev) => prev.filter((_, j) => j !== i));
  }

  // Steps 1 and 2 left their results in this tab. The estimate itself is never saved.
  useEffect(() => {
    setCards(loadCards());
    setHistory(loadValid(JOBS_KEY, isJobsResult) as AnomalyResult | null);
  }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    requestId.current++;
    setFile(f);
    setLoading(false);
    setError(null);
    setEstimate(null);
    setChosen(null);
  }

  function loadSample(notice?: string) {
    requestId.current++;
    setFile(null);
    setLoading(false);
    setError(null);
    setChosen(null);
    setEstimate({ data: sampleEstimate as Estimate, name: "Sample estimate", notice: notice ?? "This is a sample estimate for a fictional car.", photoUrls: [] });
  }

  async function submit() {
    if (!file || loading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setEstimate(null);
    try {
      const upload = await shrinkImage(file);
      const shrunk = await Promise.all(photos.map((p) => shrinkImage(p, PHOTO_LIMITS)));
      if (upload.size + shrunk.reduce((n, p) => n + p.size, 0) > MAX_UPLOAD_BYTES) {
        setError(photos.length ? "The estimate and photos together are over 4.5 MB. Try fewer photos." : "That file is over 4.5 MB. Try a screenshot of the estimate or a smaller file.");
        return;
      }
      const body = new FormData();
      body.append("file", upload);
      shrunk.forEach((p) => body.append("photos", p));
      const res = await fetch("/api/estimate", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
      const data = (await res.json().catch(() => null)) as (EstimateResponse & { error?: string }) | null;
      if (id !== requestId.current) return;
      if (res.status === 400 && data?.error) setError(data.error);
      else if (res.ok && data?.estimate)
        setEstimate({
          data: data.estimate,
          name: data.source === "ai" ? file.name : "Sample estimate",
          notice: data.notice,
          photoReview: data.photoReview,
          photoUrls,
        });
      else loadSample("Reading the estimate took too long or the server had a problem, so we're showing the sample estimate.");
    } catch {
      if (id === requestId.current) loadSample("We couldn't reach the server, so we're showing the sample estimate. Check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  if (cards === undefined) return <main className="px-safe mx-auto max-w-5xl pt-8" />;

  const available = PROGRAMS.filter((p) => cards[p.id]).map((p) => p.id);
  // Grade against the DRP the estimate is written for, when step 1 has that scorecard.
  const estimateProgram = programFor(estimate?.data.insurer);
  const program = (chosen && cards[chosen] ? chosen : null) ?? (estimateProgram && cards[estimateProgram] ? estimateProgram : null) ?? available[0] ?? null;
  const score = program ? cards[program]!.card : null;
  const repairCount = score?.repair_count ?? DEFAULT_REPAIR_COUNT;
  const impact = score && estimate ? estimateImpact(score.kpis, estimate.data, history, repairCount, estimate.photoReview) : null;
  const e = estimate?.data;
  const oem = e?.parts.filter((p) => p.type === "oem").length ?? 0;
  const alt = e?.parts.filter((p) => p.type !== "oem" && p.type !== "unknown").length ?? 0;

  return (
    <main className="px-safe mx-auto max-w-5xl pt-8">
      <Progress step={3} />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-bone sm:text-5xl">Grade an estimate</h1>
      <p className="mt-2 text-bone/70">Upload any repair estimate to see how it would move your scorecard.</p>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-bone/70">Your file:</span> sent to OpenAI (or Google Gemini as a backup) only to read
        the repair lines. Customer details are ignored, and the estimate isn&apos;t saved anywhere.
      </p>

      {!score ? (
        <div className="mt-6">
          <Notice kind="info">
            Upload at least one DRP scorecard first, so there&apos;s something to grade against.{" "}
            <Link href="/assessment/scorecard" className="font-semibold text-gold underline">
              Go to step 1
            </Link>
          </Notice>
        </div>
      ) : (
        <>
          {!history && (
            <p className="mt-3 text-sm text-muted">
              Days in the shop are estimated from general rules.{" "}
              <Link href="/assessment/jobs" className="text-gold underline">
                Add your last cars
              </Link>{" "}
              to base them on your shop.
            </p>
          )}

          <label
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={(ev) => {
              ev.preventDefault();
              pick(ev.dataTransfer.files[0]);
            }}
            className="pressable mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-night-2 px-4 py-10 text-center hover:border-gold/60"
          >
            <input
              type="file"
              className="sr-only"
              onChange={(ev) => {
                pick(ev.target.files?.[0]);
                ev.target.value = "";
              }}
            />
            <p className="max-w-full font-medium [overflow-wrap:anywhere] text-bone">{file ? file.name : "Tap to choose an estimate, or drag it here"}</p>
            <p className="mt-1 text-sm text-muted">{file ? "Tap to choose another" : "CCC, Mitchell or Audatex PDF, a photo or a screenshot · up to 4.5 MB"}</p>
          </label>

          <div className="mt-4 rounded-xl border border-line bg-night-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-bone">Damage photos (optional)</p>
                <p className="text-sm text-muted">Add up to {MAX_PHOTOS} photos of the damage to check the estimate against them.</p>
              </div>
              <label
                className={`pressable cursor-pointer rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-bone/85 hover:bg-white/[0.03] ${photos.length >= MAX_PHOTOS ? "pointer-events-none opacity-50" : ""}`}
              >
                Add photos
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  disabled={photos.length >= MAX_PHOTOS}
                  className="sr-only"
                  onChange={(ev) => {
                    addPhotos(ev.target.files);
                    ev.target.value = "";
                  }}
                />
              </label>
            </div>
            {photos.length > 0 && (
              <div className="mt-3">
                <PhotoStrip urls={photoUrls} onRemove={removePhoto} />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              onClick={submit}
              disabled={!file || loading}
              className="pressable rounded-full bg-gold px-5 py-3 font-semibold text-night hover:bg-bone disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
            >
              {photos.length ? "Grade this estimate with photos" : "Grade this estimate"}
            </button>
            <button
              type="button"
              onClick={() => loadSample()}
              disabled={loading}
              className="pressable rounded-full border border-white/20 px-5 py-3 font-semibold text-bone/85 hover:bg-white/[0.03] disabled:opacity-50"
            >
              Try with sample estimate
            </button>
            {loading && <Spinner label="Reading the estimate… about 10–30 seconds." />}
          </div>

          {error && (
            <div className="mt-6">
              <Notice kind="error">{error}</Notice>
            </div>
          )}

          {impact && e && estimate && (
            <section className="mt-10 space-y-6">
              {estimate.notice && <Notice kind="info">{estimate.notice}</Notice>}
              {e.insurer && estimateProgram !== program && (
                <Notice kind="info">
                  This estimate is for {e.insurer}, but step 1 doesn&apos;t have {estimateProgram ? `a ${programName(estimateProgram)}` : "that insurer's"} scorecard, so
                  it&apos;s graded against {programName(program!)}.{" "}
                  <Link href="/assessment/scorecard" className="font-semibold text-gold underline">
                    Add the scorecard
                  </Link>
                </Notice>
              )}

              <label className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bone/80">
                Graded against your
                <select
                  value={program!}
                  onChange={(ev) => setChosen(ev.target.value as ProgramId)}
                  className="rounded-md border border-white/20 bg-night px-2.5 py-1.5 text-base text-bone focus:border-gold focus:outline-none"
                >
                  {available.map((id) => (
                    <option key={id} value={id}>
                      {programName(id)}
                    </option>
                  ))}
                </select>
                DRP scorecard
              </label>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-night-2 p-5">
                <div className="text-center">
                  <p className="text-[11px] tracking-[0.15em] text-muted uppercase">KPI grade</p>
                  <p className={`mt-1 font-serif text-6xl leading-none ${GRADE_COLOR[impact.grade]}`} aria-label={`Grade ${impact.grade}`}>
                    {impact.grade}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-medium [overflow-wrap:anywhere] text-bone">
                    {e.vehicle ?? estimate.name}
                    {e.total !== null && <span className="text-bone/70"> · {formatValue(e.total, "$")}</span>}
                  </p>
                  <p className="mt-1 text-sm text-bone/70">
                    {impact.checked
                      ? `${impact.meets} of ${impact.checked} of this job's numbers meet ${programName(program!)}'s targets.`
                      : "This estimate didn't have enough numbers to grade."}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-2xl text-bone">Effect on your {programName(program!)} scorecard</h2>
                <p className="mt-1 text-sm text-muted">
                  Your averages now, and with this job added, across {repairCount.toLocaleString("en-US")} repairs
                  {score.repair_count ? "" : " (a typical count; enter yours in step 1)"}.
                </p>
                <div className="mt-3 overflow-hidden rounded-xl border border-line bg-night-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted uppercase">
                        <th className="px-4 py-2.5 font-semibold">KPI</th>
                        <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">This job</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Now → after</th>
                        <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impact.kpis.map((m, i) => (
                        <ImpactRow key={`${m.label}-${i}`} m={m} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-2xl text-bone">What we read</h2>
                <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  {[
                    ["Labor hours", impact.job.laborHours === null ? "Not shown" : `${impact.job.laborHours.toFixed(1)} hrs`],
                    ["Parts", `${e.parts.length} (${oem} OEM, ${alt} alternate)`],
                    ["Sublets", e.sublets.length ? e.sublets.map((s) => s.description).join(", ") : "None"],
                    [
                      "Days in the shop",
                      impact.job.days === null ? "Can't tell" : `About ${impact.job.days} (${impact.job.daysFromHistory ? "from your last cars" : "general estimate"})`,
                    ],
                    ["Chance of a supplement", pct(impact.job.supplementChance)],
                    ["Chance of a late delivery", pct(impact.job.lateChance)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right [overflow-wrap:anywhere] text-bone">{v}</dd>
                    </div>
                  ))}
                </dl>
                {e.hiddenDamageSigns.length > 0 && <p className="mt-3 text-sm text-bone/70">Possible hidden damage: {e.hiddenDamageSigns.join("; ")}.</p>}
              </div>

              {estimate.photoReview && <PhotoCheck review={estimate.photoReview} urls={estimate.photoUrls} />}

              {impact.suggestions.length > 0 && (
                <div>
                  <h2 className="font-serif text-2xl text-bone">Ways to protect your score</h2>
                  <ul className="mt-3 space-y-3">
                    {impact.suggestions.map((s) => (
                      <li key={s.title} className="rounded-xl border border-line bg-night-2 p-4 text-sm">
                        <p className="font-semibold text-bone">{s.title}</p>
                        <p className="mt-1 leading-relaxed text-bone/75">{s.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted">
                Days, supplement and late-delivery chances are predictions, not guarantees. Repair cost and parts mix come straight
                from the estimate.
              </p>
            </section>
          )}
        </>
      )}

      <StepNav back="/assessment/jobs" />
    </main>
  );
}
