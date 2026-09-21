/** The v2 component library.
 *
 * One-to-one with the `01 · Components` shelf of the design canvas. Screens
 * compose from these and never assemble markup of their own — that is the rule
 * that keeps four near-identical segmented controls from reappearing the way
 * they did in v1 (match-type, pairing-toggle, tournament-setup, format-setup
 * were four implementations of one idea).
 *
 * Every component returns a DOM node. No framework, no template strings, no
 * innerHTML: text always lands through textContent.
 *
 * Class names are prefixed `c-` so the v2 sheet cannot collide with the v1
 * stylesheet while both entry points coexist, and so the eventual cleanup is a
 * single grep.
 */
/* exported UIComponents */
var UIComponents;
(function () {
  'use strict';

  var el = DomHelpers.el;
  var icon = IconRegistry.icon;

  /* --- Text ------------------------------------------------------------- */

  function overline(text, tone) {
    return el('p', { class: ['c-overline', tone && 'c-overline--' + tone], text: text });
  }

  /* --- Buttons ---------------------------------------------------------- */

  /** variant: primary (the one lime action per screen) | ghost | danger | muted
   *  Anything interactive is a real <button>, so keyboard and screen readers
   *  work without aria patching. */
  function button(options) {
    options = options || {};
    var children = [];
    if (options.icon) children.push(icon(options.icon, { size: options.iconSize || 16 }));
    children.push(el('span', { class: 'c-button__label', text: options.label }));
    return el('button', {
      class: [
        'c-button',
        'c-button--' + (options.variant || 'primary'),
        options.size && 'c-button--' + options.size,
        options.block !== false && 'c-button--block',
      ],
      attrs: {
        type: options.type || 'button',
        disabled: options.disabled,
        'aria-describedby': options.describedBy,
      },
      on: { click: options.onClick },
    }, children);
  }

  function iconButton(options) {
    options = options || {};
    var node = el('button', {
      class: ['c-icon-button', options.tone && 'c-icon-button--' + options.tone],
      attrs: { type: 'button', 'aria-label': options.label, disabled: options.disabled },
      on: { click: options.onClick },
    }, [icon(options.icon, { size: options.size || 19 })]);
    if (options.badge) node.appendChild(el('span', { class: 'c-icon-button__badge' }));
    return node;
  }

  function pill(options) {
    options = options || {};
    return el('button', {
      class: ['c-pill', options.active && 'is-active'],
      attrs: { type: 'button', 'aria-pressed': options.active ? 'true' : 'false' },
      on: { click: options.onClick },
    }, [el('span', { text: options.label })]);
  }

  /** The single segmented-control primitive. Selection is an outline, not a
   * fill: solid lime is reserved for the primary action. */
  function toggle(options) {
    options = options || {};
    var children = [];
    if (options.icon) children.push(icon(options.icon, { size: 16 }));
    children.push(el('span', { text: options.label }));
    return el('button', {
      class: ['c-toggle', options.active && 'is-active'],
      attrs: { type: 'button', 'aria-pressed': options.active ? 'true' : 'false', disabled: options.disabled },
      on: { click: options.onClick },
    }, children);
  }

  function toggleGroup(options) {
    options = options || {};
    return el('div', {
      class: 'c-toggle-group',
      attrs: { role: 'group', 'aria-label': options.label },
    }, (options.options || []).map(function (item) {
      return toggle({
        label: item.label,
        icon: item.icon,
        active: item.active,
        disabled: item.disabled,
        onClick: function () { if (options.onSelect) options.onSelect(item.id, item); },
      });
    }));
  }

  /* --- Chrome ----------------------------------------------------------- */

  /** 56px bar. Replaces the v1 header, which spent the first ~170px of a
   * 320px-wide screen on a wrapping title, a subtitle and a language switcher
   * that overlapped the title at every breakpoint. */
  function appBar(options) {
    options = options || {};
    var trailing = el('div', { class: 'c-app-bar__trailing' });
    if (options.sync) trailing.appendChild(syncChip(options.sync));
    else if (options.meta) trailing.appendChild(el('span', { class: 'c-app-bar__meta', text: options.meta }));
    (options.actions || []).forEach(function (action) { trailing.appendChild(iconButton(action)); });
    if (options.lang) trailing.appendChild(langButton(options.lang));
    return el('header', { class: 'c-app-bar' }, [
      el('h1', { class: 'c-app-bar__title', text: options.title }),
      options.nav ? navRail(options.nav) : null,
      trailing,
    ]);
  }

  /** Stacked screens (scoring, history, access) get a back affordance instead
   * of a tab-bar destination — that separation is what stops the tab bar from
   * growing every time a flow is added. */
  function subBar(options) {
    options = options || {};
    var titles = [el('p', { class: 'c-sub-bar__title', text: options.title })];
    if (options.sub) titles.push(el('p', { class: 'c-sub-bar__sub', text: options.sub }));
    var trailing = el('div', { class: 'c-sub-bar__trailing' });
    if (options.sync) trailing.appendChild(syncChip(options.sync));
    (options.actions || []).forEach(function (action) { trailing.appendChild(iconButton(action)); });
    if (options.lang) trailing.appendChild(langButton(options.lang));
    return el('header', { class: 'c-sub-bar' }, [
      el('div', { class: 'c-sub-bar__leading' }, [
        iconButton({
          icon: options.close ? 'x' : 'chevron-left',
          label: options.backLabel || 'Volver',
          size: 22,
          onClick: options.onBack,
        }),
        el('div', { class: 'c-sub-bar__titles' }, titles),
      ]),
      trailing,
    ]);
  }

  function syncChip(sync) {
    return el('span', {
      class: ['c-sync', 'c-sync--' + (sync.tone || 'ok')],
      attrs: { role: 'status', 'aria-live': 'polite' },
    }, [
      el('span', { class: ['c-sync__dot', sync.pulsing && 'anim-sync-pulse'] }),
      el('span', { text: sync.label }),
    ]);
  }

  function langButton(lang) {
    return el('button', {
      class: 'c-lang',
      attrs: { type: 'button', 'aria-label': lang.label || lang.code },
      on: { click: lang.onClick },
    }, [el('span', { text: lang.code })]);
  }

  /** Four destinations, always visible, always the same order. Unavailable
   * ones are shown locked rather than hidden: a nav that changes length is a
   * nav people stop trusting. */
  function tabBar(options) {
    options = options || {};
    return el('nav', {
      class: 'c-tab-bar',
      attrs: { 'aria-label': options.label || 'Destinos' },
    }, (options.items || []).map(function (item) {
      var active = item.id === options.active;
      var locked = !!item.locked;
      return el('button', {
        class: ['c-tab', active && 'is-active', locked && 'is-locked'],
        attrs: {
          type: 'button',
          'aria-current': active ? 'page' : null,
          'aria-disabled': locked ? 'true' : null,
          title: locked ? item.lockReason : null,
        },
        on: {
          click: function () {
            if (locked) { if (options.onLocked) options.onLocked(item); return; }
            if (options.onSelect) options.onSelect(item.id);
          },
        },
      }, [
        icon(locked ? 'lock' : item.icon, { size: 20 }),
        el('span', { class: 'c-tab__label', text: item.label }),
      ]);
    }));
  }

  /** The same four destinations as the tab bar, laid out for the app bar. From
   * 600px up the fixed bottom bar is dropped and this takes over, which is
   * where v1's sticky nav overlapped content most visibly. Both are rendered;
   * CSS decides which one is on screen, so there is one source of truth for
   * what is locked and what is active. */
  function navRail(options) {
    options = options || {};
    return el('nav', {
      class: 'c-nav-rail',
      attrs: { 'aria-label': options.label || 'Destinos' },
    }, (options.items || []).map(function (item) {
      var active = item.id === options.active;
      return el('button', {
        class: ['c-nav-rail__item', active && 'is-active', item.locked && 'is-locked'],
        attrs: {
          type: 'button',
          'aria-current': active ? 'page' : null,
          'aria-disabled': item.locked ? 'true' : null,
          title: item.locked ? item.lockReason : null,
        },
        on: {
          click: function () {
            if (item.locked) { if (options.onLocked) options.onLocked(item); return; }
            if (options.onSelect) options.onSelect(item.id);
          },
        },
      }, [el('span', { text: item.label })]);
    }));
  }

  /** In-destination tabs (Hoy / Grupos / Bracket). Underline, not a pill: they
   * are a filter over one destination, not four destinations. */
  function subTabs(options) {
    options = options || {};
    return el('div', {
      class: 'c-sub-tabs',
      attrs: { role: 'tablist', 'aria-label': options.label },
    }, (options.items || []).map(function (item) {
      var active = item.id === options.active;
      return el('button', {
        class: ['c-sub-tab', active && 'is-active'],
        attrs: { type: 'button', role: 'tab', 'aria-selected': active ? 'true' : 'false' },
        on: { click: function () { if (options.onSelect) options.onSelect(item.id); } },
      }, [el('span', { text: item.label })]);
    }));
  }

  /* --- Containers ------------------------------------------------------- */

  function panel(options, children) {
    options = options || {};
    var content = [];
    if (options.label || options.action) {
      var head = el('div', { class: 'c-panel__head' }, [overline(options.label, options.labelTone)]);
      if (options.action) {
        head.appendChild(el('button', {
          class: 'c-panel__action',
          attrs: { type: 'button' },
          on: { click: options.action.onClick },
        }, [el('span', { text: options.action.label })]));
      }
      if (options.meta) head.appendChild(el('span', { class: 'c-panel__meta', text: options.meta }));
      content.push(head);
    }
    return el('section', {
      class: ['c-panel', options.tone && 'c-panel--' + options.tone, options.flush && 'c-panel--flush'],
    }, content.concat(children || []));
  }

  function sheet(options, children) {
    options = options || {};
    var head = [el('div', { class: 'c-sheet__grabber' })];
    if (options.title) head.push(el('h2', { class: 'c-sheet__title', text: options.title }));
    if (options.sub) head.push(el('p', { class: 'c-sheet__sub', text: options.sub }));
    return el('div', {
      class: 'c-scrim anim-scrim-in',
      on: {
        click: function (event) {
          if (event.target === event.currentTarget && options.onDismiss) options.onDismiss();
        },
      },
    }, [
      el('div', {
        class: 'c-sheet anim-sheet-in',
        attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title },
      }, head.concat(children || [])),
    ]);
  }

  function emptyState(options) {
    options = options || {};
    return el('div', { class: 'c-empty' }, [
      options.icon ? icon(options.icon, { size: 40, class: 'c-empty__icon' }) : null,
      el('h2', { class: 'c-empty__title', text: options.title }),
      options.text ? el('p', { class: 'c-empty__text', text: options.text }) : null,
      options.actions ? el('div', { class: 'c-empty__actions' }, options.actions) : null,
    ]);
  }

  /* --- Status ----------------------------------------------------------- */

  /** Every state the app can be in gets icon + text, never colour alone
   * (REQ-UX-72). `action` is the way out of the state, kept next to it. */
  function statusStrip(options) {
    options = options || {};
    var children = [
      el('div', { class: 'c-status__body' }, [
        icon(options.icon, { size: 16, class: 'c-status__icon' }),
        el('p', { class: 'c-status__text', text: options.text }),
      ]),
    ];
    if (options.action) {
      children.push(el('button', {
        class: 'c-status__action',
        attrs: { type: 'button' },
        on: { click: options.action.onClick },
      }, [el('span', { text: options.action.label })]));
    }
    return el('div', {
      class: ['c-status', 'c-status--' + (options.tone || 'neutral')],
      attrs: { role: options.assertive ? 'alert' : 'status', 'aria-live': options.assertive ? 'assertive' : 'polite' },
    }, children);
  }

  function progressBar(options) {
    options = options || {};
    var total = options.total || 0;
    var value = options.value || 0;
    var percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
    return el('div', {
      class: 'c-progress',
      attrs: {
        role: 'progressbar',
        'aria-valuenow': value,
        'aria-valuemin': 0,
        'aria-valuemax': total,
        'aria-label': options.label,
      },
    }, [
      el('div', {
        class: ['c-progress__fill', 'anim-progress-fill', options.tone && 'c-progress__fill--' + options.tone],
        style: { width: percent + '%' },
      }),
    ]);
  }

  /* --- Fields ----------------------------------------------------------- */

  function input(options) {
    options = options || {};
    var field = el('input', {
      class: 'c-input',
      attrs: {
        type: options.type || 'text',
        value: options.value || '',
        placeholder: options.placeholder,
        maxlength: options.maxLength,
        inputmode: options.inputMode,
        'aria-label': options.label,
        id: options.id,
        autocomplete: options.autocomplete || 'off',
      },
      on: { input: options.onInput, keydown: options.onKeyDown, blur: options.onBlur },
    });
    if (!options.label || options.hideLabel) return field;
    return el('div', { class: 'c-field' }, [
      el('label', { class: 'c-field__label', text: options.label, attrs: { for: options.id } }),
      field,
    ]);
  }

  /* --- Rows ------------------------------------------------------------- */

  function chip(options) {
    options = options || {};
    return el('span', {
      class: ['c-chip', options.tone && 'c-chip--' + options.tone],
      text: options.label,
    });
  }

  function matchRow(options) {
    options = options || {};
    var left = el('div', { class: 'c-match__left' });
    if (options.dot) left.appendChild(el('span', { class: ['c-match__dot', 'c-match__dot--' + options.dot] }));
    left.appendChild(el('p', { class: 'c-match__teams', text: options.teams }));
    var children = [left, el('span', {
      class: ['c-match__score', options.tone && 'c-match__score--' + options.tone],
      text: options.score,
    })];
    if (options.trailing) children.push(options.trailing);
    var interactive = typeof options.onClick === 'function';
    return el(interactive ? 'button' : 'div', {
      class: ['c-match', interactive && 'is-interactive'],
      attrs: interactive ? { type: 'button' } : null,
      on: interactive ? { click: options.onClick } : null,
    }, children);
  }

  function coupleRow(options) {
    options = options || {};
    return el('div', { class: 'c-couple' }, [
      el('span', { class: 'c-couple__index', text: options.index }),
      el('div', { class: 'c-couple__names' }, [
        el('p', { class: 'c-couple__name', text: options.player1 }),
        el('p', { class: 'c-couple__name', text: options.player2 }),
      ]),
      chip({ label: options.typeLabel, tone: options.type === 'mixed' ? 'accent' : 'same-gender' }),
    ]);
  }

  function personRow(options) {
    options = options || {};
    return el('div', { class: 'c-person' }, [
      el('span', { class: 'c-person__avatar' }, [icon(options.icon || 'users', { size: 17 })]),
      el('div', { class: 'c-person__text' }, [
        el('p', { class: 'c-person__name', text: options.name }),
        options.meta ? el('p', { class: 'c-person__meta', text: options.meta }) : null,
      ]),
      el('div', { class: 'c-person__actions' }, (options.actions || []).map(function (action) {
        return button({ label: action.label, variant: action.variant || 'ghost', size: 'sm', block: false, onClick: action.onClick });
      })),
    ]);
  }

  /** A list that animates its own entry. Kept as a helper so no screen has to
   * remember to add the stagger class, and so the stagger stays capped. */
  function list(options, rows) {
    options = options || {};
    return el(options.ordered ? 'ol' : 'ul', {
      class: ['c-list', options.tone && 'c-list--' + options.tone],
    }, (rows || []).map(function (row) {
      return el('li', { class: 'c-list__item anim-list-in' }, [row]);
    }));
  }

  UIComponents = {
    overline: overline,
    button: button,
    iconButton: iconButton,
    pill: pill,
    toggle: toggle,
    toggleGroup: toggleGroup,
    appBar: appBar,
    subBar: subBar,
    tabBar: tabBar,
    navRail: navRail,
    subTabs: subTabs,
    panel: panel,
    sheet: sheet,
    emptyState: emptyState,
    statusStrip: statusStrip,
    progressBar: progressBar,
    input: input,
    chip: chip,
    matchRow: matchRow,
    coupleRow: coupleRow,
    personRow: personRow,
    list: list,
  };
})();
