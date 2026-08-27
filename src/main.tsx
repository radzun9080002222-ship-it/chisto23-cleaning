import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import InternalCalc from "./internal-calc/InternalCalc";
import "./index.css";

const root = document.getElementById("root")!;
const isInternalCalc = window.location.pathname.replace(/\/+$/, "") === "/calc";
const application = isInternalCalc ? <InternalCalc /> : <App />;

// Если HTML уже отрисован пререндером — гидрируем, иначе обычный рендер (dev-режим).
if (root.hasChildNodes()) {
  hydrateRoot(
    root,
    <React.StrictMode>
      {application}
    </React.StrictMode>
  );
} else {
  createRoot(root).render(
    <React.StrictMode>
      {application}
    </React.StrictMode>
  );
}
