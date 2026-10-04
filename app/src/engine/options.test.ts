import { expect, test } from "vitest";
import { optionsFor } from "./options";
import { fixtureCatalog, fixtureLayer } from "../test/fixtures/catalog";

test("six options, answer included, stable order", () => {
  const a = optionsFor(fixtureLayer("beds"), fixtureCatalog);
  expect(a.map((o) => o.id).sort()).toEqual(["age", "beds", "cars", "fish", "rail", "rain"]);
  expect(optionsFor(fixtureLayer("beds"), fixtureCatalog)).toEqual(a);
  expect(a.find((o) => o.id === "age")).toEqual({ id: "age", name: "Median age", definition: "Median age of the population in years" });
});

test("the answer is not always in the same place", () => {
  const positions = fixtureCatalog.layers.map((l) => optionsFor(l, fixtureCatalog).findIndex((o) => o.id === l.id));
  expect(new Set(positions).size).toBeGreaterThan(1);
});
