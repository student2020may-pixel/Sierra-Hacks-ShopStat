import OpenAI from "openai";

export const MODEL = "gpt-5.4-mini";

/** Returns a client, or null when OPENAI_API_KEY isn't set. One attempt, so the Gemini fallback still has time. */
export function getClient(timeout = 40_000): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ timeout, maxRetries: 0 });
}
