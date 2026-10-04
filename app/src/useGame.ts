import { useCallback, useMemo, useState } from "react";
import type { Catalog, Country } from "./catalog/types";
import { applyAction, newRound } from "./engine/round";
import type { Action, Result } from "./engine/types";
import { loadSave, pruneRounds, writeSave, type Save } from "./storage/storage";

export type Game = {
  catalog: Catalog;
  countries: Country[];
  save: Save;
  persistent: boolean;
  recovered: boolean;
  /** Applies the action, records history on a solve, writes the save. */
  act: (layerId: string, action: Action) => Result;
  setView: (view: "flat" | "globe") => void;
};

export function useGame(data: { catalog: Catalog; countries: Country[] }, store: Storage | null): Game {
  const { catalog, countries } = data;
  const [initial] = useState(() => {
    const loaded = loadSave(store);
    const save = pruneRounds(loaded.save, new Set(catalog.layers.map((l) => l.id)));
    return { ...loaded, save };
  });
  const [save, setSave] = useState<Save>(initial.save);
  const [persistent, setPersistent] = useState(initial.persistent);
  const layersById = useMemo(() => new Map(catalog.layers.map((l) => [l.id, l])), [catalog]);

  const commit = useCallback(
    (next: Save) => {
      setSave(next);
      if (!writeSave(store, next)) setPersistent(false);
    },
    [store],
  );

  const act = useCallback(
    (layerId: string, action: Action): Result => {
      const layer = layersById.get(layerId);
      if (!layer) return { ok: false, reason: "notAnOption" };
      const current = save.rounds[layerId] ?? newRound(layerId);
      const result = applyAction(current, action, layer);
      if (!result.ok) return result;
      const next: Save = { ...save, rounds: { ...save.rounds, [layerId]: result.state } };
      if (result.state.status === "solved" && current.status !== "solved") {
        next.history = {
          ...save.history,
          [layerId]: {
            layerId,
            name: layer.name,
            points: result.state.points,
            extremes: result.state.extremesBought,
            unit: result.state.unitBought,
            numbers: result.state.numbersBought.length,
          },
        };
      }
      commit(next);
      return result;
    },
    [save, layersById, commit],
  );

  const setView = useCallback(
    (view: "flat" | "globe") => {
      if (view !== save.view) commit({ ...save, view });
    },
    [save, commit],
  );

  return { catalog, countries, save, persistent, recovered: initial.recovered, act, setView };
}
