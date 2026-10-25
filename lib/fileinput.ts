// Server only. Works out what an uploaded file is and turns it into something the AI can read:
// images and PDFs are passed through as files; Word, Excel and text files become plain text.
import mammoth from "mammoth";
import { readSheet } from "read-excel-file/node";
import type { AiFile } from "./ai";
import { rowsToCsv } from "./sheet";

/** Long documents are cut so the prompt stays a sensible size. */
const MAX_TEXT_CHARS = 60_000;

export type ReadFile = { ok: true; file?: AiFile; text?: string } | { ok: false; error: string };

export const UNSUPPORTED =
  "We can't read that kind of file. Try a PDF, photo, screenshot, spreadsheet (Excel or CSV), Word document or text file.";

/** Identifies a file from its first bytes; browsers often send no type, or the wrong one. */
function sniff(bytes: Uint8Array): string | null {
  const ascii = (start: number, len: number) => String.fromCharCode(...bytes.subarray(start, start + len));
  if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  // iPhone photos: an ISO media box whose brand is one of the HEIF ones.
  if (ascii(4, 4) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(ascii(8, 4))) return "image/heic";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "zip";
  return null;
}

/** True for text that is mostly printable characters (CSV, TXT, HTML, JSON, Markdown, ...). */
function decodeText(bytes: Uint8Array): string | null {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 2_000_000));
  const sample = text.slice(0, 4000);
  if (!sample.trim()) return null;
  const bad = (sample.match(/[\u0000-\u0008\u000e-\u001f�]/g) ?? []).length;
  return bad / sample.length < 0.02 ? text : null;
}

const clipText = (text: string) => (text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n[... cut off]` : text);

export async function readUpload(file: File): Promise<ReadFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  const name = file.name || "upload";

  if (type && type !== "zip") {
    return { ok: true, file: { mimeType: type, base64: Buffer.from(bytes).toString("base64"), filename: name } };
  }

  if (type === "zip") {
    // .docx and .xlsx are zip files; try the one the name suggests first, then the other.
    const buffer = Buffer.from(bytes);
    const asWord = async () => (await mammoth.extractRawText({ buffer })).value;
    const asExcel = async () => rowsToCsv(await readSheet(buffer));
    const attempts = /\.xlsx?$|\.xlsm$/i.test(name) ? [asExcel, asWord] : [asWord, asExcel];
    for (const attempt of attempts) {
      try {
        const text = (await attempt()).trim();
        if (text) return { ok: true, text: clipText(text) };
      } catch {
        // Not that format; try the next one.
      }
    }
    return { ok: false, error: UNSUPPORTED };
  }

  const text = decodeText(bytes);
  return text ? { ok: true, text: clipText(text) } : { ok: false, error: UNSUPPORTED };
}

/** Puts a text file's contents in front of the instruction the model gets. */
export function withContents(read: { text?: string }, name: string, instruction: string): string {
  return read.text ? `Contents of the uploaded file "${name}":\n\n${read.text}\n\n${instruction}` : instruction;
}
