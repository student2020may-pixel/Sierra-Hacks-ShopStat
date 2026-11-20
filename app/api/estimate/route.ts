import { NextResponse } from "next/server";
import sampleEstimate from "@/data/sample-estimate.json";
import { aiConfigured, aiJson } from "@/lib/ai";
import { readUpload, withContents } from "@/lib/fileinput";
import { EstimateExtractSchema, EstimatePhotoReviewSchema } from "@/lib/schemas";
import { clip } from "@/lib/text";
import type { AiFile } from "@/lib/ai";
import type { Estimate, EstimateResponse, PhotoReview } from "@/lib/types";
import { allowAiRequest, LIMIT_NOTICE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4.5 * 1024 * 1024;
const MAX_PHOTOS = 8;

/** Added to the prompt when damage photos come with the estimate. */
const photoInstructions = (count: number) => `

The last ${count} image${count === 1 ? " is a damage photo" : `s are damage photos of the same car, in order: Photo 1 to Photo ${count}`}. Compare them with the estimate and fill photoFindings:
- "missing": damage you can clearly see in a photo that no estimate line covers (a part to repair or replace, refinish, a blend, a related R&I).
- "unsupported": an estimate line for an area that is clearly visible in the photos and looks undamaged. Skip areas the photos don't show.
- "repair_or_replace": where the photos suggest the opposite of the estimate's choice (e.g. a small dent written as a replace, or a torn part written as a repair).
For each: item (the part or operation), photo (its number, or null), severity ("high" for structural, safety or costly items, "medium", "low") and detail (one plain sentence).
Be conservative: only report what you can actually see. Don't count hidden damage you can't see. If the photos don't clearly show the damaged area, set photosShowDamage to false and leave photoFindings empty.`;

const SYSTEM_PROMPT = `You read auto body repair estimates (CCC ONE, Mitchell, Audatex or hand-written) for a body shop.

Return only repair information. Never return the customer's name, phone, email, address, VIN, license plate or claim number.

- vehicle: year, make, model and trim, e.g. "2021 Honda CR-V EX", or null.
- insurer: the insurance company, or null.
- total: the estimate's grand total (total cost of repair) in dollars, as a plain number.
- laborAmount: total labor dollars (all labor types together), from the totals section.
- partsAmount: total parts dollars.
- paintMaterialsAmount: paint and materials (paint supplies) dollars.
- miscAmount: miscellaneous / other charges in dollars that aren't labor, parts, paint materials or sublet; null if none.
- bodyHours, refinishHours, frameHours, mechanicalHours: total labor hours of each type, as plain numbers; null if that type isn't on the estimate.
- bodyRepairHours: body (sheet-metal) labor hours on lines whose operation is a repair ("Rpr", "Repair"), not replace, R&I, refinish or overhaul.
- overwriteAmount: total dollars on lines the estimate marks as manually entered or changed from the database (e.g. CCC's manual-entry or override markers); null if none are marked.
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
    laborAmount: num(e.laborAmount, 500_000),
    partsAmount: num(e.partsAmount, 500_000),
    paintMaterialsAmount: num(e.paintMaterialsAmount, 100_000),
    miscAmount: num(e.miscAmount, 100_000),
    bodyHours: num(e.bodyHours, 500),
    bodyRepairHours: num(e.bodyRepairHours, 500),
    refinishHours: num(e.refinishHours, 500),
    frameHours: num(e.frameHours, 500),
    mechanicalHours: num(e.mechanicalHours, 500),
    parts: e.parts.slice(0, 200).map((p) => ({ description: clip(p.description, 80), price: num(p.price, 100_000), type: p.type })),
    sublets: e.sublets.slice(0, 30).map((s) => ({ description: clip(s.description, 80), price: num(s.price, 100_000) })),
    overwriteAmount: num(e.overwriteAmount, 500_000),
    preliminary: e.preliminary,
    hiddenDamageSigns: e.hiddenDamageSigns.slice(0, 6).map((s) => clip(s, 100)),
  };
}

export async function POST(req: Request) {
  let file: File | null = null;
  let photoFiles: File[] = [];
  try {
    const form = await req.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
    photoFiles = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0);
  } catch {
    return badRequest("We couldn't read that upload. Please try choosing the file again.");
  }
  if (!file || file.size === 0) return badRequest("Please choose your estimate file to upload.");
  if (photoFiles.length > MAX_PHOTOS) return badRequest(`Please add up to ${MAX_PHOTOS} damage photos.`);
  if (file.size + photoFiles.reduce((n, p) => n + p.size, 0) > MAX_BYTES) {
    return badRequest("The estimate and photos together are over 4.5 MB. Try fewer photos or a smaller estimate file.");
  }

  const read = await readUpload(file);
  if (!read.ok) return badRequest(read.error);
  const photos: AiFile[] = [];
  for (const photo of photoFiles) {
    const r = await readUpload(photo);
    if (!r.ok || !r.file?.mimeType.startsWith("image/")) return badRequest(`"${clip(photo.name, 60)}" isn't a photo we can read. Use JPG, PNG, WebP or HEIC.`);
    photos.push(r.file);
  }

  if (!aiConfigured()) return sample("Reading estimates isn't set up yet (no API key), so we're showing the sample estimate.");
  if (!allowAiRequest(req)) return sample(LIMIT_NOTICE);

  try {
    const prompt = {
      instructions: SYSTEM_PROMPT + (photos.length ? photoInstructions(photos.length) : ""),
      text: withContents(read, file.name, photos.length ? "Read this repair estimate and compare it with the damage photos." : "Read this repair estimate."),
      files: [...(read.file ? [read.file] : []), ...photos],
    };
    let parsed: Estimate | null;
    let photoReview: PhotoReview | undefined;
    if (photos.length) {
      const review = await aiJson("api/estimate", EstimatePhotoReviewSchema, "estimate_review", prompt);
      parsed = review;
      if (review) {
        photoReview = {
          photoCount: photos.length,
          photosShowDamage: review.photosShowDamage,
          findings: review.photosShowDamage
            ? review.photoFindings.slice(0, 20).map((f) => ({
                ...f,
                item: clip(f.item, 80),
                detail: clip(f.detail, 200),
                photo: f.photo !== null && Number.isInteger(f.photo) && f.photo >= 1 && f.photo <= photos.length ? f.photo : null,
              }))
            : [],
        };
      }
    } else {
      parsed = await aiJson("api/estimate", EstimateExtractSchema, "estimate", prompt);
    }
    if (!parsed || (parsed.total === null && parsed.parts.length === 0)) {
      return badRequest("We couldn't find a repair estimate in that file. Try a clearer photo, the PDF, or a screenshot.");
    }
    return NextResponse.json<EstimateResponse>({ source: "ai", estimate: tidy(parsed), photoReview });
  } catch {
    return sample("We couldn't reach the AI just now, so we're showing the sample estimate.");
  }
}
