/*
 * Start the deck.
 *
 * The engine is loaded from this site and never from a content network, which
 * would tell a third party who opened an unlisted link. It is started from a
 * file rather than from an inline script because the site serves under a
 * `default-src 'none'` policy with `'self'` for script.
 *
 * CONFIG must match DECK_CONFIG in src/core/render/slides.ts: one reveal.js
 * configuration, read by the app and by the site alike. The test
 * "deck_js_starts_the_engine_with_the_core_config" holds the two in step.
 */
var CONFIG = {
  "disableLayout": true,
  "controls": true,
  "controlsTutorial": false,
  "progress": true,
  "touch": true,
  "keyboard": true,
  "overview": true,
  "hash": true,
  "center": false,
  "transition": "none",
  "history": false
};

(function (global) {
  "use strict";
  if (!global.Reveal) {
    return;
  }
  var options = {};
  for (var key in CONFIG) {
    if (Object.prototype.hasOwnProperty.call(CONFIG, key)) {
      options[key] = CONFIG[key];
    }
  }
  if (global.RevealNotes) {
    options.plugins = [global.RevealNotes];
  }
  global.Reveal.initialize(options);
})(typeof globalThis !== "undefined" ? globalThis : this);
