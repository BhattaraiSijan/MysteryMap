/**
 * A score is a state, so it takes the fixed status scale rather than a continuous gradient:
 * critical (0 to 3), serious (4 to 5), warning (6 to 7), good (8 to 10). The colour never carries
 * the meaning alone: the card always prints the score beside it.
 */
export type ScoreBand = { name: "critical" | "serious" | "warning" | "good"; accent: string; tint: string; label: string };

const BANDS: ScoreBand[] = [
  { name: "critical", accent: "#d03b3b", tint: "#fbe9e9", label: "Try again" },
  { name: "serious", accent: "#c9643d", tint: "#fdeee7", label: "Getting there" },
  { name: "warning", accent: "#a36f00", tint: "#fdf3d8", label: "Good" },
  { name: "good", accent: "#0a7f0a", tint: "#e4f5e4", label: "Great" },
];

export function scoreBand(points: number): ScoreBand {
  if (points <= 3) return BANDS[0];
  if (points <= 5) return BANDS[1];
  if (points <= 7) return BANDS[2];
  return BANDS[3];
}
