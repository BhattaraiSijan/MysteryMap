import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { OrthographicView, _GlobeView as GlobeView, _GlobeViewport as GlobeViewport, type PickingInfo } from "@deck.gl/core";
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Country } from "../catalog/types";
import { BORDER_COLOR, GROUP_COLORS, SEA_COLOR, SELECTED_COLOR, cssColor, type RGB } from "./colors";
import { FLAT_WIDTH, largestPolygon, projectCountries, ringCentroid, type FlatCountry } from "./project";

export { GLOBE_ENABLED } from "./flags";
export const SMALL_COUNTRY_SIZE = 8; // flat units
const SMALL_COUNTRY_RADIUS_PX = 14;
/** A name is drawn once its country spans at least this many pixels on screen. */
const LABEL_MIN_PX = 48;
/** The globe draws 512 * 2^zoom pixels around the equator; the flat map draws FLAT_WIDTH * 2^zoom across. */
const GLOBE_PX_PER_FLAT_UNIT = 512 / FLAT_WIDTH;

export type MapViewProps = {
  countries: Country[];
  groups: Record<string, number>; // by country code; a missing code is group 0
  selected: string | null;
  view: "flat" | "globe";
  /** Draw country names on the map. */
  labels?: boolean;
  onPick: (code: string) => void;
  onGlobeFailed: () => void;
};

type FlatPolygon = { code: string; polygon: number[][][] };
type Centre = { code: string; position: [number, number] };
type Label = { code: string; name: string; position: [number, number]; size: number };
type GlobeState = { longitude: number; latitude: number; zoom: number };
/** A globe label is drawn while it is within this many degrees of the point facing the camera. */
const GLOBE_VISIBLE_DEGREES = 75;

/** Great-circle distance in degrees between two points. */
function angularDistance(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const [lng1, lat1] = [a[0] * toRad, a[1] * toRad];
  const [lng2, lat2] = [b[0] * toRad, b[1] * toRad];
  const cos = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng1 - lng2);
  return Math.acos(Math.max(-1, Math.min(1, cos))) / toRad;
}

/** Longitude and latitude of the centroid of a country's largest polygon. */
function lngLatLabel(country: Country): [number, number] {
  const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
  return ringCentroid(polygons[largestPolygon(polygons)][0]).centroid;
}
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

export function MapView({ countries, groups, selected, view, labels = true, onPick, onGlobeFailed }: MapViewProps) {
  const [containerRef, { width, height }] = useContainerSize();
  const globeFailed = useRef(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [globeState, setGlobeState] = useState<GlobeState | null>(null);

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
  const flatLabels = useMemo<Label[]>(
    () => projected.flat.map((c) => ({ code: c.code, name: c.name, position: c.labelAt, size: c.labelSize })),
    [projected],
  );
  const globeLabels = useMemo<Label[]>(() => {
    const sizeOf = new Map(projected.flat.map((c) => [c.code, c.labelSize]));
    return countries.map((c) => ({ code: c.code, name: c.name, position: lngLatLabel(c), size: sizeOf.get(c.code) ?? 0 }));
  }, [countries, projected]);

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
  const currentZoom = zoom ?? (view === "flat" ? fitZoom : globeZoom);
  const pxPerUnit = Math.pow(2, currentZoom) * (view === "flat" ? 1 : GLOBE_PX_PER_FLAT_UNIT);
  const labelData = (all: Label[]) => (labels ? all.filter((l) => l.size * pxPerUnit >= LABEL_MIN_PX || l.code === selected) : []);
  // deck.gl's globe view does not draw text, so globe names are HTML placed with the globe's own projection.
  const globeOverlay = useMemo(() => {
    if (view !== "globe" || width === 0 || height === 0) return [];
    const state = globeState ?? globeViewState;
    const viewport = new GlobeViewport({ width, height, longitude: state.longitude, latitude: state.latitude, zoom: state.zoom });
    const centre: [number, number] = [state.longitude, state.latitude];
    if (!labels) return [];
    return globeLabels
      .map((l) => ({ ...l, angle: angularDistance(l.position, centre) }))
      // Towards the limb a country is foreshortened, so it needs to be bigger before its name fits.
      .filter((l) => l.angle < GLOBE_VISIBLE_DEGREES)
      .filter((l) => l.code === selected || l.size * pxPerUnit * Math.cos((l.angle * Math.PI) / 180) >= LABEL_MIN_PX)
      .map((l) => {
        const [x, y] = viewport.project([l.position[0], l.position[1], 0]);
        return { code: l.code, name: l.name, x, y };
      })
      .filter((l) => l.x >= 0 && l.x <= width && l.y >= 0 && l.y <= height);
  }, [view, width, height, globeState, globeViewState, globeLabels, labels, pxPerUnit, selected]);
  const labelLayer = (id: string, data: Label[]) =>
    new TextLayer<Label>({
      id,
      data,
      getText: (d) => d.name,
      getPosition: (d) => d.position,
      getSize: 12,
      sizeUnits: "pixels",
      getColor: [15, 23, 42, 235],
      outlineWidth: 3,
      outlineColor: [255, 255, 255, 220],
      fontSettings: { sdf: true },
      fontFamily: "system-ui, sans-serif",
      fontWeight: 600,
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      characterSet: "auto",
      billboard: true,
      pickable: false,
      updateTriggers: { getText: data.length },
    });
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
          labelLayer("flat-labels", labelData(flatLabels)),
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

  useEffect(() => {
    setZoom(null);
    setGlobeState(null);
  }, [view]);

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
          onViewStateChange={({ viewState }) => {
            const v = viewState as Partial<GlobeState>;
            setZoom(v.zoom ?? null);
            if (view === "globe" && v.longitude !== undefined && v.latitude !== undefined && v.zoom !== undefined) {
              setGlobeState({ longitude: v.longitude, latitude: v.latitude, zoom: v.zoom });
            }
          }}
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
      {globeOverlay.length > 0 && (
        <div className="map-labels" aria-hidden="true">
          {globeOverlay.map((l) => (
            <span key={l.code} className="map-label" style={{ left: l.x, top: l.y }}>
              {l.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { FlatCountry };
