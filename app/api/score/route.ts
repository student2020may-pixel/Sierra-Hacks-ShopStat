import { NextResponse } from "next/server";
import sample from "@/data/sample-scorecards.json";
import { aiConfigured, aiJson } from "@/lib/ai";
import { readUpload, withContents } from "@/lib/fileinput";
import { KPI_MEASURES, KPI_UNITS, ScorecardsOutputSchema } from "@/lib/schemas";
import { plausible } from "@/lib/scoring";
import { clip } from "@/lib/text";
import type { InsurerScorecard, Kpi, ScorecardsResponse } from "@/lib/types";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over ~4.5 MB before this code runs; the upload page shrinks photos first.
const MAX_BYTES = 4.5 * 1024 * 1024;
/** Enough for any real DRP document, small enough that a misread can't flood the page. */
const MAX_INSURERS = 8;
const MAX_KPIS = 20;

const SYSTEM_PROMPT = `You read DRP scorecards and performance reports for an auto body shop. One document often covers several insurers, each in its own section, table, page or column. Return one entry in "scorecards" per insurer.

Never mix insurers: each insurer's numbers come only from its own section. If the document covers a single insurer, return one entry.

For each insurer:
- insurer: the insurance company as printed (e.g. "GEICO", "Farmers Insurance", "CSAA"), or null if the document doesn't say.
- period: the reporting period as printed, or null.
- repair_count: how many repairs (claims, ROs, vehicles) this insurer's numbers cover, or null if not shown.
- kpis: every performance KPI this insurer measures for the shop, in the order shown. Include quality, re-inspection, CSI and any other KPI, not only common ones. For each:
  - label: the KPI's name exactly as printed.
  - value: the shop's number, as a plain number (33% → 33, $3,410 → 3410), or null if not shown.
  - target: the insurer's target, goal or benchmark for it, or null if none is shown.
  - unit: one of ${KPI_UNITS.map((u) => `"${u}"`).join(", ")}. Use "/100" for scores out of 100, and "number" for anything else (ratings, counts).
  - higherIsBetter: true if a higher number is better for the shop.
  - measure: what it measures, whatever it's called:
    "repair_cost" (severity, average repair cost or estimate total), "cycle_time" (days to repair, keys to keys, touch-to-delivery),
    "supplement_rate" (share of jobs with supplements), "alt_parts" (all non-OEM parts), "aftermarket_parts", "recycled_parts" (used/LKQ),
    "on_time" (delivered when promised), "labor_hours" (labor hours per estimate), "refinish_hours" (paint hours per estimate),
    "satisfaction" (CSI, NPS, customer surveys), "quality" (re-inspection, comebacks, audits), or "other".
  - note: one short sentence a busy shop owner understands: what the number means against the target.

Only read what is printed; use null instead of guessing. Leave out shop details, ranks and totals across insurers.`;

function sampleResponse(notice: string): NextResponse<ScorecardsResponse> {
  return NextResponse.json({ source: "sample", scorecards: sample.scorecards as InsurerScorecard[], notice });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Trims text and drops numbers that can't be real (a 142% rate), so they show as "not shown" instead. */
function tidyKpi(k: Kpi): Kpi {
  const unit = KPI_UNITS.includes(k.unit) ? k.unit : "number";
  const num = (v: number | null) => (v !== null && plausible(v, unit) ? v : null);
  return {
    label: clip(k.label, 60),
    value: num(k.value),
    target: num(k.target),
    unit,
    higherIsBetter: k.higherIsBetter,
    measure: KPI_MEASURES.includes(k.measure) ? k.measure : "other",
    note: clip(k.note, 200),
  };
}

function tidy(card: InsurerScorecard): InsurerScorecard {
  const count = card.repair_count;
  return {
    insurer: card.insurer ? clip(card.insurer, 60) : null,
    period: card.period ? clip(card.period, 60) : null,
    repair_count: count !== null && count >= 1 && count <= 100_000 ? Math.round(count) : null,
    kpis: card.kpis
      .slice(0, MAX_KPIS)
      .map(tidyKpi)
      .filter((k) => k.label),
  };
}

export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const value = (await req.formData()).get("file");
    file = value instanceof File ? value : null;
  } catch {
    return badRequest("We couldn't read that upload. Please try choosing the file again.");
  }
  if (!file || file.size === 0) return badRequest("Please choose your scorecard file to upload.");
  if (file.size > MAX_BYTES) return badRequest("That file is over 4.5 MB. Try a screenshot or a smaller file.");

  const read = await readUpload(file);
  if (!read.ok) return badRequest(read.error);

  if (!aiConfigured()) return sampleResponse("Reading scorecards isn't set up yet (no API key), so we're showing the sample scorecards.");
  if (!allowAiRequest(req)) return sampleResponse(LIMIT_NOTICE);

  try {
    const parsed = await aiJson("api/score", ScorecardsOutputSchema, "scorecards", {
      instructions: SYSTEM_PROMPT,
      text: withContents(read, file.name, "Read every insurer's KPIs in this document."),
      files: read.file ? [read.file] : [],
    });
    const scorecards = (parsed?.scorecards ?? [])
      .slice(0, MAX_INSURERS)
      .map(tidy)
      .filter((c) => c.kpis.some((k) => k.value !== null));
    if (scorecards.length === 0) {
      return badRequest("We couldn't find any DRP KPIs in that file. Try a clearer photo, the PDF, or a screenshot.");
    }
    return NextResponse.json<ScorecardsResponse>({ source: "ai", scorecards });
  } catch {
    return sampleResponse("We couldn't reach the AI just now, so we're showing the sample scorecards.");
  }
}
