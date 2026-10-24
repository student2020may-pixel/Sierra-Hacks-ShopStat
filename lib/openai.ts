import OpenAI from "openai";

export const MODEL = "gpt-5.4-mini";

/** Returns a client, or null when OPENAI_API_KEY isn't set (callers fall back to mock data). */
export function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ timeout: 60_000, maxRetries: 1 });
}
