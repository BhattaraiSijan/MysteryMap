/** Card colours for a score from 0 to 10: red through amber to green. Text stays dark on all of them. */
export function scoreColors(points: number): { background: string; accent: string } {
  const t = Math.max(0, Math.min(10, points)) / 10;
  const hue = Math.round(t * 130); // 0 red, 65 amber, 130 green
  return {
    background: `linear-gradient(135deg, hsl(${hue} 85% 94%), hsl(${hue} 70% 86%))`,
    accent: `hsl(${hue} 65% 38%)`,
  };
}
