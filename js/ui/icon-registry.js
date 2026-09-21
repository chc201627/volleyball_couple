/** Inline SVG icon registry.
 *
 * WHY HAND-DRAWN, AND WHAT SHOULD REPLACE IT
 * ------------------------------------------
 * The canvas specifies Lucide icons. Lucide is MIT licensed and vendoring the
 * ~40 glyphs the redesign uses is the right end state: consistent optical
 * weight, properly drawn pictorial glyphs (trophy, crown, shuffle), and no
 * runtime dependency. That is a deliberate call to make, not something to slip
 * in, so this file ships a small set drawn to the same construction rules
 * (24x24 box, 1.75 stroke, round caps and joins, no fills) and the registry is
 * the only thing any caller touches. Swapping to a vendored set is a
 * single-file change with no call-site churn.
 *
 * The set grows per slice: slice B carries only what the shell and the base
 * components need. Pictorial glyphs are the ones most worth replacing first.
 */
/* exported IconRegistry */
var IconRegistry;
(function () {
  'use strict';

  /* Each entry is a list of path `d` strings, or {c: [cx, cy, r]} for circles.
     Keeping them as data rather than markup means `icon()` controls every
     presentational attribute in one place. */
  var PATHS = {
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
    x: ['M6 6l12 12', 'M18 6L6 18'],
    check: ['M20 6L9 17l-5-5'],
    'chevron-left': ['M15 18l-6-6 6-6'],
    'chevron-right': ['M9 18l6-6-6-6'],
    'chevron-down': ['M6 9l6 6 6-6'],
    'chevron-up': ['M6 15l6-6 6 6'],
    'arrow-right': ['M5 12h14', 'M13 5l7 7-7 7'],
    'arrow-up-down': ['M7 4v16', 'M4 7l3-3 3 3', 'M17 20V4', 'M14 17l3 3 3-3'],
    search: [{ c: [11, 11, 7] }, 'M20.5 20.5L16 16'],
    users: [
      { c: [9, 8, 3.5] },
      'M2.5 20.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5',
      'M16.5 5.3a3.5 3.5 0 0 1 0 5.4',
      'M18 14.3c2.1.9 3.5 3 3.5 5.4',
    ],
    shuffle: [
      'M16 3.5h5v5', 'M3 20.5L21 3.5',
      'M21 15.5v5h-5', 'M15 15l6 5.5', 'M3 3.5l5 4.5',
    ],
    trophy: [
      'M8 4h8v4.5a4 4 0 0 1-8 0V4z',
      'M8 5.5H5.5a2.5 2.5 0 0 0 0 5H8',
      'M16 5.5h2.5a2.5 2.5 0 0 1 0 5H16',
      'M12 12.5v4', 'M9 20.5h6', 'M10 16.5h4',
    ],
    'list-ordered': [
      'M4 6.5h1.5', 'M4.75 6.5v4', 'M3.75 10.5h2',
      'M9 7h11', 'M9 12.5h11', 'M9 18h8',
      'M3.5 14.5h2v2h-2v2h2',
    ],
    history: [
      'M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4.5V9h4.5', 'M12 7.5V12l3 1.8',
    ],
    circle: [{ c: [12, 12, 8.5] }],
    'circle-check': [{ c: [12, 12, 8.5] }, 'M8.5 12.2l2.4 2.4 4.6-4.9'],
    'circle-alert': [{ c: [12, 12, 8.5] }, 'M12 7.8v4.6', 'M12 15.8v.2'],
    'triangle-alert': ['M12 4.5L21 19.5H3z', 'M12 10v4', 'M12 16.8v.2'],
    info: [{ c: [12, 12, 8.5] }, 'M12 11.2v5', 'M12 8v.2'],
    eye: ['M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z', { c: [12, 12, 2.8] }],
    lock: ['M6.5 10.5h11v9h-11z', 'M9 10.5V8a3 3 0 0 1 6 0v2.5'],
    'share-2': [
      { c: [17.5, 5.5, 2.6] }, { c: [6.5, 12, 2.6] }, { c: [17.5, 18.5, 2.6] },
      'M9 10.7l6-3.9', 'M9 13.3l6 3.9',
    ],
    'rotate-ccw': ['M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4.5V9h4.5'],
    pencil: ['M4 20h4l10-10-4-4L4 16z', 'M13.5 6.5l4 4'],
    'ellipsis-vertical': [{ c: [12, 5.5, 0.9] }, { c: [12, 12, 0.9] }, { c: [12, 18.5, 0.9] }],
    crown: ['M3.5 7.5l3.5 4 5-6.5 5 6.5 3.5-4-2 11H5.5z', 'M5.5 18.5h13'],
    equal: ['M5 9.5h14', 'M5 14.5h14'],
  };

  var DEFAULT_SIZE = 20;

  /** Returns an <svg> element. `currentColor` throughout, so an icon inherits
   * the colour of whatever it sits in and never needs a fill passed alongside. */
  function icon(name, options) {
    options = options || {};
    var size = options.size || DEFAULT_SIZE;
    var node = DomHelpers.svg('svg', {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': options.strokeWidth || 1.75,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
      class: 'icon' + (options.class ? ' ' + options.class : ''),
    });
    (PATHS[name] || []).forEach(function (shape) {
      if (typeof shape === 'string') {
        node.appendChild(DomHelpers.svg('path', { d: shape }));
      } else if (shape.c) {
        node.appendChild(DomHelpers.svg('circle', { cx: shape.c[0], cy: shape.c[1], r: shape.c[2] }));
      }
    });
    return node;
  }

  function has(name) {
    return Object.prototype.hasOwnProperty.call(PATHS, name);
  }

  IconRegistry = { icon: icon, has: has, names: function () { return Object.keys(PATHS); } };
})();
