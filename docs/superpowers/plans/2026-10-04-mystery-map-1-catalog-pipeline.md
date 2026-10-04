# Mystery Map Catalog Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Python command that turns hand-written layer files and source CSVs into the two validated data files the Mystery Map app loads, and refuses to build when a layer breaks a rule.

**Architecture:** One small YAML file per layer holds what a person decides (wording, source, family, explanation, status). The pipeline reads the figures from CSVs kept in the repo, derives groups, extremes and wrong options, validates every live layer, and writes `catalog.json` and `countries.json`. Builds never touch the network.

**Tech Stack:** Python 3.11+, PyYAML, pytest. Standard library for CSV and JSON.

**Spec:** `docs/superpowers/specs/2026-10-04-mystery-map-design.md` (technical design) and `docs/superpowers/specs/2026-10-04-mystery-map-prd.md` (product requirements). Export both from Claude Docs as Markdown into that folder before starting.

**This is plan 1 of 2.** Plan 2 (`2026-10-04-mystery-map-2-app.md`) builds the app and consumes this plan's output files.

## Global Constraints

- Python 3.11 or newer. Runtime dependency: `pyyaml` only. Dev dependency: `pytest` only.
- Every join uses ISO 3166-1 three-letter country codes.
- Border data: Natural Earth admin-0 countries at 1:50 million scale, file `ne_50m_admin_0_countries.geojson`, committed at `pipeline/data/`.
- Source CSVs are committed under `pipeline/data/`. A build never fetches from the network.
- Coverage threshold: a live layer needs figures for at least 80% of the countries that have an ISO code.
- Groups: five bands by rank. `group = min(5, 1 + floor(5 * r / n))`, where `r` is the count of values strictly lower and `n` is the number of countries with a value.
- Extremes: the three highest and three lowest, plus every country tied with third place.
- Wrong options: exactly five per live layer, from other live layers with a different family and a Spearman rank correlation below 0.90, most similar first, ties broken by ID.
- Layer IDs match `^[a-z0-9]+(-[a-z0-9]+)*$` and are permanent. Layer numbers come from an append-only registry and are never reused.
- Only layers with status `live` enter `catalog.json`. The catalog `version` is `1`.
- Explanations are two to four sentences.
- Output directory: `app/public/data/`.

## Review Focus

1. A source CSV with several rows per country (one per year): the pipeline takes the latest year at or before the layer's `year` setting. Pinned in Task 3.
2. Source rows whose code is not a country (regional totals such as `OWID_WRL`): ignored, never fatal. Pinned in Task 3.
3. Blank value cells mean "no data". Text that is not a number stops the build. Pinned in Task 3.
4. A measure with almost no variation (fewer than five distinct values): stops the build, because five colour groups would be meaningless. Pinned in Task 6.
5. A layer that goes live and is later retired: its number is never handed to another layer. Pinned in Task 7.

---

## File Structure

```
pipeline/
  pyproject.toml
  data/                      source CSVs and the Natural Earth file (committed)
  layers/                    one <id>.yaml per layer, plus _numbers.json
  mm_pipeline/
    layerfile.py             load and check hand-written layer files
    countries.py             Natural Earth -> country list
    values.py                source CSV -> {iso: value}
    derive.py                groups and extremes
    options.py               wrong options
    validate.py              build-stopping checks
    numbers.py               append-only number registry
    build.py                 command: write catalog.json and countries.json
    preview.py               command: write review pages for draft layers
  tests/
    fixtures/                small CSVs and layer files
```

---

### Task 1: Project scaffold and layer file loader

**Files:**
- Create: `pipeline/pyproject.toml`, `pipeline/mm_pipeline/__init__.py`, `pipeline/mm_pipeline/layerfile.py`
- Test: `pipeline/tests/test_layerfile.py`, `pipeline/tests/fixtures/layers/hospital-beds.yaml`

**Interfaces:**
- Produces:

```python
@dataclass(frozen=True)
class Source:
    name: str; url: str; licence: str
    path: str                 # CSV path relative to pipeline/data/
    iso_column: str; value_column: str
    year_column: str | None; year: int | None

@dataclass(frozen=True)
class LayerFile:
    id: str; name: str; definition: str; unit: str; year: str
    family: str; explanation: str; status: str      # "draft" | "live"
    source: Source

class LayerError(Exception):
    layer_id: str; field: str

def load_layer(path: Path) -> LayerFile
def load_layers(layers_dir: Path) -> list[LayerFile]   # sorted by id; files starting with "_" are skipped
```

Fixture `hospital-beds.yaml`:

```yaml
id: hospital-beds
name: Hospital beds
definition: Beds per 1,000 people
unit: A count for every 1,000 people.
year: 2010 to 2020
family: health-capacity
status: live
explanation: >
  Japan has about 13 beds per 1,000 people and Mali about 0.1.
  Former Soviet countries built health systems around large hospitals.
source:
  name: Our World in Data
  url: https://ourworldindata.org
  licence: CC BY 4.0
  path: owid-latest.csv
  iso_column: iso_code
  value_column: hospital_beds_per_thousand
```

- [ ] **Step 1: Write the failing tests**

```python
def test_loads_valid_layer(fixtures):
    layer = load_layer(fixtures / "layers/hospital-beds.yaml")
    assert layer.id == "hospital-beds"
    assert layer.source.value_column == "hospital_beds_per_thousand"
    assert layer.source.year_column is None

@pytest.mark.parametrize("field", ["name", "definition", "unit", "year", "family", "explanation", "status"])
def test_missing_field_names_the_field(tmp_layer, field):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(remove=field))
    assert e.value.field == field

@pytest.mark.parametrize("field", ["name", "url", "licence", "path", "iso_column", "value_column"])
def test_missing_source_field(tmp_layer, field):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(remove_source=field))
    assert e.value.field == f"source.{field}"

def test_bad_id_and_bad_status(tmp_layer):
    with pytest.raises(LayerError) as e: load_layer(tmp_layer(id="Hospital Beds"))
    assert e.value.field == "id"
    with pytest.raises(LayerError) as e: load_layer(tmp_layer(status="published"))
    assert e.value.field == "status"

def test_file_name_must_match_id(tmp_layer):
    with pytest.raises(LayerError) as e: load_layer(tmp_layer(filename="other.yaml"))
    assert e.value.field == "id"

def test_duplicate_ids_rejected_and_underscore_files_skipped(tmp_path): ...
    # two files resolving to the same id -> LayerError(field="id"); "_numbers.json" is ignored
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_layerfile.py -v`. Expected: FAIL, `layerfile` not found.
- [ ] **Step 3: Implement `load_layer` and `load_layers` in `pipeline/mm_pipeline/layerfile.py`**, with `pyproject.toml` declaring the package, `pyyaml`, and a `dev` extra with `pytest`. An empty string counts as missing.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): layer file loader`.

---

### Task 2: Countries file

**Files:**
- Create: `pipeline/mm_pipeline/countries.py`, `pipeline/data/ne_50m_admin_0_countries.geojson` (download from the `nvkelso/natural-earth-vector` repository, `geojson/` folder)
- Test: `pipeline/tests/test_countries.py`

**Interfaces:**
- Produces:

```python
@dataclass(frozen=True)
class Country:
    code: str            # the ISO code, or "X-" + ADM0_A3 when there is none
    iso: str | None
    name: str
    geometry: dict       # GeoJSON Polygon or MultiPolygon, coordinates rounded to 3 decimals

def load_countries(geojson_path: Path) -> list[Country]     # sorted by code
def write_countries(countries: list[Country], out_path: Path) -> None
# file shape: {"version": 1, "countries": [{"code", "iso", "name", "geometry"}]}
```

Rules: `iso` is `ISO_A3_EH` when it is three letters, else `ISO_A3` when it is three letters, else `None`. `name` is the `NAME` property. Skip the feature whose `ADM0_A3` is `ATA`. Features sharing one code merge into one MultiPolygon.

- [ ] **Step 1: Write the failing tests** (they read the real Natural Earth file)

```python
def test_known_codes(countries):
    by = {c.code: c for c in countries}
    assert by["PSE"].name == "Palestine"
    assert by["FRA"].iso == "FRA"          # ISO_A3 is -99 for France; ISO_A3_EH carries it
    assert by["NOR"].iso == "NOR"
    assert by["X-KOS"].iso is None
    assert "ATA" not in by and "X-ATA" not in by

def test_codes_unique_and_plentiful(countries):
    codes = [c.code for c in countries]
    assert len(codes) == len(set(codes))
    assert sum(1 for c in countries if c.iso) > 200

def test_written_file_shape(tmp_path, countries):
    write_countries(countries, tmp_path / "countries.json")
    data = json.loads((tmp_path / "countries.json").read_text())
    assert data["version"] == 1
    assert set(data["countries"][0]) == {"code", "iso", "name", "geometry"}
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_countries.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `load_countries` and `write_countries`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): countries file from Natural Earth`.

---

### Task 3: Values from a source CSV

**Files:**
- Create: `pipeline/mm_pipeline/values.py`
- Test: `pipeline/tests/test_values.py`, CSVs in `pipeline/tests/fixtures/data/`

**Interfaces:**
- Consumes: `Source` from Task 1.
- Produces:

```python
class ValueProblem(Exception):
    code: str        # "non-numeric" | "duplicate-rows" | "missing-column"

def read_values(source: Source, data_dir: Path, iso_codes: set[str]) -> dict[str, float]
```

Rules: rows whose code is not in `iso_codes` are ignored. A blank value cell is skipped. With `year_column` set, each country takes its row with the latest year at or before `source.year`, skipping rows whose value is blank. Without `year_column`, two rows for one country raise `duplicate-rows`.

- [ ] **Step 1: Write the failing tests**

```python
ISO = {"JPN", "MLI", "NPL"}

def test_plain_csv(src, data):            # rows: JPN 13.05, MLI 0.1, OWID_WRL 2.9, NPL blank
    assert read_values(src("plain.csv"), data, ISO) == {"JPN": 13.05, "MLI": 0.1}

def test_latest_year_at_or_before(src, data):   # JPN: 2015=12.0, 2019=13.0, 2022=14.0
    assert read_values(src("years.csv", year_column="year", year=2020), data, ISO)["JPN"] == 13.0

def test_latest_year_skips_blank(src, data):    # MLI: 2018=0.1, 2019=blank
    assert read_values(src("years.csv", year_column="year", year=2020), data, ISO)["MLI"] == 0.1

def test_text_value_stops(src, data):           # MLI value is "n/a"
    with pytest.raises(ValueProblem) as e: read_values(src("text.csv"), data, ISO)
    assert e.value.code == "non-numeric"

def test_duplicates_without_year_column(src, data):
    with pytest.raises(ValueProblem) as e: read_values(src("dupes.csv"), data, ISO)
    assert e.value.code == "duplicate-rows"

def test_missing_column(src, data):
    with pytest.raises(ValueProblem) as e: read_values(src("plain.csv", value_column="nope"), data, ISO)
    assert e.value.code == "missing-column"
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_values.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `read_values` with the `csv` module.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): read values from source CSVs`.

---

### Task 4: Groups and extremes

**Files:**
- Create: `pipeline/mm_pipeline/derive.py`
- Test: `pipeline/tests/test_derive.py`

**Interfaces:**
- Produces:

```python
def groups(values: dict[str, float]) -> dict[str, int]              # every value in 1..5
def extremes(values: dict[str, float]) -> dict[str, list[str]]      # {"high": [...], "low": [...]}
```

`high` is ordered by value descending then code. `low` is ordered by value ascending then code.

- [ ] **Step 1: Write the failing tests**

```python
def test_ten_distinct_values_make_five_pairs():
    v = {c: i for i, c in enumerate("ABCDEFGHIJ", start=1)}
    assert groups(v) == {"A":1,"B":1,"C":2,"D":2,"E":3,"F":3,"G":4,"H":4,"I":5,"J":5}

def test_ties_share_a_group():
    assert groups({"A":1,"B":1,"C":1,"D":2,"E":3}) == {"A":1,"B":1,"C":1,"D":4,"E":5}

def test_extremes_plain():
    v = {c: i for i, c in enumerate("ABCDEFGH", start=1)}
    assert extremes(v) == {"high": ["H","G","F"], "low": ["A","B","C"]}

def test_extremes_include_ties_at_third():
    v = {"MLI":0.1,"MDG":0.2,"ETH":0.3,"GIN":0.3,"NPL":0.3,"NER":0.3,"IND":0.5,"USA":2.8,"KOR":12.3,"JPN":13.1,"PRK":13.2}
    assert extremes(v)["low"] == ["MLI","MDG","ETH","GIN","NER","NPL"]
    assert extremes(v)["high"] == ["PRK","JPN","KOR"]
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_derive.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions using the group formula in Global Constraints.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): groups and extremes`.

---

### Task 5: Wrong options

**Files:**
- Create: `pipeline/mm_pipeline/options.py`
- Test: `pipeline/tests/test_options.py`

**Interfaces:**
- Produces:

```python
def spearman(a: dict[str, float], b: dict[str, float]) -> float
# rank correlation over the codes both share; tied values take the average rank; 0.0 when fewer than 3 shared codes

def wrong_options(layer_id: str, families: dict[str, str], values: dict[str, dict[str, float]]) -> list[str]
# candidates: every other id with a different family and spearman(answer, candidate) < 0.90
# order: spearman descending, then id; returns the first five, or fewer when there are not five
```

- [ ] **Step 1: Write the failing tests**

```python
def test_spearman_known_values():
    a = {"A":1,"B":2,"C":3,"D":4}
    assert spearman(a, {"A":10,"B":20,"C":30,"D":40}) == pytest.approx(1.0)
    assert spearman(a, {"A":4,"B":3,"C":2,"D":1}) == pytest.approx(-1.0)
    assert spearman(a, {"A":1,"B":3,"C":2,"D":4}) == pytest.approx(0.8)

def test_same_family_and_lookalikes_excluded(seven_layers):
    families, values = seven_layers          # "twin" ranks identically to "answer"; "sibling" shares its family
    out = wrong_options("answer", families, values)
    assert "twin" not in out and "sibling" not in out and "answer" not in out

def test_most_similar_first_and_capped_at_five(nine_layers):
    families, values = nine_layers
    out = wrong_options("answer", families, values)
    assert len(out) == 5
    rhos = [spearman(values["answer"], values[i]) for i in out]
    assert rhos == sorted(rhos, reverse=True)

def test_returns_fewer_when_short(three_layers):
    families, values = three_layers
    assert len(wrong_options("answer", families, values)) == 2
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_options.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `spearman` and `wrong_options`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): wrong option selection`.

---

### Task 6: Validation

**Files:**
- Create: `pipeline/mm_pipeline/validate.py`
- Test: `pipeline/tests/test_validate.py`

**Interfaces:**
- Consumes: `LayerFile` (Task 1).
- Produces:

```python
@dataclass(frozen=True)
class Problem:
    layer_id: str; code: str; message: str

def validate_layer(layer: LayerFile, values: dict[str, float], wrong: list[str], iso_count: int) -> list[Problem]
```

Problem codes: `coverage` (`len(values) / iso_count < 0.80`), `wrong-options` (`len(wrong) < 5`), `no-variation` (fewer than five distinct values), `explanation-length` (sentence count outside 2 to 4, counting `.`, `!` or `?` followed by a space or the end).

- [ ] **Step 1: Write the failing tests**

```python
def codes(problems): return sorted(p.code for p in problems)

def test_good_layer_has_no_problems(good): assert validate_layer(*good) == []
def test_coverage(good_with):  assert codes(validate_layer(*good_with(n_values=159, iso_count=200))) == ["coverage"]
def test_coverage_boundary(good_with): assert validate_layer(*good_with(n_values=160, iso_count=200)) == []
def test_wrong_options(good_with): assert codes(validate_layer(*good_with(wrong=["a","b","c","d"]))) == ["wrong-options"]
def test_no_variation(good_with): assert codes(validate_layer(*good_with(distinct=4))) == ["no-variation"]
def test_explanation_length(good_with):
    assert codes(validate_layer(*good_with(explanation="One sentence."))) == ["explanation-length"]
    assert codes(validate_layer(*good_with(explanation="A. B. C. D. E."))) == ["explanation-length"]
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_validate.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `validate_layer`. Each message names the layer and the numbers involved, for example `hospital-beds: figures for 149 of 200 countries (74%), needs 80%`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): build-stopping checks`.

---

### Task 7: Number registry and build command

**Files:**
- Create: `pipeline/mm_pipeline/numbers.py`, `pipeline/mm_pipeline/build.py`
- Test: `pipeline/tests/test_build.py`, seven fixture layers and one fixture CSV

**Interfaces:**
- Consumes: everything from Tasks 1 to 6.
- Produces:

```python
def assign_numbers(registry_path: Path, live_ids: list[str]) -> dict[str, int]
# reads {"id": number} from registry_path (missing file = empty); ids not yet present get max+1 in id order;
# writes the file back; never removes or renumbers an entry

def build(layers_dir: Path, data_dir: Path, out_dir: Path, check_only: bool = False) -> list[Problem]
# writes out_dir/countries.json and out_dir/catalog.json only when the list is empty and check_only is False
```

Command: `python -m mm_pipeline.build --layers layers --data data --out ../app/public/data [--check]`. Exit code 0 with no problems, 1 otherwise, printing one line per problem. `LayerError` and `ValueProblem` are reported as problems with codes `layer-file` and their own code.

Catalog record, exactly these keys: `id, number, name, definition, unit, year, source {name, url, licence}, values, groups, extremes, wrongOptions, explanation`. File shape: `{"version": 1, "layers": [...]}` ordered by number. Draft layers are loaded and checked for file errors but are left out of the catalog and out of other layers' wrong options.

- [ ] **Step 1: Write the failing tests**

```python
def test_build_writes_both_files(seven, tmp_path):
    assert build(seven.layers, seven.data, tmp_path) == []
    cat = json.loads((tmp_path / "catalog.json").read_text())
    assert cat["version"] == 1 and len(cat["layers"]) == 7
    first = cat["layers"][0]
    assert set(first) == {"id","number","name","definition","unit","year","source","values","groups","extremes","wrongOptions","explanation"}
    assert len(first["wrongOptions"]) == 5 and first["id"] not in first["wrongOptions"]
    assert set(first["groups"]) == set(first["values"])

def test_draft_layers_stay_out(seven_plus_draft, tmp_path):
    build(seven_plus_draft.layers, seven_plus_draft.data, tmp_path)
    layers = json.loads((tmp_path / "catalog.json").read_text())["layers"]
    assert "draft-one" not in [l["id"] for l in layers]
    assert all("draft-one" not in l["wrongOptions"] for l in layers)

def test_bad_layer_stops_everything(seven_with_thin_layer, tmp_path):
    problems = build(seven_with_thin_layer.layers, seven_with_thin_layer.data, tmp_path)
    assert [p.code for p in problems] == ["coverage"]
    assert not (tmp_path / "catalog.json").exists()

def test_numbers_are_append_only(tmp_path):
    reg = tmp_path / "_numbers.json"
    assert assign_numbers(reg, ["b", "c"]) == {"b": 1, "c": 2}
    assert assign_numbers(reg, ["a", "b", "c"]) == {"a": 3, "b": 1, "c": 2}

def test_retired_number_is_not_reused(tmp_path):
    reg = tmp_path / "_numbers.json"
    assign_numbers(reg, ["a", "b"])
    assert assign_numbers(reg, ["a", "c"])["c"] == 3
    assert json.loads(reg.read_text())["b"] == 2

def test_check_only_writes_nothing(seven, tmp_path):
    build(seven.layers, seven.data, tmp_path, check_only=True)
    assert list(tmp_path.iterdir()) == []
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_build.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `assign_numbers`, `build` and the command entry point. The registry lives at `<layers_dir>/_numbers.json`.
- [ ] **Step 4: Run** `pytest pipeline -v`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(pipeline): build command and number registry`.

---

### Task 8: Preview pages for review

**Files:**
- Create: `pipeline/mm_pipeline/preview.py`
- Test: `pipeline/tests/test_preview.py`

**Interfaces:**
- Consumes: Tasks 1 to 6.
- Produces:

```python
def write_previews(layers_dir: Path, data_dir: Path, out_dir: Path) -> list[Path]
# one <id>.html per draft layer
```

Command: `python -m mm_pipeline.preview --layers layers --data data --out preview`. Each page is one self-contained HTML file holding: the layer name and definition, an inline SVG world map coloured by group (plain longitude and latitude as x and y is enough here), coverage as "N of M countries", the highest and lowest country names, the six option names with definitions, the explanation, and every problem `validate_layer` reports. For a draft, wrong options are computed against live layers only.

- [ ] **Step 1: Write the failing test**

```python
def test_preview_page_contents(seven_plus_draft, tmp_path):
    [page] = write_previews(seven_plus_draft.layers, seven_plus_draft.data, tmp_path)
    html = page.read_text()
    assert page.name == "draft-one.html"
    for text in ["Draft one", "Highest", "Lowest", "countries", "<svg"]:
        assert text in html
    assert html.count('class="option"') == 6

def test_preview_lists_problems(seven_plus_thin_draft, tmp_path):
    [page] = write_previews(seven_plus_thin_draft.layers, seven_plus_thin_draft.data, tmp_path)
    assert "needs 80%" in page.read_text()
```

- [ ] **Step 2: Run** `pytest pipeline/tests/test_preview.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `write_previews` and its command entry point.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pipeline): preview pages for draft layers`.

---

### Task 9: Continuous checks

**Files:**
- Create: `.github/workflows/pipeline.yml`

- [ ] **Step 1: Write the workflow.** On every push and pull request that touches `pipeline/**`: set up Python 3.11, `pip install -e "pipeline[dev]"`, run `pytest pipeline`, then run `python -m mm_pipeline.build --layers layers --data data --out /tmp/out --check` from `pipeline/`.
- [ ] **Step 2: Verify.** Push a branch with a layer file whose `unit` is removed. Expected: the workflow fails and prints the `layer-file` problem. Restore the field. Expected: the workflow passes.
- [ ] **Step 3: Commit** `ci: pipeline tests and catalog check`.

---

### Task 10: Count the supply and author the first 30 layers

This task is curation, so it has a checklist and a gate in place of a test cycle.

**Files:**
- Create: `docs/layer-candidates.md`, 30 files under `pipeline/layers/`, source CSVs under `pipeline/data/`

- [ ] **Step 1: List candidates.** From open country-level data sources whose licence allows reuse with credit, list every measure that is everyday (no specialist knowledge needed to understand its definition). Record source, licence, and how many ISO countries have a figure.
- [ ] **Step 2: Count.** In `docs/layer-candidates.md`, state how many candidates reach 80% coverage. This answers the open question of whether 300 usable layers exist.
- [ ] **Step 3: Author 30 layer files** across at least six families, so every layer can find five wrong options outside its own family. Claude drafts each explanation with its source.
- [ ] **Step 4: Review.** Run the preview command, read each page, check each explanation against its source, and set `status: live`.
- [ ] **Step 5: Gate.** `python -m mm_pipeline.build --layers layers --data data --out ../app/public/data` exits 0 with 30 layers in `catalog.json`. Record the time spent per layer; the target is 15 minutes or less.
- [ ] **Step 6: Commit** `content: first 30 layers`.
