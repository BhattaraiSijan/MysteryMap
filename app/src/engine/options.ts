import type { Catalog, Layer } from "../catalog/types";

export type OptionInfo = { id: string; name: string; definition: string };

export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The answer and its five wrong options, in an order that is fixed per layer. */
export function optionsFor(layer: Layer, catalog: Catalog): OptionInfo[] {
  const byId = new Map(catalog.layers.map((l) => [l.id, l]));
  const ids = [layer.id, ...layer.wrongOptions];
  return ids
    .map((id) => {
      const option = byId.get(id);
      if (!option) throw new Error(`option ${id} is not in the catalog`);
      return { id, name: option.name, definition: option.definition };
    })
    .sort((a, b) => fnv1a(`${layer.id}:${a.id}`) - fnv1a(`${layer.id}:${b.id}`));
}
