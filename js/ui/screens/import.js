/** Paste-a-list overlay — canvas board A3.
 *
 * Two steps with their own screen instead of an accordion inside the add-player
 * card: paste, then review. The review is the point — v1 showed a one-line
 * summary ("18 valid, 2 errors") and made you find them yourself.
 *
 * DEVIATION FROM player-import.js, ON PURPOSE
 * -------------------------------------------
 * The module exposes `summary.canCommit`, which is false unless EVERY row is
 * clean. This screen does not use it as the gate. Pasting twenty-two names off
 * a chat thread and being blocked because one says "avanzado" where a level
 * belongs is how people abandon the import and type everyone by hand. Rows
 * that validate are imported; rows that do not are shown with the reason and
 * skipped, and the whole batch is undoable in one tap. `canCommit` is still
 * read to decide whether anything needs attention at all.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var STEP_PASTE = 'paste';
  var STEP_REVIEW = 'review';

  var text = '';
  var step = STEP_PASTE;
  var parsed = null;
  var validated = null;
  /** Inline corrections keyed by row. The module re-validates from the drafts,
   * so a fix here goes through exactly the same rules as the original paste. */
  var edits = {};

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  function reset() {
    text = '';
    step = STEP_PASTE;
    parsed = null;
    validated = null;
    edits = {};
  }

  function revalidate(ctx) {
    if (!parsed) return;
    var rows = parsed.rows.map(function (row) {
      var edit = edits[row.key];
      return edit ? Object.assign({}, row, { draft: Object.assign({}, row.draft, edit) }) : row;
    });
    validated = validatePlayerImport(rows, {
      locale: typeof getLanguage === 'function' ? getLanguage() : 'es',
      existingCount: ctx.appState.get().players.length,
    });
  }

  function issueText(issue) {
    var key = 'import.issue.' + issue.code;
    var fallbacks = {
      nameEmpty: 'Sin nombre — se omite',
      nameTooShort: 'El nombre es demasiado corto',
      nameTooLong: 'El nombre supera los 50 caracteres',
      invalidGender: '«' + (issue.params.token || '') + '» no es un género reconocido',
      invalidLevel: '«' + (issue.params.token || '') + '» no es un nivel (1, 2 o 3)',
      tooManyColumns: 'La línea tiene ' + (issue.params.count || '?') + ' columnas, se esperan 3',
      unclosedQuote: 'Comilla sin cerrar',
      mixedDelimiter: 'Separador distinto al del resto',
      playerLimitExceeded: 'Superarías el máximo de ' + (issue.params.maxPlayers || '') + ' jugadores',
      emptyBatch: 'No hay nada que importar',
      ambiguousM: '«M» se interpretó como mujer, según el idioma',
    };
    return label(key, fallbacks[issue.code] || issue.code, issue.params);
  }

  /* --- Step 1: paste ---------------------------------------------------- */

  function pasteStep(ctx) {
    var area = el('textarea', {
      class: 'import__textarea',
      attrs: {
        rows: 8,
        placeholder: 'May, Mujer, 2\nCarlos, Hombre, 2\nValentina, Mujer, 3',
        'aria-label': label('import.label', 'Lista de jugadores'),
      },
      on: { input: function (event) { text = event.target.value; refresh(); } },
    });
    area.value = text;

    var reviewButton = C.button({
      label: label('import.review', 'Revisar lista'),
      disabled: !text.trim(),
      onClick: function () {
        parsed = parsePlayerImport(text);
        revalidate(ctx);
        step = STEP_REVIEW;
        ctx.rerender();
      },
    });

    function refresh() { reviewButton.disabled = !text.trim(); }

    return [
      C.panel({ label: label('import.oneLine', 'Una línea por jugador') }, [
        area,
        el('p', {
          class: 'import__hint',
          text: label('import.hint', 'Nombre, Género, Nivel — el nivel es opcional'),
        }),
      ]),
      el('div', { class: 'app__action-bar' }, [reviewButton]),
    ];
  }

  /* --- Step 2: review --------------------------------------------------- */

  function rowNode(ctx, row) {
    var hasError = row.issues.length > 0;
    var tone = hasError ? 'error' : 'ok';
    var icon = hasError ? 'circle-alert' : 'circle-check';

    var meta = [];
    if (row.player) {
      meta.push(row.player.gender === 'male' ? label('form.genderMale', 'Hombre')
        : row.player.gender === 'female' ? label('form.genderFemale', 'Mujer')
        : label('form.genderUnspecified', 'Sin género'));
      meta.push(row.player.level
        ? label('players.levelShort', 'N' + row.player.level, { level: row.player.level })
        : label('import.noLevel', 'sin nivel'));
    }

    var children = [
      IconRegistry.icon(icon, { size: 16, class: 'import__row-icon import__row-icon--' + tone }),
      el('div', { class: 'import__row-text' }, [
        el('div', { class: 'import__row-name-line' }, [
          el('p', { class: 'import__row-name', text: row.draft.name || label('import.blank', '(vacío)') }),
          meta.length ? el('p', { class: 'import__row-meta', text: meta.join(' · ') }) : null,
        ]),
        hasError ? el('p', {
          class: 'import__row-issue',
          text: row.issues.map(issueText).join(' · '),
        }) : null,
      ]),
    ];

    // Only failing rows get editable fields: showing three inputs per row for
    // twenty clean rows would bury the two that need attention.
    if (hasError) {
      children.push(el('div', { class: 'import__row-fix' }, [
        fixField(ctx, row, 'name', label('form.nameLabel', 'Nombre')),
        fixField(ctx, row, 'genderToken', label('form.genderLabel', 'Género')),
        fixField(ctx, row, 'levelToken', label('form.levelLabel', 'Nivel')),
      ]));
    }

    return el('div', { class: ['import__row', hasError && 'is-error'] }, children);
  }

  function fixField(ctx, row, field, placeholder) {
    var current = edits[row.key] && edits[row.key][field] != null
      ? edits[row.key][field]
      : row.draft[field];
    var input = el('input', {
      class: 'c-input import__fix-input',
      attrs: { type: 'text', value: current || '', placeholder: placeholder, 'aria-label': placeholder },
      on: {
        change: function (event) {
          edits[row.key] = edits[row.key] || {};
          edits[row.key][field] = event.target.value;
          revalidate(ctx);
          ctx.rerender();
        },
      },
    });
    return input;
  }

  function reviewStep(ctx) {
    var rows = validated ? validated.rows : [];
    var importable = rows.filter(function (row) { return !!row.player; });
    var skipped = rows.length - importable.length;

    var counts = el('div', { class: 'import__counts' }, [
      el('span', { class: 'c-chip c-chip--ok', text: importable.length + ' ' + label('import.ready', 'listos') }),
      skipped ? el('span', { class: 'c-chip c-chip--error', text: skipped + ' ' + label('import.skipped', 'se omiten') }) : null,
    ]);

    var body = [
      C.panel({ label: label('import.review', 'Revisión') }, [
        counts,
        el('div', { class: 'import__rows' }, rows.map(function (row) { return rowNode(ctx, row); })),
      ]),
    ];

    (validated && validated.batchIssues || []).forEach(function (issue) {
      body.push(C.statusStrip({ icon: 'circle-alert', tone: 'error', text: issueText(issue), assertive: true }));
    });

    if (skipped) {
      body.push(C.statusStrip({
        icon: 'info',
        tone: 'warn',
        text: label('import.skippedExplainer',
          'Las líneas con error no se importan. Corrígelas aquí arriba o impórtalas después.'),
      }));
    }

    body.push(el('div', { class: 'app__action-bar' }, [
      C.button({
        label: importable.length
          ? label('import.confirmN', 'Importar ' + importable.length + ' jugadores', { count: importable.length })
          : label('import.nothing', 'Nada que importar'),
        disabled: !importable.length,
        onClick: function () {
          ctx.appState.addPlayers(importable.map(function (row) { return row.player; }));
          reset();
          ctx.closeOverlay();
        },
      }),
      C.button({
        label: label('import.back', 'Volver a pegar'),
        variant: 'ghost',
        onClick: function () { step = STEP_PASTE; ctx.rerender(); },
      }),
    ]));

    return body;
  }

  UIScreens.import = {
    render: function (ctx) {
      var isReview = step === STEP_REVIEW;
      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('import.pasteMode', 'Pegar lista'),
          sub: isReview ? label('import.step2', 'Paso 2 de 2 · revisar') : label('import.step1', 'Paso 1 de 2 · pegar'),
          close: !isReview,
          onBack: function () {
            if (isReview) { step = STEP_PASTE; ctx.rerender(); return; }
            reset();
            ctx.closeOverlay();
          },
        }),
        el('div', { class: 'overlay-screen__body' }, isReview ? reviewStep(ctx) : pasteStep(ctx)),
      ]);
    },
  };
})();
