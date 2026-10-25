import { NextResponse } from "next/server";
import sampleFixes from "@/data/sample-fixes.json";
import { aiConfigured, aiJson } from "@/lib/ai";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";
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

  if (!aiConfigured()) return sample("AI fixes aren't set up yet (no API key), so here are sample fixes.");
  if (!allowAiRequest(req)) return sample(LIMIT_NOTICE);

  try {
    const output = await aiJson("api/fixes", FixesOutputSchema, "fixes", { instructions: SYSTEM_PROMPT, text: describe(parsed.data) });
    const fixes = output?.fixes;
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
  } catch {
    return sample("We couldn't reach the AI just now, so here are sample fixes.");
  }
}
