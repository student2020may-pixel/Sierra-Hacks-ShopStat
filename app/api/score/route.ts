import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { NextResponse } from "next/server";
import scorecardData from "@/data/scorecard.json";
import { getClient, MODEL } from "@/lib/openai";
import { METRIC_KEYS, ScoreOutputSchema } from "@/lib/schemas";
import type { Metric, Scorecard, ScoreResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SYSTEM_PROMPT = `You read insurer scorecards for auto body shops and explain them to shop owners in plain language.

Extract these six metrics from the uploaded scorecard. Use exactly these keys, labels, units, and directions:
- cycle_time: "Cycle Time", unit "days", lower is better
- customer_satisfaction: "Customer Satisfaction (CSI)", unit "/100", higher is better
- avg_repair_cost: "Average Repair Cost", unit "$", lower is better
- supplement_rate: "Supplement Rate", unit "%", lower is better
- alt_parts_usage: "Alternate Parts Usage", unit "%", higher is better
- on_time_delivery: "On-Time Delivery", unit "%", higher is better

For each metric return the shop's value and the insurer's target as plain numbers (no symbols; 33% → 33, $3,410 → 3410).
The scorecard may use different names for a metric (e.g. "repair cycle time", "CSI", "severity", "parts utilization") — map them.

score (0–100) reflects how the shop is doing against the target:
- Meets or beats the target: 85–100 (higher the further past target).
- Misses by a little (within ~10% of target): 65–84.
- Misses clearly (10–30%): 40–64.
- Misses badly (more than 30%): 0–39.

explanation: one short sentence a busy shop owner understands — what the number means and whether it's helping or hurting. No jargon, no metric codes.

Return all six metrics, in the order listed. If a metric truly isn't on the scorecard, make your best estimate from context and say so in its explanation.`;

function sample(notice: string): NextResponse<ScoreResponse> {
  return NextResponse.json({
    source: "sample",
    metrics: (scorecardData as Scorecard).metrics,
    notice,
  });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** Puts metrics in canonical order and clamps scores; returns null if any metric is missing. */
function normalize(metrics: Metric[]): Metric[] | null {
  const ordered = METRIC_KEYS.map((key) => metrics.find((m) => m.key === key));
  if (ordered.some((m) => !m)) return null;
  return (ordered as Metric[]).map((m) => ({ ...m, score: Math.round(Math.min(100, Math.max(0, m.score))) }));
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
  if (file.size > MAX_BYTES) return badRequest("That file is over 10 MB. Try a smaller image or PDF.");

  const isPdf = file.type === "application/pdf";
  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isPdf && !isImage) return badRequest("Please upload a PNG, JPG, WebP, GIF, or PDF file.");

  const client = getClient();
  if (!client) return sample("AI scoring isn't set up yet (no API key), so we're showing the sample scorecard.");

  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
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
    const metrics = response.output_parsed && normalize(response.output_parsed.metrics);
    if (!metrics) {
      return sample("The AI couldn't find all six metrics in this file, so we're showing the sample scorecard.");
    }
    return NextResponse.json<ScoreResponse>({ source: "ai", metrics });
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
