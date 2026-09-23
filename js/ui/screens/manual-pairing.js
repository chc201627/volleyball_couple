/** Pair by hand — board A4: you tap the people themselves. Fixed pairs sit above
 * the pool, and the count says how many are still drawn at random. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var selected = [];


  function playerById(ctx, id) {
    return ctx.appState.get().players.filter(function (player) { return player.id === id; })[0];
  }

  function nameOf(ctx, id) {
    var player = playerById(ctx, id);
    return player ? player.name : '';
  }

  function metaOf(player) {
    if (!player) return '';
    var parts = [];
    if (player.gender === 'male') parts.push(translate('form.genderMale', 'Hombre'));
    else if (player.gender === 'female') parts.push(translate('form.genderFemale', 'Mujer'));
    else parts.push(translate('form.genderUnspecified', 'Sin género'));
    if (player.level) parts.push(translate('players.levelShort', 'N' + player.level, { level: player.level }));
    return parts.join(' · ');
  }

  /* --- Fixed pairs ------------------------------------------------------ */

  function fixedPairs(ctx, pairs) {
    if (!pairs.length) return null;
    return C.panel({ label: translate('pairing.fixed', 'Parejas fijadas') + ' · ' + pairs.length }, [
      C.list({}, pairs.map(function (pair, index) {
        return el('div', { class: 'pairing__fixed' }, [
          el('div', { class: 'pairing__fixed-left' }, [
            IconRegistry.icon('circle-check', { size: 15, class: 'pairing__pin' }),
            el('div', { class: 'pairing__fixed-info' }, [
              el('p', {
                class: 'pairing__fixed-name',
                text: pair.map(function (id) { return nameOf(ctx, id); }).join('  &  '),
              }),
              el('p', {
                class: 'pairing__fixed-meta',
                text: pair.map(function (id) {
                  var p = playerById(ctx, id);
                  return p ? p.name + ' (' + metaOf(p) + ')' : '';
                }).join('  ·  '),
              }),
            ]),
          ]),
          C.iconButton({
            icon: 'x',
            tone: 'muted',
            size: 18,
            label: translate('pairing.unfix', 'Deshacer pareja'),
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
        var meta = metaOf(player);
        return el('button', {
          class: ['pairing__candidate', isSelected && 'is-selected', player.gender && 'pairing__candidate--' + player.gender],
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
              if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
              else ctx.rerender();
            },
          },
        }, [
          IconRegistry.icon(isSelected ? 'circle-check' : 'circle', { size: 16 }),
          el('div', { class: 'pairing__candidate-info' }, [
            el('span', { class: 'pairing__candidate-name', text: player.name }),
            meta ? el('span', { class: 'pairing__candidate-meta', text: meta }) : null,
          ]),
        ]);
      })));
    }

    return C.panel({
      label: translate('pairing.unpaired', 'Sin emparejar') + ' · ' + available.length,
      action: { label: translate('pairing.tapTwo', 'Toca ' + teamSize, { n: teamSize }), onClick: null },
    }, rows.length ? rows : [
      el('p', { class: 'pairing__empty', text: translate('pairing.allPaired', 'Ya están todos emparejados') }),
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

      var remaining = Math.max(0, Math.floor(available.length / teamSize));
      var body = [
        fixedPairs(ctx, pairs),
        pool(ctx, available, teamSize),
        remaining > 0 ? C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: translate('pairing.manualHint',
            'Las ' + remaining + ' parejas restantes se generan al azar', { count: remaining }),
        }) : null,
      ].filter(Boolean);

      body.push(el('div', { class: 'app__action-bar' }, [
        C.button({
          label: selected.length === teamSize
            ? translate('pairing.fixSelected',
                'Fijar ' + selected.map(function (id) { return nameOf(ctx, id); }).join(' & '),
                { names: selected.map(function (id) { return nameOf(ctx, id); }).join(' & ') })
            : translate('pairing.pickMore', 'Elige ' + teamSize + ' jugadores', { n: teamSize }),
          disabled: selected.length !== teamSize,
          onClick: function () {
            var newPairs = pairs.concat([selected.slice()]);
            ctx.appState.setManualPairs(newPairs);
            ctx.appState.setConfig({ pairingMode: 'manual' });
            selected = [];
            if (typeof ctx.rerenderOverlay === 'function') ctx.rerenderOverlay();
            else ctx.rerender();
          },
        }),
        C.button({
          label: translate('pairing.done', 'Listo'),
          variant: pairs.length > 0 ? 'primary' : 'ghost',
          onClick: function () {
            selected = [];
            if (pairs.length > 0) {
              ctx.appState.setConfig({ pairingMode: 'manual' });
              ctx.generateTeams();
            }
            ctx.closeOverlay();
          },
        }),
      ]));

      return el('div', { class: 'overlay-screen' }, [
        C.subBar({
          title: translate('pairing.manualTitle', 'Emparejar a mano'),
          sub: pairs.length + ' ' + translate('pairing.ofFixed', 'parejas fijadas'),
          onBack: function () {
            selected = [];
            if (pairs.length > 0) {
              ctx.appState.setConfig({ pairingMode: 'manual' });
              ctx.generateTeams();
            }
            ctx.closeOverlay();
          },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
