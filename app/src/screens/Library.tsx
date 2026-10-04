import type { Catalog } from "../catalog/types";
import type { Save } from "../storage/storage";

export type LibraryProps = {
  catalog: Catalog;
  save: Save;
  onOpen: (layerId: string) => void;
};

export function Library({ catalog, save, onOpen }: LibraryProps) {
  const layers = [...catalog.layers].sort((a, b) => a.number - b.number);
  const solvedCount = layers.filter((l) => save.history[l.id]).length;
  return (
    <section className="library" aria-labelledby="library-heading">
      <div className="library-head">
        <h2 id="library-heading">All maps</h2>
        <p className="library-progress">
          {solvedCount} of {layers.length} solved
        </p>
      </div>
      <ul className="library-list">
        {layers.map((layer) => {
          const done = save.history[layer.id];
          const started = !done && save.rounds[layer.id];
          return (
            <li key={layer.id}>
              <button type="button" className={`library-item${done ? " solved" : ""}`} onClick={() => onOpen(layer.id)}>
                <span className="library-number" aria-hidden="true">
                  {layer.number}
                </span>
                {done ? (
                  <span className="library-text">
                    <span className="library-name">{layer.name}</span>
                    <span className="library-score">{done.points} of 10 points</span>
                  </span>
                ) : (
                  <span className="library-text">
                    <span className="library-name">Map {layer.number}</span>
                    {started && <span className="library-score">in progress</span>}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
