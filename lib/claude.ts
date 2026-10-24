import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";

/** Returns a client, or null when ANTHROPIC_API_KEY isn't set (callers fall back to mock data). */
export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ timeout: 60_000, maxRetries: 1 });
}
