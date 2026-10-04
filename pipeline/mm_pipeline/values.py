"""Source CSV -> {iso: value}."""

from __future__ import annotations

import csv
import math
from pathlib import Path

from .layerfile import Source


class ValueProblem(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code  # "non-numeric" | "duplicate-rows" | "missing-column"


def _number(text: str, where: str) -> float:
    try:
        value = float(text)
    except ValueError as e:
        raise ValueProblem("non-numeric", f"{where}: {text!r} is not a number") from e
    if not math.isfinite(value):
        raise ValueProblem("non-numeric", f"{where}: {text!r} is not a finite number")
    return value


def read_values(source: Source, data_dir: Path, iso_codes: set[str]) -> dict[str, float]:
    path = Path(data_dir) / source.path
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        columns = [source.iso_column, source.value_column] + ([source.year_column] if source.year_column else [])
        for column in columns:
            if column not in (reader.fieldnames or []):
                raise ValueProblem("missing-column", f"{source.path}: no column {column!r}")

        values: dict[str, float] = {}
        best_year: dict[str, int] = {}
        for line, row in enumerate(reader, start=2):
            code = (row[source.iso_column] or "").strip()
            if code not in iso_codes:
                continue
            text = (row[source.value_column] or "").strip()
            if not text:
                continue
            where = f"{source.path} line {line}"
            if source.year_column:
                year = int(_number(row[source.year_column].strip(), where))
                if source.year is not None and year > source.year:
                    continue
                if code in best_year and year < best_year[code]:
                    continue
                if code in best_year and year == best_year[code]:
                    raise ValueProblem("duplicate-rows", f"{where}: two rows for {code} in {year}")
                best_year[code] = year
                values[code] = _number(text, where)
            else:
                if code in values:
                    raise ValueProblem("duplicate-rows", f"{where}: a second row for {code}")
                values[code] = _number(text, where)
    return values
