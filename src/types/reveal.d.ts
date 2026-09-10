/**
 * The vendored reveal.js ES module, as TypeScript sees it.
 *
 * The engine ships no types of its own and `allowJs` is off, so the shape the
 * application uses is declared here, beside the import rather than inside it.
 * `src/present.ts` imports the module and reads no global, which is the whole
 * reason this declaration exists.
 *
 * Everything but `initialize` is optional because it genuinely is. The
 * vendored build's default export is a stub carrying `initialize`, `on`,
 * `configure` and little else; only when `initialize` runs does it copy the
 * running deck's own methods — `sync`, `slide`, `getIndices`, `isReady` — onto
 * that same object. Declaring them as always present is how a call reached one
 * of them before it existed.
 */
declare module "*/vendor/reveal/reveal.esm.js" {
  export interface RevealEngine {
    initialize(config: Record<string, unknown>): Promise<void> | void;
    sync?(): void;
    slide?(horizontal: number, vertical?: number): void;
    /** One step right, which is what the right arrow and the control do. */
    right?(): void;
    on?(type: string, listener: () => void): void;
    getIndices?(): { h?: number; v?: number };
    isReady?(): boolean;
  }
  const Reveal: RevealEngine;
  export default Reveal;
}
