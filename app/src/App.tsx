import { useCallback, useEffect, useMemo, useState } from "react";
import { CatalogTooNewError, loadData } from "./catalog/load";
import type { Catalog, Country } from "./catalog/types";
import { hasWebGL } from "./map/webgl";
import { Library } from "./screens/Library";
import { Notice } from "./screens/Notice";
import { Round } from "./screens/Round";
import { useGame } from "./useGame";

type Data = { catalog: Catalog; countries: Country[] };
type LoadState = { status: "loading" } | { status: "failed"; tooNew: boolean } | { status: "ready"; data: Data };

export const DATA_URL = "./data";

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
  const layer = openId ? data.catalog.layers.find((l) => l.id === openId) : undefined;

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
        <Round key={layer.id} game={game} layer={layer} onBack={() => setOpenId(null)} />
      ) : (
        <Library catalog={data.catalog} save={game.save} onOpen={setOpenId} />
      )}
    </>
  );
}

export function App() {
  const [webgl] = useState(hasWebGL);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

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
        <h1>
          <span className="logo" aria-hidden="true" />
          Mystery Map
        </h1>
        <p className="tagline">One unlabeled map. Work out what it shows.</p>
      </header>
      <main>{body}</main>
      <footer className="app-footer">
        <p>Borders from Natural Earth. Each map names its data source once you solve it.</p>
      </footer>
    </div>
  );
}
