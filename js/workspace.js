/**
 * Workspace Module — pure, DOM-free view machine for the four-destination
 * organizer workspace (Setup, Teams, Tournament, Results). REQ-UX-01..07,
 * 10-13, 60-62.
 *
 * Standalone pure-function module (no DOM access, no side effects, no i18n,
 * no Date/Math.random). Loads immediately before app.js in the contractual
 * script order.
 *
 * Exposed function: computeWorkspace(input)
 */

/* exported computeWorkspace */

var WORKSPACE_VIEWS = ['setup', 'teams', 'tournament', 'results'];

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
    items.push({ key: 'firebaseConnected', ok: true, blocking: false, params: {} });
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

/** Default-view derivation table (design "Default-view / primary-action"). */
function workspaceDefaultView(input) {
  if (input.sessionState === 'notFound') return 'tournament';
  if (input.role !== 'owner') return input.complete ? 'results' : 'tournament';
  if (!input.couplesGenerated) return 'setup';
  if (!input.hasTournament && !input.hasKingGame) return 'teams';
  if (input.complete) return 'results';
  return 'tournament';
}

/** Whether a destination is reachable for the given input, plus its
 * lock reason key when it is not (invariant 7 — every locked item carries
 * a non-null lockReasonKey). */
function workspaceViewEnabled(id, input) {
  if (id === 'setup') return { enabled: true, lockReasonKey: null };
  if (id === 'teams') {
    return input.couplesGenerated
      ? { enabled: true, lockReasonKey: null }
      : { enabled: false, lockReasonKey: 'workspace.nav.locked.generateTeamsFirst' };
  }
  if (id === 'tournament') {
    return input.couplesGenerated
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
 * @param {object} input - see design "Module Design > js/workspace.js > Input"
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

  return {
    view: view,
    defaultView: defaultView,
    navItems: workspaceNavItems(input, view),
    primaryAction: workspacePrimaryAction(input, readiness),
    readiness: readiness,
    formatLocked: !!input.hasTournament,
  };
}
