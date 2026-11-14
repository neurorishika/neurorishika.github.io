// Build-time entry: renders the whole page to static HTML (see scripts/prerender.mjs).
import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";
export { SITE_DATA } from "./data.js";

export function render() {
  return renderToString(<App />);
}
