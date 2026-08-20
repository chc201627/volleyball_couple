/**
 * Tournament Format Module — configurable presets, validation, stage/knockout
 * match generation, deterministic slot resolution, and per-match set rules.
 * Pure, no DOM. Depends on generateMatches() from tournament.js.
 *
 * A Format is `null` for classic tournaments (D1). Knockout pairs are
 * authored as slot-descriptor tokens (`slot:A1`, `winner:k-qf-1`) copied
 * verbatim onto generated match team1Id/team2Id by generateStageMatches()
 * and resolved by resolveFormat(); the persisted format node never stores
 * `pairs` — the matches themselves are the single source of truth (D3).
 *
 * Exposed: classicFormat, presetFormat, validateFormat, generateStageMatches,
 * resolveFormat, rulesForMatch, matchOutcome.
 */

var STAGE_ID_PATTERN = /^[a-z][a-z0-9]{0,11}$/;
var SLOT_TOKEN_PATTERN = /^slot:([A-Z])(\d+)$/;
var WINNER_TOKEN_PATTERN = /^winner:k-([a-z][a-z0-9]{0,11})-(\d+)$/;

/** Classic tournaments carry no format at all (D1). */
function classicFormat() {
  return null;
}

/** Build a runtime Format for a preset. Throws 'tournament.format.error.presetUnavailable'
 * for an unknown preset, or when `crossover`'s shape (exactly 2 groups, each with at least
 * 4 teams) is not met. Groups may be uneven (e.g. 5+4); only ranks 1-4 of each group feed
 * the knockout stage — any 5th+ place team is eliminated in the group stage. */
function presetFormat(presetId, groups) {
  groups = groups || [];

  if (presetId === 'classic') return classicFormat();

  if (presetId === 'groupsTo') {
    return {
      version: 1, preset: 'groupsTo',
      stagesById: { group: { id: 'group', kind: 'roundRobin', order: 1, pointsTo: 21, overtime: false } },
    };
  }

  if (presetId === 'groupsFinal') {
    var finalPair = groups.length >= 2 ? ['slot:A1', 'slot:B1'] : ['slot:A1', 'slot:A2'];
    return {
      version: 1, preset: 'groupsFinal',
      stagesById: {
        group: { id: 'group', kind: 'roundRobin', order: 1, pointsTo: 21, overtime: false },
        final: { id: 'final', kind: 'knockout', order: 2, pointsTo: 15, overtime: false, pairs: [finalPair] },
      },
    };
  }

  if (presetId === 'crossover') {
    var isTwoGroupsOfAtLeastFour = groups.length === 2 && groups.every(function (g) { return g.teams.length >= 4; });
    if (!isTwoGroupsOfAtLeastFour) throw new Error('tournament.format.error.presetUnavailable');
    return {
      version: 1, preset: 'crossover',
      stagesById: {
        group: { id: 'group', kind: 'roundRobin', order: 1, pointsTo: 11, overtime: false },
        qf: {
          id: 'qf', kind: 'knockout', order: 2, pointsTo: 15, overtime: false,
          pairs: [['slot:A1', 'slot:B4'], ['slot:B1', 'slot:A4'], ['slot:A2', 'slot:B3'], ['slot:B2', 'slot:A3']],
        },
        sf: {
          id: 'sf', kind: 'knockout', order: 3, pointsTo: 15, overtime: false,
          pairs: [['winner:k-qf-1', 'winner:k-qf-3'], ['winner:k-qf-2', 'winner:k-qf-4']],
        },
        final: { id: 'final', kind: 'knockout', order: 4, pointsTo: 20, overtime: false, pairs: [['winner:k-sf-1', 'winner:k-sf-2']] },
      },
    };
  }

  throw new Error('tournament.format.error.presetUnavailable');
}

function orderedStages(format) {
  var stagesById = (format && format.stagesById) || {};
  return Object.keys(stagesById).map(function (id) { return stagesById[id]; })
    .sort(function (a, b) { return a.order - b.order; });
}

function isDescriptorToken(token) {
  return typeof token === 'string' && (token.indexOf('slot:') === 0 || token.indexOf('winner:') === 0);
}

/** A token is valid when it parses and (for `slot:`) references an in-range group rank,
 * or (for `winner:`) a strictly-earlier stage's existing match ordinal. */
function isValidToken(token, stage, stagesById, groups) {
  if (typeof token !== 'string') return false;

  var slotMatch = SLOT_TOKEN_PATTERN.exec(token);
  if (slotMatch) {
    var group = groups.filter(function (g) { return g.id === slotMatch[1]; })[0];
    return !!group && Number(slotMatch[2]) >= 1 && Number(slotMatch[2]) <= group.teams.length;
  }

  var winnerMatch = WINNER_TOKEN_PATTERN.exec(token);
  if (winnerMatch) {
    var srcStage = stagesById[winnerMatch[1]];
    if (!srcStage || srcStage.order >= stage.order) return false;
    var ordinal = Number(winnerMatch[2]);
    return ordinal >= 1 && ordinal <= (Array.isArray(srcStage.pairs) ? srcStage.pairs.length : 0);
  }

  return false;
}

/** Validate a Format against its groups; errors are i18n keys (REQ-FMT-03).
 * @returns {{ valid: boolean, errors: string[] }} */
function validateFormat(format, groups) {
  groups = groups || [];
  var errors = [];

  if (!format || typeof format !== 'object') return { valid: false, errors: ['tournament.format.error.missing'] };
  if (format.version !== 1) errors.push('tournament.format.error.version');

  var stagesById = format.stagesById || {};
  var ids = Object.keys(stagesById);
  var groupIds = groups.map(function (g) { return g.id; });

  if (ids.length < 1 || ids.length > 8) errors.push('tournament.format.error.stageCount');

  var roundRobinStages = [];
  ids.forEach(function (id) {
    var stage = stagesById[id] || {};
    if (!STAGE_ID_PATTERN.test(id) || stage.id !== id) errors.push('tournament.format.error.stageId');
    if (groupIds.indexOf(id.toUpperCase()) !== -1) errors.push('tournament.format.error.stageIdCollidesWithGroup');
    if (!Number.isInteger(stage.pointsTo) || stage.pointsTo < 1 || stage.pointsTo > 99) errors.push('tournament.format.error.pointsTo');
    if (typeof stage.overtime !== 'boolean') errors.push('tournament.format.error.overtime');
    if (stage.kind === 'roundRobin') roundRobinStages.push(stage);
  });

  if (roundRobinStages.length !== 1) errors.push('tournament.format.error.roundRobinStage');
  else if (roundRobinStages[0].order !== 1) errors.push('tournament.format.error.roundRobinOrder');

  ids.forEach(function (id) {
    var stage = stagesById[id];
    if (!stage || stage.kind !== 'knockout') return;
    var pairs = stage.pairs;
    if (!Array.isArray(pairs) || pairs.length < 1 || pairs.length > 8) {
      errors.push('tournament.format.error.knockoutPairs');
      return;
    }
    var seenTokens = {};
    pairs.forEach(function (pair) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) {
        errors.push('tournament.format.error.knockoutPairs');
        return;
      }
      pair.forEach(function (token) {
        if (seenTokens[token]) errors.push('tournament.format.error.knockoutTokenDuplicate');
        seenTokens[token] = true;
        if (!isValidToken(token, stage, stagesById, groups)) errors.push('tournament.format.error.knockoutToken');
      });
    });
  });

  if (format.customRules != null && (typeof format.customRules !== 'string' || format.customRules.trim().length > 500)) {
    errors.push('tournament.format.error.customRules');
  }

  return { valid: errors.length === 0, errors: errors };
}

/** Round-robin matches (delegated to generateMatches(), tagged with the round-robin stage id)
 * followed by pre-created knockout matches carrying slot-descriptor team ids. A null format
 * delegates to generateMatches() unchanged (classic path). */
function generateStageMatches(format, groups) {
  if (!format) return generateMatches(groups);

  var stages = orderedStages(format);
  var roundRobinStage = stages.filter(function (s) { return s.kind === 'roundRobin'; })[0];
  var matches = generateMatches(groups).map(function (m) {
    return Object.assign({}, m, { stageId: roundRobinStage ? roundRobinStage.id : 'group' });
  });

  stages.forEach(function (stage) {
    if (stage.kind !== 'knockout') return;
    (stage.pairs || []).forEach(function (pair, i) {
      matches.push({
        id: 'k-' + stage.id + '-' + (i + 1), groupId: stage.id, stageId: stage.id,
        team1Id: pair[0], team2Id: pair[1], round: 1, order: matches.length + 1,
        score1: null, score2: null, played: false, status: 'pending',
        revision: 0, updatedBy: null, updatedAt: null,
      });
    });
  });

  return matches;
}

/**
 * Deterministic single forward pass over stages sorted by `order` (D5/D6): a `slot:X` token
 * resolves once the whole round-robin stage completes; a `winner:X` token resolves as soon as
 * that match is played. ctx = { groups, matches, standings (Map from calculateStandings) }.
 */
function resolveFormat(format, ctx) {
  ctx = ctx || {};
  var groups = ctx.groups || [];
  var matches = ctx.matches || [];
  var standings = ctx.standings || new Map();

  if (!format) return { complete: true, bySlot: {}, stages: [] };

  var matchesById = {};
  var matchesByStage = {};
  matches.forEach(function (m) {
    matchesById[m.id] = m;
    var key = m.stageId || 'group';
    (matchesByStage[key] = matchesByStage[key] || []).push(m);
  });

  var stages = orderedStages(format);
  var roundRobinStage = stages.filter(function (s) { return s.kind === 'roundRobin'; })[0];
  var bySlot = {};

  if (roundRobinStage) {
    var rrMatches = matchesByStage[roundRobinStage.id] || [];
    if (rrMatches.length > 0 && rrMatches.every(function (m) { return m.played; })) {
      groups.forEach(function (group) {
        (standings.get(group.id) || []).forEach(function (row, idx) {
          bySlot['slot:' + group.id + (idx + 1)] = row.teamId;
        });
      });
    }
  }

  var resolvedTeams = {}; // matchId -> { team1Id, team2Id } once resolved this pass
  function resolveToken(token) {
    if (typeof token !== 'string') return null;
    if (token.indexOf('slot:') === 0) return Object.prototype.hasOwnProperty.call(bySlot, token) ? bySlot[token] : null;
    if (token.indexOf('winner:') === 0) {
      var srcId = token.slice('winner:'.length);
      var src = matchesById[srcId];
      var srcResolved = resolvedTeams[srcId];
      if (!src || !src.played || !srcResolved || src.score1 == null || src.score2 == null) return null;
      return src.score1 > src.score2 ? srcResolved.team1Id : srcResolved.team2Id;
    }
    return token; // literal team id (round-robin matches never carry descriptors)
  }

  var outStages = [];
  var overallComplete = true;

  stages.forEach(function (stage) {
    var stageMatches = matchesByStage[stage.id] || [];
    var invalid = false;

    var outMatches = stageMatches.map(function (m) {
      if (isDescriptorToken(m.team1Id) && !isValidToken(m.team1Id, stage, format.stagesById, groups)) invalid = true;
      if (isDescriptorToken(m.team2Id) && !isValidToken(m.team2Id, stage, format.stagesById, groups)) invalid = true;

      var team1 = resolveToken(m.team1Id);
      var team2 = resolveToken(m.team2Id);
      var resolved = team1 != null && team2 != null;
      if (resolved) resolvedTeams[m.id] = { team1Id: team1, team2Id: team2 };

      return {
        matchId: m.id, team1Id: resolved ? team1 : null, team2Id: resolved ? team2 : null,
        team1Slot: m.team1Id, team2Slot: m.team2Id, resolved: resolved, scorable: resolved && !m.played,
      };
    });

    var playedCount = stageMatches.filter(function (m) { return m.played; }).length;
    var status;
    if (invalid) status = 'invalid';
    else if (stageMatches.length === 0) status = 'pending';
    else if (playedCount === stageMatches.length) status = 'complete';
    else if (outMatches.some(function (m) { return m.resolved; })) status = 'active';
    else status = 'pending';
    if (status !== 'complete') overallComplete = false;

    // Hardening: an `invalid` stage (a stray/tampered slot token that validateFormat
    // did not catch, e.g. a direct Firebase write bypassing client validation) must
    // never expose a scorable match, even if that individual match's own tokens
    // happened to resolve — a stage-wide failure fails the whole stage closed.
    if (status === 'invalid') {
      outMatches = outMatches.map(function (m) { return Object.assign({}, m, { scorable: false }); });
    }

    outStages.push({
      id: stage.id, kind: stage.kind, order: stage.order, label: 'tournament.format.stage.' + stage.id,
      pointsTo: stage.pointsTo, overtime: !!stage.overtime, status: status, matches: outMatches,
    });
  });

  return { complete: overallComplete, bySlot: bySlot, stages: outStages };
}

/** Set Rules for a match; falls back to unrestricted free-entry scoring
 * ({ pointsTo: null, overtime: false, stageId: 'group', stageKind: 'roundRobin',
 * labelKey: 'tournament.format.stage.group' }) when `format` is null (classic) or the
 * matchId is an unrecognized knockout id (defensive fail-open, not blocking scoring). */
function rulesForMatch(format, matchId) {
  var fallback = {
    pointsTo: null, overtime: false, stageId: 'group',
    stageKind: 'roundRobin', labelKey: 'tournament.format.stage.group',
  };
  if (!format || typeof matchId !== 'string') return fallback;

  var stagesById = format.stagesById || {};

  if (matchId.indexOf('k-') === 0) {
    var rest = matchId.slice(2);
    var lastDash = rest.lastIndexOf('-');
    var stageId = lastDash === -1 ? rest : rest.slice(0, lastDash);
    var stage = stagesById[stageId];
    if (!stage || stage.kind !== 'knockout') return fallback;
    return {
      pointsTo: stage.pointsTo, overtime: !!stage.overtime, stageId: stage.id,
      stageKind: stage.kind, labelKey: 'tournament.format.stage.' + stage.id,
    };
  }

  var roundRobinStage = null;
  Object.keys(stagesById).forEach(function (id) {
    if (stagesById[id].kind === 'roundRobin') roundRobinStage = stagesById[id];
  });
  if (!roundRobinStage) return fallback;
  return {
    pointsTo: roundRobinStage.pointsTo, overtime: !!roundRobinStage.overtime, stageId: roundRobinStage.id,
    stageKind: roundRobinStage.kind, labelKey: 'tournament.format.stage.' + roundRobinStage.id,
  };
}

/** Evaluate a candidate score against a match's Set Rules (REQ-FMT-20); `rules.pointsTo == null`
 * means unrestricted (classic) scoring.
 * @returns {{ finished: boolean, capped: boolean, invalid: boolean }} */
function matchOutcome(rules, score1, score2) {
  var pointsTo = rules && rules.pointsTo;
  if (pointsTo == null) return { finished: false, capped: false, invalid: false };
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
    return { finished: false, capped: false, invalid: true };
  }

  var max = Math.max(score1, score2);
  var min = Math.min(score1, score2);

  if (rules.overtime) return { finished: max >= pointsTo && (max - min) >= 2, capped: false, invalid: false };
  return { finished: max === pointsTo && min < pointsTo, capped: max >= pointsTo, invalid: false };
}
