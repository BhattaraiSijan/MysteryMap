import { useMemo, useState } from "react";
import type { Layer } from "../catalog/types";
import { optionsFor } from "../engine/options";
import { newRound } from "../engine/round";
import type { Action, Result } from "../engine/types";
import { visible } from "../engine/visible";
import { GLOBE_ENABLED, MapView } from "../map/MapView";
import { CountryPicker } from "../components/CountryPicker";
import { Hints } from "../components/Hints";
import { Legend } from "../components/Legend";
import { Options } from "../components/Options";
import { Readout } from "../components/Readout";
import { ViewSwitch } from "../components/ViewSwitch";
import { Reveal } from "./Reveal";
import type { Game } from "../useGame";

export type RoundProps = {
  game: Game;
  layer: Layer;
  onBack: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
};

export function Round({ game, layer, onBack, onPrev, onNext }: RoundProps) {
  const { catalog, countries, save, act, setView } = game;
  const state = save.rounds[layer.id] ?? newRound(layer.id);
  const options = useMemo(() => optionsFor(layer, catalog), [layer, catalog]);
  const shown = useMemo(() => visible(state, layer, options), [state, layer, options]);
  const solved = state.status === "solved";
  const previous = save.history[layer.id];

  const [selected, setSelected] = useState<string | null>(null);
  const [numberArmed, setNumberArmed] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [guessMessage, setGuessMessage] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const byCode = new Map(countries.map((c) => [c.code, c.name]));
    return (code: string) => byCode.get(code) ?? code;
  }, [countries]);
  const pickerNames = useMemo(
    () => countries.map((c) => ({ code: c.code, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [countries],
  );

  const run = (action: Action): Result => act(layer.id, action);

  const pick = (code: string) => {
    setSelected(code);
    if (!numberArmed || solved) return;
    const result = run({ type: "buyNumber", code });
    if (result.ok) {
      setNumberArmed(false);
      setHintMessage(null);
    } else if (result.reason === "noData") {
      setHintMessage(`There is no data for ${nameOf(code)}. Choose another country.`);
    } else if (result.reason === "alreadyBought") {
      setHintMessage(`You already have that number. Choose another country.`);
    }
  };

  const guess = (optionId: string) => {
    const result = run({ type: "guess", optionId });
    if (result.ok && result.state.status === "solved") {
      setGuessMessage(null);
      setNumberArmed(false);
      setHintMessage(null);
    } else if (result.ok) {
      setGuessMessage("Not that one. Find a country that this guess cannot explain.");
    }
  };

  const group = selected ? (shown.groups[selected] ?? 0) : 0;
  const value = selected ? shown.values[selected] : undefined;
  const view = GLOBE_ENABLED ? save.view : "flat";

  return (
    <section className="round" aria-labelledby="round-heading">
      <div className="round-head">
        <button type="button" className="back" onClick={onBack}>
          ← All maps
        </button>
        <h2 id="round-heading">Map {layer.number}</h2>
        <p className="points" aria-live="polite">
          Points {state.points}
        </p>
      </div>
      {previous && !solved && (
        <p className="previous-best">
          Your best so far: {previous.points} of 10 points
          {(previous.attempts ?? 1) > 1 ? ` in ${previous.attempts} attempts` : ""}. This is a fresh attempt.
        </p>
      )}

      <div className="round-grid">
        <div className="map-column">
          {GLOBE_ENABLED && <ViewSwitch view={view} onChange={setView} />}
          <div className="map-frame">
            <MapView
              countries={countries}
              groups={shown.groups}
              selected={selected}
              view={view}
              onPick={pick}
              onGlobeFailed={() => setView("flat")}
            />
          </div>
          <Readout
            country={selected ? nameOf(selected) : null}
            group={group}
            value={value}
            solved={solved}
            definition={shown.answer?.definition ?? null}
          />
          <Legend />
          <CountryPicker names={pickerNames} onPick={pick} />
        </div>

        <div className="play-column">
          {solved && shown.answer && shown.unit ? (
            <Reveal answer={shown.answer} unit={shown.unit} points={state.points} onBack={onBack} />
          ) : (
            <>
              <Hints
                state={state}
                extremes={shown.extremes}
                unit={shown.unit}
                nameOf={nameOf}
                numberArmed={numberArmed}
                message={numberArmed ? (hintMessage ?? "Now choose a country on the map.") : null}
                onBuyExtremes={() => run({ type: "buyExtremes" })}
                onBuyUnit={() => run({ type: "buyUnit" })}
                onArmNumber={() => {
                  setNumberArmed(true);
                  setHintMessage(null);
                }}
              />
              <Options options={shown.options} disabled={solved} answerId={null} message={guessMessage} onGuess={guess} />
            </>
          )}
        </div>
      </div>

      <nav className="map-nav" aria-label="Other maps">
        <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev}>
          ← Previous map
        </button>
        <button type="button" onClick={onNext ?? undefined} disabled={!onNext}>
          Next map →
        </button>
      </nav>
    </section>
  );
}
