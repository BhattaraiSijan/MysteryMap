import { expect, test } from "vitest";
import { BACKUP_KEY, SAVE_KEY, emptySave, loadSave, pruneRounds, writeSave } from "./storage";
import { newRound } from "../engine/round";
import { fakeStore } from "../test/fakeStore";

test("nothing saved gives an empty save", () => {
  expect(loadSave(fakeStore())).toEqual({ save: emptySave(), persistent: true, recovered: false });
});

test("round trip", () => {
  const store = fakeStore();
  const save = { ...emptySave(), view: "globe" as const, rounds: { beds: newRound("beds") } };
  expect(writeSave(store, save)).toBe(true);
  expect(loadSave(store)).toEqual({ save, persistent: true, recovered: false });
});

test.each([
  ["not json", "{oops"],
  ["wrong shape", '{"version":1,"rounds":7}'],
  ["bad round", '{"version":1,"rounds":{"beds":{"layerId":"beds"}},"history":{},"view":"flat"}'],
  ["newer version", '{"version":2,"rounds":{},"history":{},"view":"flat"}'],
])("%s is set aside and play starts clean", (_, raw) => {
  const store = fakeStore({ [SAVE_KEY]: raw });
  expect(loadSave(store)).toEqual({ save: emptySave(), persistent: true, recovered: true });
  expect(store.getItem(BACKUP_KEY)).toBe(raw);
  expect(store.getItem(SAVE_KEY)).toBeNull();
});

test("no store means not persistent", () => {
  expect(loadSave(null)).toMatchObject({ persistent: false, recovered: false });
  expect(writeSave(null, emptySave())).toBe(false);
});

test("a throwing store is not persistent and does not crash", () => {
  const store = fakeStore({}, { throwOnSet: true, throwOnGet: true });
  expect(loadSave(store).persistent).toBe(false);
  expect(writeSave(store, emptySave())).toBe(false);
});

test("pruning drops missing rounds and keeps history", () => {
  const save = {
    ...emptySave(),
    rounds: { beds: newRound("beds"), gone: newRound("gone") },
    history: { gone: { layerId: "gone", name: "Gone", points: 6, extremes: true, unit: false, numbers: 1 } },
  };
  const out = pruneRounds(save, new Set(["beds"]));
  expect(Object.keys(out.rounds)).toEqual(["beds"]);
  expect(out.history.gone.points).toBe(6);
});
