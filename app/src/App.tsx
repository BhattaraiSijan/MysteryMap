import { useCallback, useEffect, useMemo, useState } from "react";
import { CatalogTooNewError, loadData } from "./catalog/load";
import type { Catalog, Country } from "./catalog/types";
import { hasWebGL } from "./map/webgl";
import { HowToPlay } from "./screens/HowToPlay";
import { Library } from "./screens/Library";
import { Notice } from "./screens/Notice";
import { Round } from "./screens/Round";
import { useGame } from "./useGame";

type Data = { catalog: Catalog; countries: Country[] };
type LoadState = { status: "loading" } | { status: "failed"; tooNew: boolean } | { status: "ready"; data: Data };

export const DATA_URL = "./data";
const INTRO_SEEN_KEY = "mystery-map.intro-seen";

function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // A browser that blocks storage simply shows the intro again next time.
  }
}

function browserStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function Game({ data }: { data: Data }) {
  const store = useMemo(browserStore, []);
  const game = useGame(data, store);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recoveredDismissed, setRecoveredDismissed] = useState(false);
  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const ordered = useMemo(() => [...data.catalog.layers].sort((a, b) => a.number - b.number), [data.catalog]);
  const index = openId ? ordered.findIndex((l) => l.id === openId) : -1;
  const layer = index >= 0 ? ordered[index] : undefined;

  /** Opens a map. A map already solved starts a fresh attempt; the best score stays in history. */
  const open = (id: string) => {
    if (game.save.rounds[id]?.status === "solved") game.restart(id);
    setOpenId(id);
  };

  return (
    <>
      {game.recovered && !recoveredDismissed && (
        <Notice
          tone="warning"
          text="Your saved progress could not be read. It has been set aside and you are starting fresh."
          onDismiss={() => setRecoveredDismissed(true)}
        />
      )}
      {!game.persistent && !blockedDismissed && (
        <Notice tone="warning" text="This browser is not saving progress. You can still play." onDismiss={() => setBlockedDismissed(true)} />
      )}
      {layer ? (
        <Round
          key={layer.id}
          game={game}
          layer={layer}
          onBack={() => setOpenId(null)}
          onPrev={index > 0 ? () => open(ordered[index - 1].id) : null}
          onNext={index < ordered.length - 1 ? () => open(ordered[index + 1].id) : null}
        />
      ) : (
        <Library catalog={data.catalog} save={game.save} onOpen={open} />
      )}
    </>
  );
}

export function App() {
  const [webgl] = useState(hasWebGL);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [firstVisit, setFirstVisit] = useState(() => !introSeen());
  const [howOpen, setHowOpen] = useState(firstVisit);
  const closeHow = () => {
    markIntroSeen();
    setFirstVisit(false);
    setHowOpen(false);
  };

  const fetchData = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const data = await loadData(DATA_URL);
      setLoad({ status: "ready", data });
    } catch (e) {
      setLoad({ status: "failed", tooNew: e instanceof CatalogTooNewError });
    }
  }, []);

  useEffect(() => {
    if (webgl) void fetchData();
  }, [webgl, fetchData]);

  let body;
  if (!webgl) {
    body = <Notice tone="error" text="This game needs graphics support that this device does not have." />;
  } else if (load.status === "loading") {
    body = <p className="loading">Loading the maps…</p>;
  } else if (load.status === "failed" && load.tooNew) {
    body = <Notice tone="error" text="A newer version of the game is available." action={{ label: "Refresh", onClick: () => window.location.reload() }} />;
  } else if (load.status === "failed") {
    body = <Notice tone="error" text="The maps could not be loaded." action={{ label: "Try again", onClick: () => void fetchData() }} />;
  } else {
    body = <Game data={load.data} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <h1>
            <span className="logo" aria-hidden="true" />
            Mystery Map
          </h1>
          <button type="button" className="how-button" aria-expanded={howOpen} onClick={() => (howOpen ? closeHow() : setHowOpen(true))}>
            How to play
          </button>
        </div>
        <p className="tagline">Can you guess what the unlabeled map shows? Use hints if you feel stuck.</p>
      </header>
      <main>
        {howOpen && load.status === "ready" && <HowToPlay onClose={closeHow} firstVisit={firstVisit} />}
        {body}
      </main>
      <footer className="app-footer">
        <p>Borders from Natural Earth. Each map names its data source once you solve it.</p>
      </footer>
    </div>
  );
}
