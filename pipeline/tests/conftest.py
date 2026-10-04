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
