/** Application orchestrator.
 *
 * Deliberately thin: it owns routing state, mounts the chrome, and hands the
 * active destination to a screen module. It does NOT build markup — that is
 * components.js and the screen modules. v1's app.js grew to 3,685 lines
 * precisely because it did both.
 *
 * Slice B ships the shell and the routing. Screens register themselves into
 * `UIScreens` and arrive one slice at a time; anything not yet registered
 * renders a placeholder rather than a blank page, so the chain stays
 * inspectable while it is being built.
 */
/* exported UIScreens */
var UIScreens = {};
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var DESTINATIONS = [
    { id: 'setup', icon: 'users', labelKey: 'workspace.nav.setup' },
    { id: 'teams', icon: 'shuffle', labelKey: 'workspace.nav.teams' },
    { id: 'tournament', icon: 'trophy', labelKey: 'workspace.nav.tournament' },
    { id: 'results', icon: 'list-ordered', labelKey: 'workspace.nav.results' },
  ];

  /** Everything the view machine needs that is not yet wired to real state.
   * Slice C replaces these reads with the live roster, session and repository;
   * keeping them in one object makes that swap a single edit. */
  var state = {
    currentView: null,
    currentSubView: null,
    currentOverlay: null,
    overlayMatchId: null,
    overlayMatchRevisions: 0,
    lang: 'es',
  };

  var nodes = {};

  function workspaceInput() {
    return {
      role: 'owner',
      sessionState: 'ok',
      playerCount: 0,
      teamSize: 2,
      couplesGenerated: false,
      teamCount: 0,
      unmatchedCount: 0,
      groupCount: 1,
      formatValidation: null,
      hasTournament: false,
      hasKingGame: false,
      hasBracket: false,
      complete: false,
      hasNextMatch: false,
      pendingRequestCount: 0,
      // Same test v1's initFirebase() applies, so both entry points agree on
      // whether a session is even possible.
      firebaseAvailable: typeof firebase !== 'undefined' &&
        typeof FIREBASE_CONFIG !== 'undefined' &&
        FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY',
      currentView: state.currentView,
      currentSubView: state.currentSubView,
      currentOverlay: state.currentOverlay,
      overlayMatchRevisions: state.overlayMatchRevisions,
      sessionId: null,
    };
  }

  function navigate(viewId) {
    if (state.currentView === viewId) return;
    state.currentView = viewId;
    // A destination change closes whatever was stacked on top of it: an overlay
    // belongs to the screen that opened it, never to the shell.
    state.currentSubView = null;
    state.currentOverlay = null;
    render();
  }

  function selectSubView(id) {
    state.currentSubView = id;
    render();
  }

  function openOverlay(id, options) {
    state.currentOverlay = id;
    state.overlayMatchId = (options && options.matchId) || null;
    state.overlayMatchRevisions = (options && options.revisions) || 0;
    render();
  }

  function closeOverlay() {
    state.currentOverlay = null;
    state.overlayMatchId = null;
    state.overlayMatchRevisions = 0;
    render();
  }

  function toggleLanguage() {
    state.lang = state.lang === 'es' ? 'en' : 'es';
    if (typeof setLanguage === 'function') setLanguage(state.lang);
    render();
  }

  function label(key, fallback) {
    if (typeof t !== 'function') return fallback;
    var value = t(key);
    return value === key ? fallback : value;
  }

  /** One list of destinations feeds both navigations, so "what is locked" and
   * "what is active" can never disagree between breakpoints. */
  function destinationItems(view) {
    return DESTINATIONS.map(function (destination) {
      var navItem = view.navItems.filter(function (item) { return item.id === destination.id; })[0];
      return {
        id: destination.id,
        icon: destination.icon,
        label: label(destination.labelKey, destination.id),
        locked: !navItem || navItem.enabled === false,
        lockReason: navItem && navItem.lockReasonKey ? label(navItem.lockReasonKey, '') : null,
      };
    });
  }

  function renderChrome(view) {
    var items = destinationItems(view);

    DomHelpers.mount(nodes.bar, C.appBar({
      title: label('workspace.nav.' + view.view, view.view),
      // Shown from 600px up, where the fixed tab bar is dropped.
      nav: { active: view.view, items: items, onSelect: navigate },
      lang: { code: state.lang.toUpperCase(), label: 'Cambiar idioma', onClick: toggleLanguage },
    }));

    DomHelpers.mount(nodes.tabbar, C.tabBar({
      active: view.view,
      items: items,
      onSelect: navigate,
    }));
  }

  function renderScreen(view) {
    var screen = UIScreens[view.view];
    if (screen && typeof screen.render === 'function') {
      DomHelpers.mount(nodes.main, screen.render({
        view: view,
        state: state,
        navigate: navigate,
        selectSubView: selectSubView,
        openOverlay: openOverlay,
        closeOverlay: closeOverlay,
      }));
    } else {
      DomHelpers.mount(nodes.main, C.emptyState({
        icon: 'info',
        title: label('workspace.nav.' + view.view, view.view),
        text: 'Pantalla pendiente en esta fase de la reconstrucción.',
      }));
    }
    nodes.main.classList.remove('anim-screen-in');
    void nodes.main.offsetWidth; // restart the transition on every destination change
    nodes.main.classList.add('anim-screen-in');
  }

  function renderOverlay(view) {
    if (!view.overlay) { DomHelpers.clear(nodes.overlay); return; }
    var overlay = UIScreens[view.overlay];
    if (overlay && typeof overlay.render === 'function') {
      DomHelpers.mount(nodes.overlay, overlay.render({
        view: view,
        state: state,
        closeOverlay: closeOverlay,
        openOverlay: openOverlay,
      }));
    } else {
      DomHelpers.mount(nodes.overlay, C.sheet({ title: view.overlay, onDismiss: closeOverlay }, [
        el('p', { class: 'c-sheet__sub', text: 'Pantalla pendiente en esta fase de la reconstrucción.' }),
      ]));
    }
  }

  function render() {
    var view = computeWorkspace(workspaceInput());
    state.currentView = view.view;
    state.currentSubView = view.subView;
    renderChrome(view);
    renderScreen(view);
    renderOverlay(view);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('service-worker.js').catch(function () {
      // An unavailable service worker costs the offline shell, nothing else.
      // The app must never depend on it having registered.
    });
  }

  function init() {
    nodes = {
      bar: document.getElementById('app-bar'),
      main: document.getElementById('app-main'),
      tabbar: document.getElementById('app-tabbar'),
      overlay: document.getElementById('app-overlay'),
    };
    if (typeof setLanguage === 'function') setLanguage(state.lang);
    render();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
