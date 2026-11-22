/**
 * mario-maker — Khay đất sét 3×3 có tranh mờ (bài b8).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 9, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-maker'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { gridCells: 9, snapMs: 200, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-mario-maker';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var buttons = [];
  var cells = [];
  var placed = [];
  var cellCount = 9;
  var hintNode = null;
  var statusNode = null;
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

  function maxChoiceValue() {
    var list = q && q['choices'] ? q['choices'] : [];
    var max = 0;
    var i;
    var value;
    for (i = 0; i < list.length; i += 1) {
      value = Number(list[i].value);
      if (!isNaN(value) && value > max) { max = value; }
    }
    return max;
  }

  function placedCount() {
    var total = 0;
    var i;
    for (i = 0; i < placed.length; i += 1) {
      if (placed[i]) { total += 1; }
    }
    return total;
  }

  function paintCell(index) {
    var cell = cells[index];
    if (!cell) { return; }
    if (placed[index]) {
      cell.style.background = '#ffb020';
      cell.style.borderColor = '#c47a00';
      cell.setAttribute('aria-pressed', 'true');
      if (!reduced) {
        cell.style.transition = 'transform ' + knob('snapMs') + 'ms ease';
        cell.style.transform = 'scale(1.04)';
        later(function () { if (cell.parentNode) { cell.style.transform = ''; } }, knob('snapMs'));
      }
    } else {
      cell.style.background = 'rgba(255,255,255,0.82)';
      cell.style.borderColor = '#d9b98b';
      cell.setAttribute('aria-pressed', 'false');
    }
  }

  function toggleCell(index) {
    var total;
    if (locked || destroyed || index < 0 || index >= cellCount) { return; }
    placed[index] = !placed[index];
    paintCell(index);
    root.classList.remove('has-hint');
    total = placedCount();
    if (find(q, total)) {
      submit(total);
    } else if (total > maxChoiceValue()) {
      setHint('Bè bớt 1 viên nhé');
    } else {
      setHint('Đặt đủ số viên rồi bấm số nhé');
    }
  }

  function reset() {
    clearTimers();
    locked = false;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    buttons = [];
    cells = [];
    placed = [];
    hintNode = null;
    statusNode = null;
    cellCount = knob('gridCells') >= 9 ? knob('gridCells') : 9;
    for (var i = 0; i < cellCount; i += 1) { placed.push(false); }
  }

  function build() {
    var choices = q && q['choices'] ? q['choices'] : [];
    var ghosts = q && q.visual && q.visual.items ? q.visual.items : [];
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '276px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', { class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' } }, [
      q && q.text ? q.text : ''
    ]));

    var grid = node('div', {
      class: 'kmg-clay-grid',
      role: 'group', 'aria-label': 'Khay đất sét ba trên ba',
      style: {
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(64px, 1fr))',
        gap: '8px', maxWidth: '280px'
      }
    });
    for (i = 0; i < cellCount; i += 1) {
      (function (index) {
        var kids = [];
        if (ghosts[index] && ghosts[index].shape) {
          kids.push(node('span', {
            class: 'kmg-ghost', 'aria-hidden': 'true',
            style: { opacity: '0.2', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }, [shapeSvg(ghosts[index].shape, 46)]));
        }
        var cell = node('div', {
          class: 'kmg-cell', role: 'button', tabindex: '0', 'data-index': String(index),
          'aria-label': 'Ô thứ ' + (index + 1), 'aria-pressed': 'false',
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '12px',
            border: '3px dashed #d9b98b', background: 'rgba(255,255,255,0.82)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }
        }, kids);
        cells.push(cell);
        grid.appendChild(cell);
      }(i));
    }
    root.appendChild(grid);

    var answerRow = node('div', {
      class: 'kmg-count-row',
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }
    });
    answerRow.appendChild(node('span', {
      text: 'Bấm số viên đã xếp:',
      style: { fontWeight: '700' }
    }));
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = choice.label != null ? String(choice.label) : String(choice.value);
        var btn = node('button', {
          class: 'kmg-btn kmg-number', type: 'button', 'data-index': String(index),
          'aria-label': 'Chọn số ' + label,
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '14px',
            background: '#fff7e4', color: '#4a3a24', border: '3px solid #e0b96b',
            fontSize: '1.6rem', fontWeight: '800', cursor: 'pointer'
          }
        }, [label]);
        buttons.push(btn);
        answerRow.appendChild(btn);
      }(choices[i], i));
    }
    root.appendChild(answerRow);

    statusNode = node('p', { class: 'kmg-status', style: { minHeight: '24px', fontWeight: '700' } }, ['']);
    hintNode = node('p', {
      class: 'kmg-hint', 'aria-live': 'polite',
      style: { minHeight: '24px', color: '#a4402c', fontWeight: '700' }
    }, ['']);
    root.appendChild(statusNode);
    root.appendChild(hintNode);
  }

  on(root, 'click', function (event) {
    if (destroyed) { return; }
    var cell = closestClass(event.target, 'kmg-cell', root);
    if (cell) {
      toggleCell(parseInt(cell.getAttribute('data-index'), 10));
      return;
    }
    if (locked || !q) { return; }
    var btn = closestClass(event.target, 'kmg-number', root);
    if (btn) {
      var index = parseInt(btn.getAttribute('data-index'), 10);
      if (q['choices'] && q['choices'][index]) { submit(q['choices'][index].value); }
    }
  });

  on(root, 'keydown', function (event) {
    if (destroyed || locked) { return; }
    if (event.key !== 'Enter' && event.key !== ' ') { return; }
    var cell = closestClass(event.target, 'kmg-cell', root);
    if (!cell) { return; }
    event.preventDefault();
    toggleCell(parseInt(cell.getAttribute('data-index'), 10));
  });

  function pressHotspot(index) {
    if (!q || !q['choices'] || !q['choices'][index]) { return false; }
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
    cells = [];
    placed = [];
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
