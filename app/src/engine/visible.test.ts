import fc from "fast-check";
import { expect, test } from "vitest";
import { optionsFor } from "./options";
import { applyAction, newRound } from "./round";
import { visible } from "./visible";
import { fixtureCatalog, fixtureLayer } from "../test/fixtures/catalog";
import { arbitraryAction } from "../test/arbitraries";

const beds = fixtureLayer("beds");
const opts = optionsFor(beds, fixtureCatalog);

test("a fresh round shows groups and nothing else", () => {
  const v = visible(newRound("beds"), beds, opts);
  expect(v.groups).toEqual(beds.groups);
  expect(v).toMatchObject({ values: {}, extremes: null, unit: null, answer: null });
  expect(v.options.every((o) => !o.struck)).toBe(true);
  expect(v.options).toHaveLength(6);
});

test("bought items appear, and only those", () => {
  const v = visible({ ...newRound("beds"), numbersBought: ["JPN"], extremesBought: true, wrongGuesses: ["age"] }, beds, opts);
  expect(v.values).toEqual({ JPN: 13.05 });
  expect(v.extremes).toEqual(beds.extremes);
  expect(v.unit).toBeNull();
  expect(v.answer).toBeNull();
  expect(v.options.find((o) => o.id === "age")!.struck).toBe(true);
  expect(v.options.find((o) => o.id === "rain")!.struck).toBe(false);
});

test("a solved round shows everything", () => {
  const v = visible({ ...newRound("beds"), status: "solved" }, beds, opts);
  expect(v.values).toEqual(beds.values);
  expect(v.unit).toBe(beds.unit);
  expect(v.extremes).toEqual(beds.extremes);
  expect(v.answer).toMatchObject({ name: "Hospital beds", explanation: beds.explanation, year: "2020" });
});

test("while playing, no unbought value is ever shown", () => {
  fc.assert(
    fc.property(fc.array(arbitraryAction(beds), { maxLength: 40 }), (actions) => {
      let s = newRound("beds");
      for (const a of actions) {
        const r = applyAction(s, a, beds);
        if (r.ok) s = r.state;
        if (s.status === "playing") {
          const v = visible(s, beds, opts);
          expect(Object.keys(v.values).sort()).toEqual([...s.numbersBought].sort());
          expect(v.answer).toBeNull();
          if (!s.unitBought) expect(v.unit).toBeNull();
        }
      }
    }),
  );
});
