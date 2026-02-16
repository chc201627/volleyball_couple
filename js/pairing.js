/**
 * Pairing Algorithm Module
 * Beach Volleyball Couple Matching
 *
 * Standalone, reusable module that generates couples from a player list
 * using a priority-based approach:
 *   1. Mixed-gender couples first
 *   2. Same-gender couples from remaining players
 *   3. Leftover player marked as unmatched
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
 * Generate couples from a list of players.
 *
 * @param {Array<{name: string, gender: 'male'|'female'}>} playerList
 * @returns {{
 *   couples: Array<{player1: object, player2: object, type: 'mixed'|'same'}>,
 *   unmatched: object|null
 * }}
 */
function generateCouples(playerList) {
  // Step 1: Separate players by gender
  const males = playerList.filter(p => p.gender === 'male');
  const females = playerList.filter(p => p.gender === 'female');

  // Step 2: Shuffle both lists for true randomization
  shuffle(males);
  shuffle(females);

  const couples = [];

  // Priority 1: Create mixed-gender couples
  const mixedCount = Math.min(males.length, females.length);
  for (let i = 0; i < mixedCount; i++) {
    couples.push({
      player1: males[i],
      player2: females[i],
      type: 'mixed',
    });
  }

  // Priority 2: Pair remaining same-gender players
  const remaining = [
    ...males.slice(mixedCount),
    ...females.slice(mixedCount),
  ];
  shuffle(remaining);

  while (remaining.length >= 2) {
    couples.push({
      player1: remaining.shift(),
      player2: remaining.shift(),
      type: 'same',
    });
  }

  // Priority 3: Handle unmatched player (odd total)
  const unmatched = remaining.length === 1 ? remaining[0] : null;

  return { couples, unmatched };
}
