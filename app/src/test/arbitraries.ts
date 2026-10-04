import fc from "fast-check";
import type { Layer } from "../catalog/types";
import type { Action } from "../engine/types";

export function arbitraryAction(layer: Layer): fc.Arbitrary<Action> {
  const codes = [...Object.keys(layer.values), "PSE", "ZZZ"];
  const options = [layer.id, ...layer.wrongOptions, "ghost"];
  return fc.oneof(
    fc.constant<Action>({ type: "buyExtremes" }),
    fc.constant<Action>({ type: "buyUnit" }),
    fc.constantFrom(...codes).map((code): Action => ({ type: "buyNumber", code })),
    fc.constantFrom(...options).map((optionId): Action => ({ type: "guess", optionId })),
  );
}
