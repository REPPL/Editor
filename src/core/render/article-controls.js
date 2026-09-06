/*
 * The article page's reader-controls toolbar: theme, text size, measure, and
 * a reset, none of which the page needs to read at all.
 *
 * spc-2609061318154502 is the design record for map #10
 * (`itd-2609051335492327`). The article works with no script at all — this
 * file's whole job is to build a toolbar at load, read what the reader chose
 * last time from `localStorage`, and set the CSS custom properties
 * `spc-2609061318090042` already declares on the root element:
 * `article.css`'s own `:root` rules answer every one of them, so this script
 * never computes a colour, a font size, or a line width itself. Plain JS, not
 * a module, for the same reason `article-video.js` is: the site serves under
 * `script-src 'self'` with no `'unsafe-inline'`.
 *
 * `itd-2609051336145770` ("nothing is stored about a reader") is the reason
 * every read and write of storage here is wrapped in `try`/`catch` and
 * nothing here ever calls `fetch` or `XMLHttpRequest`: a reader's choice
 * lives in the browser they made it in, or not at all when that browser
 * refuses to keep it, and it never becomes a request.
 */
(function (global) {
  "use strict";

  /** The one key every choice is kept under, in that browser's storage. */
  var STORAGE_KEY = "editor-article-reader-preferences";

  /**
   * The three axes the toolbar offers, in the order the intent names them.
   *
   * `control` is the value the button's `data-control` attribute carries —
   * a plain string, never camel-cased by `dataset`, because it is read back
   * as a value rather than named as a property. `key` is where the choice
   * lives on the in-memory object this module keeps.
   */
  var CONTROLS = [
    {
      key: "theme",
      control: "theme",
      label: "Theme",
      options: [
        ["light", "Light"],
        ["dark", "Dark"],
        ["sepia", "Sepia"],
      ],
    },
    {
      key: "textSize",
      control: "text-size",
      label: "Text size",
      options: [
        ["smaller", "Smaller"],
        ["default", "Default"],
        ["larger", "Larger"],
      ],
    },
    {
      key: "measure",
      control: "measure",
      label: "Measure",
      options: [
        ["narrow", "Narrow"],
        ["normal", "Normal"],
        ["wide", "Wide"],
      ],
    },
  ];

  /** The article's own defaults: the state a reset, and a first visit, land on. */
  var DEFAULTS = { theme: "light", textSize: "default", measure: "normal" };

  /**
   * The multiplier `article.css`'s `--article-text-scale` reads, one per
   * text-size step. "Default" is deliberately absent: leaving no entry is
   * what lets a default choice mean "no override", so it falls back to
   * `article.css`'s own `--article-text-scale: 1` rather than this module
   * repeating that number.
   */
  var TEXT_SCALE_BY_SIZE = { smaller: "0.875", larger: "1.25" };

  /**
   * The width `article.css`'s `--article-measure` reads, one per measure
   * step. `rem`, never a pixel: a length relative to the root element's own
   * font size, which this toolbar's text-size control does not touch, so a
   * wide measure and a large text size never compound into a line wider than
   * the reading column `body.article main`'s own `max-width` (set from this
   * same property) still caps to whatever the viewport leaves it. "Normal" is
   * absent for the same reason "default" is above: no override, `article.css`'s
   * own `--article-measure: 38em` answers it.
   */
  var MEASURE_BY_STEP = { narrow: "30rem", wide: "46rem" };

  /** The choice `key` a `data-control` attribute's value names, or null. */
  function fieldFor(control) {
    for (var i = 0; i < CONTROLS.length; i += 1) {
      if (CONTROLS[i].control === control) {
        return CONTROLS[i].key;
      }
    }
    return null;
  }

  /** A plain copy, so the toolbar's own closure never aliases what it reads. */
  function copy(choice) {
    return { theme: choice.theme, textSize: choice.textSize, measure: choice.measure };
  }

  /** Whether `value` is one this control offers. */
  function isOffered(group, value) {
    for (var i = 0; i < group.options.length; i += 1) {
      if (group.options[i][0] === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * A stored value, made safe to apply.
   *
   * A reader's own storage is not this page's to trust: a field an older
   * version of this script wrote, a value edited by hand, or `JSON.parse`
   * answering something that is not an object at all each fall back to the
   * article's own default for that one axis, rather than refusing the whole
   * stored choice over one bad field.
   */
  function sanitize(value) {
    if (value === null || typeof value !== "object") {
      return null;
    }
    var choice = {};
    for (var i = 0; i < CONTROLS.length; i += 1) {
      var group = CONTROLS[i];
      var candidate = value[group.key];
      choice[group.key] = isOffered(group, candidate) ? candidate : DEFAULTS[group.key];
    }
    return choice;
  }

  /**
   * The stored choice, or null where there is none — a browser storage
   * throws in (Safari's "no storage from a file" and a private window's
   * exhausted quota both do), a browser that has never been asked, and a
   * browser that was asked and answered with nothing all read the same way:
   * apply the article's own defaults, and say nothing about why.
   */
  function readStored() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      return sanitize(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Keep a choice, or keep nothing where storage refuses it — never throw. */
  function writeStored(choice) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
      /* The choice still applies for this visit; see `boot`. Nothing here
         reports an error a reader did nothing to cause. */
    }
  }

  /** Forget a choice, or forget nothing it never had — never throw. */
  function clearStored() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing was kept if storage throws on write; nothing to remove. */
    }
  }

  function setOrClearProperty(root, property, value) {
    if (value) {
      root.style.setProperty(property, value);
    } else {
      root.style.removeProperty(property);
    }
  }

  /**
   * Write one choice onto the root element: the seam `spc-2609061318090042`
   * declares. `data-article-theme` answers the two palettes this map's own
   * section of `article.css` declares; the two custom properties answer
   * `article.css`'s own `:root` rules directly. Nothing here ever writes a
   * colour, a font size, or a line width — only a data attribute a selector
   * reads, or a property that selector's own `calc()`/`max-width` reads.
   */
  function applyToRoot(choice) {
    var root = global.document.documentElement;
    root.setAttribute("data-article-theme", choice.theme);
    root.setAttribute("data-article-text-size", choice.textSize);
    root.setAttribute("data-article-measure", choice.measure);
    setOrClearProperty(root, "--article-text-scale", TEXT_SCALE_BY_SIZE[choice.textSize]);
    setOrClearProperty(root, "--article-measure", MEASURE_BY_STEP[choice.measure]);
  }

  /** One control group: a `<fieldset>` a screen reader announces by its own `<legend>`. */
  function buildGroup(group, current) {
    var fieldset = global.document.createElement("fieldset");
    fieldset.className = "article-controls-group";
    var legend = global.document.createElement("legend");
    legend.textContent = group.label;
    fieldset.appendChild(legend);
    for (var i = 0; i < group.options.length; i += 1) {
      var value = group.options[i][0];
      var text = group.options[i][1];
      var button = global.document.createElement("button");
      button.type = "button";
      button.dataset.control = group.control;
      button.dataset.value = value;
      button.textContent = text;
      button.setAttribute("aria-pressed", String(value === current[group.key]));
      fieldset.appendChild(button);
    }
    return fieldset;
  }

  /**
   * The toolbar, built once at boot from native elements alone: a `<section>`
   * with an accessible name, three `<fieldset>`s each naming themselves
   * through their own `<legend>`, and `<button>`s carrying `aria-pressed` —
   * every one of them reachable by Tab and activated by Enter or Space with
   * nothing here claiming a key, per `itd-2609061324342715`.
   */
  function buildToolbar(choice) {
    var toolbar = global.document.createElement("section");
    toolbar.className = "article-controls";
    toolbar.setAttribute("aria-label", "Reading preferences");
    for (var i = 0; i < CONTROLS.length; i += 1) {
      toolbar.appendChild(buildGroup(CONTROLS[i], choice));
    }
    var reset = global.document.createElement("button");
    reset.type = "button";
    reset.className = "article-controls-reset";
    reset.textContent = "Reset to defaults";
    toolbar.appendChild(reset);
    return toolbar;
  }

  /** Every button's `aria-pressed` made to agree with `choice` again. */
  function syncPressed(toolbar, choice) {
    var buttons = toolbar.querySelectorAll("button[data-control]");
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var field = fieldFor(button.dataset.control);
      var pressed = field !== null && button.dataset.value === choice[field];
      button.setAttribute("aria-pressed", String(pressed));
    }
  }

  /**
   * Build the toolbar, apply the reader's stored choice or the article's
   * defaults, and wire every control through one delegated listener.
   *
   * Run once, from `ArticlePage.register` where that seam exists (the page's
   * own script order the whole time), or straight from this file's own
   * boot below where it does not — a test loading this file on its own, the
   * one case `spc-2609061318090042`'s seam was never meant to reach.
   */
  function boot() {
    if (typeof global.document === "undefined") {
      return;
    }
    var choice = readStored() || copy(DEFAULTS);
    applyToRoot(choice);
    var toolbar = buildToolbar(choice);
    toolbar.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") {
        return;
      }
      if (target.closest(".article-controls-reset")) {
        choice = copy(DEFAULTS);
        clearStored();
      } else {
        var control = target.closest("button[data-control]");
        if (!control) {
          return;
        }
        var field = fieldFor(control.dataset.control);
        if (field === null) {
          return;
        }
        choice = copy(choice);
        choice[field] = control.dataset.value;
        writeStored(choice);
      }
      applyToRoot(choice);
      syncPressed(toolbar, choice);
    });
    global.document.body.appendChild(toolbar);
  }

  global.ArticleControls = {
    boot: boot,
    STORAGE_KEY: STORAGE_KEY,
    DEFAULTS: copy(DEFAULTS),
  };

  if (global.ArticlePage && typeof global.ArticlePage.register === "function") {
    global.ArticlePage.register(boot);
  } else if (global.document && !global.ARTICLE_PAGE_MANUAL) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
