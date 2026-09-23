/** Tournament day — boards C1 (Hoy), C3 (Grupos), C4 (Bracket) and C6 (every
 * match). Order and eligibility come from the selectors; this decides layout.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var selectedGroupId = null;


  /* --- Shared helpers --------------------------------------------------- */

  var teamName = TournamentText.teamName;
  var matchTitle = TournamentText.matchTitle;
  var scoreText = TournamentText.score;
  var scoreTone = TournamentText.scoreTone;

  /** A spectator sees the same score and cannot touch it: the row stops being
   * interactive rather than showing a control that refuses on tap. */
  function canScore(ctx) {
    return SessionAccess.canScore(ctx.appState.get().session);
  }

  function matchRowFor(ctx, tournament, view) {
    var scoring = canScore(ctx);
    return C.matchRow({
      teams: matchTitle(tournament, view),
      score: scoreText(view),
      tone: scoreTone(view),
      dot: view.status === 'live' ? 'live' : null,
      // No revisions, no icon: an icon that opens an empty screen is how people
      // learn to ignore icons.
      trailing: view.revision > 0 ? C.iconButton({
        icon: 'history',
        tone: 'muted',
        size: 18,
        badge: view.revision > 1,
        label: translate('history.forMatch', 'Historial de este partido'),
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
          title: translate('workspace.tournament.nextMatch.reason.' + day.nextMatchReason, 'Sin partido pendiente'),
          text: day.complete ? translate('workspace.results.seeResults', 'El torneo ha terminado.') : null,
          actions: day.complete ? [C.button({
            label: translate('workspace.tournament.nextMatch.seeResults', 'Ver resultados'),
            onClick: function () { ctx.navigate('results'); },
          })] : null,
        }),
      ]);
    }

    var view = day.nextMatch;
    // Knockout matches belong to a stage, group matches to a group; the view
    // carries both ids and only one of them is meaningful per match.
    var stageLabel = view.stageKind === 'knockout'
      ? translate('tournament.format.stage.' + view.stageId, view.stageId)
      : translate('tournament.group', 'Grupo ' + view.groupId, { id: view.groupId });

    var children = [
      el('div', { class: 'c-panel__head' }, [
        C.overline(translate('workspace.tournament.nextMatch.heading', 'Siguiente') + ' · ' + stageLabel, 'accent'),
        el('span', { class: 'c-panel__meta', text: day.progress.played + ' / ' + day.progress.total }),
      ]),
      el('p', { class: 'day__hero-teams', text: matchTitle(tournament, view) }),
    ];

    if (canScore(ctx)) {
      children.push(C.button({
        label: translate('workspace.tournament.nextMatch.scoreBtn', 'Anotar este partido'),
        onClick: function () { ctx.openOverlay('scoring', { matchId: view.matchId }); },
      }));
    } else {
      // No scoring button for a spectator, and no per-match request: access is
      // granted for the whole tournament, so asking belongs in one card.
      children.push(el('p', {
        class: 'day__hero-readonly',
        text: translate('day.readOnlyMatch', 'Solo lectura — no puedes anotar este torneo'),
      }));
    }

    return el('section', { class: 'c-panel day__hero' }, children);
  }

  function stageProgressPanel(day) {
    if (!day.stageProgress.length) return null;
    return C.panel({ label: translate('workspace.tournament.stageProgress.heading', 'Progreso') },
      day.stageProgress.map(function (stage) {
        var name = stage.kind === 'group'
          ? translate('tournament.day.stageProgress.group', 'Grupo ' + stage.id, { group: stage.id })
          : translate(stage.label, stage.id);
        return el('div', { class: 'day__stage' }, [
          el('div', { class: 'day__stage-head' }, [
            el('p', { class: 'day__stage-name', text: name }),
            el('span', {
              class: 'day__stage-count',
              text: translate('workspace.tournament.stageProgress.count',
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
        label: translate('tournament.seeAll', 'Ver todos'),
        onClick: options.onSeeAll,
      } : null,
    }, shown.map(function (view) { return matchRowFor(ctx, tournament, view); }));
  }

  /** The table as the side column wants it: no picker, no legend. Below 960 it is
   * not built at all — a table nobody can see is DOM a phone pays for. */
  function standingsAside(ctx, tournament, standings) {
    var groups = tournament.groups || [];
    if (!groups.length) return null;
    if (!selectedGroupId || !groups.some(function (group) { return group.id === selectedGroupId; })) {
      selectedGroupId = groups[0].id;
    }
    var rows = standings.get ? (standings.get(selectedGroupId) || []) : [];
    var view = standingsView(rows);
    return C.panel({
      label: translate('tournament.standings', 'Clasificación'),
      meta: groups.length > 1
        ? translate('tournament.group', 'Grupo ' + selectedGroupId, { id: selectedGroupId })
        : null,
      flush: true,
      // No tie captions: they explain a reading order, and there is no room to
      // read one sideways. Grupos, one tap away, has the full table.
    }, [standingsTable(tournament, view, { ties: false })]);
  }

  /** The group picker, which on a phone lives inside the Grupos tab. At 960 it
   * moves beside the table it controls, because both are on screen at once. */
  function groupPicker(ctx, tournament) {
    var groups = tournament.groups || [];
    if (groups.length < 2) return null;
    return C.panel({ label: translate('tournament.groupsLabel', 'Grupos') }, [
      el('div', { class: 'day__group-picker' }, groups.map(function (group) {
        return C.pill({
          label: translate('tournament.group', 'Grupo ' + group.id, { id: group.id }),
          active: group.id === selectedGroupId,
          onClick: function () { selectedGroupId = group.id; ctx.rerender(); },
        });
      })),
    ]);
  }

  /** What this tournament is, at a width with room to say it (board G1): on a
   * phone it lives on Setup and checking it means a trip back. */
  function formatSummary(ctx, tournament) {
    var preset = tournament.format && tournament.format.preset;
    var pairs = (tournament.teams || []).length;
    var teamSize = ctx.appState.get().teamSize;
    var parts = [
      preset
        ? translate('format.preset.' + preset + '.title', preset)
        : translate('format.preset.classic.title', 'Clásico'),
      pairs + ' ' + translate('workspace.summary.teamsWord', 'parejas'),
      teamSize + 'vs' + teamSize,
    ];
    return C.panel({ label: translate('tournament.format.presetLabel', 'Formato') }, [
      el('p', { class: 'day__format-line', text: parts.join(' · ') }),
    ]);
  }

  function renderToday(ctx, tournament, day, standings) {
    // At 960 the spare width becomes columns instead of air (board G1): context,
    // the match being played, and the table always in sight.
    if (ctx.layout === 'wide') {
      return [
        C.column('side', [
          stageProgressPanel(day),
          groupPicker(ctx, tournament),
          formatSummary(ctx, tournament),
        ]),
        C.column('main', [
          nextMatchCard(ctx, tournament, day),
          matchSection(ctx, tournament, {
            label: translate('tournament.live', 'En vivo'),
            tone: 'warn',
            views: day.live,
            limit: 3,
            onSeeAll: function () { ctx.openOverlay('allMatches'); },
          }),
          matchSection(ctx, tournament, {
            label: translate('tournament.upNext', 'Próximos'),
            views: day.pending,
            limit: 5,
            onSeeAll: function () { ctx.openOverlay('allMatches'); },
          }),
          matchSection(ctx, tournament, {
            label: translate('tournament.recentlyFinished', 'Recién terminados'),
            views: day.recentlyFinished,
            limit: 3,
            onSeeAll: function () { ctx.openOverlay('allMatches'); },
          }),
        ]),
        C.column('extra', [standingsAside(ctx, tournament, standings)]),
      ];
    }

    return [
      nextMatchCard(ctx, tournament, day),
      stageProgressPanel(day),
      matchSection(ctx, tournament, {
        label: translate('tournament.live', 'En vivo'),
        tone: 'warn',
        views: day.live,
        limit: 3,
        onSeeAll: function () { ctx.openOverlay('allMatches'); },
      }),
      matchSection(ctx, tournament, {
        label: translate('tournament.upNext', 'Próximos'),
        views: day.pending,
        limit: 3,
        onSeeAll: function () { ctx.openOverlay('allMatches'); },
      }),
      matchSection(ctx, tournament, {
        label: translate('tournament.recentlyFinished', 'Recién terminados'),
        views: day.recentlyFinished,
        limit: 3,
        onSeeAll: function () { ctx.openOverlay('allMatches'); },
      }),
    ].filter(Boolean);
  }

  /** `slot:A1` and `winner:k-sf-2` are how the engine writes a pairing before the
   * teams exist. Parsed here, because players do not read engine vocabulary. */
  var SLOT_TOKEN = /^slot:([A-Z])(\d+)$/;
  var WINNER_TOKEN = /^winner:k-([a-z][a-z0-9]{0,11})-(\d+)$/;

  function slotLabel(token) {
    var slot = SLOT_TOKEN.exec(token || '');
    if (slot) {
      return translate('bracket.slot.group', slot[2] + 'º del grupo ' + slot[1],
        { rank: slot[2], group: slot[1] });
    }
    var winner = WINNER_TOKEN.exec(token || '');
    if (winner) {
      var stage = translate('bracket.stage.' + winner[1], winner[1].toUpperCase());
      return translate('bracket.slot.winner', 'Ganador de ' + stage + winner[2],
        { stage: stage, n: winner[2] });
    }
    return token;
  }

  /* --- Grupos (C3) ------------------------------------------------------ */

  function standingsTable(tournament, view, options) {
    return el('div', { class: 'table' }, StandingsTable.rows(function (teamId) {
      return teamName(tournament, teamId);
    }, view, options));
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
          label: translate('tournament.group', 'Grupo ' + group.id, { id: group.id }),
          active: group.id === selectedGroupId,
          onClick: function () { selectedGroupId = group.id; ctx.rerender(); },
        });
      })));
    }

    var rows = standings.get ? (standings.get(selectedGroupId) || []) : [];
    var view = standingsView(rows);

    body.push(C.panel({
      label: translate('tournament.standings', 'Clasificación') + ' · ' +
        translate('tournament.group', 'Grupo ' + selectedGroupId, { id: selectedGroupId }),
      flush: true,
    }, [standingsTable(tournament, view)].concat(StandingsTable.legend(view) || [])));

    return body;
  }

  /* --- Bracket (C4) ----------------------------------------------------- */

  function renderBracket(ctx, tournament, day, resolution) {
    if (!resolution || !resolution.stages) {
      return [C.emptyState({
        icon: 'trophy',
        title: translate('tournament.noBracket', 'Este formato no tiene eliminatorias'),
        text: translate('tournament.noBracketText', 'El torneo se decide en la fase de grupos.'),
      })];
    }

    return resolution.stages.filter(function (stage) { return stage.kind === 'knockout'; })
      .map(function (stage) {
        var stageMatches = (tournament.matches || []).filter(function (match) { return match.stageId === stage.id; });
        return C.panel({ label: translate(stage.label, stage.id) },
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
              // An unresolved pairing reads "1º del grupo A" rather than blank: the
              // shape of the bracket is information before the names exist.
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

  /* --- Every match, and finding one (C6) -------------------------------- */

  var matchQuery = '';

  /** The full schedule, and the search that belongs where the list is long.
   * Nobody looks for "match 38": they look for the one Caro is playing. */
  UIScreens.allMatches = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;
      if (!tournament) {
        return el('div', { class: 'overlay-screen' }, [
          C.subBar({
            title: translate('matches.title', 'Todos los partidos'),
            onBack: function () { ctx.closeOverlay(); },
          }),
          el('div', { class: 'overlay-screen__body' }, [
            C.emptyState({ icon: 'trophy', title: translate('tournament.none', 'Todavía no hay torneo') }),
          ]),
        ]);
      }

      var format = tournament.format || null;
      var resolution = format
        ? resolveFormat(format, { groups: tournament.groups, matches: tournament.matches })
        : null;
      var day = tournamentDay({
        format: format,
        resolution: resolution,
        matches: tournament.matches,
        groups: tournament.groups,
        standings: calculateStandings(tournament.groups, tournament.matches, { extended: true }),
      });

      var search = searchMatchViews(day.all, matchQuery, {
        teams: tournament.teams,
        // Stage and group names reach the search already translated, so the
        // selector stays free of i18n.
        termsFor: function (view) {
          var terms = [];
          if (view.stageId) terms.push(translate('tournament.format.stage.' + view.stageId, view.stageId));
          if (view.groupId) terms.push(translate('tournament.group', 'Grupo ' + view.groupId, { id: view.groupId }));
          return terms;
        },
      });

      var field = C.input({
        id: 'match-search',
        label: translate('matches.search', 'Buscar por jugador, pareja o grupo'),
        hideLabel: true,
        placeholder: translate('matches.search', 'Buscar por jugador, pareja o grupo'),
        value: matchQuery,
        onInput: function (event) { matchQuery = event.target.value; ctx.rerender(); },
        onKeyDown: function (event) {
          // Escape empties the field rather than closing the screen: the list
          // behind it is where you were going.
          if (event.key === 'Escape' && matchQuery) {
            event.stopPropagation();
            matchQuery = '';
            ctx.rerender();
          }
        },
      });

      var searchBar = el('div', { class: 'matches__search' }, [
        IconRegistry.icon('search', { size: 16, class: 'matches__search-icon' }),
        field,
        matchQuery ? C.iconButton({
          icon: 'x',
          tone: 'muted',
          size: 16,
          label: translate('matches.clear', 'Borrar la búsqueda'),
          onClick: function () { matchQuery = ''; ctx.rerender(); },
        }) : null,
      ]);

      var body = [searchBar];

      if (search.active) {
        body.push(el('p', {
          class: 'matches__count',
          text: translate('matches.results',
            search.results.length + ' de ' + search.total + ' partidos',
            { count: search.results.length, total: search.total }),
        }));
        if (!search.results.length) {
          body.push(C.emptyState({
            icon: 'search',
            title: translate('matches.noneTitle', 'Ningún partido coincide'),
            text: translate('matches.noneText', 'Prueba con el nombre de un jugador, de una pareja o de un grupo.'),
          }));
        } else {
          // One panel while searching, not the three state groups: somebody who
          // typed a name is not browsing.
          body.push(C.panel({
            label: translate('matches.resultsLabel', 'Resultados'),
            flush: true,
          }, search.results.map(function (view) {
            return matchRowFor(ctx, tournament, view);
          })));
        }
      } else {
        [
          { label: translate('tournament.live', 'En vivo'), tone: 'warn', views: day.live },
          { label: translate('tournament.upNext', 'Próximos'), views: day.pending },
          { label: translate('matches.finished', 'Terminados'), views: day.all.filter(function (view) {
            return view.status === 'finished';
          }) },
        ].forEach(function (section) {
          if (!section.views.length) return;
          body.push(C.panel({
            label: section.label + ' · ' + section.views.length,
            labelTone: section.tone,
            flush: true,
          }, section.views.map(function (view) { return matchRowFor(ctx, tournament, view); })));
        });
      }

      return el('div', { class: 'overlay-screen' }, [
        C.subBar({
          title: translate('matches.title', 'Todos los partidos'),
          sub: translate('matches.progress',
            day.progress.played + ' de ' + day.progress.total + ' jugados',
            { played: day.progress.played, total: day.progress.total }),
          onBack: function () { matchQuery = ''; ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.tournament = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;
      var session = snapshot.session;

      // A dead link has to say so: "no tournament yet" would blame the visitor for
      // a session somebody else reset.
      if (session && (session.state === 'notFound' || session.state === 'unsupported')) {
        var gone = session.state === 'notFound';
        return [C.emptyState({
          icon: gone ? 'circle-alert' : 'info',
          title: gone
            ? translate('session.goneTitle', 'Este torneo ya no está disponible')
            : translate('session.unsupportedTitle', 'No podemos abrir este torneo'),
          text: gone
            ? translate('session.goneText', 'El organizador lo reinició, o el link está incompleto. Pídele uno nuevo.')
            : translate('session.unsupportedText', 'El link viene de una versión más reciente de la app. Recarga para actualizarla.'),
          actions: [C.button({
            label: gone
              ? translate('session.leaveLink', 'Salir del link compartido')
              : translate('session.reload', 'Recargar'),
            variant: 'ghost',
            onClick: gone ? ctx.leaveSession : function () { window.location.reload(); },
          })],
        })];
      }

      if (!tournament) {
        return [C.emptyState({
          icon: 'trophy',
          title: translate('tournament.none', 'Todavía no hay torneo'),
          text: translate('tournament.noneText', 'Genera los equipos y elige cómo quieren jugar.'),
          actions: [C.button({
            label: translate('nav.goToTeams', 'Ir a Equipos'),
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

      // One access card, once: the permission is per tournament, so repeating the
      // offer per match would suggest a scope that does not exist.
      if (SessionAccess.isSpectator(session)) {
        body.push(el('section', { class: 'c-panel day__access' }, [
          el('div', { class: 'day__access-head' }, [
            IconRegistry.icon('eye', { size: 16, class: 'day__access-icon' }),
            C.overline(translate('day.readOnly', 'Solo lectura'), 'info'),
          ]),
          el('p', {
            class: 'day__access-title',
            text: translate('day.viewingTournament', 'Estás viendo un torneo compartido'),
          }),
          el('p', {
            class: 'day__access-body',
            text: translate('day.accessBody',
              'Los resultados se actualizan en vivo. Para anotar necesitas que el organizador te dé acceso, y se concede para todo el torneo — no partido a partido.'),
          }),
          C.button({
            label: session.accessStatus === 'pending'
              ? translate('access.pendingShort', 'Solicitud enviada')
              : translate('tournament.access.request', 'Pedir acceso para anotar'),
            disabled: session.accessStatus === 'pending',
            onClick: function () { ctx.openOverlay('requestAccess'); },
          }),
        ]));
      }

      // The rest moved into the app bar menu (board H1). This stays on screen
      // because somebody is standing on the court asking to be let in.
      if (session && SessionAccess.isOwner(session)) {
        var pending = SessionAccess.pendingCount(session);
        if (pending) {
          body.push(C.statusStrip({
            icon: 'users',
            tone: 'warn',
            assertive: true,
            text: pending === 1
              ? translate('day.oneRequest', 'Alguien pide acceso para anotar')
              : translate('day.manyRequests', pending + ' personas piden acceso para anotar', { count: pending }),
            action: {
              label: translate('day.reviewRequests', 'Revisar'),
              onClick: function () { ctx.openOverlay('scorers'); },
            },
          }));
        }

      }

      body = body.concat([
        C.subTabs({
          active: subView,
          label: translate('workspace.nav.tournament', 'Torneo'),
          items: (ctx.view.subViewItems || []).map(function (item) {
            return {
              id: item.id,
              label: translate(item.labelKey, { today: 'Hoy', groups: 'Grupos', bracket: 'Bracket' }[item.id]),
            };
          }),
          onSelect: ctx.selectSubView,
        }),
      ]);

      if (subView === 'groups') body = body.concat(renderGroups(ctx, tournament, standings));
      else if (subView === 'bracket') body = body.concat(renderBracket(ctx, tournament, day, resolution));
      else body = body.concat(renderToday(ctx, tournament, day, standings));

      return body;
    },
  };
})();
