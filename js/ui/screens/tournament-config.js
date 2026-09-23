/** Configure tournament — boards A5 and A6. Each preset carries its description and
 * precondition, and below them is what it generates: matches, and how long. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var showEditor = false;
  var customRules = '';


  // Titles and descriptions are keys, not literals: an explanation in the wrong
  // language explains nothing.
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

  /** Groups built only to ask the engine whether a preset is possible and to count
   * its matches. Nothing is persisted until the tournament starts. */
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

  /** Round robin per group plus one match per knockout pair: enough to answer "an
   * afternoon or a whole day?", which is why the number is on screen. */
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
    if (!hours) return rest + ' ' + translate('common.minutesShort', 'min');
    return hours + ' ' + translate('common.hoursShort', 'h') +
      (rest ? ' ' + rest + ' ' + translate('common.minutesShort', 'min') : '');
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
    return C.panel({ label: translate('tournament.groupsLabel', 'Grupos') }, [
      C.toggleGroup({
        label: translate('tournament.groupsLabel', 'Grupos'),
        options: options,
        onSelect: function (count) { ctx.appState.setConfig({ groupCount: count }); },
      }),
    ]);
  }

  function optionRow(ctx, preset, active, available) {
    var titleRow = [el('p', {
      class: 'config__option-title',
      text: translate(preset.titleKey, preset.titleFallback),
    })];
    if (preset.requiresKey) {
      titleRow.push(el('span', {
        class: 'c-chip c-chip--warn',
        text: translate(preset.requiresKey, preset.requiresFallback),
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
        el('p', { class: 'config__option-desc', text: translate(preset.descKey, preset.descFallback) }),
      ]),
      IconRegistry.icon(active ? 'circle-check' : 'circle', { size: 20, class: 'config__option-check' }),
    ]);
  }

  function summarySection(groups, format) {
    var counts = matchCounts(groups, format);
    var lines = [
      { icon: 'users', text: translate('format.summary.groupMatches',
          counts.group + ' partidos en la fase de grupos', { count: counts.group }) },
    ];
    if (counts.knockout) {
      lines.push({
        icon: 'trophy',
        text: counts.knockout === 1
          ? translate('format.summary.singleFinal', 'Final a un partido')
          : translate('format.summary.knockoutMatches',
              counts.knockout + ' partidos de eliminatoria', { count: counts.knockout }),
      });
    }
    lines.push({
      icon: 'history',
      text: translate('format.summary.duration',
        'Unas ' + formatDuration(estimateMinutes(counts.total)) + ' con 2 canchas (aprox.)',
        { duration: formatDuration(estimateMinutes(counts.total)) }),
    });

    return C.panel({ label: translate('tournament.summaryLabel', 'Lo que sale') },
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
        ? translate('format.stage.groups', 'Etapa ' + stage.order + ' · Grupos', { order: stage.order })
        : translate('format.stage.knockout', 'Etapa ' + stage.order + ' · Eliminatoria', { order: stage.order });
      return C.panel({ label: stageLabel }, [
        fieldRow(translate('format.field.pointsTo', 'Puntos por set'), String(stage.pointsTo), locked),
        fieldRow(translate('format.field.overtime', 'Prórroga'),
          stage.overtime ? translate('common.yes', 'Sí') : translate('common.no', 'No'), locked),
        stage.kind === 'knockout'
          ? fieldRow(translate('format.field.pairs', 'Cruces'), String((stage.pairs || []).length), locked)
          : null,
      ].filter(Boolean));
    });

    if (!stages.length) {
      children.push(C.statusStrip({
        icon: 'info',
        tone: 'neutral',
        text: translate('tournament.format.classicNote',
          'El formato Clásico no tiene etapas configurables: todos contra todos y final.'),
      }));
    }

    var rules = el('textarea', {
      class: 'config__rules',
      attrs: {
        rows: 3,
        maxlength: 500,
        placeholder: 'Sets a 9 puntos. Cambio de cancha cada 5.',
        'aria-label': translate('tournament.format.customRules', 'Reglas de la casa'),
        disabled: locked,
      },
      on: { input: function (event) { customRules = event.target.value; ctx.rerender(); } },
    });
    rules.value = customRules;

    children.push(C.panel({
      label: translate('tournament.format.customRules', 'Reglas de la casa'),
      meta: customRules.length + ' / 500',
    }, [rules]));

    var validation = format ? validateFormat(format, groups) : { valid: true, errors: [] };
    children.push(C.statusStrip({
      icon: validation.valid ? 'circle-check' : 'circle-alert',
      tone: validation.valid ? 'ok' : 'error',
      text: validation.valid
        ? translate('tournament.format.valid', 'Formato válido')
        : validation.errors.map(function (code) { return translate(code, code); }).join(' · '),
    }));

    if (locked) {
      children.push(C.statusStrip({
        icon: 'lock',
        tone: 'warn',
        text: translate('workspace.setup.formatLocked.note', 'Bloqueado — reinicia el torneo para cambiar el formato'),
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
        C.panel({ label: translate('tournament.format.presetLabel', 'Formato') },
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
          el('span', { text: showEditor ? translate('tournament.format.hideEditor', 'Ocultar detalle') : translate('tournament.format.customize', 'Personalizar formato') }),
        ]),
        editorSection(ctx, format, groups, locked),
      ].filter(Boolean);

      body.push(el('div', { class: 'app__action-bar' }, [
        C.button({
          label: translate('tournament.start', 'Empezar torneo'),
          onClick: function () {
            // Closes and leaves the configuration saved, rather than pretending to
            // start something whose screen arrives in a later slice.
            ctx.closeOverlay();
          },
        }),
      ]));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: translate('tournament.configTitle', 'Configurar torneo'),
          sub: teams.length + ' ' + translate('workspace.summary.teamsWord', 'parejas') + ' · ' + snapshot.teamSize + 'vs' + snapshot.teamSize,
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
