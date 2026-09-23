/** Paste-a-list — board A3: paste, then review. Clean rows import and broken ones
 * are shown with the reason and skipped, rather than blocking the batch. */
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
      invalidLevel: '«' + (issue.params.token || '') + '» no es un nivel (1-5)',
      tooManyColumns: 'La línea tiene ' + (issue.params.count || '?') + ' columnas, se esperan 3',
      unclosedQuote: 'Comilla sin cerrar',
      mixedDelimiter: 'Separador distinto al del resto',
      playerLimitExceeded: 'Superarías el máximo de ' + (issue.params.maxPlayers || '') + ' jugadores',
      emptyBatch: 'No hay nada que importar',
      ambiguousM: '«M» se interpretó como mujer, según el idioma',
    };
    return translate(key, fallbacks[issue.code] || issue.code, issue.params);
  }

  /* --- Step 1: paste ---------------------------------------------------- */

  function pasteStep(ctx) {
    var area = el('textarea', {
      class: 'import__textarea',
      attrs: {
        rows: 8,
        placeholder: 'May, Mujer, 2\nCarlos, Hombre, 2\nValentina, Mujer, 3',
        'aria-label': translate('import.label', 'Lista de jugadores'),
      },
      on: { input: function (event) { text = event.target.value; refresh(); } },
    });
    area.value = text;

    var reviewButton = C.button({
      label: translate('import.review', 'Revisar lista'),
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
      C.panel({ label: translate('import.oneLine', 'Una línea por jugador') }, [
        area,
        el('p', {
          class: 'import__hint',
          text: translate('import.hint', 'Nombre, Género, Nivel — el nivel es opcional'),
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
      meta.push(row.player.gender === 'male' ? translate('form.genderMale', 'Hombre')
        : row.player.gender === 'female' ? translate('form.genderFemale', 'Mujer')
        : translate('form.genderUnspecified', 'Sin género'));
      meta.push(row.player.level
        ? translate('players.levelShort', 'N' + row.player.level, { level: row.player.level })
        : translate('import.noLevel', 'sin nivel'));
    }

    var children = [
      IconRegistry.icon(icon, { size: 16, class: 'import__row-icon import__row-icon--' + tone }),
      el('div', { class: 'import__row-text' }, [
        el('div', { class: 'import__row-name-line' }, [
          el('p', { class: 'import__row-name', text: row.draft.name || translate('import.blank', '(vacío)') }),
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
        fixField(ctx, row, 'name', translate('form.nameLabel', 'Nombre')),
        fixField(ctx, row, 'genderToken', translate('form.genderLabel', 'Género')),
        fixField(ctx, row, 'levelToken', translate('form.levelLabel', 'Nivel')),
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
      el('span', { class: 'c-chip c-chip--ok', text: importable.length + ' ' + translate('import.ready', 'listos') }),
      skipped ? el('span', { class: 'c-chip c-chip--error', text: skipped + ' ' + translate('import.skipped', 'se omiten') }) : null,
    ]);

    var body = [
      C.panel({ label: translate('import.review', 'Revisión') }, [
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
        text: translate('import.skippedExplainer',
          'Las líneas con error no se importan. Corrígelas aquí arriba o impórtalas después.'),
      }));
    }

    body.push(el('div', { class: 'app__action-bar' }, [
      C.button({
        label: importable.length
          ? translate('import.confirmN', 'Importar ' + importable.length + ' jugadores', { count: importable.length })
          : translate('import.nothing', 'Nada que importar'),
        disabled: !importable.length,
        onClick: function () {
          ctx.appState.addPlayers(importable.map(function (row) { return row.player; }));
          reset();
          ctx.closeOverlay();
        },
      }),
      C.button({
        label: translate('import.back', 'Volver a pegar'),
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
          title: translate('import.pasteMode', 'Pegar lista'),
          sub: isReview ? translate('import.step2', 'Paso 2 de 2 · revisar') : translate('import.step1', 'Paso 1 de 2 · pegar'),
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
