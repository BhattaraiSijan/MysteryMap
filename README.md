# Mystery Map

A geography game: one unlabeled world map, coloured by a hidden country-level measure. Work out what it shows, trading points for hints.

**Play it:** https://bhattaraisijan.github.io/MysteryMap/

- `pipeline/` — Python command that turns hand-written layer files and source CSVs into the validated `catalog.json` and `countries.json` the app loads. Refuses to build when a layer breaks a rule.
- `app/` — static React + deck.gl app that plays the catalog. No server; progress is kept in the browser.
- `docs/` — product requirements, implementation plans, the layer candidate count and decisions.

## How a round works

Every map starts at 10 points. Hints cost points: the three highest and lowest countries (1), the real value of any country you choose (1 each), the sentence that says how the measure is counted (3). A wrong guess among the six options costs 3. A right guess fixes the score and reveals the layer with its source and a short explanation.

## Developing

```sh
# pipeline
cd pipeline
pip install -e ".[dev]"
pytest
python -m mm_pipeline.build --layers layers --data data --out ../app/public/data
python -m mm_pipeline.preview --layers layers --data data --out preview   # review pages for draft layers

# app
cd app
npm ci
npm run dev          # local server
npm test             # vitest
npm run lint         # eslint, including the engine/map boundary rule
npm run build
npx playwright test  # full rounds on desktop and phone
```

Where Playwright's own browser download is not available, point it at an installed Chromium with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome`.

## Adding a layer

1. Put the source CSV in `pipeline/data/` (ISO 3166-1 alpha-3 codes in one column, figures in another) and note its origin and licence in `pipeline/data/README.md`.
2. Write `pipeline/layers/<id>.yaml` with `status: draft`, following any existing file.
3. Run the preview command, read the page, check the explanation against the source, then set `status: live`.
4. Run the build. It fails if coverage is under 80% of countries, the measure has fewer than five distinct values, the explanation is not 2 to 4 sentences, or fewer than five wrong options can be found outside the layer's family.

## Deployment

`deploy.yml` runs on every push to `main`: it rebuilds the catalog, runs the checks, builds the app and publishes `app/dist` to GitHub Pages. `pipeline.yml` and `app.yml` run the same checks on every branch.

## Data and licences

Borders: Natural Earth 1:50m (public domain). Figures: Our World in Data (CC BY 4.0), World Bank via the `datasets` mirrors (CC BY 4.0), `mledoze/countries` (ODbL), `samayo/country-json` (MIT). Each layer carries its source, licence and year in the catalog and shows them at the reveal.
