import { GROUP_COLORS, cssColor } from "../map/colors";

export function Legend() {
  return (
    <div className="legend" aria-label="Legend">
      <span className="legend-word">less</span>
      <span className="legend-ramp" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((g) => (
          <span key={g} className="swatch" style={{ background: cssColor(GROUP_COLORS[g]) }} />
        ))}
      </span>
      <span className="legend-word">more</span>
      <span className="legend-nodata">
        <span className="swatch" style={{ background: cssColor(GROUP_COLORS[0]) }} aria-hidden="true" /> no data
      </span>
    </div>
  );
}
