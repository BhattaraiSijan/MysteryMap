import type { OptionInfo } from "../engine/options";

export type OptionsProps = {
  options: (OptionInfo & { struck: boolean })[];
  disabled: boolean;
  answerId: string | null;
  message: string | null;
  onGuess: (optionId: string) => void;
};

export function Options({ options, disabled, answerId, message, onGuess }: OptionsProps) {
  return (
    <section className="options" aria-labelledby="options-heading">
      <h2 id="options-heading">What does the map show?</h2>
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
