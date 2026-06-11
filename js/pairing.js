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

  // Step 2: Shuffle both lists for true randomization
  shuffle(males);
  shuffle(females);

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

  // Priority 2: Create same-gender teams of size teamSize from remaining
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

  // Priority 3: Remaining players are unmatched
  const unmatched = [...males, ...females];

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
