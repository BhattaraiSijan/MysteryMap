"""Review pages for draft layers: one self-contained HTML file per draft."""

from __future__ import annotations

import argparse
import html
import sys
from pathlib import Path

from .build import load_inputs
from .countries import Country
from .derive import extremes, groups
from .options import wrong_options
from .validate import validate_layer

COLORS = {0: "#c3c9cf", 1: "#86b6ef", 2: "#5598e7", 3: "#2a78d6", 4: "#1c5cab", 5: "#0d366b"}  # same as the app


def _rings(geometry: dict):
    polys = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for poly in polys:
        yield poly[0]  # outer ring only is enough for a review sketch


def _svg(countries: list[Country], group_of: dict[str, int]) -> str:
    paths = []
    for c in countries:
        fill = COLORS[group_of.get(c.iso or "", 0)]
        d = " ".join(
            "M" + " L".join(f"{(x + 180) * 2:.1f},{(90 - y) * 2:.1f}" for x, y in ring) + " Z"
            for ring in _rings(c.geometry)
        )
        paths.append(f'<path d="{d}" fill="{fill}" stroke="#ffffff" stroke-width="0.4"><title>{html.escape(c.name)}</title></path>')
    return f'<svg viewBox="0 0 720 360" width="100%" style="background:#f8fafb">{"".join(paths)}</svg>'


def write_previews(layers_dir: Path, data_dir: Path, out_dir: Path) -> list[Path]:
    out_dir = Path(out_dir)
    countries, iso_codes, layers, values, problems = load_inputs(layers_dir, data_dir)
    if any(p.code == "layer-file" for p in problems):
        raise SystemExit("\n".join(p.message for p in problems))
    names = {c.iso: c.name for c in countries if c.iso}
    live = [l for l in layers if l.status == "live" and l.id in values]
    by_id = {l.id: l for l in layers}
    out_dir.mkdir(parents=True, exist_ok=True)
    pages = []
    for layer in layers:
        if layer.status != "draft":
            continue
        page = out_dir / f"{layer.id}.html"
        value_problems = [p for p in problems if p.layer_id == layer.id]
        if value_problems:
            body = "".join(f"<li>{html.escape(p.message)}</li>" for p in value_problems)
            page.write_text(f"<!doctype html><title>{html.escape(layer.name)}</title><h1>{html.escape(layer.name)}</h1><ul class='problems'>{body}</ul>")
            pages.append(page)
            continue
        v = values[layer.id]
        pool = {l.id: values[l.id] for l in live} | {layer.id: v}
        families = {l.id: l.family for l in live} | {layer.id: layer.family}
        wrong = wrong_options(layer.id, families, pool)
        found = validate_layer(layer, v, wrong, len(iso_codes))
        ext = extremes(v) if v else {"high": [], "low": []}
        options = [layer] + [by_id[w] for w in wrong]
        opts_html = "".join(
            f'<li class="option"><strong>{html.escape(o.name)}</strong>: {html.escape(o.definition)}</li>' for o in options
        )
        problems_html = "".join(f"<li>{html.escape(p.message)}</li>" for p in found) or "<li>none</li>"
        page.write_text(f"""<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>{html.escape(layer.name)}</title>
<style>body{{font:16px/1.5 system-ui;max-width:52rem;margin:1rem auto;padding:0 1rem}} .problems li{{color:#a40}}</style>
<h1>{html.escape(layer.name)}</h1>
<p>{html.escape(layer.definition)} &middot; {html.escape(layer.unit)} &middot; {html.escape(layer.year)}</p>
{_svg(countries, groups(v) if v else {})}
<p>Coverage: {len(v)} of {len(iso_codes)} countries.</p>
<p><strong>Highest:</strong> {html.escape(", ".join(names.get(c, c) for c in ext["high"]))}</p>
<p><strong>Lowest:</strong> {html.escape(", ".join(names.get(c, c) for c in ext["low"]))}</p>
<h2>Options</h2><ul>{opts_html}</ul>
<h2>Explanation</h2><p>{html.escape(layer.explanation)}</p>
<p>Source: <a href="{html.escape(layer.source.url)}">{html.escape(layer.source.name)}</a> ({html.escape(layer.source.licence)})</p>
<h2>Problems</h2><ul class="problems">{problems_html}</ul>
""")
        pages.append(page)
    return pages


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write review pages for draft layers.")
    parser.add_argument("--layers", required=True, type=Path)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args(argv)
    for page in write_previews(args.layers, args.data, args.out):
        print(page)
    return 0


if __name__ == "__main__":
    sys.exit(main())
