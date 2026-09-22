/** Pair by hand — canvas board A4.
 *
 * v1 asked you to pick two people from two chained <select> dropdowns and press
 * Pair. The names were already on screen in the roster; the dropdowns were a
 * second, worse copy of that list. Here you tap the people themselves.
 *
 * Fixed pairs sit above the pool so it is obvious what is already decided, and
 * the count says how many will still be drawn at random — the thing v1 buried
 * in a hint paragraph.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var selected = [];

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  function playerById(ctx, id) {
    return ctx.appState.get().players.filter(function (player) { return player.id === id; })[0];
  }

  function nameOf(ctx, id) {
    var player = playerById(ctx, id);
    return player ? player.name : '';
  }

  /* --- Fixed pairs ------------------------------------------------------ */

  function fixedPairs(ctx, pairs) {
    if (!pairs.length) return null;
    return C.panel({ label: label('pairing.fixed', 'Parejas fijadas') + ' · ' + pairs.length }, [
      C.list({}, pairs.map(function (pair, index) {
        return el('div', { class: 'pairing__fixed' }, [
          el('div', { class: 'pairing__fixed-left' }, [
            IconRegistry.icon('circle-check', { size: 15, class: 'pairing__pin' }),
            el('p', {
              class: 'pairing__fixed-name',
              text: pair.map(function (id) { return nameOf(ctx, id); }).join('  &  '),
            }),
          ]),
          C.iconButton({
            icon: 'x',
            tone: 'muted',
            size: 18,
            label: label('pairing.unfix', 'Deshacer pareja'),
            onClick: function () {
              var next = pairs.slice();
              next.splice(index, 1);
              ctx.appState.setManualPairs(next);
            },
          }),
        ]);
      })),
    ]);
  }

  /* --- Pool ------------------------------------------------------------- */

  function pool(ctx, available, teamSize) {
    var rows = [];
    for (var i = 0; i < available.length; i += 2) {
      rows.push(el('div', { class: 'pairing__pool-row' }, available.slice(i, i + 2).map(function (player) {
        var isSelected = selected.indexOf(player.id) !== -1;
        return el('button', {
          class: ['pairing__candidate', isSelected && 'is-selected'],
          attrs: { type: 'button', 'aria-pressed': isSelected ? 'true' : 'false' },
          on: {
            click: function () {
              var at = selected.indexOf(player.id);
              if (at !== -1) selected.splice(at, 1);
              // Selecting past the team size replaces the oldest pick rather
              // than silently ignoring the tap.
              else {
                selected.push(player.id);
                if (selected.length > teamSize) selected.shift();
              }
              ctx.rerender();
            },
          },
        }, [
          IconRegistry.icon(isSelected ? 'circle-check' : 'circle', { size: 16 }),
          el('span', { class: 'pairing__candidate-name', text: player.name }),
        ]);
      })));
    }

    return C.panel({
      label: label('pairing.unpaired', 'Sin emparejar') + ' · ' + available.length,
      action: { label: label('pairing.tapTwo', 'Toca ' + teamSize, { n: teamSize }), onClick: null },
    }, rows.length ? rows : [
      el('p', { class: 'pairing__empty', text: label('pairing.allPaired', 'Ya están todos emparejados') }),
    ]);
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.manualPairing = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var teamSize = snapshot.teamSize;
      var pairs = snapshot.manualPairs;

      var takenIds = {};
      pairs.forEach(function (pair) { pair.forEach(function (id) { takenIds[id] = true; }); });
      var available = snapshot.players.filter(function (player) { return !takenIds[player.id]; });

      // Selections can go stale when a player is removed from another screen.
      selected = selected.filter(function (id) { return !takenIds[id] && playerById(ctx, id); });

      var remaining = Math.max(0, Math.floor(available.length / teamSize) - 0);
      var body = [
        fixedPairs(ctx, pairs),
        pool(ctx, available, teamSize),
        C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: label('pairing.manualHint',
            'Las ' + remaining + ' parejas restantes se generan al azar', { count: remaining }),
        }),
      ].filter(Boolean);

      body.push(el('div', { class: 'app__action-bar' }, [
        C.button({
          label: selected.length === teamSize
            ? label('pairing.fixSelected',
                'Fijar ' + selected.map(function (id) { return nameOf(ctx, id); }).join(' & '),
                { names: selected.map(function (id) { return nameOf(ctx, id); }).join(' & ') })
            : label('pairing.pickMore', 'Elige ' + teamSize + ' jugadores', { n: teamSize }),
          disabled: selected.length !== teamSize,
          onClick: function () {
            ctx.appState.setManualPairs(pairs.concat([selected.slice()]));
            selected = [];
            ctx.rerender();
          },
        }),
        C.button({
          label: label('pairing.done', 'Listo'),
          variant: 'ghost',
          onClick: function () { selected = []; ctx.closeOverlay(); },
        }),
      ]));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('pairing.manualTitle', 'Emparejar a mano'),
          sub: pairs.length + ' ' + label('pairing.ofFixed', 'parejas fijadas'),
          onBack: function () { selected = []; ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
