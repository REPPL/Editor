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
  // A dependency's `/*@__PURE__*/` annotation is a promise that dropping the
  // call changes nothing, and `@replit/codemirror-emacs` makes that promise
  // about the two calls that are its entire installation:
  //
  //     for (let i in emacsKeys) {
  //         /*@__PURE__*/EmacsHandler.bindKey(i, emacsKeys[i]);
  //     }
  //     /*@__PURE__*/EmacsHandler.addCommands({ … });
  //
  // Both write into module-level tables, so both are pure lies. Every
  // bundler in the chain believes them: the dev server's dependency
  // pre-bundle reduced the loop to `for (let i in emacsKeys) emacsKeys[i];`
  // and dropped the command table outright, and the release build did the
  // same. The keymap was then installed with no bindings and no commands,
  // which is why `M-f` and `C-/` did nothing in the running app while the
  // chords CodeMirror's own macOS keymap also binds — `C-f`, `C-a`, `C-k` —
  // went on working. The unit tests never saw it: Vitest loads a dependency
  // as it lies on disk, unbundled and untree-shaken.
  //
  // So this project does not honour the annotation. It is the one setting
  // that covers both paths — the pre-bundle and the build — and it can only
  // ever keep code the annotation would have removed. `src/emacs.ts` checks
  // at run time that the installation survived, and says so in the console
  // if a future toolchain finds another way to drop it.
  optimizeDeps: {
    rolldownOptions: {
      treeshake: { annotations: false },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "safari15",
    sourcemap: true,
    rollupOptions: {
      // See the note above `optimizeDeps`: the same annotation, the same
      // reason, the other half of the toolchain.
      treeshake: { annotations: false },
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        present: fileURLToPath(new URL("present.html", import.meta.url)),
      },
    },
  },
});
