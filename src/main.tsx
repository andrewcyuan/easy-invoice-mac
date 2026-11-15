import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./desktop/App";
import { loadState, createStore } from "./desktop/store";
import { listFonts, systemFont } from "./desktop/fonts";
import "./desktop/styles.css";
const root = createRoot(document.getElementById("root")!);
root.render(<div className="fatal">Opening your invoice…</div>);
Promise.all([loadState(), listFonts().catch(() => [systemFont])])
  .then(([state, fonts]) => {
    root.render(<App store={createStore(state)} fonts={fonts} />);
  })
  .catch((error) =>
    root.render(
      <div className="fatal">
        <h1>Saved data could not be loaded</h1>
        <p>{String(error)}</p>
        <p>
          Your saved file has not been overwritten. Restore state.backup.json in
          Application Support/com.local.easyinvoice, then reopen the app.
        </p>
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>,
    ),
  );
