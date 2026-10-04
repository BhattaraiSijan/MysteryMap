"""Natural Earth admin-0 countries -> the country list the app draws."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

ISO_PATTERN = re.compile(r"^[A-Z]{3}$")
SKIP = {"ATA"}


@dataclass(frozen=True)
class Country:
    code: str  # the ISO code, or "X-" + ADM0_A3 when there is none
    iso: str | None
    name: str
    geometry: dict  # GeoJSON Polygon or MultiPolygon, coordinates rounded to 3 decimals


def _iso(props: dict) -> str | None:
    for key in ("ISO_A3_EH", "ISO_A3"):
        value = str(props.get(key) or "")
        if ISO_PATTERN.match(value):
            return value
    return None


def _round(coords):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], 3), round(coords[1], 3)]
    return [_round(c) for c in coords]


def _polygons(geometry: dict) -> list:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return list(geometry["coordinates"])
    raise ValueError(f"unexpected geometry type {geometry['type']}")


def load_countries(geojson_path: Path) -> list[Country]:
    data = json.loads(Path(geojson_path).read_text(encoding="utf-8"))
    merged: dict[str, dict] = {}
    for feature in data["features"]:
        props = feature["properties"]
        adm = props["ADM0_A3"]
        if adm in SKIP:
            continue
        iso = _iso(props)
        code = iso or f"X-{adm}"
        entry = merged.setdefault(code, {"iso": iso, "names": [], "polygons": []})
        entry["names"].append((adm == iso, props["NAME"]))
        entry["polygons"].extend(_polygons(feature["geometry"]))

    countries = []
    for code, entry in merged.items():
        # Prefer the name of the feature whose own ADM0 code is the ISO code (Australia over its islands).
        name = sorted(entry["names"], key=lambda n: not n[0])[0][1]
        polygons = _round(entry["polygons"])
        geometry = (
            {"type": "Polygon", "coordinates": polygons[0]}
            if len(polygons) == 1
            else {"type": "MultiPolygon", "coordinates": polygons}
        )
        countries.append(Country(code=code, iso=entry["iso"], name=name, geometry=geometry))
    return sorted(countries, key=lambda c: c.code)


def write_countries(countries: list[Country], out_path: Path) -> None:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "version": 1,
        "countries": [
            {"code": c.code, "iso": c.iso, "name": c.name, "geometry": c.geometry} for c in countries
        ],
    }
    out_path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
