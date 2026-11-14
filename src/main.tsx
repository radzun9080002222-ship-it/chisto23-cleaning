import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import InternalCalc from "./internal-calc/InternalCalc";
import Report from "./report/Report";
import "./index.css";

const root = document.getElementById("root")!;
const path = window.location.pathname.replace(/\/+$/, "");
const application = path === "/calc" ? <InternalCalc /> : path === "/report" ? <Report /> : <App />;

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
