/**
 * Tournament Module
 * Beach Volleyball Tournament Management
 *
 * Standalone pure-function module (no DOM access, no side effects).
 * Depends on: nothing (framework-agnostic, globally scoped).
 *
 * Exposed functions:
 *   createTeams(couplesResult)
 *   createGroups(teams)
 *   generateMatches(groups)
 *   calculateStandings(groups, matches)
 *   recordMatchScore(matches, matchId, score1, score2)
 *   isTournamentComplete(matches)
 */

/**
 * Convert a generateCouples() result into an array of Team objects.
 * Unmatched player is ignored (teams require exactly 2 players).
 *
 * @param {{ couples: Array<{player1, player2, type}>, unmatched: object|null }} couplesResult
 * @returns {Array<{ id: string, player1: object, player2: object, type: string, name: string }>}
 */
function createTeams(couplesResult) {
  const couples = (couplesResult && couplesResult.couples) ? couplesResult.couples : [];
  return couples.map(function (couple, index) {
    return {
      id: 't' + index,
      player1: couple.player1,
      player2: couple.player2,
      type: couple.type,
      name: couple.player1.name + ' & ' + couple.player2.name,
    };
  });
}

/**
 * Distribute teams into balanced groups.
 * When numGroups is provided (1–4), it is used directly (capped so no group
 * ends up with fewer than 2 teams). When omitted, auto-calculates targeting
 * ~4 teams per group.
 * Extra teams are distributed to the first groups (one extra each).
 *
 * @param {Array<{ id: string, player1, player2, type, name }>} teams
 * @param {number} [numGroups] - Desired number of groups (1–4). Optional.
 * @returns {Array<{ id: string, teams: Array }>}
 */
function createGroups(teams, numGroups) {
  var n = teams.length;
  if (n < 2) {
    return n === 0 ? [] : [{ id: 'A', teams: teams.slice() }];
  }

  var g;
  if (numGroups && numGroups >= 1) {
    // Clamp to [1, 4] and ensure every group has at least 2 teams
    g = Math.min(4, Math.max(1, Math.floor(numGroups)));
    while (g > 1 && Math.floor(n / g) < 2) {
      g--;
    }
  } else {
    // Auto: target ~4 teams per group, never fewer than 2 per group
    g = Math.max(1, Math.round(n / 4));
    while (g > 1 && Math.floor(n / g) < 2) {
      g--;
    }
  }

  var base = Math.floor(n / g);
  var extras = n % g; // first `extras` groups get base+1 teams

  var groups = [];
  var idx = 0;
  for (var i = 0; i < g; i++) {
    var size = base + (i < extras ? 1 : 0);
    groups.push({
      id: String.fromCharCode(65 + i), // 'A', 'B', 'C', 'D'
      teams: teams.slice(idx, idx + size),
    });
    idx += size;
  }
  return groups;
}

/**
 * Generate a complete round-robin match schedule for all groups.
 * Uses the circle method (polygon algorithm).
 * Each team in a group plays every other team exactly once.
 *
 * @param {Array<{ id: string, teams: Array }>} groups
 * @returns {Array<{
 *   id: string,
 *   groupId: string,
 *   team1Id: string,
 *   team2Id: string,
 *   score1: null,
 *   score2: null,
 *   played: boolean
 * }>}
 */
function generateMatches(groups) {
  var matches = [];

  groups.forEach(function (group) {
    var teams = group.teams.slice(); // copy to avoid mutating
    var n = teams.length;

    // If odd number of teams, add a phantom "bye" slot
    var hasBye = false;
    if (n % 2 !== 0) {
      teams.push({ id: 'bye' });
      n++;
      hasBye = true;
    }

    // Circle method: fix teams[0], rotate teams[1..n-1]
    for (var round = 0; round < n - 1; round++) {
      for (var k = 0; k < n / 2; k++) {
        var t1 = teams[k];
        var t2 = teams[n - 1 - k];

        // Skip matches involving the phantom bye slot
        if (t1.id === 'bye' || t2.id === 'bye') continue;

        var matchId = group.id + '-' + t1.id + '-' + t2.id;
        matches.push({
          id: matchId,
          groupId: group.id,
          team1Id: t1.id,
          team2Id: t2.id,
          score1: null,
          score2: null,
          played: false,
        });
      }

      // Rotate teams[1..n-1] one position to the right
      var last = teams[n - 1];
      for (var j = n - 1; j > 1; j--) {
        teams[j] = teams[j - 1];
      }
      teams[1] = last;
    }
  });

  return matches;
}

/**
 * Calculate current standings for all groups from match results.
 * Win = 3 points, Loss = 0 points, no draws.
 * Tiebreaker: set differential (setsFor - setsAgainst) DESC, then setsFor DESC.
 *
 * @param {Array<{ id: string, teams: Array }>} groups
 * @param {Array<{ id, groupId, team1Id, team2Id, score1, score2, played }>} matches
 * @returns {Map<string, Array<{
 *   teamId: string,
 *   played: number,
 *   won: number,
 *   lost: number,
 *   points: number,
 *   setsFor: number,
 *   setsAgainst: number
 * }>>}
 */
function calculateStandings(groups, matches) {
  var result = new Map();

  groups.forEach(function (group) {
    // Initialize standings for each team in this group
    var standingsMap = {};
    group.teams.forEach(function (team) {
      standingsMap[team.id] = {
        teamId: team.id,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        setsFor: 0,
        setsAgainst: 0,
      };
    });

    // Process all played matches in this group
    matches.forEach(function (match) {
      if (match.groupId !== group.id || !match.played) return;

      var s1 = standingsMap[match.team1Id];
      var s2 = standingsMap[match.team2Id];
      if (!s1 || !s2) return;

      s1.played++;
      s2.played++;
      s1.setsFor += match.score1;
      s1.setsAgainst += match.score2;
      s2.setsFor += match.score2;
      s2.setsAgainst += match.score1;

      if (match.score1 > match.score2) {
        s1.won++;
        s1.points += 3;
        s2.lost++;
      } else {
        s2.won++;
        s2.points += 3;
        s1.lost++;
      }
    });

    // Sort: points DESC → set differential DESC → setsFor DESC
    var sorted = Object.values(standingsMap).sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      var diffA = a.setsFor - a.setsAgainst;
      var diffB = b.setsFor - b.setsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.setsFor - a.setsFor;
    });

    result.set(group.id, sorted);
  });

  return result;
}

/**
 * Record a match score, returning a NEW matches array (immutable update).
 * Validates that scores are non-negative integers and not equal (no draws).
 *
 * @param {Array} matches - Current matches array (not mutated)
 * @param {string} matchId - ID of the match to update
 * @param {number|string} score1 - Score for team 1
 * @param {number|string} score2 - Score for team 2
 * @returns {Array} New matches array with the updated match
 * @throws {Error} If validation fails (message is an i18n key)
 */
function recordMatchScore(matches, matchId, score1, score2) {
  // Validate inputs
  if (score1 === '' || score1 === null || score1 === undefined ||
      score2 === '' || score2 === null || score2 === undefined) {
    throw new Error('tournament.error.scoreEmpty');
  }

  var s1 = Number(score1);
  var s2 = Number(score2);

  if (!Number.isInteger(s1) || !Number.isInteger(s2)) {
    throw new Error('tournament.error.scoreNotInt');
  }

  if (s1 < 0 || s2 < 0) {
    throw new Error('tournament.error.scoreNegative');
  }

  if (s1 === s2) {
    throw new Error('tournament.error.scoreDraw');
  }

  // Return new array with the target match updated (original unchanged)
  return matches.map(function (match) {
    if (match.id !== matchId) return match;
    return Object.assign({}, match, {
      score1: s1,
      score2: s2,
      played: true,
    });
  });
}

/**
 * Check if all matches in the tournament have been played.
 *
 * @param {Array<{ played: boolean }>} matches
 * @returns {boolean}
 */
function isTournamentComplete(matches) {
  if (!matches || matches.length === 0) return true;
  return matches.every(function (m) { return m.played; });
}
