/** Results — canvas boards F1, F2, F3 and F4.
 *
 * Shares standings-view.js with the Groups tab, so the tie blocks and the
 * deciding column are identical in both. In v1 these two tables were one
 * function (renderStandingsTable, called from the group panel and from the
 * completion view); splitting them in the redesign would have created work
 * rather than saved it.
 *
 * The difference here is medals on the top three, and that the champion is the
 * screen rather than one card among four competing blocks.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  function teamName(tournament, teamId) {
    var team = (tournament.teams || []).filter(function (item) { return item.id === teamId; })[0];
    return team ? team.name : teamId;
  }

  /* --- Table ------------------------------------------------------------ */

  var COLUMNS = [
    { key: 'played', label: 'PJ', width: 22 },
    { key: 'won', label: 'G', width: 20 },
    { key: 'lost', label: 'P', width: 20 },
    { key: 'diff', label: 'DIF', width: 30 },
    { key: 'setsFor', label: 'PF', width: 24 },
    { key: 'setsAgainst', label: 'PC', width: 24 },
    { key: 'points', label: 'PTS', width: 30 },
  ];
  var MEDAL_GLYPH = { gold: '🥇', silver: '🥈', bronze: '🥉' };

  function headerRow() {
    return el('div', { class: 'table__row table__row--head' }, [
      el('span', { class: 'table__rank', text: '#' }),
      el('span', { class: 'table__team', text: label('tournament.col.team', 'PAREJA') }),
    ].concat(COLUMNS.map(function (column) {
      return el('span', {
        class: ['table__cell', column.key === 'points' && 'is-points'],
        style: { width: column.width + 'px' },
        text: column.label,
      });
    })));
  }

  function row(tournament, item) {
    var cells = COLUMNS.map(function (column) {
      var value = column.key === 'diff'
        ? (item.diff > 0 ? '+' + item.diff : String(item.diff))
        : String(item[column.key]);
      return el('span', {
        class: [
          'table__cell',
          column.key === 'points' && 'is-points',
          item.decidedBy === column.key && 'is-deciding',
        ],
        style: { width: column.width + 'px' },
        text: value,
      });
    });

    // The medal replaces the number rather than sitting beside it: position is
    // still communicated by the order, and the row has no width to spare at
    // 320px. Colour is never the only channel — the glyph carries the meaning.
    var rank = item.medal
      ? el('span', {
          class: 'table__rank table__rank--medal',
          text: MEDAL_GLYPH[item.medal],
          attrs: { role: 'img', 'aria-label': label('results.position', 'Puesto ' + item.rank, { rank: item.rank }) },
        })
      : el('span', { class: 'table__rank', text: String(item.rank) });

    return el('div', { class: ['table__row', item.rank <= 3 && 'is-top'] }, [
      rank,
      el('span', { class: 'table__team', text: teamName(tournament, item.teamId) }),
    ].concat(cells));
  }

  function tieBlock(tournament, block, rows) {
    var columnName = { diff: 'DIF', setsFor: 'PF' }[block.decidedBy] || '';
    var children = [
      el('div', { class: 'table__tie-caption' }, [
        IconRegistry.icon('equal', { size: 12 }),
        el('span', {
          text: label('tournament.tieBlock',
            'Empatadas a ' + block.value + ' puntos · decide ' + columnName,
            { points: block.value, column: columnName }),
        }),
      ]),
    ];

    var index = 0;
    while (index < rows.length) {
      var item = rows[index];
      if (!item.subTieBlockId) {
        children.push(row(tournament, item));
        index += 1;
        continue;
      }
      var subId = item.subTieBlockId;
      var sub = (block.subBlocks || []).filter(function (candidate) { return candidate.id === subId; })[0] || {};
      var subRows = [];
      while (index < rows.length && rows[index].subTieBlockId === subId) {
        subRows.push(rows[index]);
        index += 1;
      }
      children.push(el('div', { class: 'table__tie table__tie--sub' }, [
        el('div', { class: 'table__tie-caption' }, [
          IconRegistry.icon('chevron-right', { size: 12 }),
          el('span', {
            text: sub.decidedBy === 'setsFor'
              ? label('tournament.subTieBlock', 'Mismo DIF (' + (sub.value > 0 ? '+' + sub.value : sub.value) + ') · decide PF')
              : label('tournament.tieUnresolved', 'Iguales en todo lo visible · decide el enfrentamiento directo'),
          }),
        ]),
      ].concat(subRows.map(function (candidate) { return row(tournament, candidate); }))));
    }

    return el('div', { class: 'table__tie' }, children);
  }

  function table(tournament, view) {
    var nodes = [headerRow()];
    var index = 0;
    while (index < view.rows.length) {
      var item = view.rows[index];
      if (!item.tieBlockId) {
        nodes.push(row(tournament, item));
        index += 1;
        continue;
      }
      var blockId = item.tieBlockId;
      var block = view.blocks.filter(function (candidate) { return candidate.id === blockId; })[0];
      var blockRows = [];
      while (index < view.rows.length && view.rows[index].tieBlockId === blockId) {
        blockRows.push(view.rows[index]);
        index += 1;
      }
      nodes.push(tieBlock(tournament, block, blockRows));
    }
    return el('div', { class: 'table' }, nodes);
  }

  /* --- Sections --------------------------------------------------------- */

  function championCard(tournament, outcome) {
    if (!outcome || outcome.kind !== 'champion' || !outcome.championTeamId) return null;
    return el('section', { class: 'results__champion' }, [
      IconRegistry.icon('trophy', { size: 46, class: 'results__champion-icon' }),
      C.overline(label('results.champion', 'Campeón'), 'accent'),
      el('p', { class: 'results__champion-name', text: teamName(tournament, outcome.championTeamId) }),
    ]);
  }

  function actionsRow(ctx) {
    var actions = [
      { icon: 'share-2', label: label('day.share', 'Compartir'), onClick: function () { ctx.openOverlay('share'); } },
      { icon: 'history', label: label('history.title', 'Historial'), onClick: function () { ctx.openOverlay('history'); } },
      { icon: 'rotate-ccw', label: label('workspace.results.startAnother', 'Nuevo torneo'), onClick: function () { ctx.navigate('setup'); } },
    ];
    return el('div', { class: 'results__actions' }, actions.map(function (action) {
      return el('button', {
        class: 'results__action',
        attrs: { type: 'button' },
        on: { click: action.onClick },
      }, [
        IconRegistry.icon(action.icon, { size: 18 }),
        el('span', { class: 'results__action-label', text: action.label }),
      ]);
    }));
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.results = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;

      // F3: nothing has been played. Names what will appear here rather than
      // leaving a destination that looks broken.
      if (!tournament) {
        return [C.emptyState({
          icon: 'list-ordered',
          title: label('workspace.results.empty', 'Todavía no hay resultados'),
          text: label('results.emptyText',
            'Cuando arranques un torneo verás aquí la tabla en vivo y, al terminar, el campeón.'),
          actions: [C.button({
            label: label('workspace.results.emptyLink', 'Ir a Setup'),
            onClick: function () { ctx.navigate('setup'); },
          })],
        })];
      }

      var format = tournament.format || null;
      var resolution = format
        ? resolveFormat(format, { groups: tournament.groups, matches: tournament.matches })
        : null;
      var standings = calculateStandings(tournament.groups, tournament.matches, { extended: true });
      var day = tournamentDay({
        format: format,
        resolution: resolution,
        matches: tournament.matches,
        groups: tournament.groups,
        standings: standings,
        king: snapshot.king,
      });

      var body = [];
      var champion = championCard(tournament, day.outcome);
      if (champion) body.push(champion);

      body.push(el('p', {
        class: 'results__format',
        text: [
          label('tournament.format.preset.' + (format ? format.preset : 'classic'), 'Clásico'),
          tournament.teams.length + ' ' + label('results.pairs', 'parejas'),
          day.progress.played + ' / ' + day.progress.total + ' ' + label('results.matches', 'partidos'),
        ].join(' · '),
      }));

      (tournament.groups || []).forEach(function (group) {
        var view = standingsView(standings.get(group.id) || [], { medals: true });
        body.push(C.panel({
          label: (tournament.groups.length > 1
            ? label('tournament.group', 'Grupo ' + group.id, { id: group.id }) + ' · '
            : '') + label('tournament.standingsFinal', day.complete ? 'Clasificación final' : 'Clasificación en vivo'),
          flush: true,
        }, [table(tournament, view)]));
      });

      // A gold medal halfway through a tournament reads as "already won", so
      // the provisional state says so in as many words.
      if (!day.complete) {
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'warn',
          text: label('results.provisional',
            'Posiciones provisionales: quedan ' + (day.progress.total - day.progress.played) + ' partidos por jugar'),
        }));
      }

      body.push(actionsRow(ctx));
      return body;
    },
  };
})();
