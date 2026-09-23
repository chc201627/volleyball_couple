/** Application orchestrator: routing state, the chrome, and handing the active
 * destination to a screen module. It builds no markup of its own. */
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

  /** Routing state only. The roster, configuration and teams live in AppState,
   * which owns their persistence. */
  var state = {
    currentView: null,
    currentSubView: null,
    currentOverlay: null,
    overlayMatchId: null,
    overlayMatchRevisions: 0,
    lang: 'es',
    // 'compact' | 'medium' | 'wide'. Not styling: at 960 the tournament screen
    // builds a table that does not exist on a phone, so a screen has to know.
    layout: 'compact',
  };

  var appState = AppState.create();
  var repository = null;
  var sessionId = null;
  var unsubscribeSession = null;
  var unsubscribeHistory = null;
  // Newest first, as the repository reports it. Beside the session rather than in
  // AppState, and named in full because `history` is the browser's own global.
  var historyEntries = [];
  // What the session last said we were, so a role change can be announced
  // rather than only re-rendered.
  var lastRole = null;
  var nodes = {};

  function workspaceInput() {
    var snapshot = appState.get();
    var session = snapshot.session;
    return {
      role: session ? session.role : 'owner',
      sessionState: session ? session.state : 'ok',
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
      pendingRequestCount: SessionAccess.pendingCount(appState.get().session),
      firebaseConnected: session ? session.connection !== 'offline' : undefined,
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

  /** The contextual primary action, performed: it acts and navigates, rather
   * than only moving there (REQ-UX-04). */
  /** Read from the same selectors the screens use, so completion cannot be
   * tracked separately and drift. A King round is complete once it has a winner. */
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
    if (action.id === 'requestAccess') { openOverlay('requestAccess'); return; }
    if (action.targetView) navigate(action.targetView);
  }

  function generateTeams() {
    var result = appState.generateTeams();
    if (result.ok) navigate('teams');
  }

  /** Creating the tournament and landing on the day it is played are one action:
   * a confirmation screen after Start exists only in the code's model. */
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

  /** The link exists from the first second rather than waiting for a Share tap.
   * Failure is silent: the tournament is already playable locally. */
  /** Local write first, network second: the court does not wait for signal, and
   * the server's answer only decides which state strip is shown afterwards. */
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

  /** The role comes from the repository, never from what this client claims —
   * which is what stops a spectator talking itself into scoring. */
  function subscribeToSession(id) {
    if (!repository || !id) return;
    if (unsubscribeSession) unsubscribeSession();
    sessionId = id;
    lastRole = null;
    unsubscribeSession = repository.watchSession(id, function (snapshot) {
      appState.adoptSession(id, snapshot);
      announceRoleChange(snapshot && snapshot.role);
      render();
    });
    if (unsubscribeHistory) unsubscribeHistory();
    historyEntries = [];
    unsubscribeHistory = repository.watchHistory(id, function (entries) {
      historyEntries = entries || [];
      render();
    });
  }

  /** A permission that changes has to be said out loud: either direction
   * silently rearranges the screen. The first snapshot is not a change. */
  function announceRoleChange(role) {
    if (!role) return;
    var previous = lastRole;
    lastRole = role;
    if (!previous || previous === role) return;
    if (previous === 'spectator' && role === 'scorer') {
      toast({
        title: translate('access.toast.approved', 'Ya puedes anotar'),
        sub: translate('access.toast.approvedSub', 'El organizador te dio acceso a este torneo'),
      });
    } else if (previous === 'scorer' && role === 'spectator') {
      toast({
        title: translate('access.toast.revoked', 'Se te quitó el acceso'),
        sub: translate('access.toast.revokedSub', 'Sigues viendo el torneo en solo lectura'),
      });
    }
  }

  /** The way out of a dead session: drop the link and fall back to what this
   * device holds locally, which is still intact. */
  function leaveSession() {
    if (unsubscribeSession) { unsubscribeSession(); unsubscribeSession = null; }
    if (unsubscribeHistory) { unsubscribeHistory(); unsubscribeHistory = null; }
    historyEntries = [];
    sessionId = null;
    lastRole = null;
    // Only the hash identifies the session, so only the hash is dropped: the query
    // string is whatever the visitor arrived with.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    appState.clearSession();
    navigate('setup');
  }

  function sessionIdFromUrl() {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('#s=') !== 0) return null;
    var id = hash.slice(3).trim();
    return id.length >= 8 ? id : null;
  }

  function shareUrl() {
    if (!sessionId) return null;
    return window.location.origin + window.location.pathname + '#s=' + sessionId;
  }

  function requestAccess(deviceLabel) {
    if (!repository || !sessionId) return Promise.resolve({ status: 'denied' });
    return repository.requestAccess(sessionId, deviceLabel).catch(function () { return { status: 'offline' }; });
  }

  function setAccess(memberId, status) {
    if (!repository || !sessionId) return Promise.resolve({ status: 'denied' });
    return repository.setAccess(sessionId, memberId, status).catch(function () { return { status: 'offline' }; });
  }

  /** The session is deleted rather than emptied: a reset ends the tournament, and
   * a surviving link would point at something nobody is playing. */
  function resetTournament() {
    if (repository && sessionId && repository.removeSession) {
      repository.removeSession(sessionId).catch(function () { /* the local reset stands */ });
    }
    if (unsubscribeSession) { unsubscribeSession(); unsubscribeSession = null; }
    if (unsubscribeHistory) { unsubscribeHistory(); unsubscribeHistory = null; }
    historyEntries = [];
    sessionId = null;
    lastRole = null;
    appState.clearSession();
    appState.resetTournament();
    history.replaceState(null, '', window.location.pathname + window.location.search);
    state.currentOverlay = null;
    navigate('setup');
  }

  function publishSession() {
    if (!repository) return;
    var snapshot = appState.get();
    repository.createSession(snapshot.tournament, { ownerLabel: snapshot.ownerLabel }).then(function (result) {
      if (result && result.status === 'synced' && result.sessionId) {
        history.replaceState(null, '', '#s=' + result.sessionId);
        // Subscribe to our own session too: the organiser needs the same live
        // feed as everyone else, including scorer requests as they arrive.
        subscribeToSession(result.sessionId);
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

  /** One list of destinations feeds both navigations, so "what is locked" and
   * "what is active" can never disagree between breakpoints. */
  function destinationItems(view) {
    return DESTINATIONS.map(function (destination) {
      var navItem = view.navItems.filter(function (item) { return item.id === destination.id; })[0];
      return {
        id: destination.id,
        icon: destination.icon,
        label: translate(destination.labelKey, destination.id),
        locked: !navItem || navItem.enabled === false,
        badge: navItem ? navItem.badge : null,
        lockReason: navItem && navItem.lockReasonKey ? translate(navItem.lockReasonKey, '') : null,
      };
    });
  }

  function renderChrome(view) {
    var items = destinationItems(view);

    // Same gate as the kebab: only once there is a tournament, and only on
    // Torneo, where a schedule long enough to search for a match exists.
    var hasTournament = view.view === 'tournament' && appState.get().tournament;
    var searchAction = hasTournament ? [{
      icon: 'search',
      tone: 'muted',
      label: translate('matches.search', 'Buscar por jugador, pareja o grupo'),
      onClick: function () { openOverlay('allMatches'); },
    }] : [];

    // One menu for everything that is not the match in front of you, and only on
    // the destination those actions belong to.
    var menuAction = hasTournament ? [{
      icon: 'ellipsis-vertical',
      tone: 'muted',
      label: translate('history.menuLabel', 'Opciones del torneo'),
      badge: SessionAccess.pendingCount(appState.get().session) > 0,
      onClick: function () { openOverlay('tournamentMenu'); },
    }] : [];

    DomHelpers.mount(nodes.bar, C.appBar({
      title: translate('workspace.nav.' + view.view, view.view),
      // Shown from 600px up, where the fixed tab bar is dropped.
      nav: { active: view.view, items: items, onSelect: navigate },
      actions: searchAction.concat(menuAction),
      lang: {
        code: state.lang.toUpperCase(),
        label: translate('app.toggleLanguage', 'Cambiar idioma'),
        onClick: toggleLanguage,
      },
    }));

    DomHelpers.mount(nodes.tabbar, C.tabBar({
      active: view.view,
      items: items,
      onSelect: navigate,
    }));
  }

  /** Everything a screen may reach: state and intents, never the shell's
   * internals. That boundary is what lets a screen be read on its own. */
  function screenContext(view) {
    return {
      view: view,
      state: state,
      appState: appState,
      layout: state.layout,
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
      requestAccess: requestAccess,
      setAccess: setAccess,
      shareUrl: shareUrl,
      leaveSession: leaveSession,
      resetTournament: resetTournament,
      history: historyEntries,
      sessionId: sessionId,
      rerender: render,
      rerenderOverlay: rerenderOverlay,
    };
  }

  /** The Tournament destination holds whichever mode is being played: King of the
   * Court is not a fifth tab, it is what "Torneo" means when it was chosen. */
  function screenIdFor(view) {
    if (view.view !== 'tournament') return view.view;
    var snapshot = appState.get();
    if (!snapshot.tournament && snapshot.king) return 'king';
    return 'tournament';
  }

  var lastScreenId = null;

  function renderScreen(view) {
    var nextScreenId = screenIdFor(view);
    var screenChanged = lastScreenId !== nextScreenId;
    lastScreenId = nextScreenId;

    var screen = UIScreens[nextScreenId];
    if (screen && typeof screen.render === 'function') {
      DomHelpers.mount(nodes.main, screen.render(screenContext(view)));
    } else {
      DomHelpers.mount(nodes.main, C.emptyState({
        icon: 'info',
        title: translate('workspace.nav.' + view.view, view.view),
        text: translate('app.screenPending', 'Pantalla pendiente en esta fase de la reconstrucción.'),
      }));
    }
    // Read back from the DOM the screen just produced, so which screens have
    // columns is not a second list to keep in sync.
    nodes.main.classList.toggle('app__main--split',
      !!nodes.main.querySelector(':scope > [data-col]'));
    nodes.main.classList.toggle('app__main--triple',
      !!nodes.main.querySelector(':scope > [data-col="extra"]'));
    if (screenChanged) {
      nodes.main.classList.remove('anim-screen-in');
      void nodes.main.offsetWidth; // restart the transition only on real destination change
      nodes.main.classList.add('anim-screen-in');
    }
  }

  function renderOverlay(view) {
    document.body.classList.toggle('has-overlay', !!(view && view.overlay));
    if (!view.overlay) { DomHelpers.clear(nodes.overlay); return; }
    var overlay = UIScreens[view.overlay];
    if (overlay && typeof overlay.render === 'function') {
      DomHelpers.mount(nodes.overlay, overlay.render(screenContext(view)));
    } else {
      DomHelpers.mount(nodes.overlay, C.sheet({ title: view.overlay, onDismiss: closeOverlay }, [
        el('p', {
          class: 'c-sheet__sub',
          text: translate('app.screenPending', 'Pantalla pendiente en esta fase de la reconstrucción.'),
        }),
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

  /** For overlay-local state changes (a step tap, a blur commit) that touch
   * nothing outside the sheet: a full render() also tears down and restarts
   * the screen's enter animation behind it, which is the flash this avoids. */
  function rerenderOverlay() {
    renderOverlay(computeWorkspace(workspaceInput()));
  }

  /** A missing or placeholder config is not an error: the app runs local-only,
   * which is how most people use it. */
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

  /** The widths the design is drawn at, watched rather than measured: nothing
   * runs on scroll or resize, only when a boundary is crossed. */
  var LAYOUT_STEPS = [
    { id: 'wide', query: '(min-width: 960px)' },
    { id: 'medium', query: '(min-width: 600px)' },
  ];

  function watchLayout() {
    if (typeof window.matchMedia !== 'function') return;
    var lists = LAYOUT_STEPS.map(function (step) {
      return { id: step.id, list: window.matchMedia(step.query) };
    });
    function resolve() {
      var match = lists.filter(function (entry) { return entry.list.matches; })[0];
      var next = match ? match.id : 'compact';
      if (next === state.layout) return;
      state.layout = next;
      render();
    }
    lists.forEach(function (entry) {
      if (typeof entry.list.addEventListener === 'function') entry.list.addEventListener('change', resolve);
      else if (typeof entry.list.addListener === 'function') entry.list.addListener(resolve);
    });
    resolve();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:') return;
    // Never on a development host: cache-first on `?v=` is right for a release and
    // wrong while files change under a version that does not.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) { registration.unregister(); });
      }).catch(function () { /* nothing to clean up */ });
      return;
    }
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
    // A link takes precedence over whatever is in storage: someone opening a
    // shared tournament wants that tournament, not the one they ran last week.
    var linked = sessionIdFromUrl();
    if (linked) subscribeToSession(linked);
    // A state change re-renders the active screen; screens never poke the DOM
    // of other screens, because no other screen is mounted.
    appState.subscribe(function () { render(); });
    watchLayout();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
