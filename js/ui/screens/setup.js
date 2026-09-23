/** Setup — boards A1 (empty) and A2 (with players): one screen with two states.
 * Adding is one row and two rows of 44px toggles, meant for typing on a court. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  /** Draft of the add-player form, kept here rather than in app state: a half-typed
   * name must not persist, sync, or invalidate the generated teams. */
  var draft = { name: '', gender: 'female', level: null };
  var search = '';
  var COLLAPSED_ROSTER = 6;
  var showAllPlayers = false;
  /** The empty state offers two paths and reveals the form on the first. Without
   * the flag the button focused a field the empty state had not rendered. */
  var addFormOpen = false;


  /** Each chip states the current value and opens where to change it, in place of
   * the three labelled rows of buttons that took a third of the screen. */
  function contextChips(ctx) {
    var config = ctx.appState.get();
    var sizes = [2, 3, 4];
    var chips = [
      {
        label: config.teamSize + 'vs' + config.teamSize,
        active: true,
        onClick: function () {
          var next = sizes[(sizes.indexOf(config.teamSize) + 1) % sizes.length];
          ctx.appState.setConfig({ teamSize: next });
        },
      },
      {
        label: config.pairingMode === 'manual'
          ? translate('pairing.modeManual', 'Manual')
          : translate('pairing.modeRandom', 'Aleatorio'),
        active: config.pairingMode === 'manual',
        onClick: function () {
          var manual = config.pairingMode !== 'manual';
          ctx.appState.setConfig({ pairingMode: manual ? 'manual' : 'random' });
          // Switching to manual opens the screen where it is done: choosing the
          // mode and never being shown where to use it is v1's dead end.
          if (manual && config.players.length >= 2) ctx.openOverlay('manualPairing');
        },
      },
    ];
    if (config.teams) {
      chips.push({
        label: translate('tournament.configShort', 'Torneo'),
        active: false,
        onClick: function () { ctx.openOverlay('tournamentConfig'); },
      });
    }
    return el('div', { class: 'setup__chips' }, chips.map(function (chip) {
      return C.pill({ label: chip.label, active: chip.active, onClick: chip.onClick });
    }));
  }

  /* --- Empty state (A1) ------------------------------------------------- */

  function emptyState(ctx) {
    return C.emptyState({
      icon: 'users',
      title: translate('setup.empty.title', '¿Quién juega hoy?'),
      text: translate('setup.empty.text', 'Añade jugadores uno a uno o pega la lista completa del grupo.'),
      actions: [
        C.button({
          label: translate('setup.empty.add', 'Añadir jugador'),
          onClick: function () {
            addFormOpen = true;
            ctx.rerender();
            var field = document.getElementById('setup-name');
            if (field) field.focus();
          },
        }),
        C.button({
          label: translate('import.pasteMode', 'Pegar lista'),
          variant: 'ghost',
          icon: 'plus',
          onClick: function () { ctx.openOverlay('import'); },
        }),
      ],
    });
  }

  /* --- Quick add (A2) --------------------------------------------------- */

  function quickAdd(ctx) {
    var nameField = C.input({
      id: 'setup-name',
      label: translate('form.nameLabel', 'Nombre del jugador'),
      hideLabel: true,
      placeholder: translate('form.namePlaceholder', 'Nombre del jugador'),
      value: draft.name,
      maxLength: 50,
      onInput: function (event) { draft.name = event.target.value; refreshAddButton(); },
      onKeyDown: function (event) { if (event.key === 'Enter') submit(ctx); },
    });

    var addButton = C.iconButton({
      icon: 'plus',
      label: translate('form.submit', 'Añadir jugador'),
      onClick: function () { submit(ctx); },
    });
    addButton.classList.add('setup__add');
    addButton.disabled = !draft.name.trim();

    function refreshAddButton() { addButton.disabled = !draft.name.trim(); }

    var genders = [
      { id: 'male', label: translate('form.genderMale', 'Hombre') },
      { id: 'female', label: translate('form.genderFemale', 'Mujer') },
      { id: 'unspecified', label: translate('form.genderUnspecified', 'Sin género') },
    ];
    var levels = [
      { id: 1, label: translate('form.level1', 'Nivel 1') },
      { id: 2, label: translate('form.level2', 'Nivel 2') },
      { id: 3, label: translate('form.level3', 'Nivel 3') },
      { id: 4, label: translate('form.level4', 'Nivel 4') },
      { id: 5, label: translate('form.level5', 'Nivel 5') },
    ];

    return C.panel({ label: translate('form.heading', 'Añadir jugador') }, [
      el('div', { class: 'setup__name-row' }, [nameField, addButton]),
      C.toggleGroup({
        label: translate('form.genderLabel', 'Género'),
        options: genders.map(function (item) {
          return { id: item.id, label: item.label, active: draft.gender === item.id };
        }),
        onSelect: function (id) { draft.gender = id; ctx.rerender(); },
      }),
      C.toggleGroup({
        label: translate('form.levelLabel', 'Nivel'),
        options: levels.map(function (item) {
          return { id: item.id, label: item.label, active: draft.level === item.id };
        }),
        // Tapping the selected level clears it: the level is optional, and
        // there was no way back once set in v1's select.
        onSelect: function (id) { draft.level = draft.level === id ? null : id; ctx.rerender(); },
      }),
      el('button', {
        class: 'setup__paste',
        attrs: { type: 'button' },
        on: { click: function () { ctx.openOverlay('import'); } },
      }, [
        IconRegistry.icon('plus', { size: 15 }),
        el('span', { text: translate('import.pasteMode', 'Pegar lista completa') }),
      ]),
    ]);
  }

  function submit(ctx) {
    if (!draft.name.trim()) return;
    ctx.appState.addPlayer({ name: draft.name, gender: draft.gender, level: draft.level });
    draft.name = '';
    // Gender and level persist between entries: rosters are added in runs, and
    // re-picking two chips per player is what makes people give up halfway.
    ctx.rerender();
    var field = document.getElementById('setup-name');
    if (field) field.focus();
  }

  /* --- Roster ----------------------------------------------------------- */

  function playerRow(ctx, player) {
    var meta = [];
    if (player.gender === 'male') meta.push(translate('form.genderMale', 'Hombre'));
    else if (player.gender === 'female') meta.push(translate('form.genderFemale', 'Mujer'));
    // "N1" is an abbreviation of "Nivel 1" and says nothing in English.
    if (player.level) meta.push(translate('players.levelShort', 'N' + player.level, { level: player.level }));

    var row = el('div', { class: 'setup__player' }, [
      el('div', { class: 'setup__player-identity' }, [
        el('p', { class: 'setup__player-name', text: player.name }),
        meta.length ? el('p', { class: 'setup__player-meta', text: meta.join(' · ') }) : null,
      ]),
      C.iconButton({
        icon: 'x',
        tone: 'muted',
        label: translate('players.remove', 'Quitar ' + player.name, { name: player.name }),
        size: 18,
        onClick: function () {
          // Committed first, animated after: v1 waited on animationend, so a
          // stylesheet that failed to load meant the player was never removed.
          DomHelpers.removeAnimated(row, 'anim-list-out', 140, function () {
            ctx.appState.removePlayer(player.id);
          });
        },
      }),
    ]);
    return row;
  }

  function roster(ctx, players) {
    var query = search.trim().toLowerCase();
    var filtered = query
      ? players.filter(function (player) { return player.name.toLowerCase().indexOf(query) !== -1; })
      : players;
    var visible = showAllPlayers || filtered.length <= COLLAPSED_ROSTER
      ? filtered
      : filtered.slice(0, COLLAPSED_ROSTER);

    var head = el('div', { class: 'c-panel__head' }, [
      C.overline(translate('players.heading', 'Jugadores (' + players.length + ')', { count: players.length })),
      el('div', { class: 'setup__roster-tools' }, [
        C.iconButton({
          icon: 'search',
          tone: 'muted',
          size: 18,
          label: translate('setup.search', 'Buscar jugador'),
          onClick: function () {
            var field = document.getElementById('setup-search');
            if (field) { field.classList.toggle('is-open'); field.focus(); }
          },
        }),
        C.iconButton({
          icon: 'trash-2',
          tone: 'muted',
          size: 18,
          label: translate('actions.clearAll', 'Vaciar jugadores'),
          onClick: function () {
            ctx.openOverlay('confirmClear');
          },
        }),
      ]),
    ]);

    var searchField = C.input({
      id: 'setup-search',
      label: translate('setup.search', 'Buscar jugador'),
      hideLabel: true,
      placeholder: translate('setup.search', 'Buscar jugador'),
      value: search,
      onInput: function (event) { search = event.target.value; ctx.rerender(); },
    });
    searchField.classList.add('setup__search');
    if (search) searchField.classList.add('is-open');

    var children = [head, searchField];

    if (!filtered.length) {
      children.push(el('p', {
        class: 'setup__roster-empty',
        text: translate('setup.noMatches', 'Ningún jugador coincide con la búsqueda'),
      }));
    } else {
      children.push(C.list({}, visible.map(function (player) { return playerRow(ctx, player); })));
      if (filtered.length > visible.length) {
        children.push(el('button', {
          class: 'c-panel__action setup__see-all',
          attrs: { type: 'button' },
          on: { click: function () { showAllPlayers = true; ctx.rerender(); } },
        }, [el('span', { text: translate('setup.seeAll', 'Ver los ' + filtered.length, { count: filtered.length }) })]));
      }
    }

    return C.panel({ flush: true }, children);
  }

  /* --- Readiness -------------------------------------------------------- */

  /** v1 rendered all six items always. Here the bar carries the summary and
   * only the blockers get a row, each with the action that clears it. */
  function readiness(ctx, view) {
    var items = view.readiness || [];
    var ready = items.filter(function (item) { return item.ok; }).length;
    var blockers = items.filter(function (item) { return !item.ok; });

    var head = el('div', { class: 'c-panel__head' }, [
      C.overline(translate('workspace.checklist.heading', 'Listo para empezar')),
      el('span', { class: 'setup__readiness-count', text: ready + ' / ' + items.length }),
    ]);

    var children = [head, C.progressBar({ value: ready, total: items.length, label: translate('workspace.checklist.heading', 'Listo para empezar') })];

    blockers.forEach(function (item) {
      children.push(C.statusStrip({
        icon: item.blocking ? 'circle-alert' : 'info',
        tone: item.blocking ? 'error' : 'warn',
        text: translate('workspace.readiness.' + item.key, item.key),
        action: item.key === 'teamsGenerated' && ctx.canGenerate ? {
          label: translate('actions.generate', 'Generar'),
          onClick: function () { ctx.generateTeams(); },
        } : null,
      }));
    });

    return C.panel({}, children);
  }

  /* --- Action bar ------------------------------------------------------- */

  function actionBar(ctx, view) {
    var action = view.primaryAction || {};
    var enabled = action.enabled !== false;
    var children = [
      C.button({
        label: translate(action.labelKey, translate('actions.generate', 'Generar equipos')),
        disabled: !enabled,
        onClick: function () { ctx.runPrimaryAction(action); },
      }),
    ];
    if (!enabled && action.blockedReasonKey) {
      children.push(el('p', { class: 'setup__hint' }, [
        IconRegistry.icon('info', { size: 14 }),
        el('span', { text: translate(action.blockedReasonKey, '') }),
      ]));
    }
    return el('div', { class: 'app__action-bar' }, children);
  }

  /* --- Screen ----------------------------------------------------------- */

  /** Board G2: entering players is the work and takes the wide column; settings,
   * readiness and the action that follows from them are context. */
  UIScreens.setup = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var hasPlayers = snapshot.players.length > 0;
      var main = [];
      var side = [contextChips(ctx)];

      if (!hasPlayers && !addFormOpen) {
        main.push(emptyState(ctx));
      } else {
        main.push(quickAdd(ctx));
        if (hasPlayers) {
          main.push(roster(ctx, snapshot.players));
          side.push(readiness(ctx, ctx.view));
        }
      }

      side.push(actionBar(ctx, ctx.view));

      // One column on a phone, in the order of the work. The split into work and
      // context only means something once there are two.
      if (ctx.layout === 'compact') return side.slice(0, 1).concat(main, side.slice(1));
      return [C.column('main', main), C.column('side', side)];
    },
  };
})();
