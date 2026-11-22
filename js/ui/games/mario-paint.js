/**
 * mario-paint — Canvas ba vùng vuốt dọc (bài b9).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 10, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-paint'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { strokeMinPx: 80, zoneSizePx: 120, celebrateMs: 900 };

  var root = document.createElement('div');
  root.className = 'kmg-mario-paint';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var buttons = [];
  var hintNode = null;
  var statusNode = null;
  var pointerId = null;
  var startX = 0;
  var startY = 0;
  var firstZone = -1;
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

  function zoneAt(target) {
    var zone = closestClass(target, 'kmg-zone', root);
    return zone ? parseInt(zone.getAttribute('data-index'), 10) : -1;
  }

  function distance(x, y) {
    var dx = x - startX;
    var dy = y - startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function paintZone(index) {
    var zone = buttons[index];
    if (!zone) { return; }
    zone.classList.add('is-painted');
    if (reduced) {
      zone.style.background = '#ffe08a';
      return;
    }
    zone.style.transition = 'background ' + knob('snapMs') + 'ms ease';
    zone.style.background = '#ffe08a';
  }

  function resetPointer() {
    pointerId = null;
    startX = 0;
    startY = 0;
    firstZone = -1;
  }

  function reset() {
    clearTimers();
    resetPointer();
    locked = false;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    buttons = [];
    hintNode = null;
    statusNode = null;
  }

  function build() {
    var choices = q && q['choices'] ? q['choices'] : [];
    var isIdentify = !!(q && q['choiceRender'] === 'shape');
    var zoneHeight = Math.max(96, knob('zoneSizePx'));
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '276px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', { class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' } }, [
      q && q.text ? q.text : ''
    ]));

    var canvas = node('div', {
      class: 'kmg-canvas',
      style: {
        display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 auto',
        padding: '8px', borderRadius: '18px', background: '#fffdf5',
        border: '3px solid #e6d3a8', touchAction: 'none'
      }
    });
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = isIdentify
          ? (choice.aria || choice.label || choice.shape)
          : (choice.label != null ? String(choice.label) : String(choice.value));
        var content = [];
        if (isIdentify && choice.shape) { content.push(shapeSvg(choice.shape, 52)); }
        content.push(node('span', {
          text: label, style: { fontSize: '1rem', fontWeight: '800' }
        }));
        var btn = node('button', {
          class: 'kmg-btn kmg-zone', type: 'button', 'data-index': String(index),
          'aria-label': choice.aria || label,
          style: {
            minWidth: '64px', minHeight: '64px', width: '100%', height: zoneHeight + 'px',
            borderRadius: '14px', border: '3px solid #c9e0ef', background: '#f2f9ff',
            color: '#2c6f96', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px'
          }
        }, content);
        buttons.push(btn);
        canvas.appendChild(btn);
      }(choices[i], i));
    }
    root.appendChild(canvas);

    statusNode = node('p', { class: 'kmg-status', style: { minHeight: '24px', fontWeight: '700' } }, ['']);
    hintNode = node('p', {
      class: 'kmg-hint', 'aria-live': 'polite',
      style: { minHeight: '24px', color: '#a4402c', fontWeight: '700' }
    }, ['']);
    root.appendChild(statusNode);
    root.appendChild(hintNode);
  }

  on(root, 'pointerdown', function (event) {
    if (locked || destroyed || !q) { return; }
    var index = zoneAt(event.target);
    if (index < 0) { return; }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    firstZone = index;
  });

  on(root, 'pointermove', function (event) {
    if (locked || destroyed || pointerId === null || event.pointerId !== pointerId) { return; }
    if (firstZone < 0) { firstZone = zoneAt(event.target); }
  });

  on(root, 'pointerup', function (event) {
    if (locked || destroyed || pointerId === null || event.pointerId !== pointerId) { return; }
    var travelled = distance(event.clientX, event.clientY);
    var zone = firstZone;
    resetPointer();
    if (zone < 0 || !q || !q['choices'] || !q['choices'][zone]) { return; }
    if (travelled < knob('strokeMinPx')) {
      setHint('Vuốt dài hơn một chút nhé');
      return;
    }
    paintZone(zone);
    submit(q['choices'][zone].value);
  });

  on(root, 'pointercancel', function (event) {
    if (pointerId !== null && event.pointerId !== pointerId) { return; }
    resetPointer();
  });

  function pressHotspot(index) {
    if (!q || !q['choices'] || !q['choices'][index]) { return false; }
    paintZone(index);
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
