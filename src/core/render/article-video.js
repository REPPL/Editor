/*
 * The article page's script: the video rule, and nowhere else to plug in.
 *
 * spc-2609061318090042 is the design record. This is the ONE source for the
 * article's script, the way `article.css` is the one source for its
 * stylesheet: the app's preview page loads this exact file, and the site
 * build and the folder export copy its bytes rather than a hand-kept copy
 * (`src-tauri/src/publish/stage.rs`'s `CHROME` and `chrome_for_folder` both
 * `include_str!` it). Plain JS, not a module, because the site serves under
 * `script-src 'self'` with no `'unsafe-inline'`: this file is what a
 * `<script src>` tag names, and nothing here runs from an inline tag.
 *
 * The page works with no script at all. The poster, the caption and the
 * source list are in the markup `article.ts` writes; every source is tried
 * in the order the author wrote it, and this script's only job is to try
 * them and, on the first one that loads, stand a player up in the poster's
 * place. When none loads — a train with every source unreachable — nothing
 * here changes anything, and the reader sees exactly the markup that shipped.
 *
 * `ArticlePage.register` is the seam later maps plug into: a reader-controls
 * toolbar (map #10), the once-only quotation and the easter eggs (map #12),
 * and keyboard movement and search (map #26) each add one call to it, in
 * their own file, rather than editing the boot sequence below.
 */
(function (global) {
  "use strict";

  /** How long a source is given to prove it plays before the next is tried. */
  var PROBE_TIMEOUT_MS = 4000;

  /**
   * Every module a later map registers, run once the page is ready.
   *
   * A module is a function of no arguments; what it does with the page is its
   * own affair. Registering after the page is already ready runs it at once,
   * so the order a map's own `<script>` tag loads in is never a race.
   */
  var modules = [];
  var ready = false;

  function register(module) {
    modules.push(module);
    if (ready) {
      module();
    }
  }

  function boot() {
    if (ready) {
      return;
    }
    ready = true;
    for (var i = 0; i < modules.length; i += 1) {
      modules[i]();
    }
  }

  /**
   * Whether one video source plays, probed off the page.
   *
   * A real `<video>` element is the only thing that answers this honestly: a
   * `fetch` would count a gated site's sign-in page as success, because it
   * answers `200` with a page rather than a video. `canplaythrough` needs
   * more than metadata and `error` fires promptly on a source that is not
   * there at all or that redirects to something that is not a video either,
   * so `loadedmetadata` is the earliest true "this plays" signal without
   * downloading the source ahead of the reader choosing to.
   */
  function probe(href, timeoutMs) {
    return new Promise(function (resolve) {
      if (typeof global.document === "undefined") {
        resolve(false);
        return;
      }
      var video = global.document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      var settled = false;
      var timer = null;
      function settle(result) {
        if (settled) {
          return;
        }
        settled = true;
        if (timer !== null) {
          global.clearTimeout(timer);
        }
        video.removeAttribute("src");
        resolve(result);
      }
      video.addEventListener("loadedmetadata", function () {
        settle(true);
      });
      video.addEventListener("error", function () {
        settle(false);
      });
      timer = global.setTimeout(function () {
        settle(false);
      }, timeoutMs);
      video.src = href;
    });
  }

  /**
   * The first source that plays, tried in the order it was written.
   *
   * `prober` is a parameter so a test can drive this with sources that never
   * touch a network; the page's own boot passes `probe`.
   */
  function chooseSource(sources, prober) {
    var attempt = function (index) {
      if (index >= sources.length) {
        return Promise.resolve(null);
      }
      var source = sources[index];
      return prober(source.href).then(function (ok) {
        return ok ? source : attempt(index + 1);
      });
    };
    return attempt(0);
  }

  /** The sources one `<figure class="video">` names, in the order written. */
  function sourcesOf(figure) {
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
   * Stand a player up in one video figure, if a source plays.
   *
   * Nothing here removes the poster or the source list from the page: the
   * stylesheet hides them, behind `data-player-ready`, so a reader with
   * styles but no script still sees the fallback rather than a half-built
   * page, and print — which honours neither the attribute nor a `<video>` —
   * still has the poster to show.
   */
  function upgrade(figure, prober) {
    var sources = sourcesOf(figure);
    if (sources.length === 0) {
      return Promise.resolve();
    }
    return chooseSource(sources, prober).then(function (found) {
      if (found === null) {
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

  /** Every video figure on the page, upgraded independently of the rest. */
  function upgradeVideos(prober) {
    var chosen = prober || function (href) {
      return probe(href, PROBE_TIMEOUT_MS);
    };
    var figures = global.document.querySelectorAll("figure.video");
    var run = [];
    for (var i = 0; i < figures.length; i += 1) {
      run.push(upgrade(figures[i], chosen));
    }
    return Promise.all(run);
  }

  var ArticlePage = {
    register: register,
    modules: modules,
    boot: boot,
  };
  var ArticleVideo = {
    chooseSource: chooseSource,
    upgradeVideos: upgradeVideos,
    probe: probe,
  };

  global.ArticlePage = ArticlePage;
  global.ArticleVideo = ArticleVideo;

  register(function () {
    upgradeVideos().catch(function () {
      /* A source that errors after the probe leaves the poster and the
         link exactly as they were: the fallback is not a failure state. */
    });
  });

  if (global.document && !global.ARTICLE_PAGE_MANUAL) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
