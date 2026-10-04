import pytest
import yaml

from mm_pipeline.layerfile import LayerError, load_layer, load_layers


def test_loads_valid_layer(fixtures):
    layer = load_layer(fixtures / "layers/hospital-beds.yaml")
    assert layer.id == "hospital-beds"
    assert layer.status == "live"
    assert layer.source.value_column == "hospital_beds_per_thousand"
    assert layer.source.year_column is None
    assert layer.explanation.startswith("Japan has about 13 beds")


@pytest.mark.parametrize("field", ["name", "definition", "unit", "year", "family", "explanation", "status"])
def test_missing_field_names_the_field(tmp_layer, field):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(remove=field))
    assert e.value.field == field


@pytest.mark.parametrize("field", ["name", "definition"])
def test_empty_string_counts_as_missing(tmp_layer, field):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(**{field: "  "}))
    assert e.value.field == field


@pytest.mark.parametrize("field", ["name", "url", "licence", "path", "iso_column", "value_column"])
def test_missing_source_field(tmp_layer, field):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(remove_source=field))
    assert e.value.field == f"source.{field}"


def test_bad_id_and_bad_status(tmp_layer):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(id="Hospital Beds"))
    assert e.value.field == "id"
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(status="published"))
    assert e.value.field == "status"


def test_file_name_must_match_id(tmp_layer):
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(filename="other.yaml"))
    assert e.value.field == "id"


def test_duplicate_ids_rejected_and_underscore_files_skipped(fixtures, tmp_path):
    text = (fixtures / "layers/hospital-beds.yaml").read_text()
    (tmp_path / "hospital-beds.yaml").write_text(text)
    (tmp_path / "_numbers.json").write_text("{}")
    assert [l.id for l in load_layers(tmp_path)] == ["hospital-beds"]
    (tmp_path / "hospital-beds.yml").write_text(text)
    with pytest.raises(LayerError) as e:
        load_layers(tmp_path)
    assert e.value.field == "id"


def test_year_column_needs_year(tmp_layer, fixtures):
    raw = yaml.safe_load((fixtures / "layers/hospital-beds.yaml").read_text())
    raw["source"]["year_column"] = "year"
    with pytest.raises(LayerError) as e:
        load_layer(tmp_layer(source=raw["source"]))
    assert e.value.field == "source.year"
