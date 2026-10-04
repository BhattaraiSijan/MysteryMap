import { geoEqualEarth, type GeoProjection } from "d3-geo";
import type { Country } from "../catalog/types";

export const FLAT_WIDTH = 1000;

export type FlatCountry = {
  code: string;
  name: string;
  /** MultiPolygon rings in flat [x, y], y growing downward. */
  polygons: number[][][][];
  centre: [number, number];
  /** The diagonal of the bounding box in flat units. */
  size: number;
};

/** Vertical extent of the projected sphere, found by sampling its outline. */
function verticalBounds(projection: GeoProjection): { top: number; bottom: number } {
  let top = Infinity;
  let bottom = -Infinity;
  for (let lat = -90; lat <= 90; lat += 1) {
    for (const lng of [-180, 0, 180]) {
      const p = projection([lng, lat]);
      if (!p) continue;
      top = Math.min(top, p[1]);
      bottom = Math.max(bottom, p[1]);
    }
  }
  return { top, bottom };
}

export function projectCountries(countries: Country[]): { flat: FlatCountry[]; height: number } {
  const projection = geoEqualEarth().fitWidth(FLAT_WIDTH, { type: "Sphere" });
  const { top, bottom } = verticalBounds(projection);
  const height = bottom - top;
  const flat = countries.map((country) => {
    const polygons =
      country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const projected = polygons.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => {
          const p = projection([lng, lat]) ?? [0, 0];
          const x = p[0];
          const y = p[1] - top;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          return [x, y];
        }),
      ),
    );
    return {
      code: country.code,
      name: country.name,
      polygons: projected,
      centre: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
      size: Math.hypot(maxX - minX, maxY - minY),
    };
  });
  return { flat, height };
}
