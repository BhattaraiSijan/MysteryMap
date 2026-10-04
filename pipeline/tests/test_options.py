import random

import pytest

from mm_pipeline.options import spearman, wrong_options

CODES = [f"C{i:02d}" for i in range(30)]


def _random(seed):
    rng = random.Random(seed)
    return {c: rng.random() for c in CODES}


def _layers(n):
    answer = {c: float(i) for i, c in enumerate(CODES)}
    values = {"answer": answer}
    families = {"answer": "health"}
    for i in range(n):
        values[f"l{i}"] = _random(i)
        families[f"l{i}"] = f"fam{i}"
    return families, values


def test_spearman_known_values():
    a = {"A": 1, "B": 2, "C": 3, "D": 4}
    assert spearman(a, {"A": 10, "B": 20, "C": 30, "D": 40}) == pytest.approx(1.0)
    assert spearman(a, {"A": 4, "B": 3, "C": 2, "D": 1}) == pytest.approx(-1.0)
    assert spearman(a, {"A": 1, "B": 3, "C": 2, "D": 4}) == pytest.approx(0.8)


def test_spearman_uses_shared_codes_and_handles_ties():
    assert spearman({"A": 1, "B": 2}, {"A": 1, "B": 2}) == 0.0
    assert spearman({"A": 1, "B": 2, "C": 3, "X": 9}, {"A": 1, "B": 2, "C": 3, "Y": 0}) == pytest.approx(1.0)
    assert spearman({"A": 1, "B": 1, "C": 2}, {"A": 5, "B": 5, "C": 6}) == pytest.approx(1.0)


@pytest.fixture
def seven_layers():
    families, values = _layers(4)
    values["twin"] = {c: v * 2 for c, v in values["answer"].items()}
    families["twin"] = "other"
    values["sibling"] = _random(99)
    families["sibling"] = "health"
    return families, values


def test_same_family_and_lookalikes_excluded(seven_layers):
    families, values = seven_layers  # "twin" ranks identically to "answer"; "sibling" shares its family
    out = wrong_options("answer", families, values)
    assert "twin" not in out and "sibling" not in out and "answer" not in out
    assert len(out) == 4


def test_most_similar_first_and_capped_at_five():
    families, values = _layers(8)
    out = wrong_options("answer", families, values)
    assert len(out) == 5
    rhos = [spearman(values["answer"], values[i]) for i in out]
    assert rhos == sorted(rhos, reverse=True)


def test_returns_fewer_when_short():
    families, values = _layers(2)
    assert len(wrong_options("answer", families, values)) == 2
