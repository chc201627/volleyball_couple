/**
 * Beach Volleyball — King of the Court
 *
 * Pure logic module (no DOM). Globally scoped so it can be loaded via
 * a plain <script> tag and tested independently.
 *
 * Game rules:
 *   1. One team is the King and defends the throne.
 *   2. Remaining teams form a challenger queue (head = next to play).
 *   3. King wins rally → challenger goes to queue tail; king's wins increment.
 *   4. Challenger wins rally → challenger becomes new King (wins reset);
 *      old king goes to queue tail.
 *   5. Win condition (consecutive or total) — first to reach targetWins wins.
 */

/* global */
/* exported createKingGame, recordRally, getCurrentKing, getCurrentChallenger, isKingGameOver */

/**
 * Create the initial KingState.
 *
 * @param {Array}  teams         - min 2, same shape as tournament.js createTeams()
 * @param {string} winCondition  - 'consecutive' | 'total'
 * @param {number} targetWins    - 5 | 7 | 10
 * @returns {object} KingState
 */
function createKingGame(teams, winCondition, targetWins) {
  'use strict';
  if (!teams || teams.length < 2) {
    throw new Error('king.error.notEnoughTeams');
  }
  return {
    teams:         teams.slice(),      // copy — do not mutate caller's array
    king:          teams[0],
    queue:         teams.slice(1),
    kingWins:      0,
    kingTotalWins: 0,
    rallyLog:      [],
    winCondition:  winCondition,
    targetWins:    targetWins,
    winner:        null
  };
}

/**
 * Record a rally result. Returns a NEW KingState (immutable).
 *
 * @param {object} state       - KingState
 * @param {string} winnerSide  - 'king' | 'challenger'
 * @returns {object} new KingState
 */
function recordRally(state, winnerSide) {
  'use strict';
  if (state.winner) {
    throw new Error('king.error.gameOver');
  }

  var challenger = state.queue[0];
  var newQueue, newKing, newKingWins, newKingTotalWins;

  if (winnerSide === 'king') {
    // Challenger rotates to tail; king stays
    newQueue         = state.queue.slice(1).concat([challenger]);
    newKing          = state.king;
    newKingWins      = state.kingWins + 1;
    newKingTotalWins = state.kingTotalWins + 1;
  } else {
    // Challenger dethrones king; old king goes to queue tail
    newQueue         = state.queue.slice(1).concat([state.king]);
    newKing          = challenger;
    newKingWins      = 0;
    newKingTotalWins = 0;
  }

  var rallyEntry = {
    rallyNumber:      state.rallyLog.length + 1,
    kingTeamId:       state.king.id,
    challengerTeamId: challenger.id,
    winnerSide:       winnerSide,
    kingWinsAfter:    winnerSide === 'king' ? newKingWins : 0,
    timestamp:        Date.now()
  };

  var newState = Object.assign({}, state, {
    king:          newKing,
    queue:         newQueue,
    kingWins:      newKingWins,
    kingTotalWins: newKingTotalWins,
    rallyLog:      state.rallyLog.concat([rallyEntry]),
    winner:        null
  });

  // Check win condition after updating state
  if (isKingGameOver(newState)) {
    newState = Object.assign({}, newState, { winner: newKing });
  }

  return newState;
}

/**
 * Get the current king team object.
 * @param {object} state - KingState
 * @returns {object} Team
 */
function getCurrentKing(state) {
  'use strict';
  return state.king;
}

/**
 * Get the current challenger (head of queue).
 * @param {object} state - KingState
 * @returns {object} Team
 */
function getCurrentChallenger(state) {
  'use strict';
  return state.queue[0];
}

/**
 * Check whether the win condition has been reached.
 * @param {object} state - KingState
 * @returns {boolean}
 */
function isKingGameOver(state) {
  'use strict';
  if (state.winCondition === 'consecutive') {
    return state.kingWins >= state.targetWins;
  }
  return state.kingTotalWins >= state.targetWins;
}
