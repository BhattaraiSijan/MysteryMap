import type { Visible } from "../engine/visible";

export type RevealProps = {
  answer: NonNullable<Visible["answer"]>;
  unit: string;
  points: number;
  onBack: () => void;
};

export function Reveal({ answer, unit, points, onBack }: RevealProps) {
  return (
    <section className="reveal" aria-labelledby="reveal-heading">
      <h2 id="reveal-heading">It shows {answer.name}.</h2>
      <p className="reveal-definition">
        {answer.definition}. {unit}
      </p>
      <p className="reveal-explanation">{answer.explanation}</p>
      <p className="reveal-source">
        Source: <a href={answer.source.url} target="_blank" rel="noreferrer">{answer.source.name}</a>, {answer.year} ({answer.source.licence}).
      </p>
      <p className="reveal-score">You finished with {points} of 10 points.</p>
      <button type="button" className="primary" onClick={onBack}>
        Back to all maps
      </button>
    </section>
  );
}
