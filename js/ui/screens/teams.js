/** Teams and the mode fork — boards B1, B2 and B3. A couple is one row, and the
 * organiser name is asked in the fork, where a tournament is first known of. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var optionsOpen = false;
  var forkMode = 'tournament';
  var kingCondition = 'consecutive';
  var kingTarget = 5;
  var ownerDraft = null;


  /* --- Couples ---------------------------------------------------------- */

  function couplesPanel(ctx, snapshot) {
    var teams = snapshot.teams || [];
    return C.panel({
      label: translate('results.heading', 'Parejas') + ' · ' + teams.length,
      action: { label: translate('actions.regenerate', 'Regenerar'), onClick: function () { ctx.generateTeams(); } },
    }, [
      C.list({}, teams.map(function (team, index) {
        return C.coupleRow({
          index: String(index + 1),
          player1: team.player1 ? team.player1.name : '',
          player2: team.player2 ? team.player2.name : '',
          type: team.type === 'mixed' ? 'mixed' : 'same',
          typeLabel: team.type === 'mixed'
            ? translate('results.typeMixed', 'Mixta')
            : translate('results.typeSame', 'Mismo género'),
        });
      })),
    ]);
  }

  /** v1 put the unmatched notice at the very bottom, after the cards, as a
   * centred yellow block. It belongs at the top with the way out next to it. */
  function unmatchedStrip(ctx, snapshot) {
    if (!snapshot.unmatched.length) return null;
    var names = snapshot.unmatched.map(function (player) { return player.name; }).join(', ');
    return C.statusStrip({
      icon: 'triangle-alert',
      tone: 'warn',
      text: names + ' ' + translate('unmatched.text', 'se queda sin pareja'),
      action: {
        label: translate('teams.addPlayer', 'Añadir'),
        onClick: function () { ctx.navigate('setup'); },
      },
    });
  }

  function optionsPanel(ctx) {
    if (!optionsOpen) {
      return el('button', {
        class: 'config__customize',
        attrs: { type: 'button' },
        on: { click: function () { optionsOpen = true; ctx.rerender(); } },
      }, [
        IconRegistry.icon('chevron-down', { size: 16 }),
        el('span', { text: translate('workspace.teams.moreOptions', 'Más opciones') }),
      ]);
    }

    var options = [
      {
        icon: 'shuffle',
        title: translate('actions.regenerate', 'Regenerar parejas'),
        desc: translate('teams.regenerateDesc', 'Vuelve a repartir al azar'),
        onClick: function () { ctx.generateTeams(); },
      },
      {
        icon: 'pencil',
        title: translate('workspace.teams.editPairs', 'Editar parejas a mano'),
        desc: translate('teams.editDesc', 'Fija quién juega con quién'),
        onClick: function () {
          ctx.appState.setConfig({ pairingMode: 'manual' });
          ctx.openOverlay('manualPairing');
        },
      },
      {
        icon: 'x',
        title: translate('actions.clearAll', 'Vaciar jugadores'),
        desc: translate('teams.clearDesc', 'Borra el plantel y empieza de cero'),
        danger: true,
        onClick: function () {
          ctx.openOverlay('confirmClear');
        },
      },
    ];

    return C.panel({ label: translate('workspace.teams.moreOptions', 'Más opciones') },
      options.map(function (option) {
        return el('button', {
          class: ['teams__option', option.danger && 'is-danger'],
          attrs: { type: 'button' },
          on: { click: option.onClick },
        }, [
          IconRegistry.icon(option.icon, { size: 18 }),
          el('div', { class: 'teams__option-text' }, [
            el('p', { class: 'teams__option-title', text: option.title }),
            el('p', { class: 'teams__option-desc', text: option.desc }),
          ]),
          IconRegistry.icon('chevron-right', { size: 16, class: 'teams__option-chevron' }),
        ]);
      }));
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.teams = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var body = [
        unmatchedStrip(ctx, snapshot),
        couplesPanel(ctx, snapshot),
        optionsPanel(ctx),
      ].filter(Boolean);

      body.push(el('div', { class: 'app__action-bar' }, [
        C.button({
          label: translate('tournament.start', 'Empezar torneo'),
          onClick: function () { forkMode = 'tournament'; ctx.openOverlay('modeFork'); },
        }),
        el('button', {
          class: 'teams__alt',
          attrs: { type: 'button' },
          on: { click: function () { forkMode = 'king'; ctx.openOverlay('modeFork'); } },
        }, [
          IconRegistry.icon('crown', { size: 15 }),
          el('span', { text: translate('teams.orKing', 'o jugar King of the Court') }),
        ]),
      ]));

      return body;
    },
  };

  /* --- Mode fork (B3) --------------------------------------------------- */

  function modeCard(ctx, options) {
    var head = el('div', { class: 'fork__head' }, [
      IconRegistry.icon(options.icon, { size: 24, class: 'fork__icon' }),
      el('div', { class: 'fork__text' }, [
        el('p', { class: 'fork__title', text: options.title }),
        el('p', { class: 'fork__desc', text: options.desc }),
      ]),
      IconRegistry.icon(options.active ? 'circle-check' : 'circle', { size: 20, class: 'fork__check' }),
    ]);

    var children = [head];
    if (options.active && options.extra) {
      children.push(el('div', { class: 'fork__divider' }));
      options.extra.forEach(function (node) { children.push(node); });
    }

    return el('button', {
      class: ['fork__card', options.active && 'is-active'],
      attrs: { type: 'button', 'aria-pressed': options.active ? 'true' : 'false' },
      on: { click: options.onClick },
    }, children);
  }

  function ownerField(ctx, snapshot) {
    if (ownerDraft === null) ownerDraft = snapshot.ownerLabel || '';
    var field = C.input({
      id: 'fork-owner',
      label: translate('tournament.ownerLabel', '¿Quién organiza?'),
      placeholder: translate('tournament.ownerPlaceholder', 'Tu nombre (opcional)'),
      value: ownerDraft,
      maxLength: 50,
      onInput: function (event) { ownerDraft = event.target.value; },
    });
    // The field lives inside a <button>; without this a tap to type would be
    // read as a tap on the card and re-select the mode.
    field.addEventListener('click', function (event) { event.stopPropagation(); });
    return el('div', { class: 'fork__field' }, [
      field,
      el('p', {
        class: 'fork__hint',
        text: translate('tournament.ownerHint',
          'Aparecerá en el historial de cambios. Si lo dejas vacío, dirá "Organizador".'),
      }),
    ]);
  }

  function kingSettings(ctx) {
    function stop(node) {
      node.addEventListener('click', function (event) { event.stopPropagation(); });
      return node;
    }
    return el('div', { class: 'fork__settings' }, [
      el('div', { class: 'fork__setting' }, [
        C.overline(translate('king.winConditionLabel', 'Gana por')),
        stop(C.toggleGroup({
          label: translate('king.winConditionLabel', 'Gana por'),
          options: [
            { id: 'consecutive', label: translate('king.condConsecutive', 'Seguidas'), active: kingCondition === 'consecutive' },
            { id: 'total', label: translate('king.condTotal', 'Totales'), active: kingCondition === 'total' },
          ],
          onSelect: function (id) {
            kingCondition = id;
            if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
            else ctx.rerender();
          },
        })),
      ]),
      el('div', { class: 'fork__setting' }, [
        C.overline(translate('king.targetLabel', 'Victorias para ganar')),
        stop(C.toggleGroup({
          label: translate('king.targetLabel', 'Victorias para ganar'),
          options: [5, 7, 10].map(function (value) {
            return { id: value, label: String(value), active: kingTarget === value };
          }),
          onSelect: function (id) {
            kingTarget = id;
            if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
            else ctx.rerender();
          },
        })),
      ]),
    ]);
  }

  UIScreens.modeFork = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var isTournament = forkMode === 'tournament';

      return C.sheet({
        title: translate('workspace.teams.forkHeading', '¿Cómo quieren jugar?'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, [
        modeCard(ctx, {
          icon: 'trophy',
          title: translate('workspace.teams.forkTournament', 'Torneo'),
          desc: translate('teams.forkTournamentDesc', 'Grupos, tabla y final. Todos juegan lo mismo.'),
          active: isTournament,
          onClick: function () {
            forkMode = 'tournament';
            if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
            else ctx.rerender();
          },
          extra: [ownerField(ctx, snapshot)],
        }),
        modeCard(ctx, {
          icon: 'crown',
          title: translate('workspace.teams.forkKing', 'King of the Court'),
          desc: translate('teams.forkKingDesc', 'El que gana se queda en la cancha. Cola de retadores.'),
          active: !isTournament,
          onClick: function () {
            forkMode = 'king';
            if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
            else ctx.rerender();
          },
          extra: [kingSettings(ctx)],
        }),
        isTournament ? el('button', {
          class: 'fork__configure',
          attrs: { type: 'button' },
          on: { click: function () { ctx.openOverlay('tournamentConfig'); } },
        }, [
          IconRegistry.icon('chevron-right', { size: 15 }),
          el('span', {
            text: translate('tournament.configureFirst', 'Ajustar grupos y formato') + ' · ' +
              (snapshot.groupCount === 1
                ? translate('tournament.groupCount.one', '1 grupo')
                : translate('tournament.groupCount.many', snapshot.groupCount + ' grupos', { count: snapshot.groupCount })),
          }),
        ]) : null,
        C.button({
          label: isTournament
            ? translate('tournament.start', 'Empezar torneo')
            : translate('king.start', 'Empezar King of the Court'),
          onClick: function () {
            if (isTournament) ctx.startTournament({ ownerLabel: ownerDraft });
            else ctx.startKing({ winCondition: kingCondition, target: kingTarget });
          },
        }),
      ]);
    },
  };

  UIScreens.confirmClear = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var hasActiveTournament = !!snapshot.tournament || !!snapshot.king;
      var actions = [
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
      ];

      if (hasActiveTournament) {
        actions.push(C.button({
          icon: 'rotate-ccw',
          variant: 'primary',
          label: translate('actions.resetKeepPlayers', 'Nuevo torneo (conservar jugadores)'),
          onClick: function () {
            ctx.resetTournament('teams');
            ctx.closeOverlay();
          },
        }));
      }

      actions.push(C.button({
        variant: 'ghost',
        label: translate('actions.cancel', 'Cancelar'),
        onClick: function () {
          ctx.closeOverlay();
        },
      }));

      return C.sheet({
        title: translate('actions.confirmClearTitle', '¿Vaciar jugadores?'),
        sub: translate('actions.confirmClearDesc', '¿Qué deseas hacer para empezar de cero?'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, actions);
    },
  };
})();
