export type RGB = [number, number, number];

export const GROUP_COLORS: Record<number, RGB> = {
  0: [200, 200, 200],
  1: [255, 255, 204],
  2: [161, 218, 180],
  3: [65, 182, 196],
  4: [44, 127, 184],
  5: [37, 52, 148],
};

export const GROUP_WORDS: Record<number, string> = {
  0: "no data",
  1: "lowest",
  2: "low",
  3: "middle",
  4: "high",
  5: "highest",
};

export const SEA_COLOR: RGB = [214, 222, 224];
export const BORDER_COLOR: RGB = [110, 120, 125];
export const SELECTED_COLOR: RGB = [180, 83, 15];

export function cssColor([r, g, b]: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}
