import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { App } from "./App.js";
import { STRICT_MODE } from "./config.js";

const rootEl = document.getElementById("root")!;

// Redirect hash-based URLs to history-based equivalents.
const hash = window.location.hash;
if (hash.startsWith("#/")) {
  const path = hash.slice(1);
  window.history.replaceState(null, "", path);
}

const app = <App />;
createRoot(rootEl).render(
  STRICT_MODE ? <React.StrictMode>{app}</React.StrictMode> : app,
);
