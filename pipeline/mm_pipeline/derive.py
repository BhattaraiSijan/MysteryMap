"""Groups and extremes derived from a layer's values."""

from __future__ import annotations

import bisect


def groups(values: dict[str, float]) -> dict[str, int]:
    """Five bands by rank: group = min(5, 1 + floor(5 * r / n)), r = count of values strictly lower."""
    n = len(values)
    ordered = sorted(values.values())
    return {code: min(5, 1 + (5 * bisect.bisect_left(ordered, v)) // n) for code, v in values.items()}


def _top(values: dict[str, float], descending: bool) -> list[str]:
    ordered = sorted(values, key=lambda c: ((-values[c] if descending else values[c]), c))
    if len(ordered) <= 3:
        return ordered
    third = values[ordered[2]]
    return ordered[:3] + [c for c in ordered[3:] if values[c] == third]


def extremes(values: dict[str, float]) -> dict[str, list[str]]:
    """The three highest and three lowest, plus every country tied with third place."""
    return {"high": _top(values, True), "low": _top(values, False)}
