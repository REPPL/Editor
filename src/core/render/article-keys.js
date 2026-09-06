/*
 * The article page's own keyboard vocabulary: moving by Section and by
 * item, the contents list, incremental search, cancel, and a keys panel.
 *
 * spc-2609061318158216 is the design record for map #26
 * (`itd-2609051402083398`). This file invents no chord: every one it answers
 * to is a row `READING_BINDING_IDS` names in `src/keys.ts`, the one binding
 * table the editing surface answers to as well, and `articleDocument`
 * (`src/publish/build.ts`) and the app's own preview window
 * (`src/preview.ts`) both write that row's id, label and chords into the
 * page as a `<script type="application/json" id="article-keys-data">`
 * block — the shape `src/core/render/reading-keys.ts` builds — because this
 * plain script, served under the site's `script-src 'self'` with no
 * bundler, cannot import `src/keys.ts` at all. The event-to-chord mapping
 * below is a faithful, independent copy of `chordFromEvent` in that module,
 * proven to agree with it over one shared fixture in
 * `chord-mapping.fixture.ts` (`article-keys.test.ts` drives both).
 *
 * The page works with no script at all: every chord here is an enhancement
 * over content that already stands — the contents list is the `<nav
 * class="contents">` map #9 already renders, and the headings a screen
 * reader walks by are already a correct hierarchy independent of any of
 * this (`itd-2609061324342715`). This script never claims a chord unless it
 * is one of the rows named above, and it stores nothing about a reader: a
 * search term lives in memory only and is gone the moment the search panel
 * closes (`itd-2609051336145770`).
 *
 * Coordination with map #12's own script, `article-eggs.js`, is by DOM
 * convention rather than by editing that file: its panel and its opening
 * modal both carry the class `egg-panel-backdrop`, and it closes either on
 * a plain `Escape` keydown it listens for itself. While that class is on
 * the page this script does nothing but relay the cancel chord's other
 * half, `C-g`, as a synthetic `Escape` keydown — the one cancel rule this
 * page and the editor share (`itd-2609051402083398`'s own Mechanism) — so
 * that egg panel is never left holding the keyboard with half its own
 * cancel chord unanswered.
 */
(function (global) {
  "use strict";

  // ----------------------------------------------------- the chord mapping

  /** Punctuation keys by their physical `code`, mirroring `src/keys.ts`. */
  var CODE_NAMES = {
    Slash: "/",
    Backslash: "\\",
    Minus: "-",
    Equal: "=",
    Comma: ",",
    Period: ".",
    Semicolon: ";",
    Quote: "'",
    Backquote: "`",
    BracketLeft: "[",
    BracketRight: "]",
    Space: "Space",
  };

  /** Keys whose event name is not the chord name, mirroring `src/keys.ts`. */
  var KEY_NAMES = {
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    ArrowDown: "Down",
    " ": "Space",
    Escape: "Escape",
    Enter: "Return",
  };

  /**
   * Build a chord string from a keyboard event, in the binding table's
   * notation. A faithful copy of `chordFromEvent` in `src/keys.ts` — see
   * this file's own header for why it cannot be imported instead, and
   * `chord-mapping.fixture.ts` for the list both are held against.
   */
  function chordFromEvent(event) {
    var modifiers = "";
    if (event.ctrlKey) modifiers += "C-";
    if (event.altKey) modifiers += "M-";
    if (event.metaKey) modifiers += "s-";
    if (event.shiftKey) modifiers += "S-";

    var name;
    if (/^Key[A-Z]$/.test(event.code)) {
      name = event.code.slice(3).toLowerCase();
    } else if (/^Digit[0-9]$/.test(event.code)) {
      name = event.code.slice(5);
    } else if (Object.prototype.hasOwnProperty.call(CODE_NAMES, event.code)) {
      name = CODE_NAMES[event.code];
    } else if (Object.prototype.hasOwnProperty.call(KEY_NAMES, event.key)) {
      name = KEY_NAMES[event.key];
    } else if (event.key === "Dead" || event.key === "Unidentified") {
      name = event.code;
    } else {
      name = event.key;
    }
    if (name === "Control" || name === "Alt" || name === "Meta" || name === "Shift") {
      return modifiers || name;
    }
    return modifiers + name;
  }

  // --------------------------------------------------------- honoured data

  /** The rows `#article-keys-data` names: `{id, label, chords}[]`, or `[]`. */
  var HONOURED = [];

  /** Read the honoured rows the page's own build wrote. Never throws. */
  function loadHonoured() {
    HONOURED = [];
    var script = global.document.getElementById("article-keys-data");
    if (!script) return;
    try {
      var parsed = JSON.parse(script.textContent || "[]");
      if (Array.isArray(parsed)) {
        HONOURED = parsed.filter(function (row) {
          return (
            row &&
            typeof row.id === "string" &&
            typeof row.label === "string" &&
            Array.isArray(row.chords)
          );
        });
      }
    } catch {
      HONOURED = [];
    }
  }

  /** The honoured row's own id a full chord (one or two steps) answers, or null. */
  function honouredIdForChord(chord) {
    for (var i = 0; i < HONOURED.length; i += 1) {
      var chords = HONOURED[i].chords;
      for (var j = 0; j < chords.length; j += 1) {
        if (chords[j] === chord) return HONOURED[i].id;
      }
    }
    return null;
  }

  /** Whether `step` is the first half of some honoured two-step chord. */
  function isPrefixStart(step) {
    for (var i = 0; i < HONOURED.length; i += 1) {
      var chords = HONOURED[i].chords;
      for (var j = 0; j < chords.length; j += 1) {
        var spaceAt = chords[j].indexOf(" ");
        if (spaceAt !== -1 && chords[j].slice(0, spaceAt) === step) return true;
      }
    }
    return false;
  }

  /** One honoured row's own chords, for the keys panel and its hint line. */
  function chordsFor(id) {
    for (var i = 0; i < HONOURED.length; i += 1) {
      if (HONOURED[i].id === id) return HONOURED[i].chords;
    }
    return [];
  }

  // -------------------------------------------------------- shared reveal

  /**
   * Focus an element that may not ordinarily take it, and let it go back to
   * being unfocusable once the reader moves on.
   *
   * The same idiom `article-eggs.js` uses for returning focus to a
   * paragraph — a temporary `tabindex="-1"`, removed on `blur` — kept here
   * as its own copy rather than an import, because a plain script has
   * nothing to import from another (this file's own header explains why).
   */
  function focusOnce(element) {
    if (!element || typeof element.focus !== "function") return;
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

  /** Bring an element into view and give it the keyboard's attention. */
  function reveal(element) {
    if (!element) return;
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "center" });
    }
    focusOnce(element);
  }

  // ----------------------------------------------- Section and item moves

  /** Where the reader is: which Section, which item inside it, or neither. */
  var sectionIndex = -1;
  var itemIndex = -1;
  /** The element the reader was last deliberately moved to. */
  var currentElement = null;

  function mainElement() {
    return global.document.querySelector("main");
  }

  /** Every heading on the page, in document order — Chapter down to Sub-sub-section. */
  function allHeadings() {
    var main = mainElement();
    if (!main) return [];
    return Array.prototype.slice.call(
      main.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"),
    );
  }

  function wrap(value, count) {
    if (count <= 0) return 0;
    return ((value % count) + count) % count;
  }

  /**
   * Move by Section: every heading on the page, regardless of level — the
   * same reading `outline-next-heading`/`outline-previous-heading` give the
   * editing surface (`src/keys.ts`'s own outline group). A reading page has
   * no cursor to move from, so the position lives here instead, in memory
   * only, and wraps at the ends the way every overlay's own list does.
   */
  function moveSection(delta) {
    var headings = allHeadings();
    var count = headings.length;
    if (count === 0) return;
    sectionIndex = sectionIndex === -1 ? (delta > 0 ? 0 : count - 1) : wrap(sectionIndex + delta, count);
    itemIndex = -1;
    currentElement = headings[sectionIndex];
    reveal(currentElement);
  }

  /**
   * Every flow child between the current Section's heading and the next
   * heading of any level — a paragraph, a list, a figure, a callout, a
   * margin note — read straight off the `<article>` map #9 already wraps
   * one chapter in, never a structure this file builds of its own.
   */
  function itemsInCurrentSection() {
    var headings = allHeadings();
    if (sectionIndex < 0 || sectionIndex >= headings.length) return [];
    var heading = headings[sectionIndex];
    var article = heading.closest("article") || heading.parentElement;
    if (!article) return [];
    var children = Array.prototype.slice.call(article.children);
    var start = children.indexOf(heading);
    if (start === -1) return [];
    var items = [];
    for (var i = start + 1; i < children.length; i += 1) {
      if (/^H[1-6]$/.test(children[i].tagName)) break;
      items.push(children[i]);
    }
    return items;
  }

  /** Move by item inside the current Section — nothing happens outside one. */
  function moveItem(delta) {
    var items = itemsInCurrentSection();
    var count = items.length;
    if (count === 0) return;
    itemIndex = itemIndex === -1 ? (delta > 0 ? 0 : count - 1) : wrap(itemIndex + delta, count);
    currentElement = items[itemIndex];
    reveal(currentElement);
  }

  /** Put the Section position in step with a heading reached some other way. */
  function syncSectionIndexTo(target) {
    var headings = allHeadings();
    var at = headings.indexOf(target);
    if (at !== -1) {
      sectionIndex = at;
      itemIndex = -1;
    }
  }

  // -------------------------------------------------------------- overlay

  /** The one thing of this script's own that can hold the keyboard, or null. */
  var overlay = null;

  function closeOverlay(restore) {
    if (!overlay) return;
    var closing = overlay;
    overlay = null;
    closing.element.remove();
    if (closing.type === "search") {
      if (restore && searchState && searchState.originElement) {
        reveal(searchState.originElement);
        currentElement = searchState.originElement;
      }
      searchState = null;
    }
    if (closing.returnFocusTo && typeof closing.returnFocusTo.focus === "function") {
      closing.returnFocusTo.focus();
    }
  }

  function activeElement() {
    return global.document.activeElement instanceof global.HTMLElement
      ? global.document.activeElement
      : null;
  }

  // ------------------------------------------------------------ contents

  /** One entry of the on-page `<nav class="contents">`, read back as data. */
  function walkContents(ol, out) {
    var items = ol.children;
    for (var i = 0; i < items.length; i += 1) {
      var li = items[i];
      if (li.tagName !== "LI") continue;
      var link = null;
      var label = null;
      var nestedOl = null;
      for (var j = 0; j < li.children.length; j += 1) {
        var child = li.children[j];
        if (child.tagName === "A") link = child;
        else if (child.tagName === "SPAN") label = child;
        else if (child.tagName === "OL") nestedOl = child;
      }
      if (link) {
        out.push({ kind: "entry", label: link.textContent, href: link.getAttribute("href") || "" });
      } else if (label) {
        out.push({ kind: "part", label: label.textContent });
      }
      if (nestedOl) walkContents(nestedOl, out);
    }
  }

  /**
   * The contents list's own entries, Parts and all — map #9's own markup is
   * the one source; this reads it back rather than rebuilding the document's
   * hierarchy a second time (`itd-2609051336090390`).
   */
  function contentsEntries() {
    var nav = global.document.querySelector("nav.contents");
    if (!nav) return [];
    var topList = nav.querySelector("ol");
    if (!topList) return [];
    var out = [];
    walkContents(topList, out);
    return out;
  }

  function buildContentsOverlay(entries) {
    var element = global.document.createElement("section");
    element.className = "article-contents-overlay";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-modal", "true");
    element.setAttribute("aria-label", "Contents");
    var hint = global.document.createElement("p");
    hint.className = "article-overlay-hint";
    hint.textContent = "Move with the movement chords. Return jumps. Cancel closes.";
    element.append(hint);
    var list = global.document.createElement("ol");
    list.className = "article-contents-list";
    var rows = [];
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      var li = global.document.createElement("li");
      if (entry.kind === "part") {
        li.className = "article-contents-part";
        li.textContent = entry.label;
      } else {
        li.className = "article-contents-row";
        li.dataset.href = entry.href;
        li.dataset.rowIndex = String(rows.length);
        li.textContent = entry.label;
        rows.push(li);
      }
      list.append(li);
    }
    element.append(list);
    return { element: element, rows: rows };
  }

  function highlightContentsRow() {
    var rows = overlay.rows;
    for (var i = 0; i < rows.length; i += 1) {
      rows[i].dataset.current = i === overlay.index ? "yes" : "no";
    }
    var current = rows[overlay.index];
    if (current && typeof current.scrollIntoView === "function") {
      current.scrollIntoView({ block: "nearest" });
    }
  }

  function moveContentsRow(delta) {
    overlay.index = wrap(overlay.index + delta, overlay.rows.length);
    highlightContentsRow();
  }

  function chooseContentsRow() {
    var row = overlay.rows[overlay.index];
    var href = row.dataset.href || "";
    var id = href.charAt(0) === "#" ? href.slice(1) : href;
    closeOverlay(false);
    if (!id) return;
    var target = global.document.getElementById(id);
    if (!target) return;
    syncSectionIndexTo(target);
    currentElement = target;
    reveal(target);
  }

  /**
   * Open the contents list as a list overlay: Parts, Chapters, Sections and
   * Sub-sections, exactly as `<nav class="contents">` already carries them.
   * A document whose contents list has nothing to jump to opens nothing at
   * all, rather than a dialog with no rows the movement chords could ever
   * move between.
   */
  function openContents() {
    if (overlay || eggPanelOpen()) return;
    var built = buildContentsOverlay(contentsEntries());
    if (built.rows.length === 0) return;
    global.document.body.append(built.element);
    built.element.tabIndex = -1;
    overlay = {
      type: "contents",
      element: built.element,
      rows: built.rows,
      index: 0,
      returnFocusTo: activeElement(),
    };
    highlightContentsRow();
    built.element.focus();
  }

  // --------------------------------------------------------------- search

  /** The one live search, or null — its term lives here and nowhere else. */
  var searchState = null;

  /** The nearest element a reader would call "the paragraph", for a match. */
  function containingElementOf(node) {
    var element = node.nodeType === 3 ? node.parentElement : node;
    return (
      (element &&
        element.closest(
          "p, li, td, th, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, figure, caption",
        )) ||
      element
    );
  }

  /**
   * Every text node under `<main>` carrying `query`, each read back as the
   * block element a reader would call its paragraph. One match per text
   * node that carries the term at all — this is a reading page finding
   * where to bring a reader to, not a find-in-page highlighter counting
   * every character offset, and every host's own text is walked fresh, so
   * nothing here is cached across a search.
   */
  function findMatches(query) {
    var matches = [];
    var main = mainElement();
    if (!main || query === "") return matches;
    var lower = query.toLowerCase();
    var walker = global.document.createTreeWalker(main, global.NodeFilter.SHOW_TEXT, null);
    var node = walker.nextNode();
    while (node) {
      var text = node.nodeValue || "";
      if (text.toLowerCase().indexOf(lower) !== -1) {
        var element = containingElementOf(node);
        if (element) matches.push({ element: element });
      }
      node = walker.nextNode();
    }
    return matches;
  }

  function updateSearchStatus() {
    if (!overlay || overlay.type !== "search" || !searchState) return;
    var count = searchState.matches.length;
    overlay.status.textContent =
      searchState.query === ""
        ? "Type to search the article."
        : count === 0
          ? "No matches for “" + searchState.query + "”."
          : "Match " + String(searchState.index + 1) + " of " + String(count) + ".";
  }

  function updateSearch(query) {
    searchState.query = query;
    searchState.matches = findMatches(query);
    searchState.index = searchState.matches.length > 0 ? 0 : -1;
    if (searchState.index !== -1) {
      reveal(searchState.matches[searchState.index].element);
    }
    updateSearchStatus();
  }

  function stepSearch(delta) {
    if (!searchState || searchState.matches.length === 0) return;
    searchState.index = wrap(searchState.index + delta, searchState.matches.length);
    reveal(searchState.matches[searchState.index].element);
    updateSearchStatus();
  }

  /**
   * Open the incremental search: a labelled field, read fresh on every
   * keystroke, its term kept in memory alone (`itd-2609051336145770`) —
   * gone the moment this closes, never written to storage or a request.
   */
  function openSearch() {
    if (overlay || eggPanelOpen()) return;
    var element = global.document.createElement("section");
    element.className = "article-search-panel";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-modal", "true");
    element.setAttribute("aria-label", "Search the article");
    var label = global.document.createElement("label");
    label.className = "article-search-label";
    label.textContent = "Search";
    var input = global.document.createElement("input");
    input.type = "text";
    input.className = "article-search-field";
    label.append(input);
    var status = global.document.createElement("p");
    status.className = "article-search-status";
    status.setAttribute("aria-live", "polite");
    element.append(label, status);
    global.document.body.append(element);

    searchState = { query: "", matches: [], index: -1, originElement: currentElement };
    overlay = {
      type: "search",
      element: element,
      input: input,
      status: status,
      returnFocusTo: activeElement(),
    };
    input.addEventListener("input", function () {
      updateSearch(input.value);
    });
    updateSearchStatus();
    input.focus();
  }

  // ---------------------------------------------------------- keys panel

  function buildKeysPanel() {
    var element = global.document.createElement("section");
    element.className = "article-keys-panel";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-modal", "true");
    element.setAttribute("aria-label", "Keys");
    var heading = global.document.createElement("h2");
    heading.textContent = "Keys";
    var hint = global.document.createElement("p");
    hint.className = "article-keys-panel-hint";
    var quit = chordsFor("keyboard-quit");
    hint.textContent = "Close with " + (quit.length > 0 ? quit.join(" or ") : "Escape") + ".";
    element.append(heading, hint);
    var list = global.document.createElement("dl");
    list.className = "article-keys-list";
    for (var i = 0; i < HONOURED.length; i += 1) {
      var row = HONOURED[i];
      var term = global.document.createElement("dt");
      term.textContent = row.label;
      var detail = global.document.createElement("dd");
      for (var j = 0; j < row.chords.length; j += 1) {
        var kbd = global.document.createElement("kbd");
        kbd.textContent = row.chords[j];
        detail.append(kbd);
      }
      list.append(term, detail);
    }
    element.append(list);
    return element;
  }

  /**
   * Open the keys panel: exactly the rows this page honours, each with its
   * label and its live chords, and no row this page does not honour
   * (the negative case is what the panel's own build already guarantees —
   * it only ever reads `HONOURED`, never the full binding table).
   */
  function openKeysPanel() {
    if (overlay || eggPanelOpen()) return;
    var element = buildKeysPanel();
    global.document.body.append(element);
    element.tabIndex = -1;
    overlay = { type: "keys", element: element, returnFocusTo: activeElement() };
    element.focus();
  }

  /**
   * A visible, native, Tab-reachable way to the keys panel besides its own
   * chord — `itd-2609061324342715` forbids a panel reachable only by an
   * Emacs chord a reader who has never read the binding table would have no
   * way to find. Placed first in `<body>` so one Tab from the top of the
   * page reaches it, the same reasoning the reader-controls toolbar's own
   * placement leaves this file free not to have to solve a second time.
   */
  function ensureHelpButton() {
    if (global.document.querySelector(".article-keys-help")) return;
    var button = global.document.createElement("button");
    button.type = "button";
    button.className = "article-keys-help";
    button.textContent = "Keyboard shortcuts";
    button.addEventListener("click", function () {
      openKeysPanel();
    });
    global.document.body.insertBefore(button, global.document.body.firstChild);
  }

  // ------------------------------------------------ map #12's own overlay

  /**
   * Whether `article-eggs.js`'s own panel or opening modal is open. Both
   * carry this class (`article-eggs.js`'s own `openPanel`/`openOpeningModal`);
   * reading it is the coordination this file uses instead of editing that
   * one, per this map's own boundary with map #12.
   */
  function eggPanelOpen() {
    return global.document.querySelector(".egg-panel-backdrop") !== null;
  }

  /**
   * Translate `C-g` into the `Escape` keydown `article-eggs.js` listens for
   * directly, so the one cancel rule holds even though that script only
   * ever wrote half of it for itself. The dispatched event carries a marker
   * property no real keydown has, which is what stops this page relaying
   * its own relay back to itself the moment it reaches this same listener
   * again — `isTrusted` would say the same thing on a real keyboard, but a
   * test has no way to dispatch a trusted event at all, so the marker is
   * what a synthetic keydown can prove either way.
   */
  function relayEscape() {
    var relayed = new global.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    relayed.articleKeysRelayed = true;
    global.document.dispatchEvent(relayed);
  }

  // ------------------------------------------------------------- actions

  function runAction(id, event) {
    if (id === "keyboard-quit") {
      // Reached only when nothing of this page's own and no egg panel is
      // open (both are checked before this function is ever called with
      // this id) — the cancel chord has nothing to cancel, so it is left
      // unclaimed rather than swallowed for no effect.
      return;
    }
    event.preventDefault();
    switch (id) {
      case "outline-next-heading":
        moveSection(1);
        break;
      case "outline-previous-heading":
        moveSection(-1);
        break;
      case "next-line":
        moveItem(1);
        break;
      case "previous-line":
        moveItem(-1);
        break;
      case "outline-occur":
        openContents();
        break;
      case "isearch-forward":
        openSearch();
        break;
      case "isearch-backward":
        openSearch();
        break;
      case "keys-panel":
        openKeysPanel();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------- wiring

  var pendingPrefix = null;
  var pendingTimer = null;
  /** How long a prefix's second step is waited for before it is dropped. */
  var PREFIX_TIMEOUT_MS = 2000;

  function clearPending() {
    pendingPrefix = null;
    if (pendingTimer !== null) {
      global.clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function handleOverlayKey(event, chord) {
    if (honouredIdForChord(chord) === "keyboard-quit") {
      event.preventDefault();
      closeOverlay(overlay.type === "search");
      return;
    }
    if (overlay.type === "search") {
      if (honouredIdForChord(chord) === "isearch-forward") {
        event.preventDefault();
        stepSearch(1);
        return;
      }
      if (honouredIdForChord(chord) === "isearch-backward") {
        event.preventDefault();
        stepSearch(-1);
        return;
      }
      if (chord === "Return") {
        event.preventDefault();
        closeOverlay(false);
        return;
      }
      // A letter, Backspace, an arrow inside the field: left alone. The
      // field is a real `<input>`, and typing into it is exactly what
      // holding the keyboard means for a prompt rather than a list
      // (`src/overlay.ts`'s own `onKey` contract, mirrored here since this
      // page cannot import that module).
      return;
    }
    if (overlay.type === "contents") {
      if (honouredIdForChord(chord) === "next-line") {
        event.preventDefault();
        moveContentsRow(1);
        return;
      }
      if (honouredIdForChord(chord) === "previous-line") {
        event.preventDefault();
        moveContentsRow(-1);
        return;
      }
      if (chord === "Return") {
        event.preventDefault();
        chooseContentsRow();
        return;
      }
    }
    // The keys panel, and every other key on the contents list: held, not
    // left to leak through to the page underneath while an overlay owns
    // the keyboard.
    event.preventDefault();
  }

  function onKeydown(event) {
    var chord = chordFromEvent(event);

    if (overlay) {
      handleOverlayKey(event, chord);
      return;
    }

    if (eggPanelOpen()) {
      if (honouredIdForChord(chord) === "keyboard-quit" && !event.articleKeysRelayed) {
        relayEscape();
      }
      return;
    }

    if (pendingPrefix !== null) {
      var full = pendingPrefix + " " + chord;
      var id = honouredIdForChord(full);
      clearPending();
      if (id !== null) {
        runAction(id, event);
      }
      return;
    }

    var directId = honouredIdForChord(chord);
    if (directId !== null) {
      runAction(directId, event);
      return;
    }

    if (isPrefixStart(chord)) {
      event.preventDefault();
      pendingPrefix = chord;
      pendingTimer = global.setTimeout(clearPending, PREFIX_TIMEOUT_MS);
    }
  }

  var bound = false;

  function bindOnce() {
    if (bound) return;
    bound = true;
    global.document.addEventListener("keydown", onKeydown);
  }

  function resetPosition() {
    sectionIndex = -1;
    itemIndex = -1;
    currentElement = null;
    closeOverlay(false);
    clearPending();
  }

  /**
   * Build the page's own reading vocabulary from the data the build wrote,
   * and start listening. Safe to call more than once — `preview.ts` calls
   * this again after every re-render, the same way it re-invokes
   * `article-video.js`'s own `upgradeVideos` and `article-eggs.js`'s own
   * `boot` — because a fresh document means a fresh set of headings and a
   * reading position that no longer means anything against them.
   */
  function boot() {
    if (typeof global.document === "undefined") return;
    loadHonoured();
    resetPosition();
    ensureHelpButton();
    bindOnce();
  }

  global.ArticleKeys = {
    boot: boot,
    chordFromEvent: chordFromEvent,
    state: function () {
      return {
        sectionIndex: sectionIndex,
        itemIndex: itemIndex,
        overlay: overlay ? overlay.type : null,
      };
    },
    /**
     * Stop listening and close whatever is open. Not called by any host
     * this map ships to — a page loads this file once — but exposed the
     * same way `keyspike.ts`'s own `KeyLog.dispose` is, so a test that
     * loads a fresh copy of this script for every case can retire the
     * previous one's document-level listener first.
     */
    dispose: function () {
      closeOverlay(false);
      clearPending();
      if (bound) {
        global.document.removeEventListener("keydown", onKeydown);
        bound = false;
      }
    },
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
