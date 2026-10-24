import { STAT_LABELS } from "./stats";
import { isScored, type AskRequest } from "./types";

export const SUGGESTED_QUESTIONS = [
  "Why is my cycle time so high?",
  "Which job hurt me most?",
  "What should I fix first?",
] as const;

/** Keep in sync with AskRequestSchema in lib/schemas.ts. */
export const MAX_QUESTION_LENGTH = 300;

export type { AskRequest } from "./types";

export interface AskResponse {
  answer: string;
  source: "ai" | "data";
  notice?: string;
}

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");

/**
 * Answers the suggested questions straight from the shop's numbers, for when the AI isn't
 * available. Returns null for any other question.
 */
export function answerFromData(req: AskRequest): string | null {
  const q = req.question.toLowerCase();
  const worst = [...req.flagged].sort((a, b) => b.extraDays - a.extraDays)[0];

  if (q.includes("cycle time")) {
    const cycle = req.metrics.filter(isScored).find((m) => m.key === "cycle_time");
    if (!cycle) return "I can't tell from your data: cycle time isn't on your scorecard.";
    const top = [...req.flagged].sort((a, b) => b.extraDays - a.extraDays).slice(0, 2);
    const jobs = top.length
      ? ` The biggest drags were ${top.map((j) => `${j.jobId} (+${one(j.extraDays)} days)`).join(" and ")}, part of ${one(req.totalExtraDays)} extra days across ${req.flaggedCount} slow jobs.`
      : " No individual jobs stood out as unusually slow, so the delay is spread across many jobs.";
    return `Your cycle time is ${one(cycle.shopValue)} days against a ${one(cycle.target)}-day target, which scores ${cycle.score}/100.${jobs}`;
  }

  if (q.includes("job") && (q.includes("hurt") || q.includes("worst") || q.includes("slowest"))) {
    if (!worst) return "I can't tell from your data: no jobs were flagged as unusually slow.";
    return `${worst.jobId} hurt you most: ${one(worst.daysInShop)} days in the shop when its ${one(worst.laborHours)} labor hours predict about ${one(worst.expectedDays)}, so +${one(worst.extraDays)} extra days. It also needed ${worst.supplements} supplement${worst.supplements === 1 ? "" : "s"}.`;
  }

  if (q.includes("fix first") || (q.includes("fix") && q.includes("first"))) {
    const fix = req.fixes[0];
    if (!fix) return "I can't tell from your data: there's no fix list yet.";
    const weakest = req.metrics.filter(isScored).sort((a, b) => a.score - b.score)[0];
    const why = weakest ? ` Your weakest stat is ${STAT_LABELS[weakest.key].full} at ${weakest.score}/100.` : "";
    return `Start with "${fix.title}": ${fix.explanation}${why}`;
  }

  return null;
}
