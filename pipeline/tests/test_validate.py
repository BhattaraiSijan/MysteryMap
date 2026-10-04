import dataclasses

import pytest

from mm_pipeline.layerfile import load_layer
from mm_pipeline.validate import validate_layer


def codes(problems):
    return sorted(p.code for p in problems)


@pytest.fixture
def good_with(fixtures):
    base = load_layer(fixtures / "layers/hospital-beds.yaml")

    def make(n_values=180, iso_count=200, wrong=("a", "b", "c", "d", "e"), distinct=10, explanation=None):
        layer = base if explanation is None else dataclasses.replace(base, explanation=explanation)
        values = {f"C{i:03d}": float(i % distinct) for i in range(n_values)}
        return layer, values, list(wrong), iso_count

    return make


@pytest.fixture
def good(good_with):
    return good_with()


def test_good_layer_has_no_problems(good):
    assert validate_layer(*good) == []


def test_coverage(good_with):
    problems = validate_layer(*good_with(n_values=159, iso_count=200))
    assert codes(problems) == ["coverage"]
    assert problems[0].message == "hospital-beds: figures for 159 of 200 countries (79%), needs 80%"


def test_coverage_boundary(good_with):
    assert validate_layer(*good_with(n_values=160, iso_count=200)) == []


def test_wrong_options(good_with):
    assert codes(validate_layer(*good_with(wrong=["a", "b", "c", "d"]))) == ["wrong-options"]


def test_no_variation(good_with):
    assert codes(validate_layer(*good_with(distinct=4))) == ["no-variation"]


def test_explanation_length(good_with):
    assert codes(validate_layer(*good_with(explanation="One sentence."))) == ["explanation-length"]
    assert codes(validate_layer(*good_with(explanation="A. B. C. D. E."))) == ["explanation-length"]
    assert validate_layer(*good_with(explanation="It has 1.5 beds. Really? Yes!")) == []
