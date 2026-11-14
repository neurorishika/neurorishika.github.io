import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.jsx";

// In production the page is prerendered at build time (scripts/prerender.mjs), so React
// attaches to the existing HTML. In `npm run dev` the root is empty and renders from scratch.
const root = document.getElementById("root");
if (root.firstElementChild) hydrateRoot(root, <App />);
else createRoot(root).render(<App />);
