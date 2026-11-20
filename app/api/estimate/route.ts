import { NextResponse } from "next/server";
import sampleEstimate from "@/data/sample-estimate.json";
import { aiConfigured, aiJson } from "@/lib/ai";
import { readUpload, withContents } from "@/lib/fileinput";
import { EstimateExtractSchema } from "@/lib/schemas";
import { clip } from "@/lib/text";
import type { Estimate, EstimateResponse } from "@/lib/types";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4.5 * 1024 * 1024;

const SYSTEM_PROMPT = `You read auto body repair estimates (CCC ONE, Mitchell, Audatex or hand-written) for a body shop.

Return only repair information. Never return the customer's name, phone, email, address, VIN, license plate or claim number.

- vehicle: year, make, model and trim, e.g. "2021 Honda CR-V EX", or null.
- insurer: the insurance company, or null.
- total: the estimate's grand total in dollars, as a plain number.
- bodyHours, refinishHours, frameHours, mechanicalHours: total labor hours of each type, as plain numbers; null if that type isn't on the estimate.
- parts: every part line with its description, its price (plain number, null if not shown) and its type:
  "oem" for new carmaker parts, "aftermarket" for non-OEM new parts (A/M, CAPA, quality replacement), "used" for recycled / LKQ / salvage, "reman" for remanufactured or reconditioned, "unknown" if the estimate doesn't say.
- sublets: work sent out (alignment, calibration, glass, mechanical), with price.
- preliminary: true if the estimate is marked preliminary, photo-based or "subject to teardown", or it's clearly written before the car was taken apart.
- hiddenDamageSigns: short phrases for signs of damage that usually isn't visible until teardown (front impact near the radiator support, airbag deployment, structural or frame items, suspension parts, "possible" or "inspect" lines). Empty if none.

Only read what is printed. Use null instead of guessing.`;

function sample(notice: string) {
  return NextResponse.json<EstimateResponse>({ source: "sample", estimate: sampleEstimate as Estimate, notice });
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Trims text fields and drops impossible numbers the model may have misread. */
function tidy(e: Estimate): Estimate {
  const num = (v: number | null, max: number) => (v !== null && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
  return {
    vehicle: e.vehicle ? clip(e.vehicle, 80) : null,
    insurer: e.insurer ? clip(e.insurer, 60) : null,
    total: num(e.total, 500_000),
    bodyHours: num(e.bodyHours, 500),
    refinishHours: num(e.refinishHours, 500),
    frameHours: num(e.frameHours, 500),
    mechanicalHours: num(e.mechanicalHours, 500),
    parts: e.parts.slice(0, 200).map((p) => ({ description: clip(p.description, 80), price: num(p.price, 100_000), type: p.type })),
    sublets: e.sublets.slice(0, 30).map((s) => ({ description: clip(s.description, 80), price: num(s.price, 100_000) })),
    preliminary: e.preliminary,
    hiddenDamageSigns: e.hiddenDamageSigns.slice(0, 6).map((s) => clip(s, 100)),
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
  if (!file || file.size === 0) return badRequest("Please choose your estimate file to upload.");
  if (file.size > MAX_BYTES) return badRequest("That file is over 4.5 MB. Try a screenshot or a smaller file.");

  const read = await readUpload(file);
  if (!read.ok) return badRequest(read.error);

  if (!aiConfigured()) return sample("Reading estimates isn't set up yet (no API key), so we're showing the sample estimate.");
  if (!allowAiRequest(req)) return sample(LIMIT_NOTICE);

  try {
    const parsed = await aiJson("api/estimate", EstimateExtractSchema, "estimate", {
      instructions: SYSTEM_PROMPT,
      text: withContents(read, file.name, "Read this repair estimate."),
      files: read.file ? [read.file] : [],
    });
    if (!parsed || (parsed.total === null && parsed.parts.length === 0)) {
      return badRequest("We couldn't find a repair estimate in that file. Try a clearer photo, the PDF, or a screenshot.");
    }
    return NextResponse.json<EstimateResponse>({ source: "ai", estimate: tidy(parsed) });
  } catch {
    return sample("We couldn't reach the AI just now, so we're showing the sample estimate.");
  }
}
