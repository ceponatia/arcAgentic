import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { App } from "./App.js";
import { STRICT_MODE } from "./config.js";

const rootEl = document.getElementById("root")!;

// Normalize empty hashes to '#/' on load for consistent hash-based routing.
const h = window.location.hash;
if (!h || h === "#") {
  window.location.hash = "#/";
}

const app = <App />;
createRoot(rootEl).render(
  STRICT_MODE ? <React.StrictMode>{app}</React.StrictMode> : app,
);
