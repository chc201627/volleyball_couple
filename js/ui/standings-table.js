/** The standings table, in one place: Grupos and Resultados show the same table and
 * drifted apart in v1. Order comes from standings-view.js, markup from here. */
/* exported StandingsTable */
var StandingsTable;

(function () {
  'use strict';

  var el = DomHelpers.el;

  /** Widths fit the longer of the two languages at 320px, where seven numeric
   * columns share one row. */
  var COLUMNS = [
    { key: 'played', labelKey: 'standings.col.played', fallback: 'PJ', width: 22 },
    { key: 'won', labelKey: 'standings.col.won', fallback: 'G', width: 20 },
    { key: 'lost', labelKey: 'standings.col.lost', fallback: 'P', width: 20 },
    { key: 'diff', labelKey: 'standings.col.diff', fallback: 'DIF', width: 30 },
    { key: 'setsFor', labelKey: 'standings.col.setsFor', fallback: 'PF', width: 24 },
    { key: 'setsAgainst', labelKey: 'standings.col.setsAgainst', fallback: 'PC', width: 24 },
    { key: 'points', labelKey: 'standings.col.points', fallback: 'PTS', width: 30 },
  ];

  var MEDAL_GLYPH = { gold: '🥇', silver: '🥈', bronze: '🥉' };

  function columnName(key) {
    var column = COLUMNS.filter(function (item) { return item.key === key; })[0];
    return column ? translate(column.labelKey, column.fallback) : '';
  }

  function cellText(row, column) {
    if (column.key !== 'diff') return String(row[column.key]);
    return row.diff > 0 ? '+' + row.diff : String(row.diff);
  }

  function headerRow() {
    return el('div', { class: 'table__row table__row--head' }, [
      el('span', { class: 'table__rank', text: '#' }),
      el('span', { class: 'table__team', text: translate('tournament.col.team', 'PAREJA') }),
    ].concat(COLUMNS.map(function (column) {
      return el('span', {
        class: ['table__cell', column.key === 'points' && 'is-points'],
        style: { width: column.width + 'px' },
        text: translate(column.labelKey, column.fallback),
      });
    })));
  }

  /** The medal replaces the number rather than sitting beside it: the order
   * already says the position, and at 320px the row has no width to spare. */
  function rankCell(row) {
    if (!row.medal) {
      return el('span', { class: ['table__rank', row.rank <= 3 && 'is-top'], text: String(row.rank) });
    }
    return el('span', {
      class: 'table__rank table__rank--medal',
      text: MEDAL_GLYPH[row.medal],
      attrs: {
        role: 'img',
        'aria-label': translate('results.position', 'Puesto ' + row.rank, { rank: row.rank }),
      },
    });
  }

  function standingsRow(teamNameOf, row) {
    var cells = COLUMNS.map(function (column) {
      return el('span', {
        class: [
          'table__cell',
          column.key === 'points' && 'is-points',
          // Marks the column that orders this tie block, so it can be read
          // downwards instead of comparing rows by eye.
          row.decidedBy === column.key && 'is-deciding',
        ],
        style: { width: column.width + 'px' },
        text: cellText(row, column),
      });
    });
    return el('div', { class: ['table__row', row.rank <= 3 && 'is-top'] }, [
      rankCell(row),
      el('span', { class: 'table__team', text: teamNameOf(row.teamId) }),
    ].concat(cells));
  }

  function tieCaption(icon, text) {
    return el('div', { class: 'table__tie-caption' }, [
      IconRegistry.icon(icon, { size: 12 }),
      el('span', { text: text }),
    ]);
  }

  function subTieCaption(block, subBlock) {
    var decider = subBlock.decidedBy === 'setsFor' ? columnName('setsFor') : null;
    if (!decider) {
      return tieCaption('chevron-right',
        translate('tournament.tieUnresolved', 'Iguales en todo lo visible · decide el enfrentamiento directo'));
    }
    var diff = subBlock.value > 0 ? '+' + subBlock.value : String(subBlock.value);
    return tieCaption('chevron-right', translate('tournament.subTieBlock',
      'Mismo DIF (' + diff + ') · decide ' + decider, { diff: diff, column: decider }));
  }

  /** Walks a run of rows that share `groupKey`, returning them and leaving the
   * cursor past the run. The tie grouping is two nested runs of this shape. */
  function takeRun(rows, from, groupKey) {
    var run = [];
    var index = from;
    var id = rows[from][groupKey];
    while (index < rows.length && rows[index][groupKey] === id) {
      run.push(rows[index]);
      index += 1;
    }
    return { rows: run, next: index, id: id };
  }

  function subTieNode(teamNameOf, block, subRows) {
    var subBlock = (block.subBlocks || []).filter(function (item) {
      return item.id === subRows[0].subTieBlockId;
    })[0] || {};
    return el('div', { class: 'table__tie table__tie--sub' }, [
      subTieCaption(block, subBlock),
    ].concat(subRows.map(function (row) { return standingsRow(teamNameOf, row); })));
  }

  /** Tied rows are wrapped in a block that names what orders them: without it a
   * highlighted cell means nothing, because you cannot see who it is tied with. */
  function tieBlockNode(teamNameOf, block, rows) {
    var decider = columnName(block.decidedBy);
    var children = [tieCaption('equal', translate('tournament.tieBlock',
      'Empatadas a ' + block.value + ' puntos · decide ' + decider,
      { points: block.value, column: decider }))];

    var index = 0;
    while (index < rows.length) {
      if (!rows[index].subTieBlockId) {
        children.push(standingsRow(teamNameOf, rows[index]));
        index += 1;
        continue;
      }
      var run = takeRun(rows, index, 'subTieBlockId');
      children.push(subTieNode(teamNameOf, block, run.rows));
      index = run.next;
    }
    return el('div', { class: 'table__tie' }, children);
  }

  /**
   * The table's rows, header included.
   *
   * @param {function} teamNameOf - team id to display name
   * @param {object} view - a standingsView() result
   * @param {{ties?: boolean}} [options] - `ties: false` drops the tie captions
   * @returns {Array<Element>}
   */
  function rows(teamNameOf, view, options) {
    var withTies = !options || options.ties !== false;
    var nodes = [headerRow()];
    var index = 0;

    while (index < view.rows.length) {
      if (!withTies || !view.rows[index].tieBlockId) {
        nodes.push(standingsRow(teamNameOf, view.rows[index]));
        index += 1;
        continue;
      }
      var run = takeRun(view.rows, index, 'tieBlockId');
      var block = view.blocks.filter(function (item) { return item.id === run.id; })[0];
      nodes.push(tieBlockNode(teamNameOf, block, run.rows));
      index = run.next;
    }
    return nodes;
  }

  /** What the highlighting and the abbreviations mean. Only worth the space
   * when there is a tie to explain. */
  function legend(view) {
    if (!view.hasTies) return null;
    return el('div', { class: 'table__legend' }, [
      el('div', { class: 'table__legend-line' }, [
        IconRegistry.icon('equal', { size: 13 }),
        el('span', { text: translate('tournament.tieOrder', 'Orden: PTS → DIF → PF → enfrentamiento directo') }),
      ]),
      el('div', { class: 'table__legend-line' }, [
        el('span', { class: 'table__legend-swatch' }),
        el('span', { text: translate('tournament.tieLegend', 'En cada bloque se resalta la columna que decide: léela en vertical') }),
      ]),
      el('p', {
        class: 'table__glossary',
        text: translate('tournament.glossary',
          'PJ jugados · G ganados · P perdidos · DIF diferencia · PF puntos a favor · PC en contra'),
      }),
    ]);
  }

  StandingsTable = {
    COLUMNS: COLUMNS,
    rows: rows,
    legend: legend,
  };
})();
