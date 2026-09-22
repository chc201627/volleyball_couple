/** Tournament day — canvas boards C1 (Hoy), C3 (Grupos) and C4 (Bracket).
 *
 * v1 rendered all of this as one page: next match, stage progress, three
 * stacked lists, then every group panel with its full table and all 55 matches
 * expanded. In production that page measured about 5,700px. Here it is three
 * sub-views over one destination, and only the one you are looking at exists
 * in the DOM.
 *
 * Everything shown is derived by tournament-day-selectors.js and
 * standings-view.js. This file decides layout, never order or eligibility.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var selectedGroupId = null;

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  /* --- Shared helpers --------------------------------------------------- */

  function teamName(tournament, teamId) {
    var team = (tournament.teams || []).filter(function (item) { return item.id === teamId; })[0];
    return team ? team.name : teamId;
  }

  function matchTitle(tournament, view) {
    return teamName(tournament, view.team1Id) + '  vs  ' + teamName(tournament, view.team2Id);
  }

  function scoreText(view) {
    if (view.status === 'pending') return '—';
    return view.score1 + ' – ' + view.score2;
  }

  function scoreTone(view) {
    if (view.status === 'live') return 'warn';
    if (view.status === 'finished') return 'ok';
    return null;
  }

  function matchRowFor(ctx, tournament, view) {
    return C.matchRow({
      teams: matchTitle(tournament, view),
      score: scoreText(view),
      tone: scoreTone(view),
      dot: view.status === 'live' ? 'live' : null,
      // The per-match history entrypoint only exists once there is something to
      // show: no revisions, no icon. An icon that opens an empty screen is how
      // people learn to ignore icons.
      trailing: view.revision > 0 ? C.iconButton({
        icon: 'history',
        tone: 'muted',
        size: 18,
        badge: view.revision > 1,
        label: label('history.forMatch', 'Historial de este partido'),
        onClick: function () {
          ctx.openOverlay('matchHistory', { matchId: view.matchId, revisions: view.revision });
        },
      }) : null,
      onClick: function () { ctx.openOverlay('scoring', { matchId: view.matchId }); },
    });
  }

  /* --- Hoy (C1) --------------------------------------------------------- */

  function nextMatchCard(ctx, tournament, day) {
    if (!day.nextMatch) {
      return C.panel({}, [
        C.emptyState({
          icon: 'trophy',
          title: label('workspace.tournament.nextMatch.reason.' + day.nextMatchReason, 'Sin partido pendiente'),
          text: day.complete ? label('workspace.results.seeResults', 'El torneo ha terminado.') : null,
          actions: day.complete ? [C.button({
            label: label('workspace.tournament.nextMatch.seeResults', 'Ver resultados'),
            onClick: function () { ctx.navigate('results'); },
          })] : null,
        }),
      ]);
    }

    var view = day.nextMatch;
    // Knockout matches belong to a stage, group matches to a group; the view
    // carries both ids and only one of them is meaningful per match.
    var stageLabel = view.stageKind === 'knockout'
      ? label('tournament.format.stage.' + view.stageId, view.stageId)
      : label('tournament.group', 'Grupo ' + view.groupId, { id: view.groupId });

    return el('section', { class: 'c-panel day__hero' }, [
      el('div', { class: 'c-panel__head' }, [
        C.overline(label('workspace.tournament.nextMatch.heading', 'Siguiente') + ' · ' + stageLabel, 'accent'),
        el('span', { class: 'c-panel__meta', text: day.progress.played + ' / ' + day.progress.total }),
      ]),
      el('p', { class: 'day__hero-teams', text: matchTitle(tournament, view) }),
      C.button({
        label: label('workspace.tournament.nextMatch.scoreBtn', 'Anotar este partido'),
        onClick: function () { ctx.openOverlay('scoring', { matchId: view.matchId }); },
      }),
    ]);
  }

  function stageProgressPanel(day) {
    if (!day.stageProgress.length) return null;
    return C.panel({ label: label('workspace.tournament.stageProgress.heading', 'Progreso') },
      day.stageProgress.map(function (stage) {
        var name = stage.kind === 'group'
          ? label('tournament.day.stageProgress.group', 'Grupo ' + stage.id, { group: stage.id })
          : label(stage.label, stage.id);
        return el('div', { class: 'day__stage' }, [
          el('div', { class: 'day__stage-head' }, [
            el('p', { class: 'day__stage-name', text: name }),
            el('span', {
              class: 'day__stage-count',
              text: label('workspace.tournament.stageProgress.count',
                stage.played + ' / ' + stage.total + ' jugados',
                { played: stage.played, total: stage.total }),
            }),
          ]),
          C.progressBar({ value: stage.played, total: stage.total, label: name }),
        ]);
      }));
  }

  function matchSection(ctx, tournament, options) {
    if (!options.views.length) return null;
    var shown = options.views.slice(0, options.limit || 3);
    return C.panel({
      label: options.label + ' · ' + options.views.length,
      labelTone: options.tone,
      action: options.views.length > shown.length ? {
        label: label('tournament.seeAll', 'Ver todos'),
        onClick: options.onSeeAll,
      } : null,
    }, shown.map(function (view) { return matchRowFor(ctx, tournament, view); }));
  }

  function renderToday(ctx, tournament, day) {
    return [
      nextMatchCard(ctx, tournament, day),
      stageProgressPanel(day),
      matchSection(ctx, tournament, {
        label: label('tournament.live', 'En vivo'),
        tone: 'warn',
        views: day.live,
        limit: 3,
        onSeeAll: function () { ctx.selectSubView('groups'); },
      }),
      matchSection(ctx, tournament, {
        label: label('tournament.upNext', 'Próximos'),
        views: day.pending,
        limit: 3,
        onSeeAll: function () { ctx.selectSubView('groups'); },
      }),
      matchSection(ctx, tournament, {
        label: label('tournament.recentlyFinished', 'Recién terminados'),
        views: day.recentlyFinished,
        limit: 3,
        onSeeAll: function () { ctx.selectSubView('groups'); },
      }),
    ].filter(Boolean);
  }

  /* --- Grupos (C3) ------------------------------------------------------ */

  var COLUMNS = [
    { key: 'played', label: 'PJ', width: 22 },
    { key: 'won', label: 'G', width: 20 },
    { key: 'lost', label: 'P', width: 20 },
    { key: 'diff', label: 'DIF', width: 30 },
    { key: 'setsFor', label: 'PF', width: 24 },
    { key: 'setsAgainst', label: 'PC', width: 24 },
    { key: 'points', label: 'PTS', width: 30 },
  ];

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

  function standingsRow(tournament, row) {
    var cells = COLUMNS.map(function (column) {
      var value = column.key === 'diff'
        ? (row.diff > 0 ? '+' + row.diff : String(row.diff))
        : String(row[column.key]);
      return el('span', {
        class: [
          'table__cell',
          column.key === 'points' && 'is-points',
          // The highlight marks the column that orders this row's tie block,
          // so a reader can follow it down instead of comparing rows by eye.
          row.decidedBy === column.key && 'is-deciding',
        ],
        style: { width: column.width + 'px' },
        text: value,
      });
    });

    var rankNode = row.medal
      ? el('span', { class: 'table__rank table__rank--medal', text: { gold: '🥇', silver: '🥈', bronze: '🥉' }[row.medal] })
      : el('span', { class: ['table__rank', row.rank <= 3 && 'is-top'], text: String(row.rank) });

    return el('div', { class: ['table__row', row.rank <= 3 && 'is-top'] }, [
      rankNode,
      el('span', { class: 'table__team', text: teamName(tournament, row.teamId) }),
    ].concat(cells));
  }

  /** Tied rows are wrapped in a block that names what orders them. Without the
   * block, a highlighted cell is meaningless: you cannot see who it is tied
   * with. */
  function standingsBody(tournament, view) {
    var nodes = [];
    var index = 0;
    var rows = view.rows;

    while (index < rows.length) {
      var row = rows[index];
      if (!row.tieBlockId) {
        nodes.push(standingsRow(tournament, row));
        index += 1;
        continue;
      }

      var blockId = row.tieBlockId;
      var block = view.blocks.filter(function (item) { return item.id === blockId; })[0];
      var blockRows = [];
      while (index < rows.length && rows[index].tieBlockId === blockId) {
        blockRows.push(rows[index]);
        index += 1;
      }
      nodes.push(tieBlockNode(tournament, block, blockRows));
    }
    return nodes;
  }

  function tieBlockNode(tournament, block, rows) {
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
      var row = rows[index];
      if (!row.subTieBlockId) {
        children.push(standingsRow(tournament, row));
        index += 1;
        continue;
      }
      var subId = row.subTieBlockId;
      var sub = (block.subBlocks || []).filter(function (item) { return item.id === subId; })[0] || {};
      var subRows = [];
      while (index < rows.length && rows[index].subTieBlockId === subId) {
        subRows.push(rows[index]);
        index += 1;
      }
      var subColumn = { setsFor: 'PF' }[sub.decidedBy];
      children.push(el('div', { class: 'table__tie table__tie--sub' }, [
        el('div', { class: 'table__tie-caption' }, [
          IconRegistry.icon('chevron-right', { size: 12 }),
          el('span', {
            text: subColumn
              ? label('tournament.subTieBlock',
                  'Mismo DIF (' + (sub.value > 0 ? '+' + sub.value : sub.value) + ') · decide ' + subColumn)
              : label('tournament.tieUnresolved',
                  'Iguales en todo lo visible · decide el enfrentamiento directo'),
          }),
        ]),
      ].concat(subRows.map(function (item) { return standingsRow(tournament, item); }))));
    }

    return el('div', { class: 'table__tie' }, children);
  }

  function legend(view) {
    if (!view.hasTies) return null;
    return el('div', { class: 'table__legend' }, [
      el('div', { class: 'table__legend-line' }, [
        IconRegistry.icon('equal', { size: 13 }),
        el('span', { text: label('tournament.tieOrder', 'Orden: PTS → DIF → PF → enfrentamiento directo') }),
      ]),
      el('div', { class: 'table__legend-line' }, [
        el('span', { class: 'table__legend-swatch' }),
        el('span', { text: label('tournament.tieLegend', 'En cada bloque se resalta la columna que decide: léela en vertical') }),
      ]),
      el('p', {
        class: 'table__glossary',
        text: label('tournament.glossary',
          'PJ jugados · G ganados · P perdidos · DIF diferencia · PF puntos a favor · PC en contra'),
      }),
    ]);
  }

  function renderGroups(ctx, tournament, standings) {
    var groups = tournament.groups || [];
    if (!selectedGroupId || !groups.some(function (group) { return group.id === selectedGroupId; })) {
      selectedGroupId = groups.length ? groups[0].id : null;
    }

    var body = [];
    if (groups.length > 1) {
      body.push(el('div', { class: 'day__group-picker' }, groups.map(function (group) {
        return C.pill({
          label: label('tournament.group', 'Grupo ' + group.id, { id: group.id }),
          active: group.id === selectedGroupId,
          onClick: function () { selectedGroupId = group.id; ctx.rerender(); },
        });
      })));
    }

    var rows = standings.get ? (standings.get(selectedGroupId) || []) : [];
    var view = standingsView(rows);

    body.push(C.panel({ label: label('tournament.standings', 'Clasificación') + ' · ' + label('tournament.group', 'Grupo ' + selectedGroupId, { id: selectedGroupId }), flush: true },
      [el('div', { class: 'table' }, [headerRow()].concat(standingsBody(tournament, view)))].concat(legend(view) || [])));

    return body;
  }

  /* --- Bracket (C4) ----------------------------------------------------- */

  function renderBracket(ctx, tournament, day, resolution) {
    if (!resolution || !resolution.stages) {
      return [C.emptyState({
        icon: 'trophy',
        title: label('tournament.noBracket', 'Este formato no tiene eliminatorias'),
        text: label('tournament.noBracketText', 'El torneo se decide en la fase de grupos.'),
      })];
    }

    return resolution.stages.filter(function (stage) { return stage.kind === 'knockout'; })
      .map(function (stage) {
        var stageMatches = (tournament.matches || []).filter(function (match) { return match.stageId === stage.id; });
        return C.panel({ label: label(stage.label, stage.id) },
          stageMatches.map(function (match) {
            var view = day.pending.concat(day.live, day.recentlyFinished)
              .filter(function (item) { return item.matchId === match.id; })[0];
            var slots = [
              { id: match.team1Id, score: view ? view.score1 : null },
              { id: match.team2Id, score: view ? view.score2 : null },
            ];
            var winner = view && view.status === 'finished'
              ? (view.score1 > view.score2 ? match.team1Id : match.team2Id)
              : null;
            return el('div', { class: 'bracket__match' }, slots.map(function (slot) {
              // An unresolved pairing shows its slot descriptor (1º Grupo A)
              // rather than a blank: the shape of the bracket is information
              // even before the names exist.
              var resolved = tournament.teams.some(function (team) { return team.id === slot.id; });
              var isWinner = winner === slot.id;
              return el('div', { class: ['bracket__slot', isWinner && 'is-winner', !resolved && 'is-placeholder'] }, [
                el('span', {
                  class: 'bracket__team',
                  text: resolved ? teamName(tournament, slot.id) : label('tournament.slot.' + slot.id, slot.id),
                }),
                el('span', { class: 'bracket__score', text: slot.score == null ? '—' : String(slot.score) }),
              ]);
            }));
          }));
      });
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.tournament = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;

      if (!tournament) {
        return [C.emptyState({
          icon: 'trophy',
          title: label('tournament.none', 'Todavía no hay torneo'),
          text: label('tournament.noneText', 'Genera los equipos y elige cómo quieren jugar.'),
          actions: [C.button({
            label: label('workspace.nav.teams', 'Ir a Equipos'),
            onClick: function () { ctx.navigate('teams'); },
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
      });

      var subView = ctx.view.subView || 'today';
      var body = [
        C.subTabs({
          active: subView,
          label: label('workspace.nav.tournament', 'Torneo'),
          items: (ctx.view.subViewItems || []).map(function (item) {
            return {
              id: item.id,
              label: label(item.labelKey, { today: 'Hoy', groups: 'Grupos', bracket: 'Bracket' }[item.id]),
            };
          }),
          onSelect: ctx.selectSubView,
        }),
      ];

      if (subView === 'groups') body = body.concat(renderGroups(ctx, tournament, standings));
      else if (subView === 'bracket') body = body.concat(renderBracket(ctx, tournament, day, resolution));
      else body = body.concat(renderToday(ctx, tournament, day));

      return body;
    },
  };
})();
