import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useGame } from "./useGame";
import { SAVE_KEY, emptySave, writeSave } from "./storage/storage";
import { newRound } from "./engine/round";
import { fakeStore } from "./test/fakeStore";
import { fixtureCatalog } from "./test/fixtures/catalog";
import { fixtureCountries } from "./test/fixtures/countries";

const fixtureData = { catalog: fixtureCatalog, countries: fixtureCountries };

test("a solve writes history and the save", () => {
  const store = fakeStore();
  const { result } = renderHook(() => useGame(fixtureData, store));
  act(() => {
    result.current.act("beds", { type: "buyNumber", code: "JPN" });
  });
  act(() => {
    result.current.act("beds", { type: "guess", optionId: "beds" });
  });
  expect(result.current.save.history.beds).toEqual({ layerId: "beds", name: "Hospital beds", points: 9, extremes: false, unit: false, numbers: 1 });
  expect(JSON.parse(store.getItem(SAVE_KEY)!).rounds.beds.status).toBe("solved");
  expect(result.current.persistent).toBe(true);
});

test("a failed write flips persistent off and play goes on", () => {
  const { result } = renderHook(() => useGame(fixtureData, fakeStore({}, { throwOnSet: true })));
  act(() => {
    result.current.act("beds", { type: "buyExtremes" });
  });
  expect(result.current.persistent).toBe(false);
  expect(result.current.save.rounds.beds.points).toBe(9);
});

test("rounds for missing layers are pruned on load, history is kept", () => {
  const store = fakeStore();
  writeSave(store, {
    ...emptySave(),
    rounds: { beds: newRound("beds"), gone: newRound("gone") },
    history: { gone: { layerId: "gone", name: "Gone", points: 4, extremes: false, unit: true, numbers: 0 } },
  });
  const { result } = renderHook(() => useGame(fixtureData, store));
  expect(Object.keys(result.current.save.rounds)).toEqual(["beds"]);
  expect(result.current.save.history.gone.points).toBe(4);
});

test("the view is saved", () => {
  const store = fakeStore();
  const { result } = renderHook(() => useGame(fixtureData, store));
  act(() => result.current.setView("globe"));
  expect(JSON.parse(store.getItem(SAVE_KEY)!).view).toBe("globe");
});

test("refusals do not write", () => {
  const store = fakeStore({}, { throwOnSet: true });
  const { result } = renderHook(() => useGame(fixtureData, store));
  let r;
  act(() => {
    r = result.current.act("beds", { type: "buyNumber", code: "PSE" });
  });
  expect(r).toEqual({ ok: false, reason: "noData" });
  expect(result.current.persistent).toBe(true);
});
