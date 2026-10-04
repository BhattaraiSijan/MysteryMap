"""Wrong options: other layers that are plausible but never near-duplicates."""

from __future__ import annotations

import math

MAX_RHO = 0.90
COUNT = 5


def _ranks(xs: list[float]) -> list[float]:
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(a: dict[str, float], b: dict[str, float]) -> float:
    """Rank correlation over shared codes; ties take the average rank; 0.0 with fewer than 3 shared codes."""
    shared = sorted(set(a) & set(b))
    if len(shared) < 3:
        return 0.0
    ra = _ranks([a[c] for c in shared])
    rb = _ranks([b[c] for c in shared])
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va = sum((x - ma) ** 2 for x in ra)
    vb = sum((y - mb) ** 2 for y in rb)
    if va == 0 or vb == 0:
        return 0.0
    return cov / math.sqrt(va * vb)


def wrong_options(layer_id: str, families: dict[str, str], values: dict[str, dict[str, float]]) -> list[str]:
    answer = values[layer_id]
    scored = []
    for other in values:
        if other == layer_id or families[other] == families[layer_id]:
            continue
        rho = spearman(answer, values[other])
        if rho < MAX_RHO:
            scored.append((-rho, other))
    return [other for _, other in sorted(scored)[:COUNT]]
