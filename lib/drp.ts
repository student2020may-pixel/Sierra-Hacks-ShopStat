// The shop's DRP programs. Each has its own scorecard (its own KPIs and targets), and an estimate is
// graded against the scorecard of the insurer it's written for.
import { KPI_MEASURES, KPI_UNITS } from "./schemas";
import { load, remove, save, SCORE_FILE_KEY, SCORE_KEY } from "./storage";
import type { SlotCard } from "./types";

export type ProgramId = "csaa" | "geico" | "travelers" | "farmers";

export const PROGRAMS: { id: ProgramId; name: string; match: RegExp }[] = [
  { id: "csaa", name: "CSAA", match: /\bcsaa\b|\baaa\b/i },
  { id: "geico", name: "GEICO", match: /geico/i },
  { id: "travelers", name: "Travelers", match: /travel+ers/i },
  { id: "farmers", name: "Farmers", match: /farmers/i },
];

export const programName = (id: ProgramId) => PROGRAMS.find((p) => p.id === id)!.name;

/** Which DRP an insurer name printed on a scorecard or estimate belongs to, if it's one of ours. */
export function programFor(insurer: string | null | undefined): ProgramId | null {
  if (!insurer) return null;
  return PROGRAMS.find((p) => p.match.test(insurer))?.id ?? null;
}

// v2: per-insurer KPIs. Scorecards saved in the older fixed-metric shape are dropped, not converted.
const slotKey = (id: ProgramId) => `${SCORE_KEY}:v2:${id}`;
const fileKey = (id: ProgramId) => `${SCORE_FILE_KEY}:v2:${id}`;
const OLD_KEYS = [SCORE_KEY, SCORE_FILE_KEY, ...["state-farm", "csaa", "geico", "other"].flatMap((id) => [`${SCORE_KEY}:${id}`, `${SCORE_FILE_KEY}:${id}`])];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNumOrNull = (v: unknown) => v === null || typeof v === "number";

function isSlotCard(v: unknown): v is SlotCard {
  return (
    isObject(v) &&
    (v.source === "ai" || v.source === "sample") &&
    Array.isArray(v.kpis) &&
    v.kpis.every(
      (k) =>
        isObject(k) &&
        typeof k.label === "string" &&
        isNumOrNull(k.value) &&
        isNumOrNull(k.target) &&
        typeof k.higherIsBetter === "boolean" &&
        (KPI_UNITS as readonly unknown[]).includes(k.unit) &&
        (KPI_MEASURES as readonly unknown[]).includes(k.measure),
    )
  );
}

export interface SavedCard {
  card: SlotCard;
  /** The file it came from, so the slot can say where its numbers came from. */
  file: string | null;
}

export function loadCard(id: ProgramId): SavedCard | null {
  OLD_KEYS.forEach(remove);
  const card = load<unknown>(slotKey(id));
  return isSlotCard(card) ? { card, file: load<string>(fileKey(id)) } : null;
}

export function saveCard(id: ProgramId, card: SlotCard, file?: string | null) {
  save(slotKey(id), card);
  if (file !== undefined) save(fileKey(id), file);
}

export function removeCard(id: ProgramId) {
  remove(slotKey(id));
  remove(fileKey(id));
}

/** Every DRP that has a scorecard in this tab, in menu order. */
export function loadCards(): Partial<Record<ProgramId, SavedCard>> {
  return Object.fromEntries(
    PROGRAMS.flatMap((p) => {
      const saved = loadCard(p.id);
      return saved ? [[p.id, saved]] : [];
    }),
  );
}
