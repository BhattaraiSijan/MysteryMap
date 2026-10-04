import json

from mm_pipeline.build import build, main
from mm_pipeline.numbers import assign_numbers

KEYS = {"id", "number", "name", "definition", "unit", "year", "source", "values", "groups", "extremes",
        "wrongOptions", "explanation"}


def test_build_writes_both_files(seven, tmp_path):
    out = tmp_path / "out"
    assert build(seven.layers, seven.data, out) == []
    cat = json.loads((out / "catalog.json").read_text())
    assert cat["version"] == 1 and len(cat["layers"]) == 7
    assert [l["number"] for l in cat["layers"]] == list(range(1, 8))
    first = cat["layers"][0]
    assert set(first) == KEYS
    assert set(first["source"]) == {"name", "url", "licence"}
    assert len(first["wrongOptions"]) == 5 and first["id"] not in first["wrongOptions"]
    assert set(first["groups"]) == set(first["values"])
    assert "PSE" not in first["values"]
    countries = json.loads((out / "countries.json").read_text())
    assert countries["version"] == 1 and any(c["code"] == "PSE" for c in countries["countries"])


def test_draft_layers_stay_out(seven_plus_draft, tmp_path):
    out = tmp_path / "out"
    assert build(seven_plus_draft.layers, seven_plus_draft.data, out) == []
    layers = json.loads((out / "catalog.json").read_text())["layers"]
    assert "draft-one" not in [l["id"] for l in layers]
    assert all("draft-one" not in l["wrongOptions"] for l in layers)
    assert "draft-one" not in json.loads((seven_plus_draft.layers / "_numbers.json").read_text())


def test_bad_layer_stops_everything(seven_with_thin_layer, tmp_path):
    out = tmp_path / "out"
    problems = build(seven_with_thin_layer.layers, seven_with_thin_layer.data, out)
    assert [p.code for p in problems] == ["coverage"]
    assert not (out / "catalog.json").exists()


def test_layer_file_error_is_a_problem(seven, tmp_path):
    path = seven.layers / "beds.yaml"
    path.write_text(path.read_text().replace("unit: A count for every 1,000 people.\n", ""))
    problems = build(seven.layers, seven.data, tmp_path / "out")
    assert [p.code for p in problems] == ["layer-file"]
    assert "unit" in problems[0].message


def test_missing_column_is_a_problem(seven, tmp_path):
    path = seven.layers / "beds.yaml"
    path.write_text(path.read_text().replace("value_column: beds", "value_column: nope"))
    problems = build(seven.layers, seven.data, tmp_path / "out")
    assert [p.code for p in problems] == ["missing-column"]


def test_numbers_are_append_only(tmp_path):
    reg = tmp_path / "_numbers.json"
    assert assign_numbers(reg, ["b", "c"]) == {"b": 1, "c": 2}
    assert assign_numbers(reg, ["a", "b", "c"]) == {"a": 3, "b": 1, "c": 2}


def test_retired_number_is_not_reused(tmp_path):
    reg = tmp_path / "_numbers.json"
    assign_numbers(reg, ["a", "b"])
    assert assign_numbers(reg, ["a", "c"])["c"] == 3
    assert json.loads(reg.read_text())["b"] == 2


def test_check_only_writes_nothing(seven, tmp_path):
    out = tmp_path / "out"
    assert build(seven.layers, seven.data, out, check_only=True) == []
    assert not out.exists()
    assert not (seven.layers / "_numbers.json").exists()


def test_command_exit_codes(seven, seven_with_thin_layer, tmp_path, capsys):
    assert main(["--layers", str(seven.layers), "--data", str(seven.data), "--out", str(tmp_path / "a"), "--check"]) == 0
    assert main(["--layers", str(seven_with_thin_layer.layers), "--data", str(seven_with_thin_layer.data),
                 "--out", str(tmp_path / "b")]) == 1
    assert "coverage:" in capsys.readouterr().out
