/** Application orchestrator.
 *
 * Deliberately thin: it owns routing state, mounts the chrome, and hands the
 * active destination to a screen module. It does NOT build markup — that is
 * components.js and the screen modules. v1's app.js grew to 3,685 lines
 * precisely because it did both.
 *
 * Screens register themselves into `UIScreens` (js/ui/screen-registry.js) and
 * arrive one slice at a time; anything not yet registered renders a
 * placeholder rather than a blank page, so the chain stays inspectable while
 * it is being built.
 */
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

  /** Routing state only. The roster, configuration and generated teams live in
   * AppState, which owns their persistence; mixing the two is how v1's app.js
   * ended up as one 3,685-line object. */
  var state = {
    currentView: null,
    currentSubView: null,
    currentOverlay: null,
    overlayMatchId: null,
    overlayMatchRevisions: 0,
    lang: 'es',
  };

  var appState = AppState.create();
  var repository = null;
  var sessionId = null;
  var nodes = {};

  function workspaceInput() {
    var snapshot = appState.get();
    return {
      role: 'owner',
      sessionState: 'ok',
      playerCount: snapshot.players.length,
      teamSize: snapshot.teamSize,
      couplesGenerated: !!snapshot.teams,
      teamCount: snapshot.teams ? snapshot.teams.length : 0,
      unmatchedCount: snapshot.unmatched.length,
      groupCount: snapshot.groupCount,
      formatValidation: null,
      hasTournament: !!snapshot.tournament,
      hasKingGame: !!snapshot.king,
      hasBracket: !!(snapshot.tournament && snapshot.tournament.format),
      complete: isComplete(snapshot),
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
      sessionId: sessionId,
    };
  }

  /** The contextual primary action the view machine resolved, performed. It
   * navigates as a side effect rather than only moving the user there, which
   * is what REQ-UX-04 asks of the single centre action. */
  /** Completion drives the default destination and the Results copy, so it is
   * read from the same selectors the screens use rather than tracked
   * separately. A King round is complete when it has a winner. */
  function isComplete(snapshot) {
    if (snapshot.king) return !!snapshot.king.winner;
    if (!snapshot.tournament) return false;
    try {
      var format = snapshot.tournament.format || null;
      var resolution = format
        ? resolveFormat(format, { groups: snapshot.tournament.groups, matches: snapshot.tournament.matches })
        : null;
      return tournamentDay({
        format: format,
        resolution: resolution,
        matches: snapshot.tournament.matches,
        groups: snapshot.tournament.groups,
      }).complete;
    } catch (error) {
      return false;
    }
  }

  function runPrimaryAction(action) {
    if (!action || action.enabled === false) return;
    if (action.id === 'generateTeams') { generateTeams(); return; }
    if (action.id === 'addPlayers') {
      var field = document.getElementById('setup-name');
      if (field) field.focus();
      return;
    }
    if (action.id === 'startTournament') { openOverlay('modeFork'); return; }
    if (action.targetView) navigate(action.targetView);
  }

  function generateTeams() {
    var result = appState.generateTeams();
    if (result.ok) navigate('teams');
  }

  /** Creating the tournament and landing on the day it is played are one
   * action, not two. A tournament is played in a single afternoon: leaving
   * someone on a confirmation screen after they pressed Start is a step that
   * exists only in the code's model of the world, not the user's. */
  function startTournament(options) {
    var result = appState.startTournament(options || {});
    if (!result.ok) return result;
    state.currentOverlay = null;
    state.currentSubView = 'today';
    navigate('tournament');
    publishSession();
    return result;
  }

  function startKing(options) {
    var result = appState.startKing(options || {});
    if (!result.ok) return result;
    state.currentOverlay = null;
    navigate('tournament');
    return result;
  }

  /** Published on start, exactly as v1 did: the share link exists from the
   * first second rather than waiting for someone to remember to press Share.
   * Failure is silent by design — the tournament is already playable locally,
   * and blocking the court on a network error would be worse than a link that
   * can be created later. */
  /** Local write first, network second. The court does not wait for a phone to
   * find signal: the result is applied and persisted immediately, and the
   * server's answer only decides which state strip the screen shows afterwards.
   * Without a session there is nothing to publish and the save is simply done. */
  function saveResult(command) {
    var applied = appState.applyResult(command.matchId, command.score1, command.score2, command.status);
    if (!applied.ok) return Promise.resolve({ status: 'invalid' });
    if (!repository || !sessionId) return Promise.resolve({ status: 'synced' });

    var payload = Object.assign({}, applied.command, { afterConflict: !!command.afterConflict });
    return repository.saveResult(sessionId, payload).then(function (outcome) {
      return outcome || { status: 'synced' };
    }).catch(function () {
      // An unreachable server leaves the local result in place; the strip says
      // offline rather than pretending the save failed entirely.
      return { status: 'offline' };
    });
  }

  /** Ephemeral confirmation, the last frame of board M2. It says who won,
   * because v1 saved a score and told you nothing at all. */
  function toast(options) {
    if (!nodes.toast) return;
    var node = el('div', { class: 'c-toast anim-toast-in', attrs: { role: 'status', 'aria-live': 'polite' } }, [
      IconRegistry.icon('trophy', { size: 18, class: 'c-toast__icon' }),
      el('div', { class: 'c-toast__text' }, [
        el('p', { class: 'c-toast__title', text: options.title }),
        options.sub ? el('p', { class: 'c-toast__sub', text: options.sub }) : null,
      ]),
    ]);
    DomHelpers.mount(nodes.toast, node);
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { DomHelpers.clear(nodes.toast); }, 3200);
  }

  function publishSession() {
    if (!repository) return;
    var snapshot = appState.get();
    repository.createSession(snapshot.tournament, { ownerLabel: snapshot.ownerLabel }).then(function (result) {
      if (result && result.status === 'synced' && result.sessionId) {
        sessionId = result.sessionId;
        history.replaceState(null, '', '#s=' + sessionId);
        render();
      }
    }).catch(function () { /* stays local */ });
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

  /** Everything a screen is allowed to reach. Screens get state and intents,
   * never the shell's internals — that boundary is what lets a screen be read
   * on its own. */
  function screenContext(view) {
    return {
      view: view,
      state: state,
      appState: appState,
      canGenerate: appState.get().players.length >= appState.get().teamSize * 2,
      navigate: navigate,
      selectSubView: selectSubView,
      openOverlay: openOverlay,
      closeOverlay: closeOverlay,
      runPrimaryAction: runPrimaryAction,
      generateTeams: generateTeams,
      startTournament: startTournament,
      startKing: startKing,
      saveResult: saveResult,
      toast: toast,
      sessionId: sessionId,
      rerender: render,
    };
  }

  /** The Tournament destination holds whichever mode is actually being played.
   * King of the Court is not a fifth tab: it is what "Torneo" means when the
   * group chose it, and routing it here is what stops startKing() landing on a
   * screen that only knows how to render tournaments. */
  function screenIdFor(view) {
    if (view.view !== 'tournament') return view.view;
    var snapshot = appState.get();
    if (!snapshot.tournament && snapshot.king) return 'king';
    return 'tournament';
  }

  function renderScreen(view) {
    var screen = UIScreens[screenIdFor(view)];
    if (screen && typeof screen.render === 'function') {
      DomHelpers.mount(nodes.main, screen.render(screenContext(view)));
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
      DomHelpers.mount(nodes.overlay, overlay.render(screenContext(view)));
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

  /** Same availability test v1's initFirebase() applied. A missing or
   * placeholder config is not an error: the app runs local-only, which is the
   * mode most people use it in. */
  function createRepository() {
    if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined' ||
        FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY' ||
        typeof createFirebaseTournamentRepository !== 'function') {
      return null;
    }
    try {
      var useEmulator = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') &&
        new URLSearchParams(location.search).get('firebaseEmulator') === '1';
      if (!firebase.apps.length) {
        firebase.initializeApp(useEmulator ? {
          apiKey: 'demo-key',
          authDomain: 'demo-volleyball-couple.firebaseapp.com',
          databaseURL: 'http://127.0.0.1:9000/?ns=demo-volleyball-couple-default-rtdb',
          projectId: 'demo-volleyball-couple',
        } : FIREBASE_CONFIG);
      }
      if (useEmulator) {
        firebase.app().auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        firebase.app().database().useEmulator('127.0.0.1', 9000);
      }
      return createFirebaseTournamentRepository(firebase.app());
    } catch (error) {
      return null;
    }
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
      toast: document.getElementById('app-toast'),
    };
    if (typeof setLanguage === 'function') setLanguage(state.lang);
    repository = createRepository();
    appState.load();
    // A state change re-renders the active screen; screens never poke the DOM
    // of other screens, because no other screen is mounted.
    appState.subscribe(function () { render(); });
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
