"""Load and check the hand-written layer files."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

ID_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
STATUSES = ("draft", "live")
LAYER_FIELDS = ("name", "definition", "unit", "year", "family", "explanation", "status")
SOURCE_FIELDS = ("name", "url", "licence", "path", "iso_column", "value_column")


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    licence: str
    path: str  # CSV path relative to pipeline/data/
    iso_column: str
    value_column: str
    year_column: str | None
    year: int | None


@dataclass(frozen=True)
class LayerFile:
    id: str
    name: str
    definition: str
    unit: str
    year: str
    family: str
    explanation: str
    status: str  # "draft" | "live"
    source: Source


class LayerError(Exception):
    def __init__(self, layer_id: str, field: str, message: str):
        super().__init__(f"{layer_id}: {message}")
        self.layer_id = layer_id
        self.field = field


def _text(value: object) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())


def load_layer(path: Path) -> LayerFile:
    path = Path(path)
    layer_id = path.stem
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        raise LayerError(layer_id, "file", f"cannot parse YAML: {e}") from e
    if not isinstance(raw, dict):
        raise LayerError(layer_id, "file", "layer file must be a mapping")

    found_id = _text(raw.get("id"))
    if not found_id:
        raise LayerError(layer_id, "id", "missing id")
    if not ID_PATTERN.match(found_id):
        raise LayerError(layer_id, "id", f"id {found_id!r} must be lowercase words joined by hyphens")
    if found_id != layer_id:
        raise LayerError(layer_id, "id", f"id {found_id!r} does not match file name {path.name!r}")

    values: dict[str, str] = {}
    for field in LAYER_FIELDS:
        value = _text(raw.get(field))
        if not value:
            raise LayerError(layer_id, field, f"missing {field}")
        values[field] = value
    if values["status"] not in STATUSES:
        raise LayerError(layer_id, "status", f"status {values['status']!r} must be one of {', '.join(STATUSES)}")

    src = raw.get("source")
    if not isinstance(src, dict):
        raise LayerError(layer_id, "source", "missing source")
    src_values: dict[str, str] = {}
    for field in SOURCE_FIELDS:
        value = _text(src.get(field))
        if not value:
            raise LayerError(layer_id, f"source.{field}", f"missing source.{field}")
        src_values[field] = value
    year_column = _text(src.get("year_column")) or None
    year = src.get("year")
    if year is not None:
        try:
            year = int(year)
        except (TypeError, ValueError) as e:
            raise LayerError(layer_id, "source.year", "source.year must be a whole number") from e
    if year_column and year is None:
        raise LayerError(layer_id, "source.year", "source.year is required with source.year_column")

    return LayerFile(
        id=found_id,
        source=Source(year_column=year_column, year=year, **src_values),
        **values,
    )


def load_layers(layers_dir: Path) -> list[LayerFile]:
    layers: dict[str, LayerFile] = {}
    for path in sorted(Path(layers_dir).iterdir()):
        if path.name.startswith("_") or path.suffix not in (".yaml", ".yml"):
            continue
        layer = load_layer(path)
        if layer.id in layers:
            raise LayerError(layer.id, "id", f"duplicate layer id {layer.id!r}")
        layers[layer.id] = layer
    return [layers[k] for k in sorted(layers)]
