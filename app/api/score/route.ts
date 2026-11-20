import { NextResponse } from "next/server";
import { aiConfigured, aiJson, type AiFile } from "@/lib/ai";
import { readUpload, withContents } from "@/lib/fileinput";
import { kpiByName, KPIS } from "@/lib/kpis";
import { ScorecardReadSchema } from "@/lib/schemas";
import { plausible } from "@/lib/scoring";
import { clip } from "@/lib/text";
import type { KpiValue, ScorecardReadResponse } from "@/lib/types";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over ~4.5 MB before this code runs; the page shrinks screenshots first.
const MAX_BYTES = 4.5 * 1024 * 1024;
const MAX_FILES = 10;

const SYSTEM_PROMPT = `You read an auto body shop's CCC DRP dashboard: screenshots, PDFs or exports of one insurer's KPIs.

The screens often list several insurers in a summary table (company name, rank, score, claims) but show details for only one: the selected or highlighted insurer. Read ONLY that insurer. Ignore the summary rows for the others.

Return:
- insurer: the insurer whose details are shown (e.g. "CSAA INSURANCE GROUP"), or null if you can't tell.
- period: the reporting period, if shown (e.g. "8/1/2026-11/30/2026").
- claims: that insurer's number of claims, if shown.
- readings: one entry for each KPI below that appears with a number. kpi must be the matching name from this list, exactly:
${KPIS.map((d) => `  - ${d.name}`).join("\n")}
  value: the shop's KPI value (the "KPI Value" in a hover box, or the shop's number), as a plain number ($2,085 → 2085, 45.5% → 45.5).
  target: the insurer's target ("KPI Target"), or null if not shown.
Only include a KPI when its value or target is actually printed. Never guess numbers, and never take a number from a different KPI or insurer.`;

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/** No AI available: the page loads the sample numbers for the slot and shows the note. */
const sample = (notice: string) =>
  NextResponse.json<ScorecardReadResponse>({ source: "sample", insurer: null, period: null, claims: null, values: {}, notice });

export async function POST(req: Request) {
  let uploads: File[] = [];
  try {
    uploads = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  } catch {
    return badRequest("We couldn't read that upload. Please try choosing the files again.");
  }
  if (uploads.length === 0) return badRequest("Please choose a screenshot or file to upload.");
  if (uploads.length > MAX_FILES) return badRequest(`Please upload up to ${MAX_FILES} files at a time.`);
  if (uploads.reduce((n, f) => n + f.size, 0) > MAX_BYTES) return badRequest("Those files are over 4.5 MB together. Try fewer screenshots at a time.");

  const files: AiFile[] = [];
  const texts: string[] = [];
  for (const upload of uploads) {
    const read = await readUpload(upload);
    if (!read.ok) return badRequest(`${clip(upload.name, 60)}: ${read.error}`);
    if (read.file) files.push(read.file);
    if (read.text) texts.push(withContents(read, upload.name, ""));
  }

  if (!aiConfigured()) return sample("Reading screenshots isn't set up yet (no API key), so we're showing sample numbers.");
  if (!allowAiRequest(req)) return sample(LIMIT_NOTICE);

  try {
    const parsed = await aiJson("api/score", ScorecardReadSchema, "scorecard", {
      instructions: SYSTEM_PROMPT,
      text: `${texts.join("\n\n")}Read the KPIs for the insurer shown.`,
      files,
    });
    const values: Record<string, KpiValue> = {};
    for (const r of parsed?.readings ?? []) {
      const def = kpiByName(r.kpi);
      if (!def) continue;
      const num = (v: number | null) => (v !== null && plausible(v, def.unit) ? v : null);
      const value = num(r.value);
      const target = num(r.target);
      if (value !== null || target !== null) values[def.id] = { value, target };
    }
    const claims = parsed?.claims ?? null;
    if (Object.keys(values).length === 0 && claims === null) {
      return badRequest("We couldn't find any KPI numbers in that. Try the dashboard screenshot or a KPI's hover box.");
    }
    return NextResponse.json<ScorecardReadResponse>({
      source: "ai",
      insurer: parsed?.insurer ? clip(parsed.insurer, 60) : null,
      period: parsed?.period ? clip(parsed.period, 60) : null,
      claims: claims !== null && claims >= 1 && claims <= 100_000 ? Math.round(claims) : null,
      values,
    });
  } catch {
    return sample("We couldn't reach the AI just now, so we're showing sample numbers.");
  }
}
