import type { Catalog, Layer } from "../../catalog/types";

type Code = "JPN" | "MLI" | "PSE" | "FRA" | "BRA" | "IND" | "AUS" | "GRL" | "COD" | "FJI";

function values(entries: Partial<Record<Code, number>>): Record<string, number> {
  return Object.fromEntries(Object.entries(entries));
}

function groups(values: Record<string, number>): Record<string, number> {
  const sorted = Object.values(values).sort((a, b) => a - b);
  const n = sorted.length;
  return Object.fromEntries(
    Object.entries(values).map(([code, v]) => {
      const r = sorted.findIndex((x) => x >= v);
      return [code, Math.min(5, 1 + Math.floor((5 * r) / n))];
    }),
  );
}

function extremes(values: Record<string, number>) {
  const codes = Object.keys(values);
  const asc = [...codes].sort((a, b) => values[a] - values[b] || a.localeCompare(b));
  const desc = [...codes].sort((a, b) => values[b] - values[a] || a.localeCompare(b));
  return { high: desc.slice(0, 3), low: asc.slice(0, 3) };
}

function layer(
  id: string,
  number: number,
  name: string,
  definition: string,
  unit: string,
  wrongOptions: string[],
  v: Record<string, number>,
): Layer {
  return {
    id,
    number,
    name,
    definition,
    unit,
    year: "2020",
    source: { name: "Fixture", url: "https://example.com", licence: "CC0" },
    values: v,
    groups: groups(v),
    extremes: extremes(v),
    wrongOptions,
    explanation: `${name} is a fixture layer. It exists only for the tests.`,
  };
}

export const fixtureCatalog: Catalog = {
  version: 1,
  layers: [
    layer("beds", 1, "Hospital beds", "Beds per 1,000 people", "A count for every 1,000 people.", ["age", "rain", "cars", "fish", "rail"],
      values({ JPN: 13.05, MLI: 0.1, FRA: 5.9, BRA: 2.1, IND: 0.5, AUS: 3.8, GRL: 2.5, COD: 0.8, FJI: 2.0 })),
    layer("age", 2, "Median age", "Median age of the population in years", "Years of age.", ["beds", "rain", "cars", "fish", "cold"],
      values({ JPN: 48.2, MLI: 16.4, PSE: 20.4, FRA: 42, BRA: 33.5, IND: 28.4, AUS: 37.9, GRL: 34.3, COD: 17, FJI: 28.6 })),
    layer("rain", 3, "Rainfall", "Average yearly rainfall in millimetres", "Millimetres of water a year.", ["beds", "age", "cars", "rail", "cold"],
      values({ JPN: 1668, MLI: 282, PSE: 402, FRA: 867, BRA: 1761, IND: 1083, AUS: 534, GRL: 400, COD: 1543, FJI: 2592 })),
    layer("cars", 4, "Cars", "Cars per 1,000 people", "A count for every 1,000 people.", ["beds", "age", "rain", "fish", "rail"],
      values({ JPN: 591, MLI: 12, PSE: 95, FRA: 569, BRA: 350, IND: 22, AUS: 747, GRL: 150, COD: 5, FJI: 170 })),
    layer("fish", 5, "Fish eaten", "Kilograms of fish eaten per person a year", "Kilograms a person a year.", ["beds", "age", "cars", "rail", "cold"],
      values({ JPN: 45.9, MLI: 9.6, PSE: 4.8, FRA: 33.6, BRA: 9.1, IND: 7.1, AUS: 26.3, GRL: 86.3, COD: 5.4, FJI: 36.8 })),
    layer("rail", 6, "Railway length", "Kilometres of railway per 1,000 square kilometres", "Kilometres for every 1,000 square kilometres.", ["beds", "age", "rain", "cars", "fish"],
      values({ JPN: 73.8, MLI: 0.5, PSE: 0, FRA: 51.6, BRA: 3.5, IND: 20.7, AUS: 4.3, GRL: 0, COD: 1.7, FJI: 32.7 })),
    layer("cold", 7, "Cold days", "Days a year below freezing in the capital", "A count of days a year.", ["age", "rain", "cars", "fish", "rail"],
      values({ JPN: 25, MLI: 0, PSE: 2, FRA: 20, BRA: 0, IND: 0, AUS: 1, GRL: 240, COD: 0, FJI: 0 })),
  ],
};

export function fixtureLayer(id: string): Layer {
  const found = fixtureCatalog.layers.find((l) => l.id === id);
  if (!found) throw new Error(`no fixture layer ${id}`);
  return found;
}
