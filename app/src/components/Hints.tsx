import { useId, useState } from "react";
import type { RoundState } from "../engine/types";
import { EXTREMES_COST, NUMBER_COST, UNIT_COST, WRONG_GUESS_COST } from "../engine/round";

export const HINT_HELP = {
  extremes: `Names the three countries with the highest figures and the three with the lowest. Costs ${EXTREMES_COST} point, once.`,
  number: `Shows the real figure for one country you choose on the map, without its unit. Costs ${NUMBER_COST} point for each country; a country with no data, or one you already bought, costs nothing.`,
  unit: `Tells you how the measure is counted, in one sentence. Costs ${UNIT_COST} points, once.`,
  guess: `A wrong guess costs ${WRONG_GUESS_COST} points and is struck out. A right guess fixes your score and reveals the map.`,
};

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
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  return (
    <section className="hints" aria-labelledby="hints-heading">
      <div className="card-head">
        <h2 id="hints-heading">Hints</h2>
        <button
          type="button"
          className="info"
          aria-label="How hints work"
          aria-expanded={helpOpen}
          aria-controls={helpId}
          onClick={() => setHelpOpen((v) => !v)}
        >
          i
        </button>
      </div>
      {helpOpen && (
        <dl id={helpId} className="hint-help">
          <dt>Extremes</dt>
          <dd>{HINT_HELP.extremes}</dd>
          <dt>A number</dt>
          <dd>{HINT_HELP.number}</dd>
          <dt>The unit</dt>
          <dd>{HINT_HELP.unit}</dd>
          <dt>Guessing</dt>
          <dd>{HINT_HELP.guess}</dd>
        </dl>
      )}
      <div className="hint-buttons">
        <button type="button" className="hint" title={HINT_HELP.extremes} onClick={onBuyExtremes} disabled={solved || state.extremesBought} aria-pressed={state.extremesBought}>
          <span className="hint-name">Extremes</span>
          <span className="hint-cost">costs {EXTREMES_COST}</span>
        </button>
        <button type="button" className="hint" title={HINT_HELP.number} onClick={onArmNumber} disabled={solved} aria-pressed={numberArmed}>
          <span className="hint-name">A number</span>
          <span className="hint-cost">costs {NUMBER_COST} each</span>
        </button>
        <button type="button" className="hint" title={HINT_HELP.unit} onClick={onBuyUnit} disabled={solved || state.unitBought} aria-pressed={state.unitBought}>
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
