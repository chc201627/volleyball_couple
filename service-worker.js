/** Service worker — v2.0.0
 *
 * Two jobs, in this order of importance:
 *
 * 1. The app opens without signal. It is used on a beach court where the phone
 *    often has one bar or none. Everything except the Firebase SDKs is
 *    precached, so a cold start works offline and the local flows (player
 *    entry, team generation, King of the Court) keep running.
 *
 * 2. Cache invalidation that does not depend on the host. There is no header
 *    configuration in the repo, so `?v=` only propagates if index.html itself
 *    revalidates. Here that is guaranteed: navigations are network-first, so a
 *    deploy is discovered on the next load rather than whenever the browser
 *    decides the HTML went stale.
 *
 * Bump CACHE_VERSION on every release. `activate` deletes every other cache,
 * so a version bump is a full, atomic invalidation.
 */

/** The single source of truth for the release. scripts/bump-version.js rewrites
 * this line together with every `?v=` in index.html, so the cache name and the
 * URLs the page asks for can never drift apart. */
var ASSET_VERSION = '2.0.4';
var CACHE_VERSION = 'bv-' + ASSET_VERSION;

/** Firebase SDKs are deliberately NOT precached: they are large, versioned by
 * the CDN, and a stale copy is worse than a slow one. They fall through to the
 * network and the app already degrades gracefully when they fail to load. */
var VERSIONED = [
  './css/design-tokens.css',
  './css/reset.css',
  './css/app-shell.css',
  './css/animations.css',
  './css/components.css',
  './css/screens.css',
  './js/firebase-config.js',
  './js/pairing.js',
  './js/player-import.js',
  './js/i18n.js',
  './js/tournament.js',
  './js/tournament-format.js',
  './js/tournament-day-selectors.js',
  './js/tournament-repository.js',
  './js/session-access.js',
  './js/king-of-court.js',
  './js/workspace-view-machine.js',
  './js/standings-view.js',
  './js/score-input.js',
  './js/match-history.js',
  './js/app-state.js',
  './js/ui/dom-helpers.js',
  './js/ui/icon-registry.js',
  './js/ui/ui-components.js',
  './js/ui/tournament-text.js',
  './js/ui/standings-table.js',
  './js/ui/screen-registry.js',
  './js/ui/screens/setup.js',
  './js/ui/screens/import.js',
  './js/ui/screens/manual-pairing.js',
  './js/ui/screens/tournament-config.js',
  './js/ui/screens/teams.js',
  './js/ui/screens/tournament-day.js',
  './js/ui/screens/scoring.js',
  './js/ui/screens/king.js',
  './js/ui/screens/results.js',
  './js/ui/screens/collaboration.js',
  './js/ui/screens/history.js',
  './js/app-orchestrator.js',
];

var PRECACHE = ['./index.html'].concat(VERSIONED.map(function (path) {
  return path + '?v=' + ASSET_VERSION;
}));

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // addAll is all-or-nothing; one 404 would leave the worker uninstalled and
      // the app with no offline shell at all, so failures are tolerated per URL.
      .then(function (cache) {
        return Promise.all(PRECACHE.map(function (url) {
          return cache.add(url).catch(function () { return null; });
        }));
      })
      // Activate immediately instead of waiting for every tab to close. Paired
      // with the network-first navigation below, this is what makes a deploy
      // land on the next load rather than days later.
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE_VERSION ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase and any CDN pass through.

  // Navigations: network first, cache as the offline fallback. This is the
  // rule that keeps a bad service worker from pinning the app to an old build.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Everything else: cache first. Assets carry ?v= in their URL, so a new
  // release asks for different keys and never reads a stale entry.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
