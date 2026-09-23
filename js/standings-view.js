/** Standings presentation — pure, DOM-free.
 *
 * Takes the rows `calculateStandings()` produces and works out what a reader
 * needs to understand the order: the point difference, which pairs are tied,
 * and which column actually separates them.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The tie-break chain lives in tournament.js's sort:
 *
 *     points DESC → (setsFor − setsAgainst) DESC → setsFor DESC → h2h → entry
 *
 * The table and that sort are two places that must agree. In v1 they were
 * written independently, and the table did not even show the difference —
 * the SECOND key in the chain — so a reader had to subtract two columns in
 * their head to understand why one pair was above another. Deriving the
 * presentation from the same chain here is what stops the two from drifting.
 */
/* exported standingsView, STANDINGS_TIE_CHAIN */
var standingsView, STANDINGS_TIE_CHAIN;
(function () {
  'use strict';

  /** In sort order, after `points`. `h2h` and `entryIndex` are deliberately
   * absent: they exist in the sort but are not columns anyone can see, so a
   * block they resolve is reported as `null` rather than pointing at a column
   * that is not on screen. */
  var TIE_CHAIN = ['diff', 'setsFor'];
  var MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

  function diffOf(row) {
    return (row.setsFor || 0) - (row.setsAgainst || 0);
  }

  function valueOf(row, key) {
    return key === 'diff' ? diffOf(row) : (row[key] || 0);
  }

  /** Splits consecutive rows that share `key` into runs. Only runs of two or
   * more are ties; a run of one is simply a row in its place. */
  function runsBy(rows, key) {
    var runs = [];
    var current = null;
    rows.forEach(function (row) {
      var value = valueOf(row, key);
      if (current && current.value === value) {
        current.rows.push(row);
        return;
      }
      current = { value: value, rows: [row] };
      runs.push(current);
    });
    return runs;
  }

  /**
   * @param {Array} standings - rows from calculateStandings(), already sorted
   * @param {object} [options]
   * @param {boolean} [options.medals] - mark the top three (Results, not Groups)
   * @returns {{ rows: Array, blocks: Array, hasTies: boolean }}
   */
  standingsView = function (standings, options) {
    options = options || {};
    var sorted = (standings || []).slice();

    var rows = sorted.map(function (row, index) {
      return {
        teamId: row.teamId,
        rank: index + 1,
        played: row.played || 0,
        won: row.won || 0,
        lost: row.lost || 0,
        points: row.points || 0,
        setsFor: row.setsFor || 0,
        setsAgainst: row.setsAgainst || 0,
        diff: diffOf(row),
        medal: options.medals ? (MEDALS[index + 1] || null) : null,
        tieBlockId: null,
        subTieBlockId: null,
        // The column that places this row inside its block, for the highlight.
        decidedBy: null,
      };
    });

    var blocks = [];
    var blockSeq = 0;

    runsBy(rows, 'points').forEach(function (run) {
      if (run.rows.length < 2) return;

      var blockId = 'tie-' + (++blockSeq);
      // Within a points tie, `diff` is what orders the block — so it is the
      // column to read down, and every row in the block gets it highlighted.
      var block = {
        id: blockId,
        key: 'points',
        value: run.value,
        decidedBy: TIE_CHAIN[0],
        teamIds: run.rows.map(function (row) { return row.teamId; }),
        subBlocks: [],
      };

      run.rows.forEach(function (row) {
        row.tieBlockId = blockId;
        row.decidedBy = TIE_CHAIN[0];
      });

      // Rows that also tie on `diff` need the next key in the chain, and they
      // form a block of their own inside this one. Representing it as nesting
      // rather than a flat flag is what lets the table say WHY there is a
      // second highlighted column.
      runsBy(run.rows, TIE_CHAIN[0]).forEach(function (subRun) {
        if (subRun.rows.length < 2) return;
        var subId = blockId + '-sub';
        // Everything below `setsFor` in the chain is invisible (head-to-head,
        // entry order), so a block it resolves reports no column at all.
        var stillTied = subRun.rows.every(function (row) {
          return valueOf(row, TIE_CHAIN[1]) === valueOf(subRun.rows[0], TIE_CHAIN[1]);
        });
        var decidedBy = stillTied ? null : TIE_CHAIN[1];
        block.subBlocks.push({
          id: subId,
          key: TIE_CHAIN[0],
          value: subRun.value,
          decidedBy: decidedBy,
          teamIds: subRun.rows.map(function (row) { return row.teamId; }),
        });
        subRun.rows.forEach(function (row) {
          row.subTieBlockId = subId;
          row.decidedBy = decidedBy;
        });
      });

      blocks.push(block);
    });

    return { rows: rows, blocks: blocks, hasTies: blocks.length > 0 };
  };

  STANDINGS_TIE_CHAIN = TIE_CHAIN;
})();
