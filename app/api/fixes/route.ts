import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import sampleFixes from "@/data/sample-fixes.json";
import { getClient, MODEL } from "@/lib/openai";
import { clip } from "@/lib/text";
import { FixesOutputSchema, FixesRequestSchema } from "@/lib/schemas";
import type { Fix, FixesRequest, FixesResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DAYS_PER_FIX = 5;

const SYSTEM_PROMPT = `You advise auto body shop owners on how to cut repair cycle time (how many days a car stays in the shop).

You'll get the shop's insurer scorecard (up to six metrics, each with a 0–100 score where 85 means exactly on target) and the repair jobs that took far longer than their labor hours predicted.

Return exactly 3 fixes, most impactful first. Each fix must:
- title: a short action, 3–7 words, e.g. "Order every part at teardown".
- explanation: one plain-language sentence a busy shop owner understands. Point to the specific evidence — name flagged job IDs, supplement counts, or weak metrics.
- daysSaved: a realistic estimate of days this fix would take off the shop's AVERAGE cycle time per car (typically 0.3–2). Be conservative; the three fixes together should not exceed the gap between the shop's cycle time and its target.
- basedOn: the job IDs and/or metric names the fix comes from, e.g. "VAB-1038, VAB-1022 · Supplement rate".
- metrics: the keys of the scorecard metrics this fix would improve, from: cycle_time, customer_satisfaction, avg_repair_cost, supplement_rate, alt_parts_usage, on_time_delivery. Prefer the weakest ones.

Focus on changes that shorten repair time: parts ordering, supplements and insurer approvals, scheduling, production tracking, sublet delays, communication. No jargon, no generic advice like "improve efficiency".`;

function sample(notice: string): NextResponse<FixesResponse> {
  return NextResponse.json({ source: "sample", fixes: sampleFixes as Fix[], notice });
}

function describe(input: FixesRequest): string {
  const metrics = input.metrics
    .map((m) =>
      m.shopValue === null || m.target === null || m.score === null
        ? `- ${m.label}: not on this scorecard (don't base a fix on it)`
        : `- ${m.label}: shop ${m.shopValue}${m.unit === "/100" ? "/100" : ` ${m.unit}`}, target ${m.target}, score ${m.score}/100 (${m.higherIsBetter ? "higher" : "lower"} is better)`,
    )
    .join("\n");
  const jobs = input.flagged.length
    ? input.flagged
        .map(
          (j) =>
            `- ${j.jobId}: ${j.laborHours} labor hours, ${j.daysInShop} days in shop (expected ${j.expectedDays}, +${j.extraDays} extra), ${j.supplements} supplements`,
        )
        .join("\n")
    : "- None flagged";
  return `Scorecard:\n${metrics}\n\nSlow jobs (the worst ${input.flagged.length} of the flagged jobs, out of ${input.jobCount} jobs; ${input.totalExtraDays} extra days in total across all flagged jobs):\n${jobs}`;
}

export async function POST(req: Request) {
  const parsed = FixesRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return sample("We didn't get enough data to tailor fixes, so here are sample fixes.");

  const client = getClient();
  if (!client) return sample("AI fixes aren't set up yet (no API key), so here are sample fixes.");

  try {
    const response = await client.responses.parse({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: describe(parsed.data),
      text: { format: zodTextFormat(FixesOutputSchema, "fixes") },
    });

    const fixes = response.output_parsed?.fixes;
    if (!fixes || fixes.length < 3) {
      return sample("The AI didn't come back with three fixes, so here are sample fixes.");
    }
    return NextResponse.json<FixesResponse>({
      source: "ai",
      fixes: fixes.slice(0, 3).map((f) => ({
        title: clip(f.title, 70),
        explanation: clip(f.explanation, 260),
        basedOn: clip(f.basedOn, 120),
        metrics: [...new Set(f.metrics)],
        daysSaved: Math.round(Math.min(MAX_DAYS_PER_FIX, Math.max(0, f.daysSaved)) * 10) / 10,
      })),
    });
  } catch (err) {
    console.error("[api/fixes] OpenAI call failed:", err);
    if (err instanceof OpenAI.AuthenticationError) {
      return sample("The API key was rejected, so here are sample fixes. Check OPENAI_API_KEY in .env.");
    }
    if (err instanceof OpenAI.RateLimitError) {
      return sample("The AI is busy right now, so here are sample fixes. Try again in a minute.");
    }
    return sample("We couldn't reach the AI just now, so here are sample fixes.");
  }
}
