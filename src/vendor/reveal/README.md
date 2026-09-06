# reveal.js, vendored

reveal.js **5.2.1**, MIT licence, © Hakim El Hattab and reveal.js
contributors. The licence is in `LICENSE` beside this file, unchanged.

The deck engine is vendored rather than fetched, because the app, the single
HTML file, and the published site all open a deck from disk and the
network-only-on-publish discipline forbids a runtime fetch. Every build copies
these files beside the deck it writes; nothing points at a CDN.

## What is here, and why each file

| File | Why |
|---|---|
| `reveal.js` | the engine, the UMD build a plain `<script>` tag loads: the published site and the single-file export serve it raw, under `script-src 'self'`, with no bundler anywhere in the path |
| `reveal.esm.js` | the same engine, the ES-module build `src/present.ts` imports: the app's own window goes through a bundler, and the UMD build means one thing to a bundler and another to a `<script>` tag — see `iss-2609061132369973` |
| `reveal.css` | the layout: slides, transitions, controls, progress |
| `reset.css` | the box model reveal.js expects underneath its own styles |
| `theme/white.css` | one theme, light, the deck's default appearance |
| `theme/fonts/source-sans-pro/` | the theme's font, which it loads by relative path; the `.woff` faces and their licence only, since no browser Editor targets asks for the `.eot` or `.ttf` ones |
| `plugin/notes/notes.js` | the speaker-notes window the `.notes` div feeds |

Both engine builds are the same version and the same code; which one is right
depends on how the page reaches it, and the two pages reach it in two ways.

Nothing else from the package travels: no other theme, and no Markdown, maths,
highlight, search or zoom plugin. No source map travels either. `reveal.js`
keeps the `sourceMappingURL` comment it shipped with, which costs nothing: no
part of the toolchain reads that file, it is copied beside a deck as bytes.
`reveal.esm.js` is the one vendored file the toolchain reads through — the
bundler and the test runner both follow a `sourceMappingURL` — so its comment
is cut instead, and the half-megabyte map it points at is not vendored. A
comment pointing at a map that is not here is a warning on every build and
every test run; no comment is no warning, and the engine is minified either
way, so there is nothing to step through.

## Refreshing it

The version here is pinned in `package.json` as a development dependency, so
`node_modules/reveal.js` is the copy these files came from. To take a new
version, change that pin, `npm install`, copy the files in the table above out
of `node_modules/reveal.js/dist` and `node_modules/reveal.js/plugin`, and
update the version at the top of this page. One line is cut from the copy, and
it is the only edit any file here takes: the last line of `reveal.esm.js`,
which is its `//# sourceMappingURL=reveal.esm.js.map` comment. Nothing else in
a vendored file is touched, because a local change here is a fork nobody will
remember making.

```sh
cp node_modules/reveal.js/dist/reveal.esm.js src/vendor/reveal/reveal.esm.js
sed -i "" "/^\/\/# sourceMappingURL=/d" src/vendor/reveal/reveal.esm.js
```
