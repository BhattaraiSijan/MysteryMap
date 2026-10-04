"""Checks that stop the build."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .layerfile import LayerFile

MIN_COVERAGE = 0.80
MIN_WRONG = 5
MIN_DISTINCT = 5
SENTENCES = (2, 4)
_SENTENCE_END = re.compile(r"[.!?](?=\s|$)")


@dataclass(frozen=True)
class Problem:
    layer_id: str
    code: str
    message: str


def count_sentences(text: str) -> int:
    return len(_SENTENCE_END.findall(text.strip()))


def validate_layer(layer: LayerFile, values: dict[str, float], wrong: list[str], iso_count: int) -> list[Problem]:
    problems = []
    lid = layer.id
    if iso_count == 0 or len(values) / iso_count < MIN_COVERAGE:
        pct = 0 if iso_count == 0 else int(100 * len(values) / iso_count)
        problems.append(Problem(lid, "coverage",
            f"{lid}: figures for {len(values)} of {iso_count} countries ({pct}%), needs {int(MIN_COVERAGE * 100)}%"))
    if len(wrong) < MIN_WRONG:
        problems.append(Problem(lid, "wrong-options",
            f"{lid}: {len(wrong)} eligible wrong options, needs {MIN_WRONG}"))
    distinct = len(set(values.values()))
    if distinct < MIN_DISTINCT:
        problems.append(Problem(lid, "no-variation",
            f"{lid}: {distinct} distinct values, needs {MIN_DISTINCT} for five groups"))
    n = count_sentences(layer.explanation)
    if not SENTENCES[0] <= n <= SENTENCES[1]:
        problems.append(Problem(lid, "explanation-length",
            f"{lid}: explanation has {n} sentences, needs {SENTENCES[0]} to {SENTENCES[1]}"))
    return problems
