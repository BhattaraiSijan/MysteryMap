import json

import pytest

from mm_pipeline.countries import load_countries, write_countries

from .conftest import REPO_DATA


@pytest.fixture(scope="module")
def countries():
    return load_countries(REPO_DATA / "ne_50m_admin_0_countries.geojson")


def test_known_codes(countries):
    by = {c.code: c for c in countries}
    assert by["PSE"].name == "Palestine"
    assert by["FRA"].iso == "FRA"  # ISO_A3 is -99 for France; ISO_A3_EH carries it
    assert by["NOR"].iso == "NOR"
    assert by["X-KOS"].iso is None
    assert "ATA" not in by and "X-ATA" not in by


def test_shared_codes_merge(countries):
    by = {c.code: c for c in countries}
    assert by["AUS"].name == "Australia"
    assert by["AUS"].geometry["type"] == "MultiPolygon"


def test_codes_unique_and_plentiful(countries):
    codes = [c.code for c in countries]
    assert len(codes) == len(set(codes))
    assert codes == sorted(codes)
    assert sum(1 for c in countries if c.iso) > 200


def test_coordinates_rounded(countries):
    ring = countries[0].geometry["coordinates"][0]
    if countries[0].geometry["type"] == "MultiPolygon":
        ring = ring[0]
    assert all(round(x, 3) == x and round(y, 3) == y for x, y in ring)


def test_written_file_shape(tmp_path, countries):
    write_countries(countries, tmp_path / "countries.json")
    data = json.loads((tmp_path / "countries.json").read_text())
    assert data["version"] == 1
    assert set(data["countries"][0]) == {"code", "iso", "name", "geometry"}
