from pathlib import Path

import pytest
import yaml

FIXTURES = Path(__file__).parent / "fixtures"
REPO_DATA = Path(__file__).parent.parent / "data"


@pytest.fixture
def fixtures() -> Path:
    return FIXTURES


@pytest.fixture
def tmp_layer(tmp_path):
    """Write a copy of the hospital-beds fixture with changes, return its path."""

    def make(remove=None, remove_source=None, filename=None, **changes):
        raw = yaml.safe_load((FIXTURES / "layers/hospital-beds.yaml").read_text())
        raw.update(changes)
        if remove:
            del raw[remove]
        if remove_source:
            del raw["source"][remove_source]
        path = tmp_path / (filename or f"{raw.get('id', 'hospital-beds')}.yaml")
        if not path.stem.replace("-", "").isalnum() or path.stem != path.stem.lower():
            path = tmp_path / (filename or "hospital-beds.yaml")
        path.write_text(yaml.safe_dump(raw))
        return path

    return make


class BuildCase:
    """A temporary layers dir plus a data dir holding the fixture CSV and the real Natural Earth file."""

    def __init__(self, tmp_path, layer_ids):
        root = tmp_path / "-".join(layer_ids)
        self.layers = root / "layers"
        self.layers.mkdir(parents=True)
        self.data = root / "data"
        self.data.mkdir()
        (self.data / "fixture.csv").write_bytes((FIXTURES / "build" / "data" / "fixture.csv").read_bytes())
        (self.data / "ne_50m_admin_0_countries.geojson").symlink_to(REPO_DATA / "ne_50m_admin_0_countries.geojson")
        for lid in layer_ids:
            src = FIXTURES / "build" / "layers" / f"{lid}.yaml"
            (self.layers / src.name).write_text(src.read_text())


SEVEN = ["beds", "age", "rain", "cars", "fish", "rail", "cold"]


@pytest.fixture
def seven(tmp_path):
    return BuildCase(tmp_path, SEVEN)


@pytest.fixture
def seven_plus_draft(tmp_path):
    return BuildCase(tmp_path, SEVEN + ["draft-one"])


@pytest.fixture
def seven_with_thin_layer(tmp_path):
    return BuildCase(tmp_path, SEVEN + ["thin"])


@pytest.fixture
def seven_plus_thin_draft(tmp_path):
    case = BuildCase(tmp_path, SEVEN + ["thin"])
    path = case.layers / "thin.yaml"
    path.write_text(path.read_text().replace("status: live", "status: draft"))
    return case
