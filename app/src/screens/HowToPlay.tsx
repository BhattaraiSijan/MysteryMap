import { EXTREMES_COST, NUMBER_COST, START_POINTS, UNIT_COST, WRONG_GUESS_COST } from "../engine/round";

export type HowToPlayProps = { onClose: () => void; firstVisit: boolean };

/** The rules in four steps. Shown on the first visit and whenever the header button is pressed. */
export function HowToPlay({ onClose, firstVisit }: HowToPlayProps) {
  return (
    <section className="how-to-play" role="dialog" aria-labelledby="how-heading" aria-modal="false">
      <div className="card-head">
        <h2 id="how-heading">{firstVisit ? "Welcome. Here is how to play." : "How to play"}</h2>
        <button type="button" className="dismiss" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <ol className="how-steps">
        <li>
          <strong>Pick a map.</strong> Every country is coloured by one hidden measure, from light (less) to dark (more). Grey means
          no data. Tap or point at a country to see its name and which group it is in.
        </li>
        <li>
          <strong>Read the pattern.</strong> Which countries are dark, which are light, and what might they have in common? You start
          with {START_POINTS} points.
        </li>
        <li>
          <strong>Buy a hint if you are stuck.</strong> <em>Extremes</em> names the top and bottom three ({EXTREMES_COST} point).{" "}
          <em>A number</em> shows the real figure for a country you choose ({NUMBER_COST} point each). <em>The unit</em> tells you how the
          measure is counted ({UNIT_COST} points).
        </li>
        <li>
          <strong>Guess.</strong> Six options are listed, each with its exact definition. A wrong one costs {WRONG_GUESS_COST} points and is
          struck out; the right one fixes your score and reveals the map, its source and a short explanation.
        </li>
      </ol>
      <p className="how-footer">
        Your score is the points you have left, out of {START_POINTS}. Every map can be replayed for a better score, and your progress
        stays in this browser.
      </p>
      <button type="button" className="primary" onClick={onClose}>
        {firstVisit ? "Start playing" : "Got it"}
      </button>
    </section>
  );
}
