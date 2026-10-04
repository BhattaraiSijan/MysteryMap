import { CATALOG_VERSION, type Catalog, type Country, type Layer } from "./types";

export class CatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogLoadError";
  }
}

export class CatalogTooNewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogTooNewError";
  }
}

const WRONG_OPTIONS = 5;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function fail(where: string, what: string): never {
  throw new CatalogLoadError(`${where}: ${what}`);
}

function str(obj: Record<string, unknown>, key: string, where: string): string {
  const v = obj[key];
  if (typeof v !== "string" || v === "") fail(where, `missing ${key}`);
  return v;
}

function num(obj: Record<string, unknown>, key: string, where: string): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) fail(where, `missing ${key}`);
  return v;
}

function strings(v: unknown, where: string, key: string): string[] {
  if (!Array.isArray(v) || !v.every((s) => typeof s === "string")) fail(where, `${key} must be a list of codes`);
  return v;
}

function numbers(v: unknown, where: string, key: string): Record<string, number> {
  if (!isRecord(v)) fail(where, `${key} must be a map`);
  for (const [k, n] of Object.entries(v)) {
    if (typeof n !== "number" || !Number.isFinite(n)) fail(where, `${key}.${k} is not a number`);
  }
  return v as Record<string, number>;
}

function parseLayer(raw: unknown, index: number): Layer {
  if (!isRecord(raw)) fail(`layer ${index}`, "not an object");
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : fail(`layer ${index}`, "missing id");
  const where = `layer ${id}`;
  const source = raw.source;
  if (!isRecord(source)) fail(where, "missing source");
  const extremes = raw.extremes;
  if (!isRecord(extremes)) fail(where, "missing extremes");
  const values = numbers(raw.values, where, "values");
  const groups = numbers(raw.groups, where, "groups");
  for (const g of Object.values(groups)) {
    if (!Number.isInteger(g) || g < 1 || g > 5) fail(where, "groups must be whole numbers from 1 to 5");
  }
  const wrongOptions = strings(raw.wrongOptions, where, "wrongOptions");
  if (wrongOptions.length !== WRONG_OPTIONS) fail(where, `needs exactly ${WRONG_OPTIONS} wrong options`);
  if (wrongOptions.includes(id)) fail(where, "lists itself as a wrong option");
  if (new Set(wrongOptions).size !== wrongOptions.length) fail(where, "repeats a wrong option");
  return {
    id,
    number: num(raw, "number", where),
    name: str(raw, "name", where),
    definition: str(raw, "definition", where),
    unit: str(raw, "unit", where),
    year: str(raw, "year", where),
    source: {
      name: str(source, "name", where),
      url: str(source, "url", where),
      licence: str(source, "licence", where),
    },
    values,
    groups,
    extremes: { high: strings(extremes.high, where, "extremes.high"), low: strings(extremes.low, where, "extremes.low") },
    wrongOptions,
    explanation: str(raw, "explanation", where),
  };
}

export function parseCatalog(raw: unknown): Catalog {
  if (!isRecord(raw)) fail("catalog", "not an object");
  if (typeof raw.version !== "number") fail("catalog", "missing version");
  if (raw.version > CATALOG_VERSION) throw new CatalogTooNewError(`catalog version ${raw.version} is newer than ${CATALOG_VERSION}`);
  if (!Array.isArray(raw.layers)) fail("catalog", "missing layers");
  const layers = raw.layers.map(parseLayer);
  const ids = new Set(layers.map((l) => l.id));
  if (ids.size !== layers.length) fail("catalog", "repeated layer id");
  for (const layer of layers) {
    for (const option of layer.wrongOptions) {
      if (!ids.has(option)) fail(`layer ${layer.id}`, `wrong option ${option} is not in the catalog`);
    }
  }
  return { version: raw.version, layers };
}

export function parseCountries(raw: unknown): Country[] {
  if (!isRecord(raw) || !Array.isArray(raw.countries)) fail("countries", "missing countries");
  return raw.countries.map((c, i) => {
    if (!isRecord(c)) fail(`country ${i}`, "not an object");
    const code = str(c, "code", `country ${i}`);
    const iso = c.iso === null ? null : typeof c.iso === "string" ? c.iso : fail(`country ${code}`, "bad iso");
    const geometry = c.geometry;
    if (!isRecord(geometry) || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      fail(`country ${code}`, "geometry must be a Polygon or MultiPolygon");
    }
    return { code, iso, name: str(c, "name", `country ${code}`), geometry: geometry as unknown as Country["geometry"] };
  });
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    throw new CatalogLoadError(`${url}: ${(e as Error).message}`);
  }
  if (!response.ok) throw new CatalogLoadError(`${url}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (e) {
    throw new CatalogLoadError(`${url}: ${(e as Error).message}`);
  }
}

export async function loadData(baseUrl: string): Promise<{ catalog: Catalog; countries: Country[] }> {
  const [rawCatalog, rawCountries] = await Promise.all([
    fetchJson(`${baseUrl}/catalog.json`),
    fetchJson(`${baseUrl}/countries.json`),
  ]);
  return { catalog: parseCatalog(rawCatalog), countries: parseCountries(rawCountries) };
}
