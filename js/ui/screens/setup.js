/** Setup screen — canvas boards A1 (empty) and A2 (with players).
 *
 * The two boards are one screen with two states, not two screens: the empty
 * state is what this looks like before anyone has been added.
 *
 * What changed from v1, and why:
 *
 * - The 170px header is gone. The app bar carries the count, so the first
 *   thing on screen is the thing you came to do.
 * - Adding a player was three stacked selects and a submit button, roughly
 *   360px of form. It is now one row plus two rows of 44px toggles, meant for
 *   typing standing up on a court.
 * - The readiness checklist listed six items, five of them almost always
 *   green, taking half a screen to say "fine". It is now a progress bar that
 *   names only what blocks, with the fix next to it.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  /** Draft of the add-player form. Kept on the module rather than in app state
   * because a half-typed name is not application state — it must not persist,
   * sync, or invalidate the generated teams. */
  var draft = { name: '', gender: 'female', level: null };
  var search = '';
  var COLLAPSED_ROSTER = 6;
  var showAllPlayers = false;
  /** The empty state offers two paths rather than showing the form straight
   * away; picking "add one" reveals it. Without this the button focused a
   * field that the empty state had not rendered, so it did nothing. */
  var addFormOpen = false;

  /** t() with a fallback, so a key that has not been translated yet renders
   * readable Spanish instead of leaking the key onto the screen. Params are
   * forwarded: several keys carry {count} / {name} placeholders that render
   * literally if you forget them. */
  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  /** The configuration that used to be three labelled rows of buttons taking
   * a third of the Setup screen. Each chip states the current value and opens
   * the place to change it; nothing is a mystery abbreviation. */
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
          ? label('pairing.modeManual', 'Manual')
          : label('pairing.modeRandom', 'Aleatorio'),
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
        label: label('tournament.configShort', 'Torneo'),
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
      title: label('setup.empty.title', '¿Quién juega hoy?'),
      text: label('setup.empty.text', 'Añade jugadores uno a uno o pega la lista completa del grupo.'),
      actions: [
        C.button({
          label: label('setup.empty.add', 'Añadir jugador'),
          onClick: function () {
            addFormOpen = true;
            ctx.rerender();
            var field = document.getElementById('setup-name');
            if (field) field.focus();
          },
        }),
        C.button({
          label: label('import.pasteMode', 'Pegar lista'),
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
      label: label('form.nameLabel', 'Nombre del jugador'),
      hideLabel: true,
      placeholder: label('form.namePlaceholder', 'Nombre del jugador'),
      value: draft.name,
      maxLength: 50,
      onInput: function (event) { draft.name = event.target.value; refreshAddButton(); },
      onKeyDown: function (event) { if (event.key === 'Enter') submit(ctx); },
    });

    var addButton = C.iconButton({
      icon: 'plus',
      label: label('form.submit', 'Añadir jugador'),
      onClick: function () { submit(ctx); },
    });
    addButton.classList.add('setup__add');
    addButton.disabled = !draft.name.trim();

    function refreshAddButton() { addButton.disabled = !draft.name.trim(); }

    var genders = [
      { id: 'male', label: label('form.genderMale', 'Hombre') },
      { id: 'female', label: label('form.genderFemale', 'Mujer') },
      { id: 'unspecified', label: label('form.genderUnspecified', 'Sin género') },
    ];
    var levels = [
      { id: 1, label: label('form.level1', 'Nivel 1') },
      { id: 2, label: label('form.level2', 'Nivel 2') },
      { id: 3, label: label('form.level3', 'Nivel 3') },
    ];

    return C.panel({ label: label('form.heading', 'Añadir jugador') }, [
      el('div', { class: 'setup__name-row' }, [nameField, addButton]),
      C.toggleGroup({
        label: label('form.genderLabel', 'Género'),
        options: genders.map(function (item) {
          return { id: item.id, label: item.label, active: draft.gender === item.id };
        }),
        onSelect: function (id) { draft.gender = id; ctx.rerender(); },
      }),
      C.toggleGroup({
        label: label('form.levelLabel', 'Nivel'),
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
        el('span', { text: label('import.pasteMode', 'Pegar lista completa') }),
      ]),
    ]);
  }

  function submit(ctx) {
    if (!draft.name.trim()) return;
    ctx.appState.addPlayer({ name: draft.name, gender: draft.gender, level: draft.level });
    draft.name = '';
    // Gender and level deliberately persist between entries: rosters are
    // typically added in runs, and re-picking the same two chips for every
    // player is the kind of friction that makes people give up halfway.
    ctx.rerender();
    var field = document.getElementById('setup-name');
    if (field) field.focus();
  }

  /* --- Roster ----------------------------------------------------------- */

  function playerRow(ctx, player) {
    var meta = [];
    if (player.gender === 'male') meta.push(label('form.genderMale', 'Hombre'));
    else if (player.gender === 'female') meta.push(label('form.genderFemale', 'Mujer'));
    // "N1" is an abbreviation of "Nivel 1" and says nothing in English.
    if (player.level) meta.push(label('players.levelShort', 'N' + player.level, { level: player.level }));

    var row = el('div', { class: 'setup__player' }, [
      el('div', { class: 'setup__player-identity' }, [
        el('p', { class: 'setup__player-name', text: player.name }),
        meta.length ? el('p', { class: 'setup__player-meta', text: meta.join(' · ') }) : null,
      ]),
      C.iconButton({
        icon: 'x',
        tone: 'muted',
        label: label('players.remove', 'Quitar ' + player.name, { name: player.name }),
        size: 18,
        onClick: function () {
          // The removal is committed by the state module first and animated
          // after. v1 waited on animationend to commit, so a stylesheet that
          // failed to load meant the player was never removed.
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
      C.overline(label('players.heading', 'Jugadores (' + players.length + ')', { count: players.length })),
      el('div', { class: 'setup__roster-tools' }, [
        C.iconButton({
          icon: 'search',
          tone: 'muted',
          size: 18,
          label: label('setup.search', 'Buscar jugador'),
          onClick: function () {
            var field = document.getElementById('setup-search');
            if (field) { field.classList.toggle('is-open'); field.focus(); }
          },
        }),
      ]),
    ]);

    var searchField = C.input({
      id: 'setup-search',
      label: label('setup.search', 'Buscar jugador'),
      hideLabel: true,
      placeholder: label('setup.search', 'Buscar jugador'),
      value: search,
      onInput: function (event) { search = event.target.value; ctx.rerender(); },
    });
    searchField.classList.add('setup__search');
    if (search) searchField.classList.add('is-open');

    var children = [head, searchField];

    if (!filtered.length) {
      children.push(el('p', {
        class: 'setup__roster-empty',
        text: label('setup.noMatches', 'Ningún jugador coincide con la búsqueda'),
      }));
    } else {
      children.push(C.list({}, visible.map(function (player) { return playerRow(ctx, player); })));
      if (filtered.length > visible.length) {
        children.push(el('button', {
          class: 'c-panel__action setup__see-all',
          attrs: { type: 'button' },
          on: { click: function () { showAllPlayers = true; ctx.rerender(); } },
        }, [el('span', { text: label('setup.seeAll', 'Ver los ' + filtered.length, { count: filtered.length }) })]));
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
      C.overline(label('workspace.checklist.heading', 'Listo para empezar')),
      el('span', { class: 'setup__readiness-count', text: ready + ' / ' + items.length }),
    ]);

    var children = [head, C.progressBar({ value: ready, total: items.length, label: label('workspace.checklist.heading', 'Listo para empezar') })];

    blockers.forEach(function (item) {
      children.push(C.statusStrip({
        icon: item.blocking ? 'circle-alert' : 'info',
        tone: item.blocking ? 'error' : 'warn',
        text: label('workspace.readiness.' + item.key, item.key),
        action: item.key === 'teamsGenerated' && ctx.canGenerate ? {
          label: label('actions.generate', 'Generar'),
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
        label: label(action.labelKey, label('actions.generate', 'Generar equipos')),
        disabled: !enabled,
        onClick: function () { ctx.runPrimaryAction(action); },
      }),
    ];
    if (!enabled && action.blockedReasonKey) {
      children.push(el('p', { class: 'setup__hint' }, [
        IconRegistry.icon('info', { size: 14 }),
        el('span', { text: label(action.blockedReasonKey, '') }),
      ]));
    }
    return el('div', { class: 'app__action-bar' }, children);
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.setup = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var hasPlayers = snapshot.players.length > 0;
      var body = [contextChips(ctx)];

      if (!hasPlayers && !addFormOpen) {
        body.push(emptyState(ctx));
      } else {
        body.push(quickAdd(ctx));
        if (hasPlayers) {
          body.push(roster(ctx, snapshot.players));
          body.push(readiness(ctx, ctx.view));
        }
      }

      body.push(actionBar(ctx, ctx.view));
      return body;
    },
  };
})();
