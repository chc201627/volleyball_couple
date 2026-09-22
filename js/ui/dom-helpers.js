/** DOM primitives for the v2 UI layer.
 *
 * Every screen builds its markup through `el()` rather than assembling HTML
 * strings, which is what keeps the product invariant "escape all user-provided
 * text" true by construction: text goes in through `textContent`, never through
 * `innerHTML`. `escapeHTML()` stays exported for the few places that still hand
 * a string to a template (share summaries, exported text). */
/* exported DomHelpers */
var DomHelpers;
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** Byte-identical to the v1 implementation it replaces (app.js:3669). It is
   * relied on by REQ-VAL-06 duplicate names and by every rendered player name,
   * so the behaviour is deliberately not "improved". */
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * el('div', { class: 'card', text: 'Hi', on: { click: fn } }, [child, child])
   *
   * - `class`   string or array, falsy entries dropped
   * - `text`    set via textContent — never parsed as markup
   * - `html`    explicit opt-in for pre-escaped markup; avoid it
   * - `attrs`   plain attributes, including aria-*
   * - `data`    dataset entries
   * - `on`      event listeners
   * - `style`   inline styles, for values that are genuinely dynamic (a
   *             progress width, a stagger delay) and nothing else
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    apply(node, props || {});
    append(node, children);
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function apply(node, props) {
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value == null || value === false) return;
      if (key === 'class' || key === 'className') {
        node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'attrs') {
        Object.keys(value).forEach(function (name) {
          if (value[name] == null || value[name] === false) return;
          node.setAttribute(name, value[name] === true ? '' : value[name]);
        });
      } else if (key === 'data') {
        Object.keys(value).forEach(function (name) {
          if (value[name] == null) return;
          node.dataset[name] = value[name];
        });
      } else if (key === 'on') {
        Object.keys(value).forEach(function (name) {
          if (typeof value[name] === 'function') node.addEventListener(name, value[name]);
        });
      } else if (key === 'style') {
        Object.keys(value).forEach(function (name) {
          if (value[name] == null) return;
          node.style[name] = value[name];
        });
      } else {
        node[key] = value;
      }
    });
  }

  function append(node, children) {
    if (children == null || children === false) return node;
    if (Array.isArray(children)) {
      children.forEach(function (child) { append(node, child); });
      return node;
    }
    node.appendChild(typeof children === 'string' || typeof children === 'number'
      ? document.createTextNode(String(children))
      : children);
    return node;
  }

  /** What the person was typing in, so a re-render can give it back.
   *
   * A screen that filters as you type re-renders on every keystroke, and this
   * layer replaces the whole subtree — which threw focus to <body>. On a phone
   * that closes the keyboard after the first letter: the roster search was
   * unusable and any new one would have been too. The field is found again by
   * its id, which is the only identity that survives being rebuilt, and the
   * caret is put back where it was. */
  function captureFocus(container) {
    var active = document.activeElement;
    if (!active || !active.id || !container.contains(active)) return null;
    var selectable = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA';
    return {
      id: active.id,
      start: selectable ? active.selectionStart : null,
      end: selectable ? active.selectionEnd : null,
    };
  }

  function restoreFocus(container, captured) {
    if (!captured) return;
    var node = container.querySelector('#' + (window.CSS && CSS.escape
      ? CSS.escape(captured.id)
      : captured.id.replace(/([^\w-])/g, '\\$1')));
    if (!node || node === document.activeElement) return;
    node.focus();
    if (captured.start != null && typeof node.setSelectionRange === 'function') {
      try { node.setSelectionRange(captured.start, captured.end); } catch (error) { /* not a text field */ }
    }
  }

  /** Replaces a container's contents in one shot. The v2 shell renders the
   * active screen only, so this is the normal way a destination changes —
   * there is no hidden-toggling of sibling screens to keep in sync. */
  function mount(container, children) {
    var captured = captureFocus(container);
    clear(container);
    append(container, children);
    restoreFocus(container, captured);
    return container;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /** Removes a node after its exit animation, WITHOUT making the removal depend
   * on the animation firing. The timeout is not a fallback for slow machines,
   * it is the guarantee: if the stylesheet is missing, reduced-motion collapsed
   * the duration, or the element is detached mid-flight, the node still goes.
   * This is the shape of the v1.9.1 bug this layer exists to prevent. */
  function removeAnimated(node, className, duration, done) {
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (node.parentNode) node.parentNode.removeChild(node);
      if (typeof done === 'function') done();
    }
    node.addEventListener('animationend', finish, { once: true });
    node.classList.add(className);
    setTimeout(finish, (duration || 140) + 60);
  }

  DomHelpers = {
    el: el,
    svg: svg,
    append: append,
    mount: mount,
    clear: clear,
    escapeHTML: escapeHTML,
    removeAnimated: removeAnimated,
    SVG_NS: SVG_NS,
  };
})();
