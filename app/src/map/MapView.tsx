import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { OrthographicView, _GlobeView as GlobeView, type PickingInfo } from "@deck.gl/core";
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Country } from "../catalog/types";
import { BORDER_COLOR, GROUP_COLORS, SEA_COLOR, SELECTED_COLOR, cssColor, type RGB } from "./colors";
import { FLAT_WIDTH, projectCountries, type FlatCountry } from "./project";

export { GLOBE_ENABLED } from "./flags";
export const SMALL_COUNTRY_SIZE = 8; // flat units
const SMALL_COUNTRY_RADIUS_PX = 14;

export type MapViewProps = {
  countries: Country[];
  groups: Record<string, number>; // by country code; a missing code is group 0
  selected: string | null;
  view: "flat" | "globe";
  onPick: (code: string) => void;
  onGlobeFailed: () => void;
};

type FlatPolygon = { code: string; polygon: number[][][] };
type Centre = { code: string; position: [number, number] };
type CountryFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { code: string }>;

const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

function withAlpha(color: RGB, alpha: number): [number, number, number, number] {
  return [color[0], color[1], color[2], alpha];
}

/** Longitude and latitude at the middle of a country's bounding box. */
function lngLatCentre(country: Country): [number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
  for (const polygon of polygons)
    for (const [x, y] of polygon[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function useContainerSize(): [React.RefObject<HTMLDivElement | null>, { width: number; height: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setSize({ width: element.clientWidth, height: element.clientHeight });
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

/** deck.gl draws the globe with a radius of 512 * 2^zoom / 2π pixels; fit it to 90% of the shorter side. */
function globeFitZoom(width: number, height: number): number {
  const radius = 0.45 * Math.min(width, height);
  return Math.log2((radius * 2 * Math.PI) / 512);
}

export function MapView({ countries, groups, selected, view, onPick, onGlobeFailed }: MapViewProps) {
  const [containerRef, { width, height }] = useContainerSize();
  const globeFailed = useRef(false);

  const projected = useMemo(() => projectCountries(countries), [countries]);
  const flatPolygons = useMemo<FlatPolygon[]>(
    () => projected.flat.flatMap((c) => c.polygons.map((polygon) => ({ code: c.code, polygon }))),
    [projected],
  );
  const flatCentres = useMemo<Centre[]>(
    () => projected.flat.filter((c) => c.size < SMALL_COUNTRY_SIZE).map((c) => ({ code: c.code, position: c.centre })),
    [projected],
  );
  const smallCodes = useMemo(() => new Set(flatCentres.map((c) => c.code)), [flatCentres]);
  const features = useMemo<CountryFeature[]>(
    () => countries.map((c) => ({ type: "Feature", properties: { code: c.code }, geometry: c.geometry })),
    [countries],
  );
  const globeCentres = useMemo<Centre[]>(
    () => countries.filter((c) => smallCodes.has(c.code)).map((c) => ({ code: c.code, position: lngLatCentre(c) })),
    [countries, smallCodes],
  );

  const fitZoom = width > 0 ? Math.log2(width / FLAT_WIDTH) : 0;
  const flatViewState = useMemo(
    () => ({
      target: [FLAT_WIDTH / 2, projected.height / 2, 0] as [number, number, number],
      zoom: fitZoom,
      minZoom: fitZoom - 0.5,
      maxZoom: fitZoom + 5,
    }),
    [fitZoom, projected.height],
  );
  const globeZoom = width > 0 && height > 0 ? globeFitZoom(width, height) : 0;
  const globeViewState = useMemo(
    () => ({ longitude: 20, latitude: 20, zoom: globeZoom, minZoom: globeZoom - 0.5, maxZoom: globeZoom + 4 }),
    [globeZoom],
  );

  const fill = (code: string): [number, number, number, number] => withAlpha(GROUP_COLORS[groups[code] ?? 0], 255);
  const pick = (info: PickingInfo) => {
    const code = (info.object as { code?: string; properties?: { code: string } } | null)?.code
      ?? (info.object as CountryFeature | null)?.properties?.code;
    if (code) onPick(code);
  };

  const layers =
    view === "flat"
      ? [
          new PolygonLayer<FlatPolygon>({
            id: "flat-countries",
            data: flatPolygons,
            getPolygon: (d) => d.polygon,
            getFillColor: (d) => fill(d.code),
            getLineColor: withAlpha(BORDER_COLOR, 255),
            getLineWidth: 0.5,
            lineWidthUnits: "pixels",
            stroked: true,
            filled: true,
            pickable: true,
            updateTriggers: { getFillColor: groups },
          }),
          new PolygonLayer<FlatPolygon>({
            id: "flat-selected",
            data: flatPolygons.filter((d) => d.code === selected),
            getPolygon: (d) => d.polygon,
            filled: false,
            stroked: true,
            getLineColor: withAlpha(SELECTED_COLOR, 255),
            getLineWidth: 2,
            lineWidthUnits: "pixels",
          }),
          new ScatterplotLayer<Centre>({
            id: "flat-small-targets",
            data: flatCentres,
            getPosition: (d) => d.position,
            getRadius: 1,
            radiusMinPixels: SMALL_COUNTRY_RADIUS_PX,
            getFillColor: TRANSPARENT,
            pickable: true,
          }),
        ]
      : [
          new GeoJsonLayer<{ code: string }>({
            id: "globe-countries",
            data: features,
            getFillColor: (f) => fill(f.properties.code),
            getLineColor: withAlpha(BORDER_COLOR, 255),
            getLineWidth: 0.5,
            lineWidthUnits: "pixels",
            stroked: true,
            filled: true,
            pickable: true,
            updateTriggers: { getFillColor: groups },
          }),
          new GeoJsonLayer<{ code: string }>({
            id: "globe-selected",
            data: features.filter((f) => f.properties.code === selected),
            filled: false,
            stroked: true,
            getLineColor: withAlpha(SELECTED_COLOR, 255),
            getLineWidth: 2,
            lineWidthUnits: "pixels",
          }),
          new ScatterplotLayer<Centre>({
            id: "globe-small-targets",
            data: globeCentres,
            getPosition: (d) => d.position,
            getRadius: 1,
            radiusMinPixels: SMALL_COUNTRY_RADIUS_PX,
            getFillColor: TRANSPARENT,
            pickable: true,
          }),
        ];

  const deckView = useMemo(
    () => (view === "flat" ? new OrthographicView({ id: "flat", flipY: true, controller: true }) : new GlobeView({ id: "globe", controller: true })),
    [view],
  );

  return (
    <div
      ref={containerRef}
      className="map-view"
      data-view={view}
      role="img"
      aria-label="World map coloured by the hidden measure"
      style={{ background: cssColor(SEA_COLOR) }}
    >
      {width > 0 && (
        <DeckGL
          key={`${view}-${Math.round(width)}`}
          views={deckView}
          initialViewState={view === "flat" ? flatViewState : globeViewState}
          controller={true}
          layers={layers}
          onHover={pick}
          onClick={pick}
          getCursor={({ isDragging, isHovering }) => (isDragging ? "grabbing" : isHovering ? "pointer" : "grab")}
          onError={() => {
            if (view === "globe" && !globeFailed.current) {
              globeFailed.current = true;
              onGlobeFailed();
            }
          }}
          style={{ position: "relative", width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}

export type { FlatCountry };
