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

  /** A spectator sees the same score and cannot touch it. The row stops being
   * interactive rather than showing a control that refuses on tap. */
  function canScore(ctx) {
    var session = ctx.appState.get().session;
    return !session || session.role === 'owner' || session.role === 'scorer';
  }

  function matchRowFor(ctx, tournament, view) {
    var scoring = canScore(ctx);
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
      onClick: scoring ? function () { ctx.openOverlay('scoring', { matchId: view.matchId }); } : null,
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

    var children = [
      el('div', { class: 'c-panel__head' }, [
        C.overline(label('workspace.tournament.nextMatch.heading', 'Siguiente') + ' · ' + stageLabel, 'accent'),
        el('span', { class: 'c-panel__meta', text: day.progress.played + ' / ' + day.progress.total }),
      ]),
      el('p', { class: 'day__hero-teams', text: matchTitle(tournament, view) }),
    ];

    if (canScore(ctx)) {
      children.push(C.button({
        label: label('workspace.tournament.nextMatch.scoreBtn', 'Anotar este partido'),
        onClick: function () { ctx.openOverlay('scoring', { matchId: view.matchId }); },
      }));
    } else {
      // No scoring button at all for a spectator, and no per-match request
      // either: access is granted for the whole tournament, so asking belongs
      // in the one card at the top.
      children.push(el('p', {
        class: 'day__hero-readonly',
        text: label('day.readOnlyMatch', 'Solo lectura — no puedes anotar este torneo'),
      }));
    }

    return el('section', { class: 'c-panel day__hero' }, children);
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

  /** Slot descriptors (`slot:A1`, `winner:k-sf-2`) are how the format engine
   * writes a pairing before the teams exist. They reached the bracket verbatim,
   * so an unresolved match read "winner:k-sf-1" — engine vocabulary on a screen
   * meant for players. They are parsed here and said in words instead. */
  var SLOT_TOKEN = /^slot:([A-Z])(\d+)$/;
  var WINNER_TOKEN = /^winner:k-([a-z][a-z0-9]{0,11})-(\d+)$/;

  function slotLabel(token) {
    var slot = SLOT_TOKEN.exec(token || '');
    if (slot) {
      return label('bracket.slot.group', slot[2] + 'º del grupo ' + slot[1],
        { rank: slot[2], group: slot[1] });
    }
    var winner = WINNER_TOKEN.exec(token || '');
    if (winner) {
      var stage = label('bracket.stage.' + winner[1], winner[1].toUpperCase());
      return label('bracket.slot.winner', 'Ganador de ' + stage + winner[2],
        { stage: stage, n: winner[2] });
    }
    return token;
  }

  /* --- Grupos (C3) ------------------------------------------------------ */

  // Abbreviations are translated: PJ/G/P read as nothing in English. Widths are
  // sized for the longest of either language at 320px, where seven numeric
  // columns share the row.
  var COLUMNS = [
    { key: 'played', labelKey: 'standings.col.played', fallback: 'PJ', width: 22 },
    { key: 'won', labelKey: 'standings.col.won', fallback: 'G', width: 20 },
    { key: 'lost', labelKey: 'standings.col.lost', fallback: 'P', width: 20 },
    { key: 'diff', labelKey: 'standings.col.diff', fallback: 'DIF', width: 30 },
    { key: 'setsFor', labelKey: 'standings.col.setsFor', fallback: 'PF', width: 24 },
    { key: 'setsAgainst', labelKey: 'standings.col.setsAgainst', fallback: 'PC', width: 24 },
    { key: 'points', labelKey: 'standings.col.points', fallback: 'PTS', width: 30 },
  ];

  function columnLabel(column) {
    return label(column.labelKey, column.fallback);
  }

  function headerRow() {
    return el('div', { class: 'table__row table__row--head' }, [
      el('span', { class: 'table__rank', text: '#' }),
      el('span', { class: 'table__team', text: label('tournament.col.team', 'PAREJA') }),
    ].concat(COLUMNS.map(function (column) {
      return el('span', {
        class: ['table__cell', column.key === 'points' && 'is-points'],
        style: { width: column.width + 'px' },
        text: columnLabel(column),
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
    // The caption names a column, so it has to name the same string the header
    // shows — in whichever language that is.
    var columnName = {
      diff: label('standings.col.diff', 'DIF'),
      setsFor: label('standings.col.setsFor', 'PF'),
    }[block.decidedBy] || '';
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
      var subColumn = { setsFor: label('standings.col.setsFor', 'PF') }[sub.decidedBy];
      children.push(el('div', { class: 'table__tie table__tie--sub' }, [
        el('div', { class: 'table__tie-caption' }, [
          IconRegistry.icon('chevron-right', { size: 12 }),
          el('span', {
            text: subColumn
              ? label('tournament.subTieBlock',
                  'Mismo DIF (' + (sub.value > 0 ? '+' + sub.value : sub.value) + ') · decide ' + subColumn,
                  { diff: sub.value > 0 ? '+' + sub.value : sub.value, column: subColumn })
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
                  text: resolved ? teamName(tournament, slot.id) : slotLabel(slot.id),
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
      var session = snapshot.session;

      // A dead or unreadable link has to say so. Falling through to "no
      // tournament yet" would blame the visitor for a session somebody else
      // reset, and hand them a Teams button that is not theirs to press.
      if (session && (session.state === 'notFound' || session.state === 'unsupported')) {
        var gone = session.state === 'notFound';
        return [C.emptyState({
          icon: gone ? 'circle-alert' : 'info',
          title: gone
            ? label('session.goneTitle', 'Este torneo ya no está disponible')
            : label('session.unsupportedTitle', 'No podemos abrir este torneo'),
          text: gone
            ? label('session.goneText', 'El organizador lo reinició, o el link está incompleto. Pídele uno nuevo.')
            : label('session.unsupportedText', 'El link viene de una versión más reciente de la app. Recarga para actualizarla.'),
          actions: [C.button({
            label: gone
              ? label('session.leaveLink', 'Salir del link compartido')
              : label('session.reload', 'Recargar'),
            variant: 'ghost',
            onClick: gone ? ctx.leaveSession : function () { window.location.reload(); },
          })],
        })];
      }

      if (!tournament) {
        return [C.emptyState({
          icon: 'trophy',
          title: label('tournament.none', 'Todavía no hay torneo'),
          text: label('tournament.noneText', 'Genera los equipos y elige cómo quieren jugar.'),
          actions: [C.button({
            label: label('nav.goToTeams', 'Ir a Equipos'),
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
      var body = [];

      // One access card, at the top, once. The permission is per tournament,
      // so repeating the offer on every match would suggest a scope that does
      // not exist.
      if (session && session.role === 'spectator') {
        body.push(el('section', { class: 'c-panel day__access' }, [
          el('div', { class: 'day__access-head' }, [
            IconRegistry.icon('eye', { size: 16, class: 'day__access-icon' }),
            C.overline(label('day.readOnly', 'Solo lectura'), 'info'),
          ]),
          el('p', {
            class: 'day__access-title',
            text: label('day.viewingTournament', 'Estás viendo un torneo compartido'),
          }),
          el('p', {
            class: 'day__access-body',
            text: label('day.accessBody',
              'Los resultados se actualizan en vivo. Para anotar necesitas que el organizador te dé acceso, y se concede para todo el torneo — no partido a partido.'),
          }),
          C.button({
            label: session.accessStatus === 'pending'
              ? label('access.pendingShort', 'Solicitud enviada')
              : label('tournament.access.request', 'Pedir acceso para anotar'),
            disabled: session.accessStatus === 'pending',
            onClick: function () { ctx.openOverlay('requestAccess'); },
          }),
        ]));
      }

      // The owner reaches Anotadores from inside the tournament, because that is
      // where the nav badge points. A pending request gets its own strip: it
      // means somebody is standing on the court waiting to be let in.
      if (session && session.role === 'owner') {
        var requests = session.requests || {};
        var uids = Object.keys(requests);
        var pending = uids.filter(function (uid) { return requests[uid].status === 'pending'; }).length;

        if (pending) {
          body.push(C.statusStrip({
            icon: 'users',
            tone: 'warn',
            assertive: true,
            text: pending === 1
              ? label('day.oneRequest', 'Alguien pide acceso para anotar')
              : label('day.manyRequests', pending + ' personas piden acceso para anotar', { count: pending }),
            action: {
              label: label('day.reviewRequests', 'Revisar'),
              onClick: function () { ctx.openOverlay('scorers'); },
            },
          }));
        }

        body.push(el('div', { class: 'day__collab' }, [
          C.button({
            // No count on the label: at 320px the two buttons share the row and
            // "Anotadores · 3" ellipsised into "Anotadore…". The pending count
            // is on the nav badge, and the overlay states the total.
            label: label('scorers.title', 'Anotadores'),
            variant: 'ghost',
            icon: 'users',
            block: false,
            onClick: function () { ctx.openOverlay('scorers'); },
          }),
          C.button({
            label: label('day.share', 'Compartir'),
            variant: 'ghost',
            icon: 'share-2',
            block: false,
            onClick: function () { ctx.openOverlay('share'); },
          }),
        ]));
      }

      body = body.concat([
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
      ]);

      if (subView === 'groups') body = body.concat(renderGroups(ctx, tournament, standings));
      else if (subView === 'bracket') body = body.concat(renderBracket(ctx, tournament, day, resolution));
      else body = body.concat(renderToday(ctx, tournament, day));

      return body;
    },
  };
})();
