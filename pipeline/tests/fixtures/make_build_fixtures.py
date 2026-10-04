"""Writes the fixture layers and CSV used by test_build and test_preview. Run once; output is committed."""
import random
from pathlib import Path

HERE = Path(__file__).parent
import sys
sys.path.insert(0, str(HERE.parent.parent))
from mm_pipeline.countries import load_countries  # noqa: E402

CODES = sorted(c.iso for c in load_countries(HERE.parent.parent / "data" / "ne_50m_admin_0_countries.geojson") if c.iso)
CODES = [c for c in CODES if c != "PSE"]  # PSE stays out so a known country has no data

LAYERS = [
    ("beds", "Hospital beds", "Beds per 1,000 people", "A count for every 1,000 people.", "health"),
    ("age", "Median age", "Median age of the population in years", "Years of age.", "people"),
    ("rain", "Rainfall", "Average yearly rainfall in millimetres", "Millimetres of water a year.", "climate"),
    ("cars", "Cars", "Cars per 1,000 people", "A count for every 1,000 people.", "transport"),
    ("fish", "Fish eaten", "Kilograms of fish eaten per person a year", "Kilograms a person a year.", "food"),
    ("rail", "Railway length", "Kilometres of railway per 1,000 square kilometres", "Kilometres for every 1,000 square kilometres.", "infrastructure"),
    ("cold", "Cold days", "Days a year below freezing in the capital", "A count of days a year.", "weather"),
]


def main():
    rng = random.Random(7)
    layers_dir = HERE / "build" / "layers"
    data_dir = HERE / "build" / "data"
    layers_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    columns = {}
    for lid, *_ in LAYERS + [("draft-one",), ("thin",)]:
        columns[lid] = {c: round(rng.uniform(0, 100), 2) for c in CODES}
    for c in rng.sample(CODES, 60):
        del columns["thin"][c]
    columns["beds"]["JPN"] = 130.5
    columns["beds"]["MLI"] = 0.1
    with (data_dir / "fixture.csv").open("w") as f:
        f.write("iso_code," + ",".join(columns) + "\n")
        f.write("OWID_WRL," + ",".join("1" for _ in columns) + "\n")
        for c in CODES:
            f.write(c + "," + ",".join("" if c not in columns[k] else str(columns[k][c]) for k in columns) + "\n")
    for lid, name, definition, unit, family in LAYERS + [
        ("draft-one", "Draft one", "A draft measure", "A draft unit.", "drafts"),
        ("thin", "Thin layer", "A measure with thin coverage", "A thin unit.", "thin"),
    ]:
        status = "draft" if lid == "draft-one" else "live"
        text = f"""id: {lid}
name: {name}
definition: {definition}
unit: {unit}
year: 2020
family: {family}
status: {status}
explanation: >
  Fixture layer {name}. It exists only for the tests.
source:
  name: Fixture
  url: https://example.com
  licence: CC0
  path: fixture.csv
  iso_column: iso_code
  value_column: {lid}
"""
        (layers_dir / f"{lid}.yaml").write_text(text)


if __name__ == "__main__":
    main()
