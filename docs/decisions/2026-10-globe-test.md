# Globe test result

Date: 4 October 2026. deck.gl 9.4.0, `_GlobeView` (still exported with an underscore, so still marked experimental by deck.gl).

## What was checked

A `GeoJsonLayer` of every geometry in `countries.json` on the globe view, `pickable: true`, with a hover and click readout. Run through the real app (`MapView` in globe mode) rather than a separate spike page, because the map view was already small enough to test directly.

## Devices

- Headless Chromium 1194 (Playwright) at 1280×800 and 360×740, software WebGL through SwiftShader. Automated: `e2e/round.spec.ts`, "switching view mid-round keeps the round" passes in both projects, and screenshots show every country filled with no holes or stray triangles over Africa, Europe, Russia and Indonesia.
- Desktop Chrome and a phone with a real GPU: **not yet checked**. The build environment had no display. This is the first thing to do once the site is published.

## Decision

`GLOBE_ENABLED = true` in `app/src/map/flags.ts`. The flat equal-area map stays the default, and a deck.gl error while the globe is showing drops the player back to the flat view and saves that choice (`onGlobeFailed`), so a device that cannot draw the globe still plays. If the phone check finds holes or stuttering, set the flag to `false` and the view switch disappears.
