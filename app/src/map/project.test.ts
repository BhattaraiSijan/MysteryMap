import { expect, test } from "vitest";
import { FLAT_WIDTH, projectCountries } from "./project";
import { fixtureCountries } from "../test/fixtures/countries";

const { flat, height } = projectCountries(fixtureCountries);

function shoelaceArea(polygons: number[][][][]): number {
  let total = 0;
  for (const polygon of polygons) {
    polygon.forEach((ring, i) => {
      let a = 0;
      for (let j = 0; j < ring.length - 1; j++) a += ring[j][0] * ring[j + 1][1] - ring[j + 1][0] * ring[j][1];
      total += (i === 0 ? 1 : -1) * Math.abs(a / 2);
    });
  }
  return total;
}

const area = (code: string) => shoelaceArea(flat.find((c) => c.code === code)!.polygons);

test("the projection keeps areas honest", () => {
  // Real ratio of Greenland to DR Congo is about 0.92. Web Mercator would give more than 10.
  const ratio = area("GRL") / area("COD");
  expect(ratio).toBeGreaterThan(0.8);
  expect(ratio).toBeLessThan(1.05);
});

test("everything lands inside the frame", () => {
  expect(height).toBeGreaterThan(400);
  expect(height).toBeLessThan(600);
  for (const c of flat)
    for (const poly of c.polygons)
      for (const ring of poly)
        for (const [x, y] of ring) {
          expect(x).toBeGreaterThanOrEqual(-0.01);
          expect(x).toBeLessThanOrEqual(FLAT_WIDTH + 0.01);
          expect(y).toBeGreaterThanOrEqual(-0.01);
          expect(y).toBeLessThanOrEqual(height + 0.01);
        }
});

test("north is up", () => {
  const y = (code: string) => flat.find((c) => c.code === code)!.centre[1];
  expect(y("GRL")).toBeLessThan(y("COD"));
  expect(y("COD")).toBeLessThan(y("AUS"));
});

test("size separates small from large", () => {
  const size = (code: string) => flat.find((c) => c.code === code)!.size;
  expect(size("PSE")).toBeLessThan(8);
  expect(size("COD")).toBeGreaterThan(8);
});
