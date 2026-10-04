import { afterEach, expect, test, vi } from "vitest";
import { CatalogLoadError, CatalogTooNewError, loadData, parseCatalog, parseCountries } from "./load";
import type { Layer } from "./types";
import { fixtureCatalog } from "../test/fixtures/catalog";
import { fixtureCountries } from "../test/fixtures/countries";

function withLayer(id: string, changes: Partial<Layer>) {
  return { ...fixtureCatalog, layers: fixtureCatalog.layers.map((l) => (l.id === id ? { ...l, ...changes } : l)) };
}

function withoutField(id: string, field: keyof Layer) {
  return {
    ...fixtureCatalog,
    layers: fixtureCatalog.layers.map((l) => {
      if (l.id !== id) return l;
      const copy: Partial<Layer> = { ...l };
      delete copy[field];
      return copy;
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

test("accepts the fixture", () => {
  expect(parseCatalog(fixtureCatalog).layers).toHaveLength(7);
  expect(parseCountries({ version: 1, countries: fixtureCountries })).toHaveLength(fixtureCountries.length);
});

test("rejects a newer version", () => {
  expect(() => parseCatalog({ ...fixtureCatalog, version: 2 })).toThrow(CatalogTooNewError);
});

test("rejects a wrong option that is not a layer", () => {
  const bad = withLayer("beds", { wrongOptions: ["age", "rain", "cars", "fish", "ghost"] });
  expect(() => parseCatalog(bad)).toThrow(CatalogLoadError);
});

test("rejects a layer without exactly five wrong options", () => {
  expect(() => parseCatalog(withLayer("beds", { wrongOptions: ["age", "rain"] }))).toThrow(CatalogLoadError);
});

test("rejects a layer that lists itself", () => {
  expect(() => parseCatalog(withLayer("beds", { wrongOptions: ["beds", "age", "rain", "cars", "fish"] }))).toThrow(CatalogLoadError);
});

test("rejects a missing field", () => {
  expect(() => parseCatalog(withoutField("beds", "unit"))).toThrow(CatalogLoadError);
  expect(() => parseCatalog(withoutField("beds", "groups"))).toThrow(CatalogLoadError);
});

test("rejects a group outside 1 to 5", () => {
  expect(() => parseCatalog(withLayer("beds", { groups: { JPN: 6 } }))).toThrow(CatalogLoadError);
});

test("rejects rubbish", () => {
  expect(() => parseCatalog(null)).toThrow(CatalogLoadError);
  expect(() => parseCatalog("{}")).toThrow(CatalogLoadError);
  expect(() => parseCountries({ countries: [{ code: "X" }] })).toThrow(CatalogLoadError);
});

test("a failed request is a load error", async () => {
  vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
  await expect(loadData("/data")).rejects.toThrow(CatalogLoadError);
});

test("a network failure is a load error", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await expect(loadData("/data")).rejects.toThrow(CatalogLoadError);
});

test("loadData fetches both files from the base url", async () => {
  const urls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    urls.push(url);
    const body = url.endsWith("catalog.json") ? fixtureCatalog : { version: 1, countries: fixtureCountries };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  const data = await loadData("./data");
  expect(urls.sort()).toEqual(["./data/catalog.json", "./data/countries.json"]);
  expect(data.catalog.layers).toHaveLength(7);
  expect(data.countries.map((c) => c.code)).toContain("PSE");
});
