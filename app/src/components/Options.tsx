import { useId, useState } from "react";
import type { OptionInfo } from "../engine/options";
import { HINT_HELP } from "./Hints";

export type OptionsProps = {
  options: (OptionInfo & { struck: boolean })[];
  disabled: boolean;
  answerId: string | null;
  message: string | null;
  onGuess: (optionId: string) => void;
};

export function Options({ options, disabled, answerId, message, onGuess }: OptionsProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  return (
    <section className="options" aria-labelledby="options-heading">
      <div className="card-head">
        <h2 id="options-heading">What does the map show?</h2>
        <button
          type="button"
          className="info"
          aria-label="How guessing works"
          aria-expanded={helpOpen}
          aria-controls={helpId}
          onClick={() => setHelpOpen((v) => !v)}
        >
          i
        </button>
      </div>
      {helpOpen && (
        <p id={helpId} className="hint-help">
          {HINT_HELP.guess} One of the six is the answer; the other five are real maps too.
        </p>
      )}
      <ul className="option-list">
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              className={`option${o.struck ? " struck" : ""}${answerId === o.id ? " answer" : ""}`}
              disabled={disabled || o.struck}
              onClick={() => onGuess(o.id)}
            >
              <span className="option-name">{o.name}</span>
              <span className="option-definition">{o.definition}</span>
            </button>
          </li>
        ))}
      </ul>
      {message && (
        <p className="guess-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
