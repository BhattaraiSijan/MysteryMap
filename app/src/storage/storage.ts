import type { RoundState } from "../engine/types";
import { migrations } from "./migrations";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "mystery-map.save";
export const BACKUP_KEY = "mystery-map.save.backup";

export type HistoryEntry = {
  layerId: string;
  name: string;
  points: number;
  extremes: boolean;
  unit: boolean;
  numbers: number;
};

export type Save = {
  version: 1;
  rounds: Record<string, RoundState>;
  history: Record<string, HistoryEntry>;
  view: "flat" | "globe";
};

export type LoadResult = { save: Save; persistent: boolean; recovered: boolean };

export function emptySave(): Save {
  return { version: 1, rounds: {}, history: {}, view: "flat" };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isRound(x: unknown): x is RoundState {
  return (
    isRecord(x) &&
    typeof x.layerId === "string" &&
    typeof x.points === "number" &&
    typeof x.extremesBought === "boolean" &&
    typeof x.unitBought === "boolean" &&
    Array.isArray(x.numbersBought) &&
    Array.isArray(x.wrongGuesses) &&
    (x.status === "playing" || x.status === "solved")
  );
}

function isHistory(x: unknown): x is HistoryEntry {
  return (
    isRecord(x) &&
    typeof x.layerId === "string" &&
    typeof x.name === "string" &&
    typeof x.points === "number" &&
    typeof x.extremes === "boolean" &&
    typeof x.unit === "boolean" &&
    typeof x.numbers === "number"
  );
}

function asSave(x: unknown): Save | null {
  if (!isRecord(x) || x.version !== SAVE_VERSION) return null;
  if (!isRecord(x.rounds) || !Object.values(x.rounds).every(isRound)) return null;
  if (!isRecord(x.history) || !Object.values(x.history).every(isHistory)) return null;
  if (x.view !== "flat" && x.view !== "globe") return null;
  return { version: 1, rounds: x.rounds as Save["rounds"], history: x.history as Save["history"], view: x.view };
}

function setAside(store: Storage, raw: string): void {
  try {
    store.setItem(BACKUP_KEY, raw);
    store.removeItem(SAVE_KEY);
  } catch {
    // The round can still be played; the note about saving tells the player.
  }
}

export function loadSave(store: Storage | null): LoadResult {
  const fresh = emptySave();
  if (!store) return { save: fresh, persistent: false, recovered: false };
  let raw: string | null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return { save: fresh, persistent: false, recovered: false };
  }
  if (raw === null) return { save: fresh, persistent: true, recovered: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    setAside(store, raw);
    return { save: fresh, persistent: true, recovered: true };
  }
  if (isRecord(parsed) && typeof parsed.version === "number" && parsed.version < SAVE_VERSION) {
    for (let v = parsed.version; v < SAVE_VERSION; v++) parsed = migrations[v - 1](parsed);
  }
  const save = asSave(parsed);
  if (!save) {
    setAside(store, raw);
    return { save: fresh, persistent: true, recovered: true };
  }
  return { save, persistent: true, recovered: false };
}

export function writeSave(store: Storage | null, save: Save): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Drops rounds for layers that are no longer in the catalog. History is kept. */
export function pruneRounds(save: Save, layerIds: Set<string>): Save {
  const rounds = Object.fromEntries(Object.entries(save.rounds).filter(([id]) => layerIds.has(id)));
  return { ...save, rounds };
}
