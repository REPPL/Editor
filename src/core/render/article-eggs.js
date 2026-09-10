/*
 * The article page's script: the once-only opening quotation, and the
 * marks hidden in its paragraphs.
 *
 * spc-2609061318159422 is the design record for map #12 (`itd-2609051335518134`).
 * The page works with no script at all: `article.ts` writes the opening
 * quotation in the flow as an epigraph, and an easter egg's own content in a
 * `<template>` a plain browser never paints (`itd-2609051336110536`,
 * degrade). This file's whole job is to take the opening out of the flow and
 * into a modal the first time a browser sees it, and to turn a matched
 * marker into a button that opens its `<template>` in a panel, moves the
 * marker into a tray once opened, and remembers both facts — the opening
 * seen, and which marks are collected — in that browser's own storage
 * (`itd-2609051336145770`, nothing stored about a reader) and nowhere else.
 * Plain JS, not a module, for the same reason `article-video.js` is: the
 * site serves under `script-src 'self'` with no `'unsafe-inline'`.
 *
 * Every read and write of storage is wrapped in `try`/`catch`, the same
 * discipline `article-controls.js` holds: a browser that refuses storage
 * still reads the page correctly for that one visit, and nothing here ever
 * calls `fetch` or `XMLHttpRequest` — a reader's own progress is never a
 * request.
 */
(function (global) {
  "use strict";

  /** Whether Bob has already been shown the opening quotation, in this browser. */
  var STORAGE_KEY_OPENING = "editor-article-opening-seen";
  /** Every egg id Bob has collected, in this browser, as a JSON array. */
  var STORAGE_KEY_COLLECTED = "editor-article-collected-eggs";

  // ------------------------------------------------------------- the scope

  /**
   * A stable scope for this document's own memory, so a dismissal or a
   * collection is remembered per document, not per origin
   * (iss-2609070642209805).
   *
   * The published site serves every document from one origin —
   * `/<id>/<token>/` for the stable link, `/<id>/<token>/v/<hash>/` for one
   * frozen version — so `location.pathname` with the `/v/<hash>/` segment
   * stripped scopes a version to the same memory as its own document's
   * stable link, and leaves two different documents apart. The app's
   * preview window never navigates between two documents it shows in one
   * session (`preview.ts`'s own header: "the window outlives one Preview"),
   * so its pathname alone cannot tell them apart; `preview.ts` writes a
   * `data-document-scope` attribute instead, from a hash of the document's
   * own folder name, never the path itself, and that is read first here
   * when it is present.
   */
  function documentScope() {
    try {
      var body = global.document.body;
      var attr = body && body.getAttribute("data-document-scope");
      if (attr) {
        return attr;
      }
    } catch {
      /* Falls through to the path-derived scope below. */
    }
    try {
      return String(global.location.pathname).replace(/\/v\/[^/]+\//, "/");
    } catch {
      return "";
    }
  }

  /** One storage key, scoped to this document. */
  function scopedKey(base) {
    return base + "::" + documentScope();
  }

  /** up, up, down, down, left, right, left, right, b, a. */
  var KONAMI_SEQUENCE = [
    "arrowup",
    "arrowup",
    "arrowdown",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "arrowleft",
    "arrowright",
    "b",
    "a",
  ];

  /** How long a probe is given before the fallback stands, mirroring `article-video.js`'s own. */
  var PROBE_TIMEOUT_MS = 4000;
  /** How long a Konami reveal flashes before it fades, in milliseconds. */
  var REVEAL_MS = 2000;

  // ------------------------------------------------------------- storage

  function readSeenOpening() {
    try {
      return global.localStorage.getItem(scopedKey(STORAGE_KEY_OPENING)) !== null;
    } catch {
      return false;
    }
  }

  function markSeenOpening() {
    try {
      global.localStorage.setItem(scopedKey(STORAGE_KEY_OPENING), "1");
    } catch {
      /* The dismissal still applies for this visit; nothing to report. */
    }
  }

  /**
   * The collected ids, as a plain array read back from storage.
   *
   * Anything that is not an array of strings — a browser storage refusing to
   * read, an old key from a version that wrote a different shape, or a value
   * edited by hand — reads back as no marks collected, the same "sanitise
   * rather than refuse the whole thing" rule `article-controls.js` follows
   * for its own stored choice.
   */
  function readCollected() {
    try {
      var raw = global.localStorage.getItem(scopedKey(STORAGE_KEY_COLLECTED));
      if (raw === null) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(function (id) {
        return typeof id === "string";
      });
    } catch {
      return [];
    }
  }

  function writeCollected(ids) {
    try {
      global.localStorage.setItem(scopedKey(STORAGE_KEY_COLLECTED), JSON.stringify(ids));
    } catch {
      /* The collection still applies for this visit; nothing to report. */
    }
  }

  // --------------------------------------------------------------- focus

  /**
   * Focus an element that may not ordinarily take it, and let it go back to
   * being unfocusable once the reader moves on.
   *
   * "Focus returns to the paragraph on close" (`itd-2609061324342715`) means
   * an ordinary `<p>`, which has no place in the tab order of its own. A
   * temporary `tabindex="-1"` is the standard way to hand it focus once
   * without adding it to that order, and the attribute comes off again on
   * `blur` so the paragraph reads exactly as it did before to any assistive
   * technology walking the page afterwards.
   */
  function focusOnce(element) {
    if (!element) {
      return;
    }
    var hadTabIndex = element.hasAttribute("tabindex");
    if (!hadTabIndex) {
      element.setAttribute("tabindex", "-1");
    }
    element.focus();
    if (!hadTabIndex) {
      element.addEventListener(
        "blur",
        function () {
          element.removeAttribute("tabindex");
        },
        { once: true },
      );
    }
  }

  /** The nearest ancestor a reader would call "the paragraph", for a marker. */
  function containingElementOf(marker) {
    return (
      marker.closest("p, li, td, th, blockquote, figcaption, dd, dt") ||
      marker.parentElement ||
      marker
    );
  }

  // ------------------------------------------------------------ the video

  /**
   * The sources one `<figure class="video">` names, in the order written —
   * the same reading `article-video.js`'s own `sourcesOf` does, kept here
   * rather than shared, because calling that file's own `upgradeVideos`
   * would re-probe every figure already on the page (`data-player-ready`
   * carries no guard against a second player), not only the one a panel just
   * revealed.
   */
  function videoSourcesOf(figure) {
    var items = figure.querySelectorAll("ul.video-sources li[data-role]");
    var sources = [];
    for (var i = 0; i < items.length; i += 1) {
      var link = items[i].querySelector("a[href]");
      if (link === null) {
        continue;
      }
      sources.push({ role: items[i].getAttribute("data-role"), href: link.getAttribute("href") });
    }
    return sources;
  }

  /**
   * Upgrade one video figure inside a panel, following the article's own
   * video rule (spc-2609061318090042) rather than one of the egg's own —
   * this map's own falsifiable assumption. `prober` is a parameter so a test
   * drives this without a network, the same seam `article-video.js` offers.
   */
  function upgradeEggVideo(figure, prober) {
    var video = global.ArticleVideo;
    if (!video || typeof video.chooseSource !== "function") {
      return Promise.resolve();
    }
    var sources = videoSourcesOf(figure);
    if (sources.length === 0) {
      return Promise.resolve();
    }
    var chosen =
      prober ||
      function (href) {
        return video.probe ? video.probe(href, PROBE_TIMEOUT_MS) : Promise.resolve(false);
      };
    return video.chooseSource(sources, chosen).then(function (found) {
      if (!found) {
        return;
      }
      var player = global.document.createElement("video");
      player.setAttribute("controls", "");
      player.setAttribute("playsinline", "");
      var poster = figure.querySelector("img");
      if (poster) {
        var posterSrc = poster.getAttribute("src");
        if (posterSrc) {
          player.setAttribute("poster", posterSrc);
        }
        poster.insertAdjacentElement("afterend", player);
      } else {
        figure.insertBefore(player, figure.firstChild);
      }
      player.src = found.href;
      figure.setAttribute("data-player-ready", "");
    });
  }

  // ----------------------------------------------------------- the panel

  var currentPanel = null;

  /**
   * Open one egg's content beside the text (`article.css` positions it; this
   * only builds it), a dialog with a labelled close
   * (`itd-2609061324342715`).
   */
  function openPanel(id, returnFocusTo, prober) {
    var template = global.document.getElementById(id);
    if (!template || template.tagName !== "TEMPLATE") {
      return;
    }
    closePanel();
    var label = template.getAttribute("data-egg-label") || "";
    var backdrop = global.document.createElement("div");
    backdrop.className = "egg-panel-backdrop";
    var dialog = global.document.createElement("div");
    dialog.className = "egg-panel";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", label ? "Hidden content: " + label : "Hidden content");
    var close = global.document.createElement("button");
    close.type = "button";
    close.className = "egg-panel-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "\u00d7";
    var body = global.document.createElement("div");
    body.className = "egg-panel-body";
    body.appendChild(template.content.cloneNode(true));
    dialog.appendChild(close);
    dialog.appendChild(body);
    backdrop.appendChild(dialog);
    global.document.body.appendChild(backdrop);
    currentPanel = { backdrop: backdrop, dialog: dialog, returnFocusTo: returnFocusTo || null };
    focusOnce(close);
    var figures = body.querySelectorAll("figure.video");
    for (var i = 0; i < figures.length; i += 1) {
      upgradeEggVideo(figures[i], prober).catch(function () {
        /* The poster and the link already stand; see article-video.js. */
      });
    }
  }

  function closePanel() {
    if (currentPanel === null) {
      return;
    }
    var panel = currentPanel;
    currentPanel = null;
    panel.backdrop.remove();
    focusOnce(panel.returnFocusTo);
  }

  // --------------------------------------------------------- the markers

  var collected = null; // Set<string>, built once at boot and kept in step.
  /** Where focus returns for one egg id, kept across a marker's move to the tray. */
  var originsById = {};

  function trayList() {
    var tray = global.document.querySelector(".egg-tray");
    if (tray !== null) {
      return tray.querySelector("ul");
    }
    tray = global.document.createElement("nav");
    tray.className = "egg-tray";
    tray.setAttribute("aria-label", "Collected marks");
    var list = global.document.createElement("ul");
    tray.appendChild(list);
    global.document.body.appendChild(tray);
    return list;
  }

  /** Add this id to the tray, once — a reload that finds it already collected calls this too. */
  function addTrayEntry(id, label) {
    var list = trayList();
    if (list.querySelector('button[data-egg="' + cssEscape(id) + '"]')) {
      return;
    }
    var item = global.document.createElement("li");
    var button = global.document.createElement("button");
    button.type = "button";
    button.className = "egg-tray-item";
    button.setAttribute("data-egg", id);
    button.setAttribute("aria-haspopup", "dialog");
    button.textContent = label;
    item.appendChild(button);
    list.appendChild(item);
  }

  /** A `data-egg` value used as a literal attribute-selector string, quotes escaped. */
  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function labelOf(id) {
    var template = global.document.getElementById(id);
    return (template && template.getAttribute("data-egg-label")) || "";
  }

  /** Collect one marker: open its panel, hide it, and move it into the tray. */
  function collect(marker, prober) {
    var id = marker.getAttribute("data-egg");
    if (!id) {
      return;
    }
    openPanel(id, originsById[id] || containingElementOf(marker), prober);
    if (collected.has(id)) {
      return;
    }
    collected.add(id);
    writeCollected([...collected]);
    marker.hidden = true;
    addTrayEntry(id, labelOf(id));
  }

  /** Every marker on the page, matched or not, wired for its first boot. */
  function processMarkers() {
    var markers = global.document.querySelectorAll(".egg-marker[data-egg]");
    for (var i = 0; i < markers.length; i += 1) {
      var marker = markers[i];
      var id = marker.getAttribute("data-egg");
      if (!id) {
        continue;
      }
      if (originsById[id] === undefined) {
        originsById[id] = containingElementOf(marker);
      }
      if (collected.has(id)) {
        marker.hidden = true;
        addTrayEntry(id, labelOf(id));
      }
    }
  }

  // -------------------------------------------------------- the opening

  var openingModal = null;

  function closeOpeningModal() {
    if (openingModal === null) {
      return;
    }
    var modal = openingModal;
    openingModal = null;
    markSeenOpening();
    modal.opening.hidden = true;
    // The dialog and its backdrop go with it: the quotation was moved in
    // (never cloned), so nothing is left holding it once the whole wrapper
    // is gone, and a reader who reloads sees `processOpening` build nothing
    // at all rather than finding a hidden leftover node to reason about.
    modal.backdrop.remove();
  }

  /**
   * Show the opening quotation as a modal over the page, the first time this
   * browser has ever seen it. `opening` is moved into the dialog rather than
   * cloned, so the modal and the no-script epigraph are the same markup —
   * one source, shown two ways depending on whether this ever runs.
   */
  function openOpeningModal(opening) {
    var backdrop = global.document.createElement("div");
    backdrop.className = "egg-panel-backdrop opening-backdrop";
    var dialog = global.document.createElement("div");
    dialog.className = "opening-modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Opening quotation");
    opening.hidden = false;
    dialog.appendChild(opening);
    var dismiss = global.document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "opening-dismiss";
    dismiss.textContent = "Continue reading";
    dialog.appendChild(dismiss);
    backdrop.appendChild(dialog);
    global.document.body.appendChild(backdrop);
    openingModal = { backdrop: backdrop, dialog: dialog, opening: opening };
    focusOnce(dismiss);
  }

  function processOpening() {
    var opening = global.document.querySelector(".opening[data-once]");
    if (!opening) {
      return;
    }
    opening.hidden = true;
    if (readSeenOpening()) {
      return;
    }
    openOpeningModal(opening);
  }

  // -------------------------------------------------------------- Konami

  var konamiBuffer = [];

  /** Every marker still hidden nowhere, i.e. still to be collected, in document order. */
  function uncollectedMarkers() {
    var markers = global.document.querySelectorAll(".egg-marker[data-egg]");
    var live = [];
    for (var i = 0; i < markers.length; i += 1) {
      if (!markers[i].hidden) {
        live.push(markers[i]);
      }
    }
    return live;
  }

  /**
   * Flash every uncollected marker and scroll to the first, in document
   * order. Reveals; never collects — a revealed mark is still uncollected
   * until the reader opens it (this map's own falsifiable assumption).
   */
  function revealUncollected() {
    var markers = uncollectedMarkers();
    if (markers.length === 0) {
      return;
    }
    for (var i = 0; i < markers.length; i += 1) {
      markers[i].classList.add("egg-marker-revealed");
    }
    if (typeof markers[0].scrollIntoView === "function") {
      markers[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    global.setTimeout(function () {
      for (var j = 0; j < markers.length; j += 1) {
        markers[j].classList.remove("egg-marker-revealed");
      }
    }, REVEAL_MS);
  }

  function handleKonamiKey(key) {
    var lower = String(key || "").toLowerCase();
    konamiBuffer.push(lower);
    if (konamiBuffer.length > KONAMI_SEQUENCE.length) {
      konamiBuffer.shift();
    }
    if (
      konamiBuffer.length === KONAMI_SEQUENCE.length &&
      konamiBuffer.every(function (value, index) {
        return value === KONAMI_SEQUENCE[index];
      })
    ) {
      konamiBuffer = [];
      revealUncollected();
    }
  }

  // ------------------------------------------------------------- wiring

  var bound = false;

  function onClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }
    if (target.closest(".opening-dismiss")) {
      closeOpeningModal();
      return;
    }
    if (target.closest(".egg-panel-close")) {
      closePanel();
      return;
    }
    if (target.closest(".egg-panel-backdrop") === target) {
      // A click on the backdrop itself, never on the dialog it holds.
      closePanel();
      return;
    }
    var trayButton = target.closest(".egg-tray-item");
    if (trayButton) {
      var id = trayButton.getAttribute("data-egg");
      if (id) {
        openPanel(id, originsById[id] || trayButton);
      }
      return;
    }
    var marker = target.closest(".egg-marker[data-egg]");
    if (marker) {
      collect(marker);
    }
  }

  /** Every element `container` a Tab could reach, in document order. */
  var FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusableWithin(container) {
    return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE_SELECTOR));
  }

  /**
   * Wrap Tab at `container`'s own first and last focusable element, so a
   * dialog that claims `aria-modal="true"` actually holds the keyboard
   * (Fable F23, GLM F9): Escape and the labelled close already work, but
   * nothing kept Tab from walking out into the page behind the backdrop.
   * Returns whether it handled the key, so a caller with no dialog open
   * falls through to whatever else a Tab press means on this page.
   */
  function trapTab(event, container) {
    if (event.key !== "Tab") {
      return false;
    }
    var focusable = focusableWithin(container);
    if (focusable.length === 0) {
      return false;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = global.document.activeElement;
    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    return true;
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      if (currentPanel !== null) {
        closePanel();
        return;
      }
      if (openingModal !== null) {
        closeOpeningModal();
        return;
      }
    }
    if (currentPanel !== null && trapTab(event, currentPanel.dialog)) {
      return;
    }
    if (openingModal !== null && trapTab(event, openingModal.dialog)) {
      return;
    }
    handleKonamiKey(event.key);
  }

  function bindOnce() {
    if (bound) {
      return;
    }
    bound = true;
    global.document.addEventListener("click", onClick);
    global.document.addEventListener("keydown", onKeydown);
  }

  /**
   * Build or refresh everything this script owns, safe to call more than
   * once — `preview.ts` calls this again after every re-render, the same way
   * it re-invokes `article-video.js`'s own `upgradeVideos`.
   */
  /**
   * Tear down a panel or an opening modal left over from a previous
   * document's own render, without marking anything seen and without
   * returning focus anywhere: `<main>` is about to be replaced, so the
   * element focus would return to is already gone (Fable F14, GLM F10).
   */
  function discardStalePanels() {
    if (currentPanel !== null) {
      var panel = currentPanel;
      currentPanel = null;
      panel.backdrop.remove();
    }
    if (openingModal !== null) {
      var modal = openingModal;
      openingModal = null;
      modal.backdrop.remove();
    }
  }

  function boot() {
    if (typeof global.document === "undefined") {
      return;
    }
    bindOnce();
    // A second Preview replaces `<main>` with a fresh document: any panel
    // or opening modal the previous one left open is looking at nodes that
    // no longer belong to the page, and `originsById` still holds the
    // previous document's own elements — both are reset before this
    // document's own markers are matched (Fable F14, GLM F10).
    discardStalePanels();
    originsById = {};
    collected = new Set(readCollected());
    processMarkers();
    processOpening();
  }

  global.ArticleEggs = {
    boot: boot,
    STORAGE_KEY_OPENING: STORAGE_KEY_OPENING,
    STORAGE_KEY_COLLECTED: STORAGE_KEY_COLLECTED,
    KONAMI_SEQUENCE: KONAMI_SEQUENCE.slice(),
    documentScope: documentScope,
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
