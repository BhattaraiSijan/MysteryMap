import dataclasses

import pytest

from mm_pipeline.layerfile import Source
from mm_pipeline.values import ValueProblem, read_values

ISO = {"JPN", "MLI", "NPL"}


@pytest.fixture
def data(fixtures):
    return fixtures / "data"


@pytest.fixture
def src():
    base = Source(name="t", url="u", licence="l", path="plain.csv", iso_column="iso_code",
                  value_column="value", year_column=None, year=None)
    return lambda path, **changes: dataclasses.replace(base, path=path, **changes)


def test_plain_csv(src, data):  # rows: JPN 13.05, MLI 0.1, OWID_WRL 2.9, NPL blank
    assert read_values(src("plain.csv"), data, ISO) == {"JPN": 13.05, "MLI": 0.1}


def test_latest_year_at_or_before(src, data):  # JPN: 2015=12.0, 2019=13.0, 2022=14.0
    assert read_values(src("years.csv", year_column="year", year=2020), data, ISO)["JPN"] == 13.0


def test_latest_year_skips_blank(src, data):  # MLI: 2018=0.1, 2019=blank
    assert read_values(src("years.csv", year_column="year", year=2020), data, ISO)["MLI"] == 0.1


def test_text_value_stops(src, data):  # MLI value is "n/a"
    with pytest.raises(ValueProblem) as e:
        read_values(src("text.csv"), data, ISO)
    assert e.value.code == "non-numeric"


def test_duplicates_without_year_column(src, data):
    with pytest.raises(ValueProblem) as e:
        read_values(src("dupes.csv"), data, ISO)
    assert e.value.code == "duplicate-rows"


def test_missing_column(src, data):
    with pytest.raises(ValueProblem) as e:
        read_values(src("plain.csv", value_column="nope"), data, ISO)
    assert e.value.code == "missing-column"
