/**
 * Tournament Day Module — pure, DOM-free selectors for the Tournament command
 * center and Results/completion screen (REQ-UX-31/32/33/50/52).
 *
 * Standalone pure-function module (no DOM access, no side effects, no i18n).
 * Depends on: tournament.js (isTournamentComplete), tournament-format.js
 * (rulesForMatch). Both load earlier in the contractual script order.
 *
 * Exposed functions:
 *   tournamentDay(input)
 *   formatTournamentSummary(view, labels)
 *   TOURNAMENT_DAY_COLLAPSE_AFTER
 */

/* exported tournamentDay, formatTournamentSummary, TOURNAMENT_DAY_COLLAPSE_AFTER */

/** Sections longer than this collapse behind "Show all (N)" (REQ-UX-32, D12).
 * The module always returns full arrays plus counts — collapsing is a
 * rendering concern owned by app.js. */
var TOURNAMENT_DAY_COLLAPSE_AFTER = 5;

/** A stage's sort weight: the format's stage `order`, or 1 when there is no
 * format (classic sessions have a single implicit stage). */
function tournamentDayStageOrder(format, stageId) {
  if (!format || !format.stagesById || !stageId) return 1;
  var stage = format.stagesById[stageId];
  return stage ? stage.order : 1;
}

/** Matches the fallback already used throughout app.js: prefer the explicit
 * `status` field, else derive it from `played`. */
function tournamentDayMatchStatus(match) {
  return match.status || (match.played ? 'finished' : 'pending');
}

/** Finds a match's projected entry in a resolveFormat() result (any stage). */
function tournamentDayProjectedMatch(resolution, matchId) {
  if (!resolution || !Array.isArray(resolution.stages)) return null;
  for (var i = 0; i < resolution.stages.length; i++) {
    var stageMatches = resolution.stages[i].matches || [];
    for (var j = 0; j < stageMatches.length; j++) {
      if (stageMatches[j].matchId === matchId) return stageMatches[j];
    }
  }
  return null;
}

/** Builds one MatchView from a raw match, enriched with Set Rules
 * (rulesForMatch) and, for formatted sessions, the resolveFormat() projection
 * (resolved team ids, slot tokens, scorability). Classic matches always
 * carry real team ids, so they are resolved/scorable by construction. */
function tournamentDayBuildMatchView(match, format, resolution) {
  var stageId = match.stageId || match.groupId;
  var rules = rulesForMatch(format, match.id);

  var resolved = true;
  var scorable = !match.played;
  var team1Id = match.team1Id;
  var team2Id = match.team2Id;
  var team1Slot = match.team1Id;
  var team2Slot = match.team2Id;

  if (format) {
    var projected = tournamentDayProjectedMatch(resolution, match.id);
    if (projected) {
      resolved = projected.resolved;
      scorable = projected.scorable;
      team1Id = projected.team1Id;
      team2Id = projected.team2Id;
      team1Slot = projected.team1Slot;
      team2Slot = projected.team2Slot;
    } else {
      resolved = false;
      scorable = false;
      team1Id = null;
      team2Id = null;
    }
  }

  return {
    matchId: match.id,
    groupId: match.groupId,
    stageId: stageId,
    stageKind: rules.stageKind,
    order: match.order,
    status: tournamentDayMatchStatus(match),
    score1: match.score1,
    score2: match.score2,
    played: !!match.played,
    revision: Number.isInteger(match.revision) ? match.revision : 0,
    updatedAt: match.updatedAt == null ? null : match.updatedAt,
    team1Id: team1Id,
    team2Id: team2Id,
    team1Slot: team1Slot,
    team2Slot: team2Slot,
    resolved: resolved,
    scorable: scorable,
    rules: { pointsTo: rules.pointsTo, overtime: rules.overtime },
  };
}

/** Deterministic (stageOrder, order, matchId) comparator used for live/pending
 * lists and next-match selection (REQ-UX-31/32). */
function tournamentDayCompareMatches(format) {
  return function (a, b) {
    var oa = tournamentDayStageOrder(format, a.stageId);
    var ob = tournamentDayStageOrder(format, b.stageId);
    if (oa !== ob) return oa - ob;
    if (a.order !== b.order) return a.order - b.order;
    if (a.matchId === b.matchId) return 0;
    return a.matchId < b.matchId ? -1 : 1;
  };
}

/** Recently-finished ordering: `updatedAt` desc (local saves leave it `null`,
 * sorted last) → `revision` desc → `order` desc (REQ-UX-32). */
function tournamentDayCompareRecentlyFinished(a, b) {
  var au = a.updatedAt == null ? -Infinity : a.updatedAt;
  var bu = b.updatedAt == null ? -Infinity : b.updatedAt;
  if (au !== bu) return bu - au;
  if (a.revision !== b.revision) return b.revision - a.revision;
  return b.order - a.order;
}

/** Read a group's standings rows from either a Map (calculateStandings'
 * native return) or a plain object keyed by group id. */
function tournamentDayStandingsRows(standings, groupId) {
  if (!standings) return [];
  if (typeof standings.get === 'function') return standings.get(groupId) || [];
  return standings[groupId] || [];
}

/** Two standings rows are truly tied when every tiebreak field used by
 * calculateStandings' sort agrees (points, set differential, setsFor and,
 * when present, the extended-tiebreak `h2hWins` scalar). */
function tournamentDayRowsTied(a, b) {
  if (!a || !b) return false;
  if (a.points !== b.points) return false;
  if ((a.setsFor - a.setsAgainst) !== (b.setsFor - b.setsAgainst)) return false;
  if (a.setsFor !== b.setsFor) return false;
  if (typeof a.h2hWins === 'number' && typeof b.h2hWins === 'number' && a.h2hWins !== b.h2hWins) return false;
  return true;
}

/** Champion resolution (REQ-UX-50): King > formatted knockout final > single
 * classic group (champion or tied lead) > multi-group classic (group
 * winners) > none. */
function tournamentDayOutcome(views, complete, format, resolution, standings, groups, king) {
  var empty = { kind: 'none', championTeamId: null, groupWinners: [], tiedTeamIds: [] };

  if (king && king.winner) {
    return { kind: 'kingChampion', championTeamId: king.winner.id, groupWinners: [], tiedTeamIds: [] };
  }

  if (format) {
    if (!complete || !resolution) return empty;
    var knockoutStages = resolution.stages.filter(function (s) { return s.kind === 'knockout'; });
    var lastKnockout = knockoutStages.length ? knockoutStages[knockoutStages.length - 1] : null;
    if (!lastKnockout) return empty;
    var playedFinalViews = lastKnockout.matches
      .map(function (pm) { return views.filter(function (v) { return v.matchId === pm.matchId; })[0]; })
      .filter(function (v) { return v && v.played; });
    if (playedFinalViews.length !== 1) return empty;
    var finalView = playedFinalViews[0];
    var championId = finalView.score1 > finalView.score2 ? finalView.team1Id : finalView.team2Id;
    return { kind: 'champion', championTeamId: championId, groupWinners: [], tiedTeamIds: [] };
  }

  if (!complete || !groups || groups.length === 0) return empty;

  if (groups.length === 1) {
    var rows = tournamentDayStandingsRows(standings, groups[0].id);
    if (rows.length === 0) return empty;
    if (rows.length === 1) return { kind: 'champion', championTeamId: rows[0].teamId, groupWinners: [], tiedTeamIds: [] };
    if (tournamentDayRowsTied(rows[0], rows[1])) {
      return { kind: 'tiedLead', championTeamId: null, groupWinners: [], tiedTeamIds: [rows[0].teamId, rows[1].teamId] };
    }
    return { kind: 'champion', championTeamId: rows[0].teamId, groupWinners: [], tiedTeamIds: [] };
  }

  var groupWinners = groups.map(function (group) {
    var groupRows = tournamentDayStandingsRows(standings, group.id);
    if (groupRows.length === 0) return null;
    var tied = groupRows.length > 1 && tournamentDayRowsTied(groupRows[0], groupRows[1]);
    return { groupId: group.id, teamId: groupRows[0].teamId, tied: tied };
  }).filter(function (w) { return w !== null; });

  if (groupWinners.length === 0) return empty;
  return { kind: 'groupWinners', championTeamId: null, groupWinners: groupWinners, tiedTeamIds: [] };
}

/**
 * Pure Tournament Day selectors: next match, live/pending/recently-finished
 * lists, stage progress and the champion/outcome projection.
 *
 * @param {{ matches?: Array, teams?: Array, groups?: Array, format?: object|null,
 *   resolution?: object|null, standings?: (Map|object), king?: object|null }} input
 * @returns {object} TournamentDayView
 */
function tournamentDay(input) {
  input = input || {};
  var format = input.format || null;
  var resolution = input.resolution || null;
  var rawMatches = input.matches || [];
  var groups = input.groups || [];
  var standings = input.standings || null;
  var king = input.king || null;

  var views = rawMatches.map(function (m) { return tournamentDayBuildMatchView(m, format, resolution); });
  var cmp = tournamentDayCompareMatches(format);

  var live = views.filter(function (v) { return v.status === 'live'; }).sort(cmp);
  var pendingAll = views.filter(function (v) { return v.status === 'pending'; }).sort(cmp);
  var finished = views.filter(function (v) { return v.status === 'finished'; });
  var recentlyFinished = finished.slice().sort(tournamentDayCompareRecentlyFinished);

  var nextMatch = null;
  var nextMatchReason;

  if (views.length === 0) {
    nextMatchReason = 'none';
  } else if (live.length > 0) {
    nextMatch = live[0];
    nextMatchReason = 'ok';
  } else {
    var scorablePending = format ? pendingAll.filter(function (v) { return v.scorable; }) : pendingAll;
    if (scorablePending.length > 0) {
      nextMatch = scorablePending[0];
      nextMatchReason = 'ok';
    } else if (pendingAll.length > 0) {
      nextMatchReason = 'awaitingStage';
    } else {
      nextMatchReason = 'allFinished';
    }
  }

  var complete = resolution ? resolution.complete : isTournamentComplete(rawMatches);

  var stageProgress;
  if (format && resolution) {
    stageProgress = resolution.stages.map(function (stage) {
      var stageViews = views.filter(function (v) { return v.stageId === stage.id; });
      var played = stageViews.filter(function (v) { return v.played; }).length;
      return { id: stage.id, kind: stage.kind, label: stage.label, played: played, total: stageViews.length, status: stage.status };
    });
  } else {
    stageProgress = groups.map(function (group) {
      var groupViews = views.filter(function (v) { return v.groupId === group.id; });
      var played = groupViews.filter(function (v) { return v.played; }).length;
      var total = groupViews.length;
      var status = total === 0 ? 'pending' : (played === total ? 'complete' : (played > 0 ? 'active' : 'pending'));
      return { id: group.id, kind: 'group', label: 'tournament.day.stageProgress.group', played: played, total: total, status: status };
    });
  }

  return {
    nextMatch: nextMatch,
    nextMatchReason: nextMatchReason,
    live: live,
    pending: pendingAll,
    recentlyFinished: recentlyFinished,
    counts: { live: live.length, pending: pendingAll.length, recentlyFinished: recentlyFinished.length },
    stageProgress: stageProgress,
    progress: { played: finished.length, total: views.length },
    complete: complete,
    outcome: tournamentDayOutcome(views, complete, format, resolution, standings, groups, king),
  };
}

/**
 * Plain-text export summary (REQ-UX-52). Pure and i18n-free (D6): the caller
 * supplies already-translated pieces via `labels`, a set of optional
 * callbacks/strings this function invokes with the raw TournamentDayView
 * data it needs to describe.
 *
 * @param {object} view - a tournamentDay() result (or a fake with the same shape)
 * @param {{ title?: string, championLine?: function, groupWinnerLine?: function,
 *   tiedLeadLine?: function, noChampionLine?: string, stageLine?: function,
 *   matchLine?: function }} labels
 * @returns {string}
 */
function formatTournamentSummary(view, labels) {
  view = view || {};
  labels = labels || {};
  var lines = [];

  if (labels.title) lines.push(labels.title);

  var outcome = view.outcome || { kind: 'none' };
  if ((outcome.kind === 'champion' || outcome.kind === 'kingChampion') && typeof labels.championLine === 'function') {
    lines.push(labels.championLine(outcome.championTeamId));
  } else if (outcome.kind === 'groupWinners' && typeof labels.groupWinnerLine === 'function') {
    (outcome.groupWinners || []).forEach(function (winner) {
      lines.push(labels.groupWinnerLine(winner.groupId, winner.teamId, winner.tied));
    });
  } else if (outcome.kind === 'tiedLead' && typeof labels.tiedLeadLine === 'function') {
    lines.push(labels.tiedLeadLine(outcome.tiedTeamIds || []));
  } else if (outcome.kind === 'none' && labels.noChampionLine) {
    lines.push(labels.noChampionLine);
  }

  if (Array.isArray(view.stageProgress) && typeof labels.stageLine === 'function') {
    view.stageProgress.forEach(function (stage) { lines.push(labels.stageLine(stage)); });
  }

  if (Array.isArray(view.recentlyFinished) && typeof labels.matchLine === 'function') {
    view.recentlyFinished.forEach(function (match) { lines.push(labels.matchLine(match)); });
  }

  return lines.join('\n');
}
