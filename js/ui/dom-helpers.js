/** DOM primitives. Screens build markup through `el()`, never HTML strings, which
 * keeps "escape all user text" true by construction: text lands via textContent. */
/* exported DomHelpers */
var DomHelpers;
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** Byte-identical to the v1 implementation it replaces: REQ-VAL-06 duplicate
   * names depend on it, so the behaviour is deliberately not "improved". */
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * el('div', { class: 'card', text: 'Hi', on: { click: fn } }, [child, child])
   *
   * @param {string} tag
   * @param {{class?: (string|Array), text?: string, html?: string, attrs?: object,
   *   data?: object, on?: object, style?: object}} [props] - `text` goes in through
   *   textContent; `html` is an explicit opt-in for pre-escaped markup
   * @param {Array|Element|string} [children]
   * @returns {Element}
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

  /** What the person was typing in, found again by id — the only identity that
   * survives a rebuild. Without it, filtering as you type closes the keyboard. */
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

  /** Replaces a container's contents in one shot: the shell renders the active
   * screen only, with no hidden siblings to keep in sync. */
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

  /** Removes a node after its exit animation without depending on it firing: the
   * timeout is the guarantee, not a fallback. This was the v1.9.1 bug. */
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
