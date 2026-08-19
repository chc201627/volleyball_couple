/**
 * Pairing Algorithm Module
 * Beach Volleyball Couple Matching
 *
 * Standalone, reusable module that generates couples/teams from a player list
 * using a priority-based approach:
 *   1. Mixed-gender teams first
 *   2. Same-gender teams from remaining players
 *   3. Leftover players returned as unmatched
 */

/**
 * Fisher-Yates (Knuth) shuffle — unbiased in-place array shuffle.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} The same array, shuffled in place.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- Level-Balanced Team Generation ---

const DEFAULT_LEVEL = 2;    // Players without an explicit level count as Intermediate
const EPS = 1e-9;           // Floating-point tolerance for improvement/tie comparisons
const MAX_ITERATIONS = 100; // Safety cap; the swap loop terminates on its own well before this

/**
 * Normalize a player's gender to one of the three swap-eligibility buckets.
 * @param {object} player
 * @returns {'male'|'female'|'unspecified'}
 */
function normGender(player) {
  return player.gender === 'male' || player.gender === 'female' ? player.gender : 'unspecified';
}

/**
 * Whether a value is a valid skill level. Restored state (localStorage,
 * Firebase) may carry arbitrary numbers, so membership in {1,2,3} is
 * required — a bare typeof check is not enough.
 * @param {*} level
 * @returns {boolean}
 */
function isValidLevel(level) {
  return level === 1 || level === 2 || level === 3;
}

/**
 * Get a player's skill level, defaulting unleveled players to Intermediate (2).
 * @param {object} player
 * @returns {number} 1|2|3
 */
function getPlayerLevel(player) {
  return isValidLevel(player.level) ? player.level : DEFAULT_LEVEL;
}

/**
 * Average skill level of a team's players.
 * @param {{players: Array<object>}} team
 * @returns {number}
 */
function teamLevelAverage(team) {
  const sum = team.players.reduce((acc, p) => acc + getPlayerLevel(p), 0);
  return sum / team.players.length;
}

/**
 * Variance (sum of squared deviations from the mean) of a set of team averages.
 * Lower is better balanced.
 * @param {Array<number>} averages
 * @returns {number}
 */
function levelSpreadScore(averages) {
  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
  return averages.reduce((acc, avg) => acc + (avg - mean) * (avg - mean), 0);
}

/**
 * Whether any player across all teams has an explicit level set.
 * @param {Array<{players: Array<object>}>} teams
 * @returns {boolean}
 */
function hasExplicitLevel(teams) {
  return teams.some(team => team.players.some(p => isValidLevel(p.level)));
}

/**
 * Bounded local-search pass that swaps same-gender players between teams to
 * reduce the variance of team average skill levels. No-op unless at least
 * one player has an explicit level and there are 2+ teams. Only exchanges
 * players with identical normalized gender, so gender composition (and thus
 * each team's mixed/same `type`) is provably unchanged. Mutates `teams` in
 * place (array slots only — player objects are never mutated) and returns it.
 *
 * @param {Array<{players: Array<object>, type: 'mixed'|'same'}>} teams
 * @returns {Array<{players: Array<object>, type: 'mixed'|'same'}>} the same teams array
 */
function balanceTeamsByLevel(teams) {
  if (!teams || teams.length < 2 || !hasExplicitLevel(teams)) {
    return teams;
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const averages = teams.map(teamLevelAverage);
    const before = levelSpreadScore(averages);

    const candidates = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamI = teams[i];
        const teamJ = teams[j];
        for (let a = 0; a < teamI.players.length; a++) {
          for (let b = 0; b < teamJ.players.length; b++) {
            const playerA = teamI.players[a];
            const playerB = teamJ.players[b];
            if (normGender(playerA) !== normGender(playerB)) continue;

            const levelA = getPlayerLevel(playerA);
            const levelB = getPlayerLevel(playerB);
            if (levelA === levelB) continue;

            const sizeI = teamI.players.length;
            const sizeJ = teamJ.players.length;
            const modifiedAverages = averages.slice();
            modifiedAverages[i] = averages[i] + (levelB - levelA) / sizeI;
            modifiedAverages[j] = averages[j] + (levelA - levelB) / sizeJ;

            const improvement = before - levelSpreadScore(modifiedAverages);
            if (improvement > EPS) {
              candidates.push({ i, j, a, b, improvement });
            }
          }
        }
      }
    }

    if (candidates.length === 0) break;

    const bestImprovement = candidates.reduce((max, c) => Math.max(max, c.improvement), -Infinity);
    const bestCandidates = candidates.filter(c => Math.abs(c.improvement - bestImprovement) <= EPS);
    const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

    const teamI = teams[chosen.i];
    const teamJ = teams[chosen.j];
    const tmp = teamI.players[chosen.a];
    teamI.players[chosen.a] = teamJ.players[chosen.b];
    teamJ.players[chosen.b] = tmp;
  }

  return teams;
}

/**
 * Generate teams of a specific size from a list of players.
 *
 * @param {Array<{name: string, gender: 'male'|'female'}>} playerList
 * @param {number} teamSize - Size of each team (default 2)
 * @returns {{
 *   teams: Array<{players: Array<object>, type: 'mixed'|'same'}>,
 *   unmatched: Array<object>
 * }}
 */
function generateTeams(playerList, teamSize) {
  teamSize = teamSize || 2;
  // Step 1: Separate players by gender
  const males = playerList.filter(p => p.gender === 'male');
  const females = playerList.filter(p => p.gender === 'female');
  const unspecified = playerList.filter(p => p.gender !== 'male' && p.gender !== 'female');

  // Step 2: Shuffle all lists for true randomization
  shuffle(males);
  shuffle(females);
  shuffle(unspecified);

  const teams = [];

  // Priority 1: Create mixed-gender teams of size teamSize
  // A mixed-gender team must contain at least 1 male and 1 female.
  while (males.length >= 1 && females.length >= 1 && (males.length + females.length) >= teamSize) {
    const teamPlayers = [];
    teamPlayers.push(males.shift());
    teamPlayers.push(females.shift());

    // Fill remaining slots
    while (teamPlayers.length < teamSize) {
      if (males.length > females.length) {
        teamPlayers.push(males.shift());
      } else if (females.length > males.length) {
        teamPlayers.push(females.shift());
      } else {
        if (Math.random() < 0.5) {
          teamPlayers.push(males.shift());
        } else {
          teamPlayers.push(females.shift());
        }
      }
    }
    teams.push({
      players: teamPlayers,
      type: 'mixed',
    });
  }

  // Priority 2: Create same-gender teams of size teamSize from remaining males
  while (males.length >= teamSize) {
    const teamPlayers = [];
    for (let i = 0; i < teamSize; i++) {
      teamPlayers.push(males.shift());
    }
    teams.push({
      players: teamPlayers,
      type: 'same',
    });
  }

  // Priority 2b: Create same-gender teams of size teamSize from remaining females
  while (females.length >= teamSize) {
    const teamPlayers = [];
    for (let i = 0; i < teamSize; i++) {
      teamPlayers.push(females.shift());
    }
    teams.push({
      players: teamPlayers,
      type: 'same',
    });
  }

  // Priority 3: Combine all remaining players (leftover males, females, and all unspecified)
  // and pair them into teams.
  const leftovers = [...males, ...females, ...unspecified];
  shuffle(leftovers);

  while (leftovers.length >= teamSize) {
    const teamPlayers = [];
    for (let i = 0; i < teamSize; i++) {
      teamPlayers.push(leftovers.shift());
    }
    const hasMale = teamPlayers.some(p => p.gender === 'male');
    const hasFemale = teamPlayers.some(p => p.gender === 'female');
    const type = (hasMale && hasFemale) ? 'mixed' : 'same';
    teams.push({
      players: teamPlayers,
      type: type,
    });
  }

  // Priority 4: Remaining players in leftovers are unmatched
  const unmatched = leftovers;

  // Priority 5: Balance team average skill levels via same-gender swaps.
  // No-op unless a player has an explicit level; gender priority and
  // unmatched selection above are untouched.
  balanceTeamsByLevel(teams);

  return { teams, unmatched };
}

/**
 * Generate couples (teams of size 2) from a list of players.
 * Maintained for backward compatibility.
 *
 * @param {Array<{name: string, gender: 'male'|'female'}>} playerList
 * @returns {{
 *   couples: Array<{player1: object, player2: object, type: 'mixed'|'same'}>,
 *   unmatched: object|null
 * }}
 */
function generateCouples(playerList) {
  const result = generateTeams(playerList, 2);
  const couples = result.teams.map(team => ({
    player1: team.players[0],
    player2: team.players[1],
    type: team.type,
  }));
  const unmatched = result.unmatched.length === 1 ? result.unmatched[0] : null;
  return { couples, unmatched };
}
