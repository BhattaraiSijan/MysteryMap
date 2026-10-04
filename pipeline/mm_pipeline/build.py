"""Build command: write catalog.json and countries.json, or refuse."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .countries import Country, load_countries, write_countries
from .derive import extremes, groups
from .layerfile import LayerError, LayerFile, load_layers
from .numbers import assign_numbers
from .options import wrong_options
from .validate import Problem, validate_layer
from .values import ValueProblem, read_values

CATALOG_VERSION = 1
NE_FILE = "ne_50m_admin_0_countries.geojson"
REGISTRY = "_numbers.json"


def load_inputs(layers_dir: Path, data_dir: Path):
    """Shared by build and preview: countries, all layers, values for every readable layer, problems so far."""
    problems: list[Problem] = []
    countries = load_countries(Path(data_dir) / NE_FILE)
    iso_codes = {c.iso for c in countries if c.iso}
    try:
        layers = load_layers(layers_dir)
    except LayerError as e:
        return countries, iso_codes, [], {}, [Problem(e.layer_id, "layer-file", str(e))]
    values: dict[str, dict[str, float]] = {}
    for layer in layers:
        try:
            values[layer.id] = read_values(layer.source, data_dir, iso_codes)
        except (ValueProblem, OSError) as e:
            code = e.code if isinstance(e, ValueProblem) else "source-file"
            problems.append(Problem(layer.id, code, f"{layer.id}: {e}"))
    return countries, iso_codes, layers, values, problems


def catalog_record(layer: LayerFile, number: int, values: dict[str, float], wrong: list[str]) -> dict:
    return {
        "id": layer.id,
        "number": number,
        "name": layer.name,
        "definition": layer.definition,
        "unit": layer.unit,
        "year": layer.year,
        "source": {"name": layer.source.name, "url": layer.source.url, "licence": layer.source.licence},
        "values": dict(sorted(values.items())),
        "groups": dict(sorted(groups(values).items())),
        "extremes": extremes(values),
        "wrongOptions": wrong,
        "explanation": layer.explanation,
    }


def build(layers_dir: Path, data_dir: Path, out_dir: Path, check_only: bool = False) -> list[Problem]:
    layers_dir, data_dir, out_dir = Path(layers_dir), Path(data_dir), Path(out_dir)
    countries, iso_codes, layers, values, problems = load_inputs(layers_dir, data_dir)
    if problems:
        return problems

    live = [l for l in layers if l.status == "live"]
    families = {l.id: l.family for l in live}
    live_values = {l.id: values[l.id] for l in live}
    wrong = {l.id: wrong_options(l.id, families, live_values) for l in live}
    for layer in live:
        problems.extend(validate_layer(layer, values[layer.id], wrong[layer.id], len(iso_codes)))
    if problems or check_only:
        return problems

    numbers = assign_numbers(layers_dir / REGISTRY, [l.id for l in live])
    records = sorted(
        (catalog_record(l, numbers[l.id], values[l.id], wrong[l.id]) for l in live),
        key=lambda r: r["number"],
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    write_countries(countries, out_dir / "countries.json")
    (out_dir / "catalog.json").write_text(
        json.dumps({"version": CATALOG_VERSION, "layers": records}, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    return []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the Mystery Map catalog.")
    parser.add_argument("--layers", required=True, type=Path)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--check", action="store_true", help="validate only, write nothing")
    args = parser.parse_args(argv)
    problems = build(args.layers, args.data, args.out, check_only=args.check)
    for p in problems:
        print(f"{p.code}: {p.message}")
    if not problems:
        print("ok" if args.check else f"wrote {args.out / 'catalog.json'} and {args.out / 'countries.json'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
