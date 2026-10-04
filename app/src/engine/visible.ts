import type { Layer } from "../catalog/types";
import type { OptionInfo } from "./options";
import type { RoundState } from "./types";

export type Visible = {
  groups: Record<string, number>;
  values: Record<string, number>;
  extremes: { high: string[]; low: string[] } | null;
  unit: string | null;
  options: (OptionInfo & { struck: boolean })[];
  answer: { name: string; definition: string; year: string; source: Layer["source"]; explanation: string } | null;
};

/** Everything the screen may show about the layer, and nothing else. */
export function visible(state: RoundState, layer: Layer, options: OptionInfo[]): Visible {
  const solved = state.status === "solved";
  const values: Record<string, number> = {};
  if (solved) {
    Object.assign(values, layer.values);
  } else {
    for (const code of state.numbersBought) {
      if (code in layer.values) values[code] = layer.values[code];
    }
  }
  return {
    groups: layer.groups,
    values,
    extremes: solved || state.extremesBought ? layer.extremes : null,
    unit: solved || state.unitBought ? layer.unit : null,
    options: options.map((o) => ({ ...o, struck: state.wrongGuesses.includes(o.id) })),
    answer: solved
      ? {
          name: layer.name,
          definition: layer.definition,
          year: layer.year,
          source: layer.source,
          explanation: layer.explanation,
        }
      : null,
  };
}
