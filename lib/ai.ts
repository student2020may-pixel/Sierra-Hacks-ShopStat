// Server only. Tries OpenAI first and falls back to Gemini with the same prompt and output shape.
import { GoogleGenAI, type Part } from "@google/genai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { z } from "zod";
import { getClient, MODEL } from "./openai";

export const GEMINI_MODEL = "gemini-3.8-flash";

/** Both providers together must finish inside the routes' 60s maxDuration. */
const SHARED_TIMEOUT_MS = 26_000;
const SOLO_TIMEOUT_MS = 45_000;

export interface AiFile {
  mimeType: string;
  base64: string;
  filename: string;
}

interface Prompt {
  instructions: string;
  text: string;
  file?: AiFile;
}

const hasGemini = () => Boolean(process.env.Gemini_API_Key_2);
export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY) || hasGemini();

function gemini(timeout: number) {
  return { ai: new GoogleGenAI({ apiKey: process.env.Gemini_API_Key_2 }), config: { httpOptions: { timeout } } };
}

function geminiParts({ text, file }: Prompt): Part[] {
  return file ? [{ inlineData: { mimeType: file.mimeType, data: file.base64 } }, { text }] : [{ text }];
}

function openaiContent({ text, file }: Prompt): ResponseInputContent[] {
  if (!file) return [{ type: "input_text", text }];
  const dataUrl = `data:${file.mimeType};base64,${file.base64}`;
  const fileInput: ResponseInputContent =
    file.mimeType === "application/pdf"
      ? { type: "input_file", filename: file.filename, file_data: dataUrl }
      : { type: "input_image", image_url: dataUrl, detail: "high" };
  return [fileInput, { type: "input_text", text }];
}

/** Runs OpenAI, then Gemini if OpenAI isn't configured or throws. Rethrows when neither works. */
async function withFallback<T>(label: string, openai: (timeout: number) => Promise<T>, google: (timeout: number) => Promise<T>): Promise<T> {
  let lastError: unknown = new Error("No AI provider is configured.");
  if (process.env.OPENAI_API_KEY) {
    try {
      return await openai(hasGemini() ? SHARED_TIMEOUT_MS : SOLO_TIMEOUT_MS);
    } catch (err) {
      console.error(`[${label}] OpenAI failed${hasGemini() ? ", trying Gemini" : ""}:`, err);
      lastError = err;
    }
  }
  if (hasGemini()) {
    try {
      return await google(process.env.OPENAI_API_KEY ? SHARED_TIMEOUT_MS : SOLO_TIMEOUT_MS);
    } catch (err) {
      console.error(`[${label}] Gemini failed:`, err);
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Structured output matching `schema`. Returns null when the model answered but the result didn't
 * fit the schema (or it refused); throws when no provider could be reached.
 */
export function aiJson<S extends z.ZodType>(label: string, schema: S, name: string, prompt: Prompt): Promise<z.infer<S> | null> {
  return withFallback(
    label,
    async (timeout) => {
      const client = getClient(timeout)!;
      const response = await client.responses.parse({
        model: MODEL,
        // Don't let OpenAI keep the response for later retrieval (the Responses API stores it for 30+ days by default).
        store: false,
        instructions: prompt.instructions,
        input: [{ role: "user", content: openaiContent(prompt) }],
        text: { format: zodTextFormat(schema, name) },
      });
      return (response.output_parsed as z.infer<S> | null) ?? null;
    },
    async (timeout) => {
      const { ai, config } = gemini(timeout);
      const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
      delete jsonSchema.$schema;
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: geminiParts(prompt) }],
        config: { ...config, systemInstruction: prompt.instructions, responseMimeType: "application/json", responseJsonSchema: jsonSchema },
      });
      let json: unknown = null;
      try {
        json = JSON.parse(response.text ?? "");
      } catch {
        return null;
      }
      const parsed = schema.safeParse(json);
      return parsed.success ? parsed.data : null;
    },
  );
}

/** Plain-text answer; empty string when the model returned nothing. Throws when no provider works. */
export function aiText(label: string, prompt: Prompt): Promise<string> {
  return withFallback(
    label,
    async (timeout) => {
      const response = await getClient(timeout)!.responses.create({
        model: MODEL,
        store: false,
        instructions: prompt.instructions,
        input: prompt.text,
      });
      return response.output_text?.trim() ?? "";
    },
    async (timeout) => {
      const { ai, config } = gemini(timeout);
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: geminiParts(prompt) }],
        config: { ...config, systemInstruction: prompt.instructions },
      });
      return response.text?.trim() ?? "";
    },
  );
}
