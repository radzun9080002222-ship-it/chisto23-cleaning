import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    vitePrerenderPlugin({
      renderTarget: "#root",
      prerenderScript: fileURLToPath(new URL("./src/prerender.tsx", import.meta.url)),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        calc: resolve(projectRoot, "calc/index.html"),
      },
    },
  },
});
