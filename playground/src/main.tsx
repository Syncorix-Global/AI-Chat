import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing <div id="root" /> in index.html');
}

createRoot(rootEl).render(<App />);
