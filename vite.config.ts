import { defineConfig } from "vite";

/**
 * Vite serves the frontend; Tauri points its dev window at this port and its
 * release build at `dist/`. The port is fixed because `tauri.conf.json` names
 * it, and a silent fallback to another port would leave the window blank.
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
  },
});
