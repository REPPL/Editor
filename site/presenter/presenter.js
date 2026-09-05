/*
 * The presenter.
 *
 * Every page of this site is the same shell file: the root, the not-found
 * page, a bare id, a stable link and a stable deck link are byte for byte one
 * another. This script is the only thing that tells them apart, and it does
 * one thing: where the address is a stable link, it reads which version that
 * link serves and goes there.
 *
 * A segment that is not a well-formed name is never fetched, so a mistyped
 * address makes no request. Nothing is written to the page on failure — no
 * message, no code, no console line — because a page that explains why it is
 * empty is a page that says a document exists.
 */
(function (global) {
  "use strict";

  /* Sixteen bytes, base32, lower-cased and unpadded. */
  var NAME = /^[a-z2-7]{26}$/;

  function nonEmpty(segment) {
    return segment !== "";
  }

  /*
   * What an address resolves to, or null where the shell simply stands.
   *
   *   /<id>/<token>/           the article of the latest version
   *   /<id>/<token>/slides/    the deck of the latest version
   *
   * Anything else — the root, a bare id, a version path, an unknown word —
   * is left alone: a version path is already a real file, and everything else
   * is the shell.
   */
  function target(segments) {
    if (segments.length !== 2 && segments.length !== 3) {
      return null;
    }
    if (segments.length === 3 && segments[2] !== "slides") {
      return null;
    }
    var id = segments[0];
    var token = segments[1];
    if (!NAME.test(id) || !NAME.test(token)) {
      return null;
    }
    var stable = "/" + id + "/" + token + "/";
    var suffix = segments.length === 3 ? "slides/" : "";
    return {
      latest: stable + "latest.json",
      version: function (hash) {
        return stable + "v/" + hash + "/" + suffix;
      }
    };
  }

  /* Follow the address, if it is one this site answers. */
  function present(env) {
    var plan = target(String(env.location.pathname).split("/").filter(nonEmpty));
    if (plan === null) {
      return null;
    }
    return env
      .fetch(plan.latest, { credentials: "omit" })
      .then(function (response) {
        if (!response || response.status !== 200) {
          return;
        }
        return response.json().then(function (body) {
          if (!body || typeof body.hash !== "string" || !NAME.test(body.hash)) {
            return;
          }
          env.location.replace(plan.version(body.hash));
        });
      })
      .catch(function () {
        /* The shell stands. */
      });
  }

  global.Presenter = { NAME: NAME, target: target, present: present };

  if (global.document && global.location && !global.PRESENTER_MANUAL) {
    present({
      location: global.location,
      fetch: global.fetch.bind(global)
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
