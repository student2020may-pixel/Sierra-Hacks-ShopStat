import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { NextResponse } from "next/server";
import scorecardData from "@/data/scorecard.json";
import { getClient, MODEL } from "@/lib/openai";
import { clip } from "@/lib/text";
import { METRIC_DEFS, METRIC_KEYS, ScoreOutputSchema, type MetricUnit } from "@/lib/schemas";
import { scoreMetric } from "@/lib/scoring";
import { isScored, type Metric, type OtherMetric, type Scorecard, type ScoreResponse } from "@/lib/types";
import type { z } from "zod";
import type { ExtractedMetricSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over ~4.5 MB before this code runs; the upload page shrinks photos first.
const MAX_BYTES = 4.5 * 1024 * 1024;
/**
 * Identifies the file from its first bytes. Browsers sometimes send no MIME type (some Android
 * pickers) or a wrong one (a renamed file), and the model needs the real type.
 */
function sniffType(bytes: Uint8Array): string | null {
  const ascii = (start: number, len: number) => String.fromCharCode(...bytes.subarray(start, start + len));
  if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}

const METRIC_LIST = METRIC_KEYS.map((key) => {
  const d = METRIC_DEFS[key];
  return `- ${key}: "${d.label}", unit "${d.unit}", ${d.higherIsBetter ? "higher" : "lower"} is better`;
}).join("\n");

const SYSTEM_PROMPT = `You read insurer scorecards for auto body shops and explain them to shop owners in plain language.

Look for these six metrics on the uploaded scorecard. Use exactly these keys, labels, units, and directions:
${METRIC_LIST}

For each metric return the shop's value and the insurer's target as plain numbers (no symbols; 33% → 33, $3,410 → 3410).
The scorecard may use different names for a metric (e.g. "repair cycle time", "CSI", "severity", "parts utilization") — map them.

If a metric is NOT on the scorecard, do not guess or estimate it: set shopValue and target to null and set explanation to "Not on this scorecard." If the shop's value is shown but no target is, set target to null too.

explanation: one short sentence a busy shop owner understands — what the number means compared with the target and whether it's helping or hurting. No jargon, no metric codes. Don't invent a score; just read the numbers.

Return all six metrics, in the order listed.

period: the reporting period exactly as printed on the scorecard (e.g. "Q3 2026" or "Jul 1 – Sep 30, 2026"), or null if none is shown.

other_metrics: any OTHER performance metrics on the scorecard that matter to a body shop and aren't one of the six — for example touch time, comeback/redo rate, labor efficiency, photo estimate accuracy, rental days, total loss rate. For each: label as printed, value and target as plain numbers (null if not shown), unit as printed ("%", "$", "hours", "days", or "" if none), and note: one plain-language sentence on what it means for the shop. Leave out shop details, dates, rankings, and anything that isn't a performance metric. Return an empty array if there are none.`;

/** At most this many "Also found" metrics, so a dense scorecard can't flood the page. */
const MAX_OTHER_METRICS = 8;

/**
 * Values outside these ranges can't be real (a 142% rate, a 1,284-day cycle time), so they're a
 * misread and the metric is treated as not on the scorecard rather than scored.
 */
const PLAUSIBLE: Record<MetricUnit, [number, number]> = {
  "%": [0, 100],
  "/100": [0, 100],
  days: [0, 365],
  $: [0, 100_000],
};
const plausible = (v: number, unit: MetricUnit) => Number.isFinite(v) && v >= PLAUSIBLE[unit][0] && v <= PLAUSIBLE[unit][1];

function sample(notice: string): NextResponse<ScoreResponse> {
  return NextResponse.json({
    source: "sample",
    metrics: (scorecardData as Scorecard).metrics,
    other_metrics: [],
    period: (scorecardData as Scorecard).period,
    notice,
  });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Returns the six metrics in canonical order with scores computed in code (lib/scoring.ts). A
 * metric the model skipped, returned with only some of its numbers, or read as an impossible value
 * becomes "not on this scorecard" (null numbers) — never a guess.
 */
function normalize(extracted: z.infer<typeof ExtractedMetricSchema>[]): Metric[] {
  return METRIC_KEYS.map((key) => {
    const m = extracted.find((x) => x.key === key);
    const d = METRIC_DEFS[key];
    if (
      !m ||
      m.shopValue === null ||
      m.target === null ||
      !plausible(m.shopValue, d.unit) ||
      !plausible(m.target, d.unit)
    ) {
      return { key, ...d, shopValue: null, target: null, score: null, explanation: "Not on this scorecard." };
    }
    return {
      key,
      ...d,
      shopValue: m.shopValue,
      target: m.target,
      score: scoreMetric(m.shopValue, m.target, d.higherIsBetter),
      explanation: clip(m.explanation, 240),
    };
  });
}

function normalizeOther(others: OtherMetric[]): OtherMetric[] {
  return others
    .map((o) => ({
      ...o,
      label: clip(o.label, 60),
      unit: clip(o.unit, 24),
      note: clip(o.note, 200),
      value: o.value !== null && Number.isFinite(o.value) ? o.value : null,
      target: o.target !== null && Number.isFinite(o.target) ? o.target : null,
    }))
    .filter((o) => o.label && (o.value !== null || o.note))
    .slice(0, MAX_OTHER_METRICS);
}

export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const value = (await req.formData()).get("file");
    file = value instanceof File ? value : null;
  } catch {
    return badRequest("We couldn't read that upload. Please try choosing the file again.");
  }
  if (!file || file.size === 0) return badRequest("Please choose a scorecard image or PDF to upload.");
  if (file.size > MAX_BYTES) return badRequest("That file is over 4.5 MB. Try a screenshot or a smaller PDF.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type) return badRequest("Please upload a PNG, JPG, WebP, GIF, or PDF file.");
  const isPdf = type === "application/pdf";

  const client = getClient();
  if (!client) return sample("AI scoring isn't set up yet (no API key), so we're showing the sample scorecard.");

  const dataUrl = `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  const fileInput: ResponseInputContent = isPdf
    ? { type: "input_file", filename: file.name || "scorecard.pdf", file_data: dataUrl }
    : { type: "input_image", image_url: dataUrl, detail: "high" };

  try {
    const response = await client.responses.parse({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: [{ role: "user", content: [fileInput, { type: "input_text", text: "Score this shop's scorecard." }] }],
      text: { format: zodTextFormat(ScoreOutputSchema, "scorecard") },
    });

    // output_parsed is null when the model refused or the output didn't match the schema.
    const parsed = response.output_parsed;
    if (!parsed) return sample("The AI couldn't read this file, so we're showing the sample scorecard.");
    const metrics = normalize(parsed.metrics);
    if (!metrics.some(isScored)) {
      return sample("We couldn't find any of the six scorecard metrics in this file, so we're showing the sample scorecard.");
    }
    return NextResponse.json<ScoreResponse>({
      source: "ai",
      metrics,
      other_metrics: normalizeOther(parsed.other_metrics),
      period: parsed.period ? clip(parsed.period, 60) : null,
    });
  } catch (err) {
    console.error("[api/score] OpenAI call failed:", err);
    if (err instanceof OpenAI.AuthenticationError) {
      return sample("The API key was rejected, so we're showing the sample scorecard. Check OPENAI_API_KEY in .env.");
    }
    if (err instanceof OpenAI.RateLimitError) {
      return sample("The AI is busy right now, so we're showing the sample scorecard. Try again in a minute.");
    }
    return sample("We couldn't reach the AI just now, so we're showing the sample scorecard.");
  }
}
