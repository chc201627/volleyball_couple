/** Results — boards F1 to F4. The same table as Grupos, through standings-table.js;
 * what differs is medals on the top three, and a champion that is the screen. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;


  var teamName = TournamentText.teamName;

  /* --- Table ------------------------------------------------------------ */

  // Abbreviations are translated: PJ/G/P read as nothing in English.
  function table(tournament, view) {
    return el('div', { class: 'table' }, StandingsTable.rows(function (teamId) {
      return teamName(tournament, teamId);
    }, view));
  }

  /* --- Sections --------------------------------------------------------- */

  function championCard(tournament, outcome) {
    if (!outcome || outcome.kind !== 'champion' || !outcome.championTeamId) return null;
    return el('section', { class: 'results__champion' }, [
      IconRegistry.icon('trophy', { size: 46, class: 'results__champion-icon' }),
      C.overline(translate('results.champion', 'Campeón'), 'accent'),
      el('p', { class: 'results__champion-name', text: teamName(tournament, outcome.championTeamId) }),
    ]);
  }

  function actionsRow(ctx) {
    var actions = [
      { icon: 'share-2', label: translate('day.share', 'Compartir'), onClick: function () { ctx.openOverlay('share'); } },
      { icon: 'history', label: translate('history.title', 'Historial'), onClick: function () { ctx.openOverlay('history'); } },
      { icon: 'rotate-ccw', label: translate('workspace.results.startAnother', 'Nuevo torneo'), onClick: function () { ctx.openOverlay('confirmReset'); } },
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
          title: translate('workspace.results.empty', 'Todavía no hay resultados'),
          text: translate('results.emptyText',
            'Cuando arranques un torneo verás aquí la tabla en vivo y, al terminar, el campeón.'),
          actions: [C.button({
            label: translate('workspace.results.emptyLink', 'Ir a Inicio'),
            onClick: function () { ctx.navigate('setup'); },
          })],
        })];
      }

      var projection = tournamentDayProjection(Object.assign({}, tournament, { king: snapshot.king }));
      var format = projection.format;
      var standings = projection.standings;
      var day = projection.day;

      var body = [];
      var champion = championCard(tournament, day.outcome);
      if (champion) body.push(champion);

      body.push(el('p', {
        class: 'results__format',
        text: [
          translate('tournament.format.preset.' + (format ? format.preset : 'classic'), 'Clásico'),
          tournament.teams.length + ' ' + translate('results.pairs', 'parejas'),
          day.progress.played + ' / ' + day.progress.total + ' ' + translate('results.matches', 'partidos'),
        ].join(' · '),
      }));

      (tournament.groups || []).forEach(function (group) {
        var view = standingsView(standings.get(group.id) || [], { medals: true });
        body.push(C.panel({
          label: (tournament.groups.length > 1
            ? translate('tournament.group', 'Grupo ' + group.id, { id: group.id }) + ' · '
            : '') + (day.complete
              ? translate('tournament.standingsFinal', 'Clasificación final')
              : translate('tournament.standingsLive', 'Clasificación en vivo')),
          flush: true,
        }, [table(tournament, view)]));
      });

      // A gold medal halfway through a tournament reads as "already won", so
      // the provisional state says so in as many words.
      if (!day.complete) {
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'warn',
          text: translate('results.provisional',
            'Posiciones provisionales: quedan ' + (day.progress.total - day.progress.played) + ' partidos por jugar',
            { count: day.progress.total - day.progress.played }),
        }));
      }

      body.push(actionsRow(ctx));
      return body;
    },
  };

  UIScreens.confirmReset = {
    render: function (ctx) {
      return C.sheet({
        title: translate('tournament.newTournamentTitle', '¿Empezar un nuevo torneo?'),
        sub: translate('tournament.newTournamentDesc', '¿Qué deseas hacer con el plantel actual?'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, [
        C.button({
          icon: 'users',
          variant: 'primary',
          label: translate('actions.resetKeepPlayers', 'Nuevo torneo (conservar jugadores)'),
          onClick: function () {
            ctx.resetTournament('teams');
            ctx.closeOverlay();
          },
        }),
        C.button({
          icon: 'trash-2',
          variant: 'danger',
          label: translate('actions.clearAllAndReset', 'Vaciar todo y empezar de cero'),
          onClick: function () {
            ctx.appState.clearPlayers();
            ctx.resetTournament('setup');
            ctx.closeOverlay();
          },
        }),
        C.button({
          variant: 'ghost',
          label: translate('actions.cancel', 'Cancelar'),
          onClick: function () {
            ctx.closeOverlay();
          },
        }),
      ]);
    },
  };
})();
