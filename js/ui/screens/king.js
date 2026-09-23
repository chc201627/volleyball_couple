/** King of the Court — boards E1 and E2. Local only, so no sharing, scorers or
 * history; the two rally buttons differ in shape, not only in colour. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var logOpen = false;


  /* --- Champion (E2) ---------------------------------------------------- */

  function champion(ctx, king) {
    var stats = [
      { key: translate('king.rallies', 'Rallies jugados'), value: String(king.rallyLog.length) },
      {
        key: translate('king.challengers', 'Retadores que pasaron'),
        // The log records challengerTeamId per rally; distinct ids is how many
        // pairs actually stepped on court, which is not the same as the roster.
        value: String(new Set(king.rallyLog.map(function (entry) { return entry.challengerTeamId; })).size),
      },
      {
        key: translate('king.bestStreak', 'Racha más larga'),
        value: String(king.rallyLog.reduce(function (best, entry) {
          return Math.max(best, entry.kingWinsAfter || 0);
        }, 0)),
      },
    ];

    return [
      el('section', { class: 'king__champion' }, [
        IconRegistry.icon('crown', { size: 52, class: 'king__champion-icon' }),
        C.overline(translate('king.winnerTitle', 'Campeones de la cancha'), 'accent'),
        el('p', { class: 'king__champion-name', text: king.winner.name }),
        el('p', {
          class: 'king__champion-how',
          text: king.targetWins + ' ' + (king.winCondition === 'consecutive'
            ? translate('king.winsConsecutive', 'victorias seguidas')
            : translate('king.winsTotal', 'victorias totales')),
        }),
      ]),
      C.panel({ label: translate('king.roundLabel', 'La ronda') }, stats.map(function (stat) {
        return el('div', { class: 'king__stat' }, [
          el('p', { class: 'king__stat-key', text: stat.key }),
          el('p', { class: 'king__stat-value', text: stat.value }),
        ]);
      })),
      el('div', { class: 'app__action-bar' }, [
        C.button({
          label: translate('king.another', 'Otra ronda'),
          onClick: function () {
            ctx.appState.startKing({ winCondition: king.winCondition, target: king.targetWins });
          },
        }),
        C.button({
          label: translate('nav.goToResults', 'Ver resultados'),
          variant: 'ghost',
          onClick: function () { ctx.navigate('results'); },
        }),
      ]),
    ];
  }

  /* --- In play (E1) ----------------------------------------------------- */

  function throne(king) {
    var dots = [];
    var target = king.targetWins;
    var achieved = king.winCondition === 'consecutive' ? king.kingWins : king.kingTotalWins;
    for (var i = 0; i < target; i++) {
      dots.push(el('span', { class: ['king__dot', i < achieved && 'is-filled'] }));
    }

    return el('section', { class: 'king__throne' }, [
      IconRegistry.icon('crown', { size: 32, class: 'king__throne-icon' }),
      C.overline(translate('king.roleKing', 'Rey'), 'accent'),
      el('p', { class: 'king__team', text: king.king.name }),
      el('div', { class: 'king__dots' }, dots),
      el('p', {
        class: 'king__wins',
        text: achieved + ' ' + translate('king.of', 'de') + ' ' + target + ' ' +
          (king.winCondition === 'consecutive'
            ? translate('king.winsConsecutive', 'victorias seguidas')
            : translate('king.winsTotal', 'victorias totales')),
      }),
    ]);
  }

  function challenger(king) {
    var next = king.queue[0];
    return el('section', { class: 'king__challenger' }, [
      C.overline(translate('king.roleChallenger', 'Reta')),
      el('p', { class: 'king__team', text: next ? next.name : '—' }),
    ]);
  }

  function rallyActions(ctx, king) {
    return el('div', { class: 'king__actions' }, [
      C.button({
        label: translate('king.kingWins', 'Punto para el rey'),
        onClick: function () { ctx.appState.setKing(recordRally(king, 'king')); },
      }),
      // Outlined rather than a second solid colour: the pair must be
      // distinguishable by shape alone.
      el('button', {
        class: 'king__challenger-btn',
        attrs: { type: 'button' },
        on: { click: function () { ctx.appState.setKing(recordRally(king, 'challenger')); } },
      }, [el('span', { text: translate('king.challengerWins', 'Punto para el retador') })]),
    ]);
  }

  function queuePanel(king) {
    if (!king.queue.length) return null;
    var upcoming = king.queue.slice(0, 3);
    return C.panel({ label: translate('king.queueHeading', 'Cola') + ' · ' + king.queue.length },
      upcoming.map(function (team, index) {
        return el('div', { class: 'king__queue-row' }, [
          el('span', { class: 'king__queue-index', text: String(index + 1) }),
          el('p', { class: 'king__queue-name', text: team.name }),
        ]);
      }).concat(king.queue.length > upcoming.length ? [
        el('p', {
          class: 'king__queue-more',
          text: '… ' + (king.queue.length - upcoming.length) + ' ' + translate('king.more', 'más'),
        }),
      ] : []));
  }

  function logPanel(ctx, king) {
    if (!king.rallyLog.length) return null;
    if (!logOpen) {
      return el('button', {
        class: 'config__customize',
        attrs: { type: 'button' },
        on: { click: function () { logOpen = true; ctx.rerender(); } },
      }, [
        IconRegistry.icon('history', { size: 16 }),
        el('span', { text: translate('king.logHeading', 'Historial de rallies') + ' · ' + king.rallyLog.length }),
      ]);
    }
    return C.panel({
      label: translate('king.logHeading', 'Historial de rallies'),
      action: { label: translate('king.hideLog', 'Ocultar'), onClick: function () { logOpen = false; ctx.rerender(); } },
    }, king.rallyLog.slice().reverse().slice(0, 10).map(function (entry) {
      // The log stores team ids and a side, never names: resolve them here so a
      // restored game from storage still reads correctly.
      var winnerId = entry.winnerSide === 'king' ? entry.kingTeamId : entry.challengerTeamId;
      var winner = king.teams.filter(function (team) { return team.id === winnerId; })[0];
      return el('div', { class: 'king__log-row' }, [
        el('span', { class: 'king__log-index', text: String(entry.rallyNumber) }),
        el('p', {
          class: 'king__log-text',
          text: (winner ? winner.name : winnerId) + ' · ' +
            (entry.winnerSide === 'king'
              ? translate('king.keptThrone', 'mantuvo el trono')
              : translate('king.tookThrone', 'tomó el trono')),
        }),
      ]);
    }));
  }

  UIScreens.king = {
    render: function (ctx) {
      var king = ctx.appState.get().king;
      if (!king) {
        return [C.emptyState({
          icon: 'crown',
          title: translate('king.none', 'No hay partida de King'),
          text: translate('king.noneText', 'Genera los equipos y elige King of the Court.'),
          actions: [C.button({
            label: translate('nav.goToTeams', 'Ir a Equipos'),
            onClick: function () { ctx.navigate('teams'); },
          })],
        })];
      }

      if (king.winner) return champion(ctx, king);

      return [
        throne(king),
        el('p', { class: 'king__vs', text: 'VS' }),
        challenger(king),
        rallyActions(ctx, king),
        queuePanel(king),
        logPanel(ctx, king),
        C.button({
          label: translate('king.reset', 'Reiniciar King'),
          variant: 'danger',
          icon: 'rotate-ccw',
          onClick: function () {
            if (!window.confirm(translate('king.confirmReset', '¿Seguro que quieres reiniciar la partida?'))) return;
            ctx.appState.resetKing();
            ctx.navigate('teams');
          },
        }),
      ].filter(Boolean);
    },
  };
})();
