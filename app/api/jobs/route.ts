import { NextResponse } from "next/server";
import { aiConfigured, aiJson } from "@/lib/ai";
import { readUpload, withContents } from "@/lib/fileinput";
import { JobsExtractSchema } from "@/lib/schemas";
import { csvCell } from "@/lib/sheet";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4.5 * 1024 * 1024;
const DAY_MS = 864e5;

/** What the jobs page gets back: CSV text it parses in the browser, or "sample" with a note (it then loads the sample jobs). */
type JobsExtractResponse = { source: "ai"; csv: string } | { source: "sample"; notice: string };

const SYSTEM_PROMPT = `You read lists of auto body repair jobs (repair orders) from PDFs, photos, screenshots and documents.

Return every repair job you can see, one entry per job, in the order shown:
- jobId: the job / RO / repair order number exactly as printed.
- laborHours: the estimated labor hours for the job, as a plain number.
- daysInShop: days the car was in the shop (cycle time), as a plain number, if shown.
- dateIn and dateOut: the dates the car came in and was delivered, as YYYY-MM-DD, if shown.
- supplements: the number of supplements, if shown.

Only read what is printed. If a value isn't shown for a job, set it to null; never guess or estimate. Skip totals, averages and header rows. If the file has no repair jobs, return an empty list.`;

function sample(notice: string): NextResponse<JobsExtractResponse> {
  return NextResponse.json({ source: "sample", notice });
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

function daysBetween(dateIn: string | null, dateOut: string | null): number | null {
  if (!dateIn || !dateOut) return null;
  const days = Math.round((Date.parse(dateOut) - Date.parse(dateIn)) / DAY_MS);
  return Number.isFinite(days) ? days : null;
}

export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const value = (await req.formData()).get("file");
    file = value instanceof File ? value : null;
  } catch {
    return badRequest("We couldn't read that upload. Please try choosing the file again.");
  }
  if (!file || file.size === 0) return badRequest("Please choose your jobs file to upload.");
  if (file.size > MAX_BYTES) return badRequest("That file is over 4.5 MB. Try a screenshot of the job list or a smaller file.");

  const read = await readUpload(file);
  if (!read.ok) return badRequest(read.error);

  if (!aiConfigured()) return sample("Reading PDFs and photos isn't set up yet (no API key), so we're showing the sample jobs.");
  if (!allowAiRequest(req)) return sample(LIMIT_NOTICE);

  try {
    const parsed = await aiJson("api/jobs", JobsExtractSchema, "jobs", {
      instructions: SYSTEM_PROMPT,
      text: withContents(read, file.name, "List the repair jobs in this file."),
      file: read.file,
    });
    const jobs = parsed?.jobs ?? [];
    if (jobs.length === 0) {
      return badRequest("We couldn't find a list of repair jobs in that file. Try a clearer photo, a PDF, or a spreadsheet export.");
    }
    const header = "job_id,estimate_labor_hours,days_in_shop,supplements,date_in,date_out";
    const rows = jobs.map((j) =>
      [j.jobId, j.laborHours ?? "", j.daysInShop ?? daysBetween(j.dateIn, j.dateOut) ?? "", j.supplements ?? "", j.dateIn ?? "", j.dateOut ?? ""]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
    return NextResponse.json<JobsExtractResponse>({ csv: [header, ...rows].join("\n"), source: "ai" });
  } catch {
    return sample("We couldn't reach the AI just now, so we're showing the sample jobs.");
  }
}
