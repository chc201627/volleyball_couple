/** Configure tournament — canvas boards A5 and A6.
 *
 * v1 offered groups and format as two rows of unlabelled buttons ("A", "A–B",
 * "Classic", "Groups Only") with no way to know what any of them meant or what
 * they would produce. Here each preset is an option with its description and
 * its precondition, and below them is what it actually generates: how many
 * matches, and roughly how long that takes.
 *
 * The format editor (A6) shares this screen rather than living apart, because
 * customising is a continuation of choosing, not a separate errand.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var showEditor = false;
  var customRules = '';

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  // Titles and descriptions are keys, not literals: this is the screen that
  // explains the tournament, and an explanation in the wrong language explains
  // nothing.
  var PRESETS = [
    { id: 'classic', titleKey: 'format.preset.classic.title', titleFallback: 'Clásico',
      descKey: 'format.preset.classic.desc', descFallback: 'Todos contra todos y final entre los dos primeros.' },
    { id: 'groupsTo', titleKey: 'format.preset.groupsTo.title', titleFallback: 'Solo grupos',
      descKey: 'format.preset.groupsTo.desc', descFallback: 'Termina al acabar la fase de grupos, gana el líder.' },
    { id: 'groupsFinal', titleKey: 'format.preset.groupsFinal.title', titleFallback: 'Grupos + Final',
      descKey: 'format.preset.groupsFinal.desc', descFallback: 'Igual que Clásico pero sin desempates cruzados.' },
    { id: 'crossover', titleKey: 'format.preset.crossover.title', titleFallback: 'Referencia (Top 4)',
      descKey: 'format.preset.crossover.desc', descFallback: 'Semifinales cruzadas 1º–4º y 2º–3º.',
      requiresKey: 'format.preset.crossover.requires', requiresFallback: '2 grupos de 4+' },
  ];

  /** Groups are built here only to ask the format engine whether a preset is
   * possible, and to count the matches it would generate. Nothing is persisted
   * until the tournament actually starts. */
  function previewGroups(teams, groupCount) {
    var groups = [];
    for (var i = 0; i < groupCount; i++) {
      groups.push({ id: String.fromCharCode(65 + i), teams: [] });
    }
    teams.forEach(function (team, index) { groups[index % groupCount].teams.push(team); });
    return groups;
  }

  function presetAvailable(presetId, groups) {
    try {
      presetFormat(presetId, groups);
      return true;
    } catch (error) {
      return false;
    }
  }

  /** Round-robin inside each group, plus one match per knockout pair. Enough to
   * answer "is this an afternoon or a whole day?", which is the only reason the
   * number is on screen. */
  function matchCounts(groups, format) {
    var groupMatches = groups.reduce(function (total, group) {
      var n = group.teams.length;
      return total + (n * (n - 1)) / 2;
    }, 0);
    var knockoutMatches = 0;
    if (format && format.stagesById) {
      Object.keys(format.stagesById).forEach(function (id) {
        var stage = format.stagesById[id];
        if (stage.kind === 'knockout') knockoutMatches += (stage.pairs || []).length;
      });
    }
    return { group: groupMatches, knockout: knockoutMatches, total: groupMatches + knockoutMatches };
  }

  function estimateMinutes(total) {
    // Two courts, ~12 minutes a match. Deliberately rough and labelled as such:
    // a precise-looking number would be a lie.
    return Math.round((total * 12) / 2);
  }

  function formatDuration(minutes) {
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    if (!hours) return rest + ' ' + label('common.minutesShort', 'min');
    return hours + ' ' + label('common.hoursShort', 'h') +
      (rest ? ' ' + rest + ' ' + label('common.minutesShort', 'min') : '');
  }

  /* --- Sections --------------------------------------------------------- */

  function groupsSection(ctx, snapshot, teamCount) {
    var options = [1, 2, 3, 4].map(function (count) {
      var enough = Math.floor(teamCount / count) >= 2;
      return {
        id: count,
        label: count === 1 ? 'A' : 'A–' + String.fromCharCode(64 + count),
        active: snapshot.groupCount === count,
        // A group that cannot hold two teams cannot play a match.
        disabled: !enough,
      };
    });
    return C.panel({ label: label('tournament.groupsLabel', 'Grupos') }, [
      C.toggleGroup({
        label: label('tournament.groupsLabel', 'Grupos'),
        options: options,
        onSelect: function (count) { ctx.appState.setConfig({ groupCount: count }); },
      }),
    ]);
  }

  function optionRow(ctx, preset, active, available) {
    var titleRow = [el('p', {
      class: 'config__option-title',
      text: label(preset.titleKey, preset.titleFallback),
    })];
    if (preset.requiresKey) {
      titleRow.push(el('span', {
        class: 'c-chip c-chip--warn',
        text: label(preset.requiresKey, preset.requiresFallback),
      }));
    }
    return el('button', {
      class: ['config__option', active && 'is-active', !available && 'is-unavailable'],
      attrs: { type: 'button', 'aria-pressed': active ? 'true' : 'false', 'aria-disabled': available ? null : 'true' },
      on: {
        click: function () {
          if (!available) return;
          ctx.appState.setConfig({ formatPreset: preset.id });
        },
      },
    }, [
      el('div', { class: 'config__option-text' }, [
        el('div', { class: 'config__option-title-row' }, titleRow),
        el('p', { class: 'config__option-desc', text: label(preset.descKey, preset.descFallback) }),
      ]),
      IconRegistry.icon(active ? 'circle-check' : 'circle', { size: 20, class: 'config__option-check' }),
    ]);
  }

  function summarySection(groups, format) {
    var counts = matchCounts(groups, format);
    var lines = [
      { icon: 'users', text: label('format.summary.groupMatches',
          counts.group + ' partidos en la fase de grupos', { count: counts.group }) },
    ];
    if (counts.knockout) {
      lines.push({
        icon: 'trophy',
        text: counts.knockout === 1
          ? label('format.summary.singleFinal', 'Final a un partido')
          : label('format.summary.knockoutMatches',
              counts.knockout + ' partidos de eliminatoria', { count: counts.knockout }),
      });
    }
    lines.push({
      icon: 'history',
      text: label('format.summary.duration',
        'Unas ' + formatDuration(estimateMinutes(counts.total)) + ' con 2 canchas (aprox.)',
        { duration: formatDuration(estimateMinutes(counts.total)) }),
    });

    return C.panel({ label: label('tournament.summaryLabel', 'Lo que sale') },
      lines.map(function (line) {
        return el('div', { class: 'config__summary-line' }, [
          IconRegistry.icon(line.icon, { size: 16 }),
          el('p', { text: line.text }),
        ]);
      }));
  }

  /* --- Format editor (A6) ----------------------------------------------- */

  function editorSection(ctx, format, groups, locked) {
    if (!showEditor) return null;

    var stages = format && format.stagesById ? Object.keys(format.stagesById).map(function (id) {
      return format.stagesById[id];
    }).sort(function (a, b) { return a.order - b.order; }) : [];

    var children = stages.map(function (stage) {
      var stageLabel = stage.kind === 'roundRobin'
        ? label('format.stage.groups', 'Etapa ' + stage.order + ' · Grupos', { order: stage.order })
        : label('format.stage.knockout', 'Etapa ' + stage.order + ' · Eliminatoria', { order: stage.order });
      return C.panel({ label: stageLabel }, [
        fieldRow(label('format.field.pointsTo', 'Puntos por set'), String(stage.pointsTo), locked),
        fieldRow(label('format.field.overtime', 'Prórroga'),
          stage.overtime ? label('common.yes', 'Sí') : label('common.no', 'No'), locked),
        stage.kind === 'knockout'
          ? fieldRow(label('format.field.pairs', 'Cruces'), String((stage.pairs || []).length), locked)
          : null,
      ].filter(Boolean));
    });

    if (!stages.length) {
      children.push(C.statusStrip({
        icon: 'info',
        tone: 'neutral',
        text: label('tournament.format.classicNote',
          'El formato Clásico no tiene etapas configurables: todos contra todos y final.'),
      }));
    }

    var rules = el('textarea', {
      class: 'config__rules',
      attrs: {
        rows: 3,
        maxlength: 500,
        placeholder: 'Sets a 9 puntos. Cambio de cancha cada 5.',
        'aria-label': label('tournament.format.customRules', 'Reglas de la casa'),
        disabled: locked,
      },
      on: { input: function (event) { customRules = event.target.value; ctx.rerender(); } },
    });
    rules.value = customRules;

    children.push(C.panel({
      label: label('tournament.format.customRules', 'Reglas de la casa'),
      meta: customRules.length + ' / 500',
    }, [rules]));

    var validation = format ? validateFormat(format, groups) : { valid: true, errors: [] };
    children.push(C.statusStrip({
      icon: validation.valid ? 'circle-check' : 'circle-alert',
      tone: validation.valid ? 'ok' : 'error',
      text: validation.valid
        ? label('tournament.format.valid', 'Formato válido')
        : validation.errors.map(function (code) { return label(code, code); }).join(' · '),
    }));

    if (locked) {
      children.push(C.statusStrip({
        icon: 'lock',
        tone: 'warn',
        text: label('workspace.setup.formatLocked.note', 'Bloqueado — reinicia el torneo para cambiar el formato'),
      }));
    }

    return el('div', { class: 'config__editor' }, children);
  }

  function fieldRow(name, value, locked) {
    return el('div', { class: 'config__field' }, [
      el('p', { class: 'config__field-label', text: name }),
      el('span', { class: ['config__field-value', locked && 'is-locked'], text: value }),
    ]);
  }

  /* --- Screen ----------------------------------------------------------- */

  UIScreens.tournamentConfig = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var teams = snapshot.teams || [];
      var groups = previewGroups(teams, snapshot.groupCount);
      var locked = false; // a running tournament opens this read-only; wired in slice E

      var format = null;
      try { format = presetFormat(snapshot.formatPreset, groups); } catch (error) { format = null; }

      var body = [
        groupsSection(ctx, snapshot, teams.length),
        C.panel({ label: label('tournament.format.presetLabel', 'Formato') },
          PRESETS.map(function (preset) {
            return optionRow(ctx, preset, snapshot.formatPreset === preset.id, presetAvailable(preset.id, groups));
          })),
        summarySection(groups, format),
        el('button', {
          class: 'config__customize',
          attrs: { type: 'button' },
          on: { click: function () { showEditor = !showEditor; ctx.rerender(); } },
        }, [
          IconRegistry.icon(showEditor ? 'chevron-up' : 'chevron-down', { size: 16 }),
          el('span', { text: showEditor ? label('tournament.format.hideEditor', 'Ocultar detalle') : label('tournament.format.customize', 'Personalizar formato') }),
        ]),
        editorSection(ctx, format, groups, locked),
      ].filter(Boolean);

      body.push(el('div', { class: 'app__action-bar' }, [
        C.button({
          label: label('tournament.start', 'Empezar torneo'),
          onClick: function () {
            // Starting the tournament belongs to slice E; until then this
            // closes and leaves the configuration saved, which is honest
            // rather than pretending to start something that has no screen.
            ctx.closeOverlay();
          },
        }),
      ]));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('tournament.configTitle', 'Configurar torneo'),
          sub: teams.length + ' ' + label('workspace.summary.teamsWord', 'parejas') + ' · ' + snapshot.teamSize + 'vs' + snapshot.teamSize,
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
