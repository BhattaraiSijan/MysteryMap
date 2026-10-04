export type Layer = {
  id: string;
  number: number;
  name: string;
  definition: string;
  unit: string;
  year: string;
  source: { name: string; url: string; licence: string };
  values: Record<string, number>;
  groups: Record<string, number>;
  extremes: { high: string[]; low: string[] };
  wrongOptions: string[];
  explanation: string;
};

export type Catalog = { version: number; layers: Layer[] };

export type Country = {
  code: string;
  iso: string | null;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

export const CATALOG_VERSION = 1;
