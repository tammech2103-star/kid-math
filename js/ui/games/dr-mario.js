/**
 * dr-mario — Chai đứng + khay nang giấy (bài b7).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 8, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['dr-mario'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { dropMs: 550, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-dr-mario';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var buttons = [];
  var hintNode = null;
  var statusNode = null;
  var trayNode = null;
  var locked = false;
  var destroyed = false;

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function knob(name) {
    var tune = window.KM && KM.Tuning && KM.Tuning.game;
    return tune && typeof tune[name] === 'number' ? tune[name] : DEFAULTS[name];
  }

  function applyStyle(el, styles) {
    var key;
    for (key in styles) {
      if (has(styles, key)) { el.style[key] = styles[key]; }
    }
  }

  function node(tag, attrs, children) {
    var el = document.createElement(tag);
    var key;
    var i;
    attrs = attrs || {};
    for (key in attrs) {
      if (!has(attrs, key)) { continue; }
      if (key === 'text') { el.textContent = attrs[key]; }
      else if (key === 'class') { el.className = attrs[key]; }
      else if (key === 'style') { applyStyle(el, attrs[key]); }
      else { el.setAttribute(key, attrs[key]); }
    }
    if (children) {
      for (i = 0; i < children.length; i += 1) {
        if (children[i] == null) { continue; }
        el.appendChild(typeof children[i] === 'string'
          ? document.createTextNode(children[i]) : children[i]);
      }
    }
    return el;
  }

  function svgNode(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    var key;
    for (key in attrs) {
      if (has(attrs, key)) { el.setAttribute(key, String(attrs[key])); }
    }
    return el;
  }

  function shapeSvg(kind, size) {
    var svg = svgNode('svg', {
      viewBox: '0 0 64 64', width: size, height: size,
      'aria-hidden': 'true', focusable: 'false'
    });
    var part;
    if (kind === 'circle') {
      part = svgNode('circle', { cx: 32, cy: 32, r: 23, fill: 'currentColor' });
    } else if (kind === 'triangle') {
      part = svgNode('polygon', { points: '32,8 57,56 7,56', fill: 'currentColor' });
    } else if (kind === 'rectangle' || kind === 'cuboid') {
      part = svgNode('rect', { x: 4, y: 16, width: 56, height: 32, rx: 4, fill: 'currentColor' });
    } else {
      part = svgNode('rect', { x: 10, y: 10, width: 44, height: 44, rx: 4, fill: 'currentColor' });
    }
    svg.appendChild(part);
    return svg;
  }

  function closestClass(target, className, boundary) {
    var el = target;
    while (el && el !== boundary) {
      if (el.nodeType === 1 && el.classList && el.classList.contains(className)) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function on(target, type, fn) {
    target.addEventListener(type, fn, false);
    listeners.push({ target: target, type: type, fn: fn });
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    while (timers.length) { window.clearTimeout(timers.pop()); }
  }

  function tap() {
    if (audio && typeof audio.tap === 'function') {
      try { audio.tap(); } catch (error) { /* am thanh chi la hieu ung phu */ }
    }
  }

  function find(question, value) {
    var list;
    var i;
    if (value == null || !question || !question['choices']) { return null; }
    list = question['choices'];
    for (i = 0; i < list.length; i += 1) {
      if (String(list[i].value) === String(value)) { return list[i]; }
    }
    return null;
  }

  function setHint(text) {
    if (!hintNode) { return; }
    hintNode.textContent = text;
    root.classList.add('has-hint');
  }

  function submit(value) {
    var found;
    if (locked || destroyed) { return false; }
    found = find(q, value);
    if (!found) { setHint('Bé chọn lại nhé!'); return false; }
    locked = true;
    tap();
    root.classList.add('is-answered');
    mount.dispatchEvent(new CustomEvent('km:answer', {
      bubbles: true, detail: { value: found.value }
    }));
    return true;
  }

  function dropVial(el) {
    var ms = knob('dropMs');
    if (reduced) {
      el.style.opacity = '0.45';
      return;
    }
    el.style.transition = 'transform ' + ms + 'ms ease, opacity ' + ms + 'ms ease';
    el.style.transform = 'translateY(-18px) scale(0.92)';
    el.style.opacity = '0.45';
    later(function () {
      if (el.parentNode) {
        el.style.transform = '';
        el.style.opacity = '';
      }
    }, ms);
  }

  function reset() {
    clearTimers();
    locked = false;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    buttons = [];
    hintNode = null;
    statusNode = null;
    trayNode = null;
  }

  function build() {
    var choices = q && q['choices'] ? q['choices'] : [];
    var isIdentify = !!(q && q['choiceRender'] === 'shape');
    var items = q && q.visual && q.visual.items ? q.visual.items : [];
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '248px', fontFamily: 'inherit'
    });

    root.appendChild(node('div', { class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' } }, [
      q && q.text ? q.text : ''
    ]));

    var stage = node('div', {
      class: 'kmg-stage',
      style: { display: 'flex', gap: '8px', alignItems: 'flex-end', flex: '1 1 auto' }
    });
    var left = node('div', {
      class: 'kmg-left',
      style: { flex: '1 1 62%', display: 'flex', flexDirection: 'column', gap: '8px' }
    });
    var scene = node('div', {
      class: 'kmg-scene',
      style: {
        minHeight: '104px', display: 'flex', flexWrap: 'wrap', gap: '4px',
        alignItems: 'center', justifyContent: 'center', padding: '6px',
        borderRadius: '16px', background: 'rgba(255,255,255,0.66)',
        border: '2px solid #cfe5ef', color: '#2c7fb0'
      }
    });
    if (!isIdentify && items.length) {
      for (i = 0; i < items.length; i += 1) {
        scene.appendChild(shapeSvg(items[i].shape, items[i].size || 46));
      }
    } else if (!isIdentify) {
      scene.appendChild(node('span', {
        text: 'Không có hình nào để đếm',
        style: { fontSize: '0.9rem', fontWeight: '700' }
      }));
    }
    left.appendChild(scene);

    trayNode = node('div', {
      class: 'kmg-tray',
      style: {
        display: 'flex', flexDirection: 'column', gap: '8px',
        padding: '6px', borderRadius: '16px', background: 'rgba(255,251,233,0.9)'
      }
    });
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = isIdentify
          ? (choice.aria || choice.label || choice.shape)
          : (choice.label != null ? String(choice.label) : String(choice.value));
        var content = [];
        if (isIdentify && choice.shape) { content.push(shapeSvg(choice.shape, 42)); }
        content.push(node('span', {
          text: label,
          style: { fontSize: isIdentify ? '0.9rem' : '1.5rem', fontWeight: '800' }
        }));
        var btn = node('button', {
          class: 'kmg-btn kmg-vial', type: 'button',
          'data-index': String(index), 'aria-label': (isIdentify ? 'Thả hình ' : 'Thả số ') + label + ' vào chai',
          style: {
            minWidth: '64px', minHeight: '64px', width: '100%',
            borderRadius: '16px', background: '#fffbe9', color: '#33465d',
            border: '3px solid #e2c98a', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '2px'
          }
        }, content);
        buttons.push(btn);
        trayNode.appendChild(btn);
      }(choices[i], i));
    }
    left.appendChild(trayNode);

    var right = node('div', {
      class: 'kmg-right',
      style: { width: '112px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }
    });
    var mouth = node('div', {
      class: 'kmg-mouth', role: 'button', tabindex: '0', 'aria-label': 'Miệng chai',
      style: {
        width: '76px', height: '22px', borderRadius: '999px',
        background: '#2f6f8f', border: '3px solid #bfe6f5', cursor: 'pointer'
      }
    });
    right.appendChild(mouth);
    right.appendChild(node('div', {
      class: 'kmg-bottle', 'aria-hidden': 'true',
      style: { fontSize: '3.5rem', lineHeight: '1.1' }
    }, ['🧪']));
    stage.appendChild(left);
    stage.appendChild(right);
    root.appendChild(stage);

    statusNode = node('p', { class: 'kmg-status', style: { minHeight: '24px', fontWeight: '700' } }, ['']);
    hintNode = node('p', {
      class: 'kmg-hint', 'aria-live': 'polite',
      style: { minHeight: '24px', color: '#a4402c', fontWeight: '700' }
    }, ['']);
    root.appendChild(statusNode);
    root.appendChild(hintNode);
  }

  on(root, 'click', function (event) {
    if (locked || destroyed || !q) { return; }
    var vial = closestClass(event.target, 'kmg-vial', root);
    if (vial) {
      var index = parseInt(vial.getAttribute('data-index'), 10);
      if (q['choices'] && q['choices'][index]) {
        dropVial(vial);
        submit(q['choices'][index].value);
      }
      return;
    }
    if (closestClass(event.target, 'kmg-mouth', root)) { return; }
    setHint('Thả vào chai nhé');
  });

  on(root, 'keydown', function (event) {
    if (locked || destroyed || !q) { return; }
    if (event.key !== 'Enter' && event.key !== ' ') { return; }
    if (!closestClass(event.target, 'kmg-mouth', root)) { return; }
    event.preventDefault();
    setHint('Chọn một nang trong khay nhé');
  });

  function pressHotspot(index) {
    if (!q || !q['choices'] || !q['choices'][index]) { return false; }
    var vial = buttons[index];
    if (vial) { dropVial(vial); }
    return submit(q['choices'][index].value);
  }

  function render(question) {
    if (destroyed) { return; }
    if (question) { q = question; }
    build();
  }

  function onWrong() {
    if (destroyed) { return; }
    build();
    root.classList.add('is-wrong');
    if (statusNode) { statusNode.textContent = 'Thử lại nhé!'; }
  }

  function onCorrect() {
    if (destroyed) { return; }
    root.classList.remove('is-wrong', 'has-hint');
    root.classList.add('is-correct');
    if (statusNode) { statusNode.textContent = '✓ Đúng!'; }
  }

  function celebrate() {
    if (destroyed) { return; }
    root.classList.add('is-correct', 'is-celebrating');
    if (statusNode) { statusNode.textContent = '✓ Đúng!'; }
  }

  function handleKey(key) {
    if (destroyed) { return false; }
    var index = parseInt(key, 10);
    if (isNaN(index) || index < 1 || index > buttons.length) { return false; }
    pressHotspot(index - 1);
    return true;
  }

  function destroy() {
    if (destroyed) { return; }
    destroyed = true;
    clearTimers();
    for (var i = 0; i < listeners.length; i += 1) {
      listeners[i].target.removeEventListener(listeners[i].type, listeners[i].fn, false);
    }
    listeners.length = 0;
    if (root.parentNode) { root.parentNode.removeChild(root); }
    q = null;
    buttons = [];
    hintNode = null;
    statusNode = null;
    trayNode = null;
  }

  if (q) { build(); }

  return {
    render: render,
    onWrong: onWrong,
    onCorrect: onCorrect,
    celebrate: celebrate,
    destroy: destroy,
    handleKey: handleKey
  };
};
