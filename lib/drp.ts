// The shop's DRP programs. Each one has its own insurer scorecard (its KPIs and targets), and an
// estimate is graded against the scorecard of the program it's written for.
import { isScoreResult, load, loadValid, remove, save, SCORE_FILE_KEY, SCORE_KEY } from "./storage";
import type { ScoreResponse } from "./types";

export type ProgramId = "state-farm" | "csaa" | "geico" | "other";

export const PROGRAMS: { id: ProgramId; name: string; match?: RegExp }[] = [
  { id: "state-farm", name: "State Farm", match: /state\s*farm/i },
  { id: "csaa", name: "CSAA", match: /\bcsaa\b|\baaa\b/i },
  { id: "geico", name: "GEICO", match: /geico/i },
  { id: "other", name: "Other insurer" },
];

export const programName = (id: ProgramId) => PROGRAMS.find((p) => p.id === id)!.name;

/** Which DRP an insurer name printed on a scorecard or estimate belongs to, if it's one of ours. */
export function programFor(insurer: string | null | undefined): ProgramId | null {
  if (!insurer) return null;
  return PROGRAMS.find((p) => p.match?.test(insurer))?.id ?? null;
}

const scoreKey = (id: ProgramId) => `${SCORE_KEY}:${id}`;
const fileKey = (id: ProgramId) => `${SCORE_FILE_KEY}:${id}`;

/** Before DRPs, the tab held one scorecard. File it under its insurer's program the first time we look. */
function migrate() {
  const old = loadValid(SCORE_KEY, isScoreResult) as ScoreResponse | null;
  if (!old) return;
  const id = programFor(old.insurer) ?? "other";
  if (!load(scoreKey(id))) {
    save(scoreKey(id), old);
    save(fileKey(id), load<string>(SCORE_FILE_KEY));
  }
  remove(SCORE_KEY);
  remove(SCORE_FILE_KEY);
}

export interface SavedCard {
  result: ScoreResponse;
  file: string | null;
}

export function loadCard(id: ProgramId): SavedCard | null {
  migrate();
  const result = loadValid(scoreKey(id), isScoreResult) as ScoreResponse | null;
  if (!result) return null;
  return { result: { ...result, other_metrics: Array.isArray(result.other_metrics) ? result.other_metrics : [] }, file: load<string>(fileKey(id)) };
}

export function saveCard(id: ProgramId, result: ScoreResponse, file?: string | null) {
  save(scoreKey(id), result);
  if (file !== undefined) save(fileKey(id), file);
}

export function removeCard(id: ProgramId) {
  remove(scoreKey(id));
  remove(fileKey(id));
}

/** Every program that has a scorecard in this tab, in menu order. */
export function loadCards(): Partial<Record<ProgramId, SavedCard>> {
  return Object.fromEntries(
    PROGRAMS.flatMap((p) => {
      const card = loadCard(p.id);
      return card ? [[p.id, card]] : [];
    }),
  );
}
