# Mystery Map App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app in which the player opens any map from a library, works out what its hidden measure is with three paid hints, and keeps their progress in the browser.

**Architecture:** Four parts with hard boundaries. A game engine of plain TypeScript functions owns every rule. A map view (React around deck.gl) draws countries as a flat equal-area map or a globe and reports taps. A storage module keeps one versioned saved object. An app shell of React screens connects them. The engine and the map never import each other.

**Tech Stack:** TypeScript (strict), React, Vite, deck.gl 9.4 (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react`), d3-geo, Vitest, fast-check, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-mystery-map-design.md` (technical design) and `docs/superpowers/specs/2026-10-04-mystery-map-prd.md` (product requirements).

**This is plan 2 of 2.** It consumes `app/public/data/catalog.json` and `app/public/data/countries.json`, written by plan 1 (`2026-10-04-mystery-map-1-catalog-pipeline.md`). Tasks 1 to 8 run against fixtures, so they do not wait for plan 1's content task.

## Global Constraints

- No server, no accounts, no MapLibre, no background tiles. The build output is static files.
- No daily schedule. Every layer in the catalog is playable at any time.
- Files under `src/engine/` import nothing from React, deck.gl, `src/map/`, `src/storage/` or browser globals. A lint rule enforces this (Task 9).
- Scoring constants: `START_POINTS = 10`, `EXTREMES_COST = 1`, `NUMBER_COST = 1`, `UNIT_COST = 3`, `WRONG_GUESS_COST = 3`. Points never go below 0 or above 10.
- `CATALOG_VERSION = 1`, `SAVE_VERSION = 1`, `SAVE_KEY = "mystery-map.save"`, `BACKUP_KEY = "mystery-map.save.backup"`.
- Group words: 0 "no data", 1 "lowest", 2 "low", 3 "middle", 4 "high", 5 "highest".
- Group colours as RGB: 0 `[200,200,200]`, 1 `[255,255,204]`, 2 `[161,218,180]`, 3 `[65,182,196]`, 4 `[44,127,184]`, 5 `[37,52,148]`. Sea `[214,222,224]`. Country border `[110,120,125]` at 0.5 px. Selected outline `[180,83,15]` at 2 px.
- The flat view is the default. The player's choice of view is saved.
- A country's group is never shown by colour alone: the readout states it in words.
- Every control works by keyboard and by touch. The layout works at 360 px wide with no sideways scroll.
- Before a round is solved, no value, unit sentence, layer name or explanation is rendered unless the engine's `visible` function returned it.

**Exact copy**

| Where | Text |
| --- | --- |
| Library, unsolved | `Map {number}` |
| Library, solved | `{name}` and `{points} of 10 points` |
| Points | `Points {n}` |
| View switch | `Flat map`, `Globe` |
| Readout, nothing picked | `Point at or tap a country to see its name.` |
| Readout | `{country}: {group word} group` |
| Readout, number bought | `{country}: {group word} group, value {value}` |
| Readout, solved | `{country}: {value}` followed by the layer's `definition` in brackets |
| Readout, no data | `{country}: no data` |
| Hint buttons | `Extremes`, `A number`, `The unit`, with costs `costs 1`, `costs 1 each`, `costs 3` |
| Extremes shown | `Highest: A, B and C.` and `Lowest: X, Y and Z.` |
| Number hint armed | `Now choose a country on the map.` |
| Number hint, no data | `There is no data for {country}. Choose another country.` |
| Number hint, already bought | `You already have that number. Choose another country.` |
| Wrong guess | `Not that one. Find a country that this guess cannot explain.` |
| Reveal heading | `It shows {name}.` |
| Reveal score | `You finished with {points} of 10 points.` |
| Catalog failed | `The maps could not be loaded.` with button `Try again` |
| Catalog too new | `A newer version of the game is available.` with button `Refresh` |
| Save recovered | `Your saved progress could not be read. It has been set aside and you are starting fresh.` |
| Save blocked | `This browser is not saving progress. You can still play.` |
| No graphics | `This game needs graphics support that this device does not have.` |

## Review Focus

1. A double tap on one country while the number hint is armed: the player is charged once. Pinned in Task 2.
2. A save written by a newer version of the app: set aside as a backup, never overwritten or half-read. Pinned in Task 4.
3. A catalog whose layer names a wrong option that is not in the catalog: the catalog is rejected at load, so a round never shows fewer than six options. Pinned in Task 1.
4. The browser refuses a write mid-game (storage full or blocked): the round continues and the save-blocked note appears. Pinned in Task 4 and Task 8.
5. Switching between flat and globe mid-round, or rotating the phone: the round, the selected country and the bought numbers are unchanged. Pinned in Task 8.

---

## File Structure

```
app/
  package.json  vite.config.ts  tsconfig.json  eslint.config.js  playwright.config.ts
  public/data/                 catalog.json, countries.json (from plan 1)
  src/
    catalog/  types.ts  load.ts
    engine/   types.ts  round.ts  options.ts  visible.ts
    storage/  storage.ts  migrations.ts
    map/      project.ts  colors.ts  webgl.ts  MapView.tsx
    screens/  Library.tsx  Round.tsx  Reveal.tsx  Notice.tsx
    components/  Readout.tsx  Hints.tsx  Options.tsx  CountryPicker.tsx  ViewSwitch.tsx
    useGame.ts  App.tsx  main.tsx
    test/fixtures/  catalog.ts  countries.ts
  e2e/  round.spec.ts  failures.spec.ts
docs/decisions/
```

Unit tests sit beside their file as `*.test.ts` or `*.test.tsx`.

---

### Task 0: Globe test (throwaway)

The globe is the newest of deck.gl's views. This task finds out whether it works before anything depends on it.

**Files:**
- Create on branch `spike/globe` only: `spike/index.html`, `spike/main.ts`
- Create on main: `docs/decisions/2026-10-globe-test.md`

- [ ] **Step 1: Build the page.** One deck.gl canvas with the globe view and a `GeoJsonLayer` of every geometry in `countries.json`, `pickable: true`. A click writes the country's name into a `<p>`. Check the deck.gl 9.4 documentation for the globe view's current import name.
- [ ] **Step 2: Check on desktop Chrome and on one phone.** Pass means all three hold: every country is filled with no holes or stray triangles (look at Russia, Canada, Indonesia and Fiji); tapping a country names that country; drag-to-rotate and pinch-to-zoom are smooth.
- [ ] **Step 3: Record the result** in `docs/decisions/2026-10-globe-test.md` with the devices used. On a pass, continue. On a fail, set `GLOBE_ENABLED = false` in Task 6, hide the view switch, and ship flat only.
- [ ] **Step 4: Do not merge the branch.** Commit only the decision file to main: `docs: globe test result`.

---

### Task 1: Scaffold, catalog types and loader

**Files:**
- Create: `app/package.json`, `app/vite.config.ts` (with `base: "./"`), `app/tsconfig.json`, `app/src/catalog/types.ts`, `app/src/catalog/load.ts`, `app/src/test/fixtures/catalog.ts`, `app/src/test/fixtures/countries.ts`
- Test: `app/src/catalog/load.test.ts`

**Interfaces:**
- Produces:

```ts
export type Layer = {
  id: string; number: number; name: string; definition: string; unit: string; year: string;
  source: { name: string; url: string; licence: string };
  values: Record<string, number>; groups: Record<string, number>;
  extremes: { high: string[]; low: string[] };
  wrongOptions: string[]; explanation: string;
};
export type Catalog = { version: number; layers: Layer[] };
export type Country = { code: string; iso: string | null; name: string; geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon };

export class CatalogLoadError extends Error {}
export class CatalogTooNewError extends Error {}
export function parseCatalog(raw: unknown): Catalog;
export function parseCountries(raw: unknown): Country[];
export async function loadData(baseUrl: string): Promise<{ catalog: Catalog; countries: Country[] }>;
```

The fixture catalog has seven layers with IDs `beds, age, rain, cars, fish, rail, cold`, numbered 1 to 7, over ten countries including `JPN`, `MLI` and `PSE`. `beds` is named `Hospital beds` and `age` is named `Median age`. `beds` has `JPN: 13.05` in group 5, `MLI: 0.1` in group 1, no value for `PSE`, the unit `A count for every 1,000 people.`, and wrong options `age, rain, cars, fish, rail`.

- [ ] **Step 1: Write the failing tests**

```ts
test("accepts the fixture", () => { expect(parseCatalog(fixtureCatalog).layers).toHaveLength(7); });
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
});
test("a failed request is a load error", async () => {
  vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
  await expect(loadData("/data")).rejects.toThrow(CatalogLoadError);
});
```

- [ ] **Step 2: Run** `npx vitest run src/catalog`. Expected: FAIL, module not found.
- [ ] **Step 3: Create the Vite React TypeScript project and implement** `parseCatalog`, `parseCountries` and `loadData`. `loadData` fetches `${baseUrl}/catalog.json` and `${baseUrl}/countries.json`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): scaffold and catalog loader`.

---

### Task 2: Engine actions

**Files:**
- Create: `app/src/engine/types.ts`, `app/src/engine/round.ts`
- Test: `app/src/engine/round.test.ts`

**Interfaces:**
- Consumes: `Layer` (Task 1, type only).
- Produces:

```ts
export const START_POINTS = 10, EXTREMES_COST = 1, NUMBER_COST = 1, UNIT_COST = 3, WRONG_GUESS_COST = 3;

export type RoundState = {
  layerId: string; points: number;
  extremesBought: boolean; unitBought: boolean;
  numbersBought: string[]; wrongGuesses: string[];
  status: "playing" | "solved";
};
export type Action =
  | { type: "buyExtremes" } | { type: "buyUnit" }
  | { type: "buyNumber"; code: string }
  | { type: "guess"; optionId: string };
export type Refusal = "solved" | "alreadyBought" | "noData" | "alreadyStruck" | "notAnOption";
export type Result = { ok: true; state: RoundState } | { ok: false; reason: Refusal };

export function newRound(layerId: string): RoundState;
export function applyAction(state: RoundState, action: Action, layer: Layer): Result;
```

A guess is valid when `optionId` is `layer.id` or one of `layer.wrongOptions`. Buying is allowed at 0 points and leaves the points at 0. `applyAction` never mutates its input.

- [ ] **Step 1: Write the failing tests**

```ts
const beds = layer("beds");
const play = (...actions: Action[]) => actions.reduce((s, a) => {
  const r = applyAction(s, a, beds); return r.ok ? r.state : s; }, newRound("beds"));

test("starts at 10 and playing", () => { expect(newRound("beds")).toMatchObject({ points: 10, status: "playing" }); });
test("extremes cost 1, once", () => {
  const s = play({ type: "buyExtremes" });
  expect(s.points).toBe(9);
  expect(applyAction(s, { type: "buyExtremes" }, beds)).toEqual({ ok: false, reason: "alreadyBought" });
});
test("a number costs 1 per country, once per country", () => {
  const s = play({ type: "buyNumber", code: "JPN" });
  expect(s).toMatchObject({ points: 9, numbersBought: ["JPN"] });
  expect(applyAction(s, { type: "buyNumber", code: "JPN" }, beds)).toEqual({ ok: false, reason: "alreadyBought" });
});
test("a country with no data costs nothing", () => {
  expect(applyAction(newRound("beds"), { type: "buyNumber", code: "PSE" }, beds)).toEqual({ ok: false, reason: "noData" });
});
test("the unit costs 3", () => { expect(play({ type: "buyUnit" }).points).toBe(7); });
test("a wrong guess costs 3 and is struck", () => {
  const s = play({ type: "guess", optionId: "age" });
  expect(s).toMatchObject({ points: 7, wrongGuesses: ["age"], status: "playing" });
  expect(applyAction(s, { type: "guess", optionId: "age" }, beds)).toEqual({ ok: false, reason: "alreadyStruck" });
});
test("an unknown option is refused", () => {
  expect(applyAction(newRound("beds"), { type: "guess", optionId: "cold" }, beds)).toEqual({ ok: false, reason: "notAnOption" });
});
test("a right guess solves and keeps the points", () => {
  const s = play({ type: "buyUnit" }, { type: "guess", optionId: "beds" });
  expect(s).toMatchObject({ points: 7, status: "solved" });
  expect(applyAction(s, { type: "buyExtremes" }, beds)).toEqual({ ok: false, reason: "solved" });
});
test("points stop at 0", () => {
  const wrongFour = ["age", "rain", "cars", "fish"].map(optionId => ({ type: "guess", optionId }) as Action);
  expect(play(...wrongFour).points).toBe(0);            // 10, 7, 4, 1, 0
  expect(play(...wrongFour, { type: "buyExtremes" })).toMatchObject({ points: 0, extremesBought: true });
});
test("any sequence keeps points in range and refusals change nothing", () => {
  fc.assert(fc.property(fc.array(arbitraryAction(beds), { maxLength: 40 }), actions => {
    let s = newRound("beds");
    for (const a of actions) {
      const before = structuredClone(s);
      const r = applyAction(s, a, beds);
      expect(s).toEqual(before);
      if (r.ok) s = r.state;
      expect(s.points).toBeGreaterThanOrEqual(0);
      expect(s.points).toBeLessThanOrEqual(10);
    }
  }));
});
```

- [ ] **Step 2: Run** `npx vitest run src/engine/round.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `newRound` and `applyAction`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): round actions and scoring`.

---

### Task 3: Options and the "what may be shown" function

**Files:**
- Create: `app/src/engine/options.ts`, `app/src/engine/visible.ts`
- Test: `app/src/engine/options.test.ts`, `app/src/engine/visible.test.ts`

**Interfaces:**
- Consumes: `RoundState` (Task 2), `Layer`, `Catalog` (Task 1).
- Produces:

```ts
export type OptionInfo = { id: string; name: string; definition: string };
export function optionsFor(layer: Layer, catalog: Catalog): OptionInfo[];

export type Visible = {
  groups: Record<string, number>;
  values: Record<string, number>;
  extremes: { high: string[]; low: string[] } | null;
  unit: string | null;
  options: (OptionInfo & { struck: boolean })[];
  answer: { name: string; definition: string; year: string; source: Layer["source"]; explanation: string } | null;
};
export function visible(state: RoundState, layer: Layer, options: OptionInfo[]): Visible;
```

`optionsFor` returns the answer and its five wrong options, ordered by the FNV-1a 32-bit hash of `` `${layer.id}:${option.id}` `` ascending, so the order is fixed per layer and the answer's position varies between layers:

```ts
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
test("six options, answer included, stable order", () => {
  const a = optionsFor(layer("beds"), fixtureCatalog);
  expect(a.map(o => o.id).sort()).toEqual(["age", "beds", "cars", "fish", "rail", "rain"]);
  expect(optionsFor(layer("beds"), fixtureCatalog)).toEqual(a);
});
test("the answer is not always in the same place", () => {
  const positions = fixtureCatalog.layers.map(l => optionsFor(l, fixtureCatalog).findIndex(o => o.id === l.id));
  expect(new Set(positions).size).toBeGreaterThan(1);
});
test("a fresh round shows groups and nothing else", () => {
  const v = visible(newRound("beds"), beds, opts);
  expect(v.groups).toEqual(beds.groups);
  expect(v).toMatchObject({ values: {}, extremes: null, unit: null, answer: null });
  expect(v.options.every(o => !o.struck)).toBe(true);
});
test("bought items appear, and only those", () => {
  const v = visible({ ...newRound("beds"), numbersBought: ["JPN"], extremesBought: true, wrongGuesses: ["age"] }, beds, opts);
  expect(v.values).toEqual({ JPN: 13.05 });
  expect(v.extremes).toEqual(beds.extremes);
  expect(v.unit).toBeNull();
  expect(v.options.find(o => o.id === "age")!.struck).toBe(true);
});
test("a solved round shows everything", () => {
  const v = visible({ ...newRound("beds"), status: "solved" }, beds, opts);
  expect(v.values).toEqual(beds.values);
  expect(v.unit).toBe(beds.unit);
  expect(v.answer).toMatchObject({ name: "Hospital beds", explanation: beds.explanation });
});
test("while playing, no unbought value is ever shown", () => {
  fc.assert(fc.property(fc.array(arbitraryAction(beds), { maxLength: 40 }), actions => {
    let s = newRound("beds");
    for (const a of actions) { const r = applyAction(s, a, beds); if (r.ok) s = r.state;
      if (s.status === "playing") expect(Object.keys(visible(s, beds, opts).values).sort()).toEqual([...s.numbersBought].sort()); }
  }));
});
```

- [ ] **Step 2: Run** `npx vitest run src/engine`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `optionsFor` and `visible`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): options and visibility`.

---

### Task 4: Storage

**Files:**
- Create: `app/src/storage/storage.ts`, `app/src/storage/migrations.ts`
- Test: `app/src/storage/storage.test.ts`

**Interfaces:**
- Consumes: `RoundState` (Task 2, type only).
- Produces:

```ts
export const SAVE_VERSION = 1, SAVE_KEY = "mystery-map.save", BACKUP_KEY = "mystery-map.save.backup";

export type HistoryEntry = { layerId: string; name: string; points: number; extremes: boolean; unit: boolean; numbers: number };
export type Save = { version: 1; rounds: Record<string, RoundState>; history: Record<string, HistoryEntry>; view: "flat" | "globe" };
export type LoadResult = { save: Save; persistent: boolean; recovered: boolean };

export function emptySave(): Save;                                        // view "flat"
export function loadSave(store: Storage | null): LoadResult;
export function writeSave(store: Storage | null, save: Save): boolean;    // false when nothing was written
export function pruneRounds(save: Save, layerIds: Set<string>): Save;     // drops rounds for missing layers, keeps history
export const migrations: Array<(old: unknown) => unknown>;                // migrations[n-1] upgrades version n to n+1; empty at version 1
```

`loadSave` rules: no store, or `getItem` throws: `{ emptySave, persistent: false, recovered: false }`. Nothing saved: `{ emptySave, persistent: true, recovered: false }`. Unparseable text, a wrong shape, or `version > SAVE_VERSION`: copy the raw text to `BACKUP_KEY`, return `{ emptySave, persistent: true, recovered: true }`. An older version runs through `migrations` in order first.

- [ ] **Step 1: Write the failing tests**

```ts
test("nothing saved gives an empty save", () => {
  expect(loadSave(fakeStore())).toEqual({ save: emptySave(), persistent: true, recovered: false });
});
test("round trip", () => {
  const store = fakeStore(); const save = { ...emptySave(), view: "globe" as const };
  expect(writeSave(store, save)).toBe(true);
  expect(loadSave(store).save).toEqual(save);
});
test.each([["not json", "{oops"], ["wrong shape", '{"version":1,"rounds":7}'], ["newer version", '{"version":2,"rounds":{},"history":{},"view":"flat"}']])(
  "%s is set aside and play starts clean", (_, raw) => {
    const store = fakeStore({ [SAVE_KEY]: raw });
    expect(loadSave(store)).toEqual({ save: emptySave(), persistent: true, recovered: true });
    expect(store.getItem(BACKUP_KEY)).toBe(raw);
  });
test("no store means not persistent", () => {
  expect(loadSave(null)).toMatchObject({ persistent: false, recovered: false });
  expect(writeSave(null, emptySave())).toBe(false);
});
test("a throwing store is not persistent and does not crash", () => {
  const store = fakeStore({}, { throwOnSet: true, throwOnGet: true });
  expect(loadSave(store).persistent).toBe(false);
  expect(writeSave(store, emptySave())).toBe(false);
});
test("pruning drops missing rounds and keeps history", () => {
  const save = { ...emptySave(), rounds: { beds: newRound("beds"), gone: newRound("gone") },
    history: { gone: { layerId: "gone", name: "Gone", points: 6, extremes: true, unit: false, numbers: 1 } } };
  const out = pruneRounds(save, new Set(["beds"]));
  expect(Object.keys(out.rounds)).toEqual(["beds"]);
  expect(out.history.gone.points).toBe(6);
});
```

- [ ] **Step 2: Run** `npx vitest run src/storage`. Expected: FAIL.
- [ ] **Step 3: Implement** the module.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(storage): versioned save with recovery`.

---

### Task 5: Flat projection and colours

**Files:**
- Create: `app/src/map/project.ts`, `app/src/map/colors.ts`
- Test: `app/src/map/project.test.ts`

**Interfaces:**
- Consumes: `Country` (Task 1).
- Produces:

```ts
export const FLAT_WIDTH = 1000;
export type FlatCountry = { code: string; name: string; polygons: number[][][][]; centre: [number, number]; size: number };
// polygons: MultiPolygon rings in flat [x, y], y growing downward. size: the diagonal of the bounding box in flat units.
export function projectCountries(countries: Country[]): { flat: FlatCountry[]; height: number };

export const GROUP_COLORS: Record<number, [number, number, number]>;   // values from Global Constraints
export const GROUP_WORDS: Record<number, string>;
```

Use `geoEqualEarth().fitWidth(FLAT_WIDTH, { type: "Sphere" })` from d3-geo and project each coordinate. Natural Earth shapes are already cut at the 180° line, so no extra clipping is needed. The countries fixture holds real Natural Earth shapes for `GRL`, `COD`, `JPN`, `MLI`, `PSE` and `FJI`.

- [ ] **Step 1: Write the failing tests**

```ts
const { flat, height } = projectCountries(fixtureCountries);
const area = (code: string) => shoelaceArea(flat.find(c => c.code === code)!.polygons);

test("the projection keeps areas honest", () => {
  // Real ratio of Greenland to DR Congo is about 0.92. Web Mercator would give more than 10.
  const ratio = area("GRL") / area("COD");
  expect(ratio).toBeGreaterThan(0.8); expect(ratio).toBeLessThan(1.05);
});
test("everything lands inside the frame", () => {
  for (const c of flat) for (const poly of c.polygons) for (const ring of poly) for (const [x, y] of ring) {
    expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(FLAT_WIDTH);
    expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(height);
  }
});
test("north is up", () => {
  const y = (code: string) => flat.find(c => c.code === code)!.centre[1];
  expect(y("GRL")).toBeLessThan(y("COD"));
});
test("size separates small from large", () => {
  const size = (code: string) => flat.find(c => c.code === code)!.size;
  expect(size("PSE")).toBeLessThan(8); expect(size("COD")).toBeGreaterThan(8);
});
```

- [ ] **Step 2: Run** `npx vitest run src/map`. Expected: FAIL.
- [ ] **Step 3: Implement** `projectCountries` and the two constant tables.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(map): equal-area projection and colours`.

---

### Task 6: Map view

**Files:**
- Create: `app/src/map/MapView.tsx`, `app/src/map/webgl.ts`
- Test: `app/src/map/webgl.test.ts`

**Interfaces:**
- Consumes: `Country` (Task 1), `projectCountries`, `GROUP_COLORS` (Task 5).
- Produces:

```ts
export const GLOBE_ENABLED: boolean;          // set from the Task 0 result
export const SMALL_COUNTRY_SIZE = 8;          // flat units
export type MapViewProps = {
  countries: Country[];
  groups: Record<string, number>;             // by country code; a missing code is group 0
  selected: string | null;
  view: "flat" | "globe";
  onPick: (code: string) => void;
  onGlobeFailed: () => void;
};
export function MapView(props: MapViewProps): JSX.Element;
export function hasWebGL(): boolean;
```

Decisions the implementer cannot make alone:

- Flat view: deck.gl's orthographic view with a polygon layer over `projectCountries(...).flat`, in Cartesian coordinates, with pan and zoom, opening fitted to the container width.
- Globe view: deck.gl's globe view with a `GeoJsonLayer` over the country geometries, drag to rotate, zoom enabled.
- Both views: fill from `GROUP_COLORS`, border and selected outline from Global Constraints, the sea colour as the background. Hover and click both call `onPick` with the country's code.
- Small countries: every country whose `size` is below `SMALL_COUNTRY_SIZE` also gets an invisible pickable circle at its centre with a minimum radius of 14 px, drawn above the polygons.
- The root element carries `data-view="flat"` or `data-view="globe"`, and `role="img"` with `aria-label="World map coloured by the hidden measure"`.
- Any deck.gl error while `view` is `"globe"` calls `onGlobeFailed` once.
- Nothing in this file imports from `src/engine/` or `src/storage/`.

- [ ] **Step 1: Write the failing test**

```ts
test("hasWebGL is false when no context can be made", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  expect(hasWebGL()).toBe(false);
});
```

- [ ] **Step 2: Run** `npx vitest run src/map/webgl.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `hasWebGL` and `MapView`.
- [ ] **Step 4: Run the test.** Expected: PASS. Then run `npm run dev` with a temporary page that renders `MapView` over the fixture and confirm by eye: both views draw, picking works, and the selected outline shows. The full round in Task 8 covers the rest.
- [ ] **Step 5: Commit** `feat(map): map view with flat and globe`.

---

### Task 7: Screens and app shell

**Files:**
- Create: `app/src/useGame.ts`, `app/src/App.tsx`, `app/src/main.tsx`, `app/src/screens/{Library,Round,Reveal,Notice}.tsx`, `app/src/components/{Readout,Hints,Options,CountryPicker,ViewSwitch}.tsx`
- Test: `app/src/components/Readout.test.tsx`, `app/src/screens/Library.test.tsx`, `app/src/useGame.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 6.
- Produces:

```ts
export type Game = {
  catalog: Catalog; countries: Country[]; save: Save;
  persistent: boolean; recovered: boolean;
  act: (layerId: string, action: Action) => Result;   // applies the action, records history on a solve, writes the save
  setView: (view: "flat" | "globe") => void;
};
export function useGame(data: { catalog: Catalog; countries: Country[] }, store: Storage | null): Game;
```

Behaviour:

- `App` loads the data and shows, in order of precedence: the no-graphics notice when `hasWebGL()` is false; the catalog-failed or catalog-too-new notice; otherwise the library. The recovered and save-blocked notes sit above the library and can be dismissed.
- On load, `pruneRounds` runs with the catalog's layer IDs.
- `Library` lists every layer by number using the copy table. Choosing one opens `Round`.
- `Round` shows the points, the view switch (hidden when `GLOBE_ENABLED` is false), the map, the readout, a legend from "less" to "more" with a "no data" swatch, the `CountryPicker`, the three hints and the six options. Everything it shows about the layer comes from `visible(...)`.
- `CountryPicker` is a labelled combobox, `Find a country`, listing every country name. Choosing one is the same as tapping it on the map. It is the keyboard route to the map.
- The number hint arms on press. The next country chosen, by map or picker, is bought. Refusals show the copy-table message and leave the hint armed.
- When `onGlobeFailed` fires, the view is set to flat and saved.
- On a right guess, `Reveal` renders inside the round screen under the map: heading, definition, explanation, source link with year, score line, and a `Back to all maps` button. A solved round reopened from the library shows the reveal directly.
- When `act` cannot write the save, `persistent` becomes false and the save-blocked note appears.

- [ ] **Step 1: Write the failing tests**

```tsx
test.each([
  [{ group: 4 }, "Japan: high group"],
  [{ group: 4, value: 13.05 }, "Japan: high group, value 13.05"],
  [{ group: 0 }, "Japan: no data"],
])("readout while playing", (props, text) => {
  render(<Readout country="Japan" solved={false} definition="Beds per 1,000 people" {...props} />);
  expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
});
test("readout once solved", () => {
  render(<Readout country="Japan" solved group={5} value={13.05} definition="Beds per 1,000 people" />);
  expect(screen.getByText("Japan: 13.05 (Beds per 1,000 people)", { exact: false })).toBeInTheDocument();
});
test("library hides names until solved", () => {
  render(<Library catalog={fixtureCatalog} save={saveWithSolved("beds", 6)} onOpen={() => {}} />);
  expect(screen.getByText("Hospital beds")).toBeInTheDocument();
  expect(screen.getByText("6 of 10 points")).toBeInTheDocument();
  expect(screen.getByText("Map 2")).toBeInTheDocument();
  expect(screen.queryByText("Median age")).toBeNull();
});
test("a solve writes history and the save", () => {
  const store = fakeStore();
  const { result } = renderHook(() => useGame(fixtureData, store));
  act(() => { result.current.act("beds", { type: "buyNumber", code: "JPN" }); });
  act(() => { result.current.act("beds", { type: "guess", optionId: "beds" }); });
  expect(result.current.save.history.beds).toEqual({ layerId: "beds", name: "Hospital beds", points: 9, extremes: false, unit: false, numbers: 1 });
  expect(JSON.parse(store.getItem(SAVE_KEY)!).rounds.beds.status).toBe("solved");
});
test("a failed write flips persistent off and play goes on", () => {
  const { result } = renderHook(() => useGame(fixtureData, fakeStore({}, { throwOnSet: true })));
  act(() => { result.current.act("beds", { type: "buyExtremes" }); });
  expect(result.current.persistent).toBe(false);
  expect(result.current.save.rounds.beds.points).toBe(9);
});
```

- [ ] **Step 2: Run** `npx vitest run src/components src/screens src/useGame.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hook, the components and the screens, using the copy table word for word.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(app): screens and shell`.

---

### Task 8: Full rounds in a real browser

**Files:**
- Create: `app/playwright.config.ts` (projects `desktop` at 1280×800 and `phone` at 360×740, both Chromium, web server `npm run preview`), `app/e2e/round.spec.ts`, `app/e2e/failures.spec.ts`, `app/e2e/fixtures.ts`

**Interfaces:**
- Consumes: the built app. Every test routes `**/data/catalog.json` and `**/data/countries.json` to the fixtures from Task 1, so results never depend on real layers.

- [ ] **Step 1: Write the failing tests**

```ts
test("a full round, then a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Map 1").click();
  await expect(page.getByText("Points 10")).toBeVisible();
  await expect(page.getByText("A count for every 1,000 people.")).toHaveCount(0);

  await page.getByRole("button", { name: /Extremes/ }).click();
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText(/^Highest:/)).toBeVisible();

  await page.getByRole("button", { name: /A number/ }).click();
  await pickCountry(page, "Japan");
  await expect(page.getByText("Points 8")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();

  await page.getByRole("button", { name: /A number/ }).click();
  await pickCountry(page, "Japan");
  await expect(page.getByText("You already have that number. Choose another country.")).toBeVisible();
  await pickCountry(page, "Palestine");
  await expect(page.getByText("There is no data for Palestine. Choose another country.")).toBeVisible();
  await expect(page.getByText("Points 8")).toBeVisible();

  await page.getByRole("button", { name: /The unit/ }).click();
  await expect(page.getByText("Points 5")).toBeVisible();
  await page.getByRole("button", { name: /Median age/ }).click();
  await expect(page.getByText("Points 2")).toBeVisible();
  await page.getByRole("button", { name: /Hospital beds/ }).click();
  await expect(page.getByRole("heading", { name: "It shows Hospital beds." })).toBeVisible();
  await expect(page.getByText("You finished with 2 of 10 points.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Hospital beds")).toBeVisible();
  await expect(page.getByText("2 of 10 points")).toBeVisible();
});

test("switching view mid-round keeps the round", async ({ page }) => {
  test.skip(!GLOBE_ENABLED);
  await openMap1AndBuyJapan(page);
  await page.getByRole("button", { name: "Globe" }).click();
  await expect(page.locator("[data-view=globe]")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();
  await expect(page.getByText("Points 9")).toBeVisible();
  await page.reload();
  await page.getByText("Map 1").click();
  await expect(page.locator("[data-view=globe]")).toBeVisible();
});

test("a resize keeps the round", async ({ page }) => {
  await openMap1AndBuyJapan(page);
  await page.setViewportSize({ width: 740, height: 360 });
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText("Japan: highest group, value 13.05")).toBeVisible();
});

test("no sideways scroll on the phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await page.goto("/"); await page.getByText("Map 1").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
```

```ts
// failures.spec.ts
test("catalog fails, then retry works", async ({ page }) => {
  let fail = true;
  await page.route("**/data/catalog.json", r => fail ? r.fulfill({ status: 500 }) : r.fulfill({ json: fixtureCatalog }));
  await page.goto("/");
  await expect(page.getByText("The maps could not be loaded.")).toBeVisible();
  fail = false; await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Map 1")).toBeVisible();
});
test("a newer catalog asks for a refresh", async ({ page }) => {
  await page.route("**/data/catalog.json", r => r.fulfill({ json: { ...fixtureCatalog, version: 2 } }));
  await page.goto("/");
  await expect(page.getByText("A newer version of the game is available.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
});
test("an unreadable save is set aside", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mystery-map.save", "{oops"));
  await page.goto("/");
  await expect(page.getByText("Your saved progress could not be read.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mystery-map.save.backup"))).toBe("{oops");
});
test("blocked saving still plays", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
  await page.goto("/"); await page.getByText("Map 1").click();
  await page.getByRole("button", { name: /Extremes/ }).click();
  await expect(page.getByText("Points 9")).toBeVisible();
  await expect(page.getByText("This browser is not saving progress. You can still play.")).toBeVisible();
});
```

`pickCountry(page, name)` fills the `Find a country` combobox and chooses the match.

- [ ] **Step 2: Run** `npx playwright test`. Expected: FAIL on the first missing behaviour.
- [ ] **Step 3: Fix what the run exposes** in the files from Tasks 6 and 7. Add no behaviour that the spec does not name.
- [ ] **Step 4: Run** `npx playwright test`. Expected: all PASS in both projects.
- [ ] **Step 5: Commit** `test(app): full rounds and failure paths`.

---

### Task 9: Boundary rule, continuous checks and hosting

**Files:**
- Create: `app/eslint.config.js`, `.github/workflows/app.yml`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Add the boundary rule.** In `eslint.config.js`, for `src/engine/**`, forbid imports of `react`, `react-dom`, `@deck.gl/*`, `d3-geo`, and any path containing `/map/`, `/storage/`, `/screens/` or `/components/`. For `src/map/**`, forbid any path containing `/engine/` or `/storage/`.
- [ ] **Step 2: Verify the rule.** Add `import "react"` to `src/engine/round.ts`. Run `npx eslint src`. Expected: an error on that line. Remove the import.
- [ ] **Step 3: Write `app.yml`.** On every push and pull request touching `app/**`: `npm ci`, `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npm run build`, `npx playwright install chromium`, `npx playwright test`.
- [ ] **Step 4: Write `deploy.yml`.** On a push to `main`, after `app.yml` and `pipeline.yml` pass: run plan 1's build command so `app/public/data/` is fresh, build the app, and publish `app/dist` to GitHub Pages. GitHub Pages is the static host chosen for the MVP; `base: "./"` keeps the build portable to any other host.
- [ ] **Step 5: Verify.** Open the published address on a desktop and on a phone, and play one map from the real catalog to the reveal.
- [ ] **Step 6: Commit** `ci: app checks, boundary rule and deploy`.
