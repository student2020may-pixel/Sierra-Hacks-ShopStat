// The shop's DRP programs. Each has its own scorecard (its own KPIs and targets), and an estimate is
// graded against the scorecard of the insurer it's written for.
import { KPIS } from "./kpis";
import { load, remove, save, SCORE_FILE_KEY, SCORE_KEY } from "./storage";
import type { Kpi, SlotCard } from "./types";

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

// v3: values by KPI id against the built-in KPI list. Older shapes are dropped, not converted.
const slotKey = (id: ProgramId) => `${SCORE_KEY}:v3:${id}`;
const fileKey = (id: ProgramId) => `${SCORE_FILE_KEY}:v3:${id}`;
const OLD_KEYS = [
  SCORE_KEY,
  SCORE_FILE_KEY,
  ...["state-farm", "csaa", "geico", "other", "v2:csaa", "v2:geico", "v2:travelers", "v2:farmers"].flatMap((id) => [`${SCORE_KEY}:${id}`, `${SCORE_FILE_KEY}:${id}`]),
];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNumOrNull = (v: unknown) => v === null || typeof v === "number";

function isSlotCard(v: unknown): v is SlotCard {
  return (
    isObject(v) &&
    (v.source === "ai" || v.source === "manual" || v.source === "sample") &&
    isNumOrNull(v.claims) &&
    isObject(v.values) &&
    Object.values(v.values).every((x) => isObject(x) && isNumOrNull(x.value) && isNumOrNull(x.target))
  );
}

/** Every KPI on the list, with this insurer's numbers where it has them (blank ones are inactive). */
export function slotKpis(card: SlotCard | null): Kpi[] {
  return KPIS.map((d) => {
    const v = card?.values[d.id];
    return {
      id: d.id,
      label: d.name,
      unit: d.unit,
      higherIsBetter: d.higherIsBetter,
      kind: d.kind,
      confirmed: d.confirmed,
      value: v?.value ?? null,
      target: v?.target ?? null,
      edited: v?.edited,
    };
  });
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
