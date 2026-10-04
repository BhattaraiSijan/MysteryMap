import fc from "fast-check";
import { expect, test } from "vitest";
import { applyAction, newRound } from "./round";
import type { Action } from "./types";
import { fixtureLayer } from "../test/fixtures/catalog";
import { arbitraryAction } from "../test/arbitraries";

const beds = fixtureLayer("beds");
const play = (...actions: Action[]) =>
  actions.reduce((s, a) => {
    const r = applyAction(s, a, beds);
    return r.ok ? r.state : s;
  }, newRound("beds"));

test("starts at 10 and playing", () => {
  expect(newRound("beds")).toMatchObject({ points: 10, status: "playing", numbersBought: [], wrongGuesses: [] });
});

test("extremes cost 1, once", () => {
  const s = play({ type: "buyExtremes" });
  expect(s.points).toBe(9);
  expect(applyAction(s, { type: "buyExtremes" }, beds)).toEqual({ ok: false, reason: "alreadyBought" });
});

test("a number costs 1 per country, once per country", () => {
  const s = play({ type: "buyNumber", code: "JPN" });
  expect(s).toMatchObject({ points: 9, numbersBought: ["JPN"] });
  expect(applyAction(s, { type: "buyNumber", code: "JPN" }, beds)).toEqual({ ok: false, reason: "alreadyBought" });
  expect(play({ type: "buyNumber", code: "JPN" }, { type: "buyNumber", code: "MLI" }).points).toBe(8);
});

test("a country with no data costs nothing", () => {
  expect(applyAction(newRound("beds"), { type: "buyNumber", code: "PSE" }, beds)).toEqual({ ok: false, reason: "noData" });
});

test("the unit costs 3", () => {
  expect(play({ type: "buyUnit" }).points).toBe(7);
});

test("a wrong guess costs 3 and is struck", () => {
  const s = play({ type: "guess", optionId: "age" });
  expect(s).toMatchObject({ points: 7, wrongGuesses: ["age"], status: "playing" });
  expect(applyAction(s, { type: "guess", optionId: "age" }, beds)).toEqual({ ok: false, reason: "alreadyStruck" });
});

test("an unknown option is refused", () => {
  expect(applyAction(newRound("beds"), { type: "guess", optionId: "cold" }, beds)).toEqual({ ok: false, reason: "notAnOption" });
});

test("a right guess solves and keeps the points", () => {
  const s = play({ type: "buyUnit" }, { type: "guess", optionId: "beds" });
  expect(s).toMatchObject({ points: 7, status: "solved" });
  expect(applyAction(s, { type: "buyExtremes" }, beds)).toEqual({ ok: false, reason: "solved" });
});

test("points stop at 0", () => {
  const wrongFour = ["age", "rain", "cars", "fish"].map((optionId) => ({ type: "guess", optionId }) as Action);
  expect(play(...wrongFour).points).toBe(0); // 10, 7, 4, 1, 0
  expect(play(...wrongFour, { type: "buyExtremes" })).toMatchObject({ points: 0, extremesBought: true });
});

test("any sequence keeps points in range and refusals change nothing", () => {
  fc.assert(
    fc.property(fc.array(arbitraryAction(beds), { maxLength: 40 }), (actions) => {
      let s = newRound("beds");
      for (const a of actions) {
        const before = structuredClone(s);
        const r = applyAction(s, a, beds);
        expect(s).toEqual(before);
        if (r.ok) s = r.state;
        expect(s.points).toBeGreaterThanOrEqual(0);
        expect(s.points).toBeLessThanOrEqual(10);
      }
    }),
  );
});
