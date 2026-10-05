export type RGB = [number, number, number];

/**
 * Groups are an ordinal scale, so they take one hue, light to dark: blue steps 250, 350, 450,
 * 550 and 700 of the reference palette. Lightness is monotone, every adjacent gap is wide enough
 * to tell apart, and the lightest step clears 2:1 against the sea. No data is a neutral grey.
 */
export const GROUP_COLORS: Record<number, RGB> = {
  0: [195, 201, 207],
  1: [134, 182, 239],
  2: [85, 152, 231],
  3: [42, 120, 214],
  4: [28, 92, 171],
  5: [13, 54, 107],
};

export const GROUP_WORDS: Record<number, string> = {
  0: "no data",
  1: "lowest",
  2: "low",
  3: "middle",
  4: "high",
  5: "highest",
};

/** A near-white surface, so even the lightest group reads as a fill. */
export const SEA_COLOR: RGB = [248, 250, 251];
export const BORDER_COLOR: RGB = [255, 255, 255];
/** Warm orange: the one hue the blue ramp never uses, so the selection is unmistakable. */
export const SELECTED_COLOR: RGB = [236, 131, 90];

export function cssColor([r, g, b]: RGB): string {
  return `rgb(${r}, ${g}, ${b})`;
}
