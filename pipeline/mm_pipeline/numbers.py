"""Append-only registry of layer numbers. A number is never reused or reassigned."""

from __future__ import annotations

import json
from pathlib import Path


def assign_numbers(registry_path: Path, live_ids: list[str]) -> dict[str, int]:
    registry_path = Path(registry_path)
    registry: dict[str, int] = json.loads(registry_path.read_text()) if registry_path.exists() else {}
    next_number = max(registry.values(), default=0) + 1
    for layer_id in sorted(live_ids):
        if layer_id not in registry:
            registry[layer_id] = next_number
            next_number += 1
    registry_path.write_text(json.dumps(registry, indent=2, sort_keys=True) + "\n")
    return {layer_id: registry[layer_id] for layer_id in live_ids}
