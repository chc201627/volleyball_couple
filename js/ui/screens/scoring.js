/** Scoring — canvas boards C2, C2b, C5 and the celebration in M2.
 *
 * A dedicated screen with no tab bar: while you are scoring you are not
 * navigating, and a nav bar under your thumb during a rally is an invitation to
 * lose the match you are in.
 *
 * The number is a field. The rule that makes that safe rather than fiddly lives
 * in score-input.js: + and − operate on what is typed, leaving the field empty
 * reverts instead of committing a zero, and a drawn finished result is refused
 * before the save rather than after, because the Firebase rules reject it.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  /** Raw strings while typing; null means "showing the stored value". */
  var draft = { matchId: null, raw1: null, raw2: null };
  var lastAction = null;
  var sync = null;
  var conflict = null;
  var celebration = null;

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  function reset() {
    draft = { matchId: null, raw1: null, raw2: null };
    lastAction = null;
    sync = null;
    conflict = null;
    celebration = null;
  }

  function currentMatch(ctx) {
    var tournament = ctx.appState.get().tournament;
    if (!tournament) return null;
    return tournament.matches.filter(function (item) { return item.id === ctx.state.overlayMatchId; })[0] || null;
  }

  function ensureDraft(match) {
    if (draft.matchId === match.id) return;
    draft = {
      matchId: match.id,
      raw1: match.score1 == null ? '0' : String(match.score1),
      raw2: match.score2 == null ? '0' : String(match.score2),
    };
  }

  function stored(match, side) {
    var value = side === 1 ? match.score1 : match.score2;
    return value == null ? 0 : value;
  }

  function currentValue(match, side) {
    return scoreInput.commit(side === 1 ? draft.raw1 : draft.raw2, stored(match, side));
  }

  /* --- Score block ------------------------------------------------------ */

  function scoreBlock(ctx, match, side, teamName, isWinning, focused) {
    var raw = side === 1 ? draft.raw1 : draft.raw2;

    var field = el('input', {
      class: ['scoring__value', isWinning && 'is-winning'],
      attrs: {
        type: 'text',
        // Numeric keypad without a minus sign or decimal point. The field still
        // sanitises, because a hardware keyboard or a paste ignores this hint.
        inputmode: 'numeric',
        pattern: '[0-9]*',
        maxlength: 2,
        value: raw,
        'aria-label': label('tournament.scoreFor', 'Puntos de') + ' ' + teamName,
      },
      on: {
        input: function (event) {
          var clean = scoreInput.sanitize(event.target.value);
          event.target.value = clean;
          if (side === 1) draft.raw1 = clean; else draft.raw2 = clean;
          refreshSaveState(ctx, match);
        },
        focus: function () { celebration = null; },
        blur: function () {
          // Confirm on leaving: there is no accept button on a numeric keypad,
          // so blur is the only gesture available.
          var committed = String(scoreInput.commit(raw, stored(match, side)));
          if (side === 1) draft.raw1 = committed; else draft.raw2 = committed;
          ctx.rerender();
        },
      },
    });

    function stepBy(delta) {
      var next = scoreInput.step(side === 1 ? draft.raw1 : draft.raw2, delta, stored(match, side));
      if (side === 1) draft.raw1 = next; else draft.raw2 = next;
      lastAction = { side: side, delta: delta };
      ctx.rerender();
    }

    var minus = el('button', {
      class: 'scoring__step',
      attrs: { type: 'button', 'aria-label': label('tournament.decrement', 'Restar punto') },
      on: { click: function () { stepBy(-1); } },
    }, [IconRegistry.icon('minus', { size: 22 })]);

    var plus = el('button', {
      class: ['scoring__step', 'scoring__step--add', isWinning && 'is-winning'],
      attrs: { type: 'button', 'aria-label': label('tournament.increment', 'Sumar punto') },
      on: { click: function () { stepBy(1); } },
    }, [IconRegistry.icon('plus', { size: 22 })]);

    return el('section', {
      class: [
        'scoring__block',
        isWinning && 'is-winning',
        focused && 'is-focused',
        celebration && celebration.side === side && 'anim-winner-flash',
      ],
    }, [
      el('div', { class: 'scoring__team-row' }, [
        celebration && celebration.side === side
          ? IconRegistry.icon('circle-check', { size: 18, class: 'scoring__won' })
          : null,
        el('p', { class: 'scoring__team', text: teamName }),
      ]),
      el('div', { class: 'scoring__stepper' }, [minus, field, plus]),
    ]);
  }

  /** Kept out of the render pass so typing does not rebuild the field and lose
   * the caret position mid-number. */
  function refreshSaveState(ctx, match) {
    var node = document.querySelector('.scoring__save');
    if (!node) return;
    var rules = rulesForMatch(ctx.appState.get().tournament.format, match.id);
    var check = scoreInput.validate({
      score1: currentValue(match, 1),
      score2: currentValue(match, 2),
      status: 'finished',
    }, rules);
    node.disabled = !check.ok;
    var reason = document.querySelector('.scoring__reason');
    if (reason) reason.textContent = check.ok ? '' : reasonText(check.reason, rules);
  }

  function reasonText(reason, rules) {
    var texts = {
      tie: label('tournament.error.scoreDraw',
        'Empate: las reglas rechazan un resultado terminado sin ganador. Puedes dejarlo en vivo.'),
      overTarget: label('tournament.format.error.pointsTarget',
        'El set es a ' + (rules && rules.pointsTo) + ' puntos', { points: rules && rules.pointsTo }),
      notFinished: label('tournament.error.notFinished',
        'Todavía no llega a ' + (rules && rules.pointsTo) + ' puntos', { points: rules && rules.pointsTo }),
      tooHigh: label('tournament.error.tooHigh', 'Máximo ' + scoreInput.MAX, { max: scoreInput.MAX }),
      invalidScore: label('tournament.error.scoreNotInt', 'Marcador no válido'),
    };
    return texts[reason] || '';
  }

  /* --- Sync and conflict (C5) ------------------------------------------- */

  function syncStrip() {
    if (!sync) return null;
    var map = {
      saving: { icon: 'history', tone: 'warn', text: label('tournament.sync.saving', 'Guardando…') },
      synced: { icon: 'circle-check', tone: 'ok', text: label('tournament.sync.synced', 'Guardado') },
      offline: { icon: 'info', tone: 'warn', text: label('tournament.sync.offline', 'Sin conexión — se guardará al volver') },
      denied: { icon: 'lock', tone: 'error', text: label('tournament.sync.denied', 'Ya no tienes permiso para anotar') },
      invalid: { icon: 'circle-alert', tone: 'error', text: label('tournament.sync.invalid', 'El servidor rechazó el resultado') },
    };
    var state = map[sync];
    if (!state) return null;
    return C.statusStrip({ icon: state.icon, tone: state.tone, text: state.text });
  }

  /** The conflict card never overwrites silently. Both values are on screen and
   * the choice is explicit, which is the whole point of the revision check in
   * the rules: the last confirmed result must survive a race. */
  function conflictCard(ctx, match) {
    if (!conflict) return null;
    var mine = { score1: currentValue(match, 1), score2: currentValue(match, 2) };

    function choice(options) {
      return el('button', {
        class: ['scoring__choice', options.active && 'is-active'],
        attrs: { type: 'button' },
        on: { click: options.onClick },
      }, [
        el('div', { class: 'scoring__choice-text' }, [
          el('p', { class: 'scoring__choice-who', text: options.who }),
          el('p', { class: 'scoring__choice-score', text: options.score }),
        ]),
        IconRegistry.icon(options.active ? 'circle-check' : 'circle', { size: 20 }),
      ]);
    }

    return el('section', { class: 'c-panel scoring__conflict' }, [
      el('div', { class: 'scoring__conflict-head' }, [
        IconRegistry.icon('triangle-alert', { size: 18, class: 'scoring__conflict-icon' }),
        el('p', {
          class: 'scoring__conflict-title',
          text: label('tournament.conflict.title', 'Alguien anotó antes que tú'),
        }),
      ]),
      el('p', {
        class: 'scoring__conflict-body',
        text: label('tournament.conflict.body',
          'Otro dispositivo guardó este partido mientras anotabas. Elige qué resultado queda.'),
      }),
      choice({
        who: conflict.authorLabel || label('tournament.conflict.theirs', 'Guardado por otro dispositivo'),
        score: conflict.score1 + ' – ' + conflict.score2,
        active: true,
        onClick: function () {
          ctx.appState.adoptResult(match.id, conflict);
          reset();
          ctx.closeOverlay();
        },
      }),
      choice({
        who: label('tournament.conflict.mine', 'Tu versión'),
        score: mine.score1 + ' – ' + mine.score2,
        active: false,
        onClick: function () {
          // Retrying adopts the server's revision first, so the next save is
          // an edit on top of it rather than another losing race.
          ctx.appState.adoptResult(match.id, conflict);
          conflict = null;
          save(ctx, true);
        },
      }),
    ]);
  }

  /* --- Saving ----------------------------------------------------------- */

  function save(ctx, afterConflict) {
    var match = currentMatch(ctx);
    if (!match) return;
    var score1 = currentValue(match, 1);
    var score2 = currentValue(match, 2);
    var rules = rulesForMatch(ctx.appState.get().tournament.format, match.id);
    var check = scoreInput.validate({ score1: score1, score2: score2, status: 'finished' }, rules);
    if (!check.ok) return;

    sync = 'saving';
    celebration = { side: scoreInput.winnerOf(score1, score2) };
    ctx.rerender();

    ctx.saveResult({
      matchId: match.id,
      score1: score1,
      score2: score2,
      status: 'finished',
      afterConflict: !!afterConflict,
    }).then(function (outcome) {
      sync = outcome.status;
      if (outcome.status === 'conflict') {
        celebration = null;
        conflict = outcome.current;
        ctx.rerender();
        return;
      }
      ctx.rerender();
      // Long enough to read the winner, short enough not to be in the way —
      // the 900ms of board M2.
      setTimeout(function () {
        var winnerName = celebration ? teamNameFor(ctx, match, celebration.side) : '';
        reset();
        ctx.closeOverlay();
        if (winnerName) ctx.toast({ title: label('tournament.won', 'Ganó') + ' ' + winnerName, sub: score1 + ' – ' + score2 });
      }, 900);
    });
  }

  function teamNameFor(ctx, match, side) {
    var tournament = ctx.appState.get().tournament;
    var teamId = side === 1 ? match.team1Id : match.team2Id;
    var team = (tournament.teams || []).filter(function (item) { return item.id === teamId; })[0];
    return team ? team.name : teamId;
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.scoring = {
    render: function (ctx) {
      var match = currentMatch(ctx);
      if (!match) {
        return C.sheet({ title: label('tournament.noMatch', 'Partido no encontrado'), onDismiss: ctx.closeOverlay }, []);
      }
      ensureDraft(match);

      var tournament = ctx.appState.get().tournament;
      var rules = rulesForMatch(tournament.format, match.id);
      var score1 = currentValue(match, 1);
      var score2 = currentValue(match, 2);
      var winner = scoreInput.winnerOf(score1, score2);
      var check = scoreInput.validate({ score1: score1, score2: score2, status: 'finished' }, rules);

      var body = [
        scoreBlock(ctx, match, 1, teamNameFor(ctx, match, 1), winner === 1, false),
        scoreBlock(ctx, match, 2, teamNameFor(ctx, match, 2), winner === 2, false),
        el('div', { class: 'scoring__meta' }, [
          el('span', {
            class: 'scoring__target',
            text: rules.pointsTo
              ? label('tournament.setTo', 'Set a ' + rules.pointsTo + ' puntos', { points: rules.pointsTo })
              : label('tournament.noTarget', 'Sin límite de puntos'),
          }),
          lastAction ? el('button', {
            class: 'scoring__undo',
            attrs: { type: 'button' },
            on: {
              click: function () {
                var side = lastAction.side;
                var next = scoreInput.step(side === 1 ? draft.raw1 : draft.raw2, -lastAction.delta, stored(match, side));
                if (side === 1) draft.raw1 = next; else draft.raw2 = next;
                lastAction = null;
                ctx.rerender();
              },
            },
          }, [
            IconRegistry.icon('rotate-ccw', { size: 14 }),
            el('span', { text: label('tournament.undoStep', 'Deshacer') + ' ' + (lastAction.delta > 0 ? '+1' : '−1') }),
          ]) : null,
        ]),
        el('p', { class: 'scoring__hint' }, [
          IconRegistry.icon('pencil', { size: 13 }),
          el('span', { text: label('tournament.editHint', 'Toca el número para escribirlo con el teclado') }),
        ]),
        syncStrip(),
        conflictCard(ctx, match),
      ].filter(Boolean);

      var saveButton = C.button({
        label: label('tournament.saveResult', 'Guardar resultado'),
        disabled: !check.ok || sync === 'saving',
        onClick: function () { save(ctx, false); },
      });
      saveButton.classList.add('scoring__save');

      var actionBar = el('div', { class: 'app__action-bar' }, [
        saveButton,
        el('p', { class: 'scoring__reason', text: check.ok ? '' : reasonText(check.reason, rules) }),
      ]);

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('tournament.scoreTitle', 'Anotar'),
          sub: teamNameFor(ctx, match, 1) + ' vs ' + teamNameFor(ctx, match, 2),
          close: true,
          onBack: function () { reset(); ctx.closeOverlay(); },
          sync: sync === 'saving'
            ? { tone: 'warn', label: label('tournament.sync.saving', 'Guardando…'), pulsing: true }
            : { tone: 'ok', label: label('tournament.sync.saved', 'Guardado') },
        }),
        el('div', { class: 'overlay-screen__body scoring' }, body),
        actionBar,
      ]);
    },
  };
})();
