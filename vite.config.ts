import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

/**
 * Vite serves the frontend; Tauri points its dev window at this port and its
 * release build at `dist/`. The port is fixed because `tauri.conf.json` names
 * it, and a silent fallback to another port would leave the window blank.
 *
 * Two pages, not one. `index.html` is the editing surface; `present.html` is
 * the deck's own window, which exists because the shell's CSP is
 * `script-src 'self'` and a second page from the same bundle runs under it
 * with no relaxation.
 */
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "safari15",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        present: fileURLToPath(new URL("present.html", import.meta.url)),
      },
    },
  },
});
