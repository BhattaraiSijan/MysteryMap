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
  /** Where a name belongs: the centroid of the largest polygon, so islands and the date line do not pull it away. */
  labelAt: [number, number];
  /** The diagonal of the largest polygon's bounding box, in flat units. */
  labelSize: number;
};

/** Signed shoelace area and centroid of a ring. */
export function ringCentroid(ring: number[][]): { area: number; centroid: [number, number] } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (a === 0) return { area: 0, centroid: [ring[0][0], ring[0][1]] };
  return { area: Math.abs(a / 2), centroid: [cx / (3 * a), cy / (3 * a)] };
}

/** Index of the polygon with the largest outer ring. */
export function largestPolygon(polygons: number[][][][]): number {
  let best = 0;
  let bestArea = -1;
  polygons.forEach((polygon, i) => {
    const { area } = ringCentroid(polygon[0]);
    if (area > bestArea) {
      bestArea = area;
      best = i;
    }
  });
  return best;
}

function diagonal(ring: number[][]): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.hypot(maxX - minX, maxY - minY);
}

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
    const main = projected[largestPolygon(projected)][0];
    return {
      code: country.code,
      name: country.name,
      polygons: projected,
      centre: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
      size: Math.hypot(maxX - minX, maxY - minY),
      labelAt: ringCentroid(main).centroid,
      labelSize: diagonal(main),
    };
  });
  return { flat, height };
}
