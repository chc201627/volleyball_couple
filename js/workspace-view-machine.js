/**
 * Workspace Module — pure, DOM-free view machine for the four-destination
 * organizer workspace (Setup, Teams, Tournament, Results). REQ-UX-01..07,
 * 10-13, 60-62.
 *
 * Standalone pure-function module (no DOM access, no side effects, no i18n,
 * no Date/Math.random). Loads before the UI layer in the contractual script order.
 *
 * Exposed function: computeWorkspace(input)
 */

/* exported computeWorkspace */

var WORKSPACE_VIEWS = ['setup', 'teams', 'tournament', 'results'];

/** v2 routing has three axes, and the distinction between the last two is what
 * keeps the tab bar at four entries no matter how many flows exist:
 *
 *   destination — the four tab-bar entries above
 *   sub-view    — a filter *within* a destination (Tournament only)
 *   overlay     — a stacked screen or sheet with its own bar and a way back
 *
 * Scoring, history, access and share are overlays, not destinations: they are
 * things you do and come back from, not places you live in.
 */
var WORKSPACE_SUBVIEWS = { tournament: ['today', 'groups', 'bracket'] };
var WORKSPACE_OVERLAYS = [
  'scoring', 'history', 'matchHistory', 'requestAccess', 'scorers', 'share', 'modeFork',
];

/** Sub-view resolution. Only Tournament has them; everything else resolves to
 * null so a screen never has to ask "do I have tabs?". Bracket is hidden
 * rather than shown-empty when the session's format has no knockout stage —
 * an always-present tab that is always empty teaches people to ignore it. */
function workspaceSubView(input, view) {
  var allowed = WORKSPACE_SUBVIEWS[view];
  if (!allowed) return { subView: null, subViewItems: [] };
  var items = allowed.filter(function (id) {
    return id !== 'bracket' || !!input.hasBracket;
  }).map(function (id) {
    return { id: id, labelKey: 'workspace.tournament.tab.' + id };
  });
  var requested = input.currentSubView;
  var resolved = items.some(function (item) { return item.id === requested; }) ? requested : 'today';
  return { subView: resolved, subViewItems: items };
}

/** Whether a requested overlay may open for the current state and role.
 * Returning a reason key rather than silently dropping it means the caller can
 * explain the refusal instead of appearing to ignore the tap. */
function workspaceOverlayAllowed(id, input) {
  switch (id) {
    case 'scoring':
      if (input.role !== 'owner' && input.role !== 'scorer') {
        return { enabled: false, reasonKey: 'workspace.overlay.blocked.readOnly' };
      }
      return { enabled: !!input.hasTournament, reasonKey: input.hasTournament ? null : 'workspace.overlay.blocked.noTournament' };
    case 'history':
      return { enabled: !!input.hasTournament, reasonKey: input.hasTournament ? null : 'workspace.overlay.blocked.noTournament' };
    case 'matchHistory':
      // Only reachable for a match that actually has something to show. This is
      // the rule behind the per-match entrypoint: no revisions, no icon.
      return { enabled: (input.overlayMatchRevisions || 0) > 0, reasonKey: 'workspace.overlay.blocked.noRevisions' };
    case 'requestAccess':
      return { enabled: input.role === 'spectator', reasonKey: 'workspace.overlay.blocked.alreadyScoring' };
    case 'scorers':
      return { enabled: input.role === 'owner', reasonKey: 'workspace.overlay.blocked.ownerOnly' };
    case 'share':
      return { enabled: !!input.sessionId, reasonKey: 'workspace.overlay.blocked.noSession' };
    case 'modeFork':
      return {
        enabled: !!input.couplesGenerated && !input.hasTournament && !input.hasKingGame,
        reasonKey: 'workspace.overlay.blocked.modeChosen',
      };
    default:
      return { enabled: false, reasonKey: null };
  }
}

function workspaceOverlay(input) {
  var requested = input.currentOverlay;
  if (!requested || WORKSPACE_OVERLAYS.indexOf(requested) === -1) {
    return { overlay: null, overlayBlockedReasonKey: null };
  }
  var allowed = workspaceOverlayAllowed(requested, input);
  return {
    overlay: allowed.enabled ? requested : null,
    overlayBlockedReasonKey: allowed.enabled ? null : allowed.reasonKey,
  };
}

/** REQ-UX-11 readiness checklist. `enoughPlayers`/`teamsGenerated`/
 * `groupFeasible`/`formatValid` are blocking; `noUnmatched` and
 * `firebaseConnected` are warning-only (non-blocking). Feasibility/format
 * checks defer to `true` before teams exist — nothing to validate yet. */
function workspaceReadiness(input) {
  var items = [];
  var needed = Math.max(0, 2 * input.teamSize - input.playerCount);
  items.push({ key: 'enoughPlayers', ok: needed === 0, blocking: true, params: { needed: needed } });
  items.push({ key: 'teamsGenerated', ok: !!input.couplesGenerated, blocking: true, params: {} });
  items.push({ key: 'noUnmatched', ok: (input.unmatchedCount || 0) === 0, blocking: false, params: { count: input.unmatchedCount || 0 } });
  var groupFeasible = !input.couplesGenerated || input.groupCount <= 1 ||
    Math.floor(input.teamCount / input.groupCount) >= 2;
  items.push({ key: 'groupFeasible', ok: groupFeasible, blocking: true, params: { groupCount: input.groupCount } });
  var formatValid = !input.formatValidation || input.formatValidation.valid !== false;
  items.push({ key: 'formatValid', ok: formatValid, blocking: true, params: {} });
  if (input.firebaseAvailable) {
    // input.firebaseConnected reflects the real per-session connectivity
    // once a Firebase session exists; omitted/undefined means "no signal
    // yet" (no session subscribed) and defaults to ok — REQ-UX-11/80's
    // offline warning cell becomes reachable once a session reports it.
    items.push({ key: 'firebaseConnected', ok: input.firebaseConnected !== false, blocking: false, params: {} });
  }
  return items;
}

/** First not-ok blocking item, or null when every blocking item is ok. */
function workspaceFirstBlocker(readiness) {
  for (var i = 0; i < readiness.length; i++) {
    if (readiness[i].blocking && !readiness[i].ok) return readiness[i];
  }
  return null;
}

/** Default-view derivation table (design "Default-view / primary-action").
 * `hasTournament`/`hasKingGame` is checked BEFORE `couplesGenerated` — fixed:
 * after a page reload restoring a running LOCAL tournament/king game,
 * `couplesGenerated` (a separate, non-persisted orchestrator flag) is
 * still false, which previously forced 'setup' even though a tournament was
 * already active, contradicting REQ-UX-05's "tournament or king in progress
 * → Tournament" row. A tournament/king existing already implies teams were
 * generated, so it takes precedence over the couplesGenerated-based
 * Setup/Teams split below it. */
function workspaceDefaultView(input) {
  if (input.sessionState === 'notFound') return 'tournament';
  if (input.role !== 'owner') return input.complete ? 'results' : 'tournament';
  if (input.hasTournament || input.hasKingGame) return input.complete ? 'results' : 'tournament';
  if (!input.couplesGenerated) return 'setup';
  return 'teams';
}

/** Whether a destination is reachable for the given input, plus its
 * lock reason key when it is not (invariant 7 — every locked item carries
 * a non-null lockReasonKey). Teams/Tournament are reachable once
 * `couplesGenerated` OR a tournament/king game already exists — fixed: same
 * post-reload desync as workspaceDefaultView() above previously left the
 * Tournament nav item locked (and Teams unreachable) even while a real
 * tournament/king game was active, because `couplesGenerated` alone gated
 * both. */
function workspaceViewEnabled(id, input) {
  if (id === 'setup') return { enabled: true, lockReasonKey: null };
  var teamsOrTournamentExist = !!(input.couplesGenerated || input.hasTournament || input.hasKingGame);
  if (id === 'teams') {
    return teamsOrTournamentExist
      ? { enabled: true, lockReasonKey: null }
      : { enabled: false, lockReasonKey: 'workspace.nav.locked.generateTeamsFirst' };
  }
  if (id === 'tournament') {
    return teamsOrTournamentExist
      ? { enabled: true, lockReasonKey: null }
      : { enabled: false, lockReasonKey: 'workspace.nav.locked.generateTeamsFirst' };
  }
  // results (invariant 8 — enabled as soon as a tournament or king game exists)
  return (input.hasTournament || input.hasKingGame)
    ? { enabled: true, lockReasonKey: null }
    : { enabled: false, lockReasonKey: 'workspace.nav.locked.startFirst' };
}

/** Nav item status: locked > current > attention (owner, pending requests on
 * Tournament) > done (any other reachable item — reachable-but-inactive
 * destinations read as already unlocked in a stepper-style nav). */
function workspaceNavStatus(id, input, resolvedView, enabled) {
  if (!enabled) return 'locked';
  if (id === resolvedView) return 'current';
  if (id === 'tournament' && input.role === 'owner' && (input.pendingRequestCount || 0) > 0) return 'attention';
  return 'done';
}

function workspaceBadge(id, input) {
  if (id === 'tournament' && input.role === 'owner' && (input.pendingRequestCount || 0) > 0) {
    return input.pendingRequestCount;
  }
  return null;
}

function workspaceNavItems(input, resolvedView) {
  if (input.sessionState === 'notFound') {
    return [{ id: 'tournament', labelKey: 'workspace.nav.tournament', status: 'current', badge: null, enabled: true, lockReasonKey: null }];
  }
  var ids = input.role === 'owner' ? WORKSPACE_VIEWS : ['tournament', 'results'];
  return ids.map(function (id) {
    var reach = workspaceViewEnabled(id, input);
    return {
      id: id,
      labelKey: 'workspace.nav.' + id,
      status: workspaceNavStatus(id, input, resolvedView, reach.enabled),
      badge: workspaceBadge(id, input),
      enabled: reach.enabled,
      lockReasonKey: reach.lockReasonKey,
    };
  });
}

/** Contextual primary action (invariant 5 — at most one; null is legal). */
function workspacePrimaryAction(input, readiness) {
  if (input.sessionState === 'notFound') return null;

  if (input.role === 'scorer') {
    return { id: 'scoreNext', labelKey: 'workspace.action.scoreNext', targetView: 'tournament',
      enabled: !!input.hasNextMatch, blockedReasonKey: input.hasNextMatch ? null : 'workspace.action.blocked.noNextMatch' };
  }
  if (input.role === 'spectator') {
    return { id: 'requestAccess', labelKey: 'workspace.action.requestAccess', targetView: 'tournament', enabled: true, blockedReasonKey: null };
  }

  var enoughPlayers = readiness[0].ok;
  if (!enoughPlayers) {
    return { id: 'addPlayers', labelKey: 'workspace.action.addPlayers', targetView: 'setup', enabled: false, blockedReasonKey: 'workspace.readiness.enoughPlayers' };
  }
  if (!input.couplesGenerated) {
    return { id: 'generateTeams', labelKey: 'workspace.action.generateTeams', targetView: 'setup', enabled: true, blockedReasonKey: null };
  }
  if (!input.hasTournament && !input.hasKingGame) {
    var blocker = workspaceFirstBlocker(readiness);
    return { id: 'startTournament', labelKey: 'workspace.action.startTournament', targetView: 'teams',
      enabled: !blocker, blockedReasonKey: blocker ? 'workspace.readiness.' + blocker.key : null };
  }
  if (!input.complete) {
    return { id: 'scoreNext', labelKey: 'workspace.action.scoreNext', targetView: 'tournament',
      enabled: !!input.hasNextMatch, blockedReasonKey: input.hasNextMatch ? null : 'workspace.action.blocked.noNextMatch' };
  }
  return { id: 'shareResults', labelKey: 'workspace.action.shareResults', targetView: 'results', enabled: true, blockedReasonKey: null };
}

/**
 * Pure workspace view machine: resolves the active destination, the
 * role-scoped nav, the single contextual primary action and the readiness
 * checklist from application state.
 *
 * @param {object} input - see design "Module Design > workspace view machine > Input"
 * @returns {object} WorkspaceView
 */
function computeWorkspace(input) {
  input = input || {};
  var readiness = workspaceReadiness(input);
  var defaultView = workspaceDefaultView(input);

  // Invariant 1: an absent/locked currentView falls back to defaultView.
  var view = defaultView;
  if (input.currentView && WORKSPACE_VIEWS.indexOf(input.currentView) !== -1) {
    var reach = workspaceViewEnabled(input.currentView, input);
    var visibleForRole = input.sessionState === 'notFound'
      ? input.currentView === 'tournament'
      : (input.role === 'owner' || input.currentView === 'tournament' || input.currentView === 'results');
    if (reach.enabled && visibleForRole) view = input.currentView;
  }

  var sub = workspaceSubView(input, view);
  var overlay = workspaceOverlay(input);

  return {
    view: view,
    defaultView: defaultView,
    navItems: workspaceNavItems(input, view),
    primaryAction: workspacePrimaryAction(input, readiness),
    readiness: readiness,
    formatLocked: !!input.hasTournament,
    subView: sub.subView,
    subViewItems: sub.subViewItems,
    overlay: overlay.overlay,
    overlayBlockedReasonKey: overlay.overlayBlockedReasonKey,
  };
}
