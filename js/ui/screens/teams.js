/** Teams screen and mode fork — canvas boards B1, B2 and B3.
 *
 * The couple card of v1 was ~130px tall for two names and a tag; with eleven
 * couples you scrolled past the whole thing to reach the button. Here a couple
 * is one row, so the list is the screen rather than a preamble to it.
 *
 * WHERE THE ORGANISER NAME IS ASKED
 * ---------------------------------
 * In the mode fork's Tournament card, not in the configuration screen. Two
 * reasons: it is the first moment the app knows a tournament is being created,
 * and King of the Court never creates a Firebase session — so asking there
 * would collect a name that nothing would ever use. It is optional and
 * remembered, so it is typed once ever and falls back to "Organizador".
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var optionsOpen = false;
  var forkMode = 'tournament';
  var kingCondition = 'consecutive';
  var kingTarget = 5;
  var ownerDraft = null;

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  /* --- Couples ---------------------------------------------------------- */

  function couplesPanel(ctx, snapshot) {
    var teams = snapshot.teams || [];
    return C.panel({
      label: label('results.heading', 'Parejas') + ' · ' + teams.length,
      action: { label: label('actions.regenerate', 'Regenerar'), onClick: function () { ctx.generateTeams(); } },
    }, [
      C.list({}, teams.map(function (team, index) {
        return C.coupleRow({
          index: String(index + 1),
          player1: team.player1 ? team.player1.name : '',
          player2: team.player2 ? team.player2.name : '',
          type: team.type === 'mixed' ? 'mixed' : 'same',
          typeLabel: team.type === 'mixed'
            ? label('results.typeMixed', 'Mixta')
            : label('results.typeSame', 'Mismo género'),
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
      text: names + ' ' + label('unmatched.text', 'se queda sin pareja'),
      action: {
        label: label('teams.addPlayer', 'Añadir'),
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
        el('span', { text: label('workspace.teams.moreOptions', 'Más opciones') }),
      ]);
    }

    var options = [
      {
        icon: 'shuffle',
        title: label('actions.regenerate', 'Regenerar parejas'),
        desc: label('teams.regenerateDesc', 'Vuelve a repartir al azar'),
        onClick: function () { ctx.generateTeams(); },
      },
      {
        icon: 'pencil',
        title: label('workspace.teams.editPairs', 'Editar parejas a mano'),
        desc: label('teams.editDesc', 'Fija quién juega con quién'),
        onClick: function () { ctx.openOverlay('manualPairing'); },
      },
      {
        icon: 'x',
        title: label('actions.clearAll', 'Vaciar jugadores'),
        desc: label('teams.clearDesc', 'Borra el plantel y empieza de cero'),
        danger: true,
        onClick: function () {
          if (!window.confirm(label('actions.confirmClear', '¿Seguro que quieres borrar todos los jugadores?'))) return;
          ctx.appState.clearPlayers();
          ctx.navigate('setup');
        },
      },
    ];

    return C.panel({ label: label('workspace.teams.moreOptions', 'Más opciones') },
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
          label: label('tournament.start', 'Empezar torneo'),
          onClick: function () { forkMode = 'tournament'; ctx.openOverlay('modeFork'); },
        }),
        el('button', {
          class: 'teams__alt',
          attrs: { type: 'button' },
          on: { click: function () { forkMode = 'king'; ctx.openOverlay('modeFork'); } },
        }, [
          IconRegistry.icon('crown', { size: 15 }),
          el('span', { text: label('teams.orKing', 'o jugar King of the Court') }),
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
      label: label('tournament.ownerLabel', '¿Quién organiza?'),
      placeholder: label('tournament.ownerPlaceholder', 'Tu nombre (opcional)'),
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
        text: label('tournament.ownerHint',
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
        C.overline(label('king.winConditionLabel', 'Gana por')),
        stop(C.toggleGroup({
          label: label('king.winConditionLabel', 'Gana por'),
          options: [
            { id: 'consecutive', label: label('king.condConsecutive', 'Seguidas'), active: kingCondition === 'consecutive' },
            { id: 'total', label: label('king.condTotal', 'Totales'), active: kingCondition === 'total' },
          ],
          onSelect: function (id) { kingCondition = id; ctx.rerender(); },
        })),
      ]),
      el('div', { class: 'fork__setting' }, [
        C.overline(label('king.targetLabel', 'Victorias para ganar')),
        stop(C.toggleGroup({
          label: label('king.targetLabel', 'Victorias para ganar'),
          options: [5, 7, 10].map(function (value) {
            return { id: value, label: String(value), active: kingTarget === value };
          }),
          onSelect: function (id) { kingTarget = id; ctx.rerender(); },
        })),
      ]),
    ]);
  }

  UIScreens.modeFork = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var isTournament = forkMode === 'tournament';

      return C.sheet({
        title: label('workspace.teams.forkHeading', '¿Cómo quieren jugar?'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, [
        modeCard(ctx, {
          icon: 'trophy',
          title: label('workspace.teams.forkTournament', 'Torneo'),
          desc: label('teams.forkTournamentDesc', 'Grupos, tabla y final. Todos juegan lo mismo.'),
          active: isTournament,
          onClick: function () { forkMode = 'tournament'; ctx.rerender(); },
          extra: [ownerField(ctx, snapshot)],
        }),
        modeCard(ctx, {
          icon: 'crown',
          title: label('workspace.teams.forkKing', 'King of the Court'),
          desc: label('teams.forkKingDesc', 'El que gana se queda en la cancha. Cola de retadores.'),
          active: !isTournament,
          onClick: function () { forkMode = 'king'; ctx.rerender(); },
          extra: [kingSettings(ctx)],
        }),
        isTournament ? el('button', {
          class: 'fork__configure',
          attrs: { type: 'button' },
          on: { click: function () { ctx.openOverlay('tournamentConfig'); } },
        }, [
          IconRegistry.icon('chevron-right', { size: 15 }),
          el('span', {
            text: label('tournament.configureFirst', 'Ajustar grupos y formato') + ' · ' +
              (snapshot.groupCount === 1
                ? label('tournament.groupCount.one', '1 grupo')
                : label('tournament.groupCount.many', snapshot.groupCount + ' grupos', { count: snapshot.groupCount })),
          }),
        ]) : null,
        C.button({
          label: isTournament
            ? label('tournament.start', 'Empezar torneo')
            : label('king.start', 'Empezar King of the Court'),
          onClick: function () {
            if (isTournament) ctx.startTournament({ ownerLabel: ownerDraft });
            else ctx.startKing({ winCondition: kingCondition, target: kingTarget });
          },
        }),
      ]);
    },
  };
})();
