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
| `reveal.js` | the engine, the UMD build a plain `<script>` tag loads |
| `reveal.css` | the layout: slides, transitions, controls, progress |
| `reset.css` | the box model reveal.js expects underneath its own styles |
| `theme/white.css` | one theme, light, the deck's default appearance |
| `theme/fonts/source-sans-pro/` | the theme's font, which it loads by relative path; the `.woff` faces and their licence only, since no browser Editor targets asks for the `.eot` or `.ttf` ones |
| `plugin/notes/notes.js` | the speaker-notes window the `.notes` div feeds |

Nothing else from the package travels: no other theme, no Markdown, maths,
highlight, search or zoom plugin, no source maps, and no ES-module build.

## Refreshing it

The version here is pinned in `package.json` as a development dependency, so
`node_modules/reveal.js` is the copy these files came from. To take a new
version, change that pin, `npm install`, copy the files in the table above out
of `node_modules/reveal.js/dist` and `node_modules/reveal.js/plugin`, and
update the version at the top of this page. Do not edit a vendored file: a
local change here is a fork nobody will remember making.
