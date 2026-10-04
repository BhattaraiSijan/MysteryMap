import type { Layer } from "../catalog/types";
import type { Action, Result, RoundState } from "./types";

export const START_POINTS = 10;
export const EXTREMES_COST = 1;
export const NUMBER_COST = 1;
export const UNIT_COST = 3;
export const WRONG_GUESS_COST = 3;

export function newRound(layerId: string): RoundState {
  return {
    layerId,
    points: START_POINTS,
    extremesBought: false,
    unitBought: false,
    numbersBought: [],
    wrongGuesses: [],
    status: "playing",
  };
}

function pay(points: number, cost: number): number {
  return Math.max(0, Math.min(START_POINTS, points - cost));
}

export function applyAction(state: RoundState, action: Action, layer: Layer): Result {
  if (state.status === "solved") return { ok: false, reason: "solved" };
  switch (action.type) {
    case "buyExtremes":
      if (state.extremesBought) return { ok: false, reason: "alreadyBought" };
      return { ok: true, state: { ...state, extremesBought: true, points: pay(state.points, EXTREMES_COST) } };
    case "buyUnit":
      if (state.unitBought) return { ok: false, reason: "alreadyBought" };
      return { ok: true, state: { ...state, unitBought: true, points: pay(state.points, UNIT_COST) } };
    case "buyNumber":
      if (!(action.code in layer.values)) return { ok: false, reason: "noData" };
      if (state.numbersBought.includes(action.code)) return { ok: false, reason: "alreadyBought" };
      return {
        ok: true,
        state: { ...state, numbersBought: [...state.numbersBought, action.code], points: pay(state.points, NUMBER_COST) },
      };
    case "guess":
      if (action.optionId === layer.id) return { ok: true, state: { ...state, status: "solved" } };
      if (!layer.wrongOptions.includes(action.optionId)) return { ok: false, reason: "notAnOption" };
      if (state.wrongGuesses.includes(action.optionId)) return { ok: false, reason: "alreadyStruck" };
      return {
        ok: true,
        state: { ...state, wrongGuesses: [...state.wrongGuesses, action.optionId], points: pay(state.points, WRONG_GUESS_COST) },
      };
  }
}
