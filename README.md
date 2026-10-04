# Mystery Map

A geography game: one unlabeled world map, coloured by a hidden country-level measure. Work out what it shows, buying hints with your 10 points.

- `pipeline/` — Python command that turns hand-written layer files and source CSVs into the validated `catalog.json` and `countries.json` the app loads.
- `app/` — static React + deck.gl app that plays the catalog. No server, progress kept in the browser.
- `docs/` — product requirements, implementation plans and decisions.

## Quick start

```sh
# build the catalog
cd pipeline && pip install -e ".[dev]" && pytest
python -m mm_pipeline.build --layers layers --data data --out ../app/public/data

# run the app
cd ../app && npm ci && npm run dev
```
