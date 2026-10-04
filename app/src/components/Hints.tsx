import type { RoundState } from "../engine/types";
import { EXTREMES_COST, NUMBER_COST, UNIT_COST } from "../engine/round";

export type HintsProps = {
  state: RoundState;
  extremes: { high: string[]; low: string[] } | null;
  unit: string | null;
  nameOf: (code: string) => string;
  numberArmed: boolean;
  message: string | null;
  onBuyExtremes: () => void;
  onBuyUnit: () => void;
  onArmNumber: () => void;
};

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function Hints({ state, extremes, unit, nameOf, numberArmed, message, onBuyExtremes, onBuyUnit, onArmNumber }: HintsProps) {
  const solved = state.status === "solved";
  return (
    <section className="hints" aria-labelledby="hints-heading">
      <h2 id="hints-heading">Hints</h2>
      <div className="hint-buttons">
        <button type="button" className="hint" onClick={onBuyExtremes} disabled={solved || state.extremesBought} aria-pressed={state.extremesBought}>
          <span className="hint-name">Extremes</span>
          <span className="hint-cost">costs {EXTREMES_COST}</span>
        </button>
        <button type="button" className="hint" onClick={onArmNumber} disabled={solved} aria-pressed={numberArmed}>
          <span className="hint-name">A number</span>
          <span className="hint-cost">costs {NUMBER_COST} each</span>
        </button>
        <button type="button" className="hint" onClick={onBuyUnit} disabled={solved || state.unitBought} aria-pressed={state.unitBought}>
          <span className="hint-name">The unit</span>
          <span className="hint-cost">costs {UNIT_COST}</span>
        </button>
      </div>
      <div className="hint-results" aria-live="polite">
        {extremes && (
          <>
            <p>Highest: {joinNames(extremes.high.map(nameOf))}.</p>
            <p>Lowest: {joinNames(extremes.low.map(nameOf))}.</p>
          </>
        )}
        {unit && <p className="unit">{unit}</p>}
        {message && <p className="hint-message">{message}</p>}
      </div>
    </section>
  );
}
