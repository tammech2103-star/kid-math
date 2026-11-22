/**
 * brain-age — Bảng phấn một ô trống (bài b12).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 13, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['brain-age'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { writeMs: 320, cellSizePx: 88, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-brain-age';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var answers = [];
  var slotNode = null;
  var hintNode = null;
  var statusNode = null;
  var slotFilled = false;
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

  function choicesOf(question) {
    return question && question['choices'] ? question['choices'] : [];
  }

  function renderOf(question) {
    return question && question['choiceRender'] ? question['choiceRender'] : '';
  }

  function tokensOf(question) {
    if (!question || !question.equation || !question.equation.tokens) { return []; }
    return question.equation.tokens;
  }

  function find(question, value) {
    var list;
    var i;
    if (value == null || !question) { return null; }
    list = choicesOf(question);
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

  function clearHint() {
    if (hintNode) { hintNode.textContent = ''; }
    root.classList.remove('has-hint');
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

  function tokenText(token) {
    if (!token) { return ''; }
    if (token.type === 'slot') { return ''; }
    if (token.value === '-') { return '−'; }
    return token.value != null ? String(token.value) : '';
  }

  function choiceLabel(choice) {
    if (renderOf(q) === 'shape') {
      return choice.aria || choice.label || choice.shape || String(choice.value);
    }
    return choice.label != null ? String(choice.label) : String(choice.value);
  }

  function fillSlot(label, index) {
    var ms = knob('writeMs');
    if (locked || destroyed || !slotNode || slotFilled) { return; }
    slotFilled = true;
    slotNode.textContent = label;
    slotNode.setAttribute('aria-label', 'ô đã điền ' + label);
    slotNode.classList.add('is-filled');
    clearHint();
    if (!reduced) {
      slotNode.style.transition = 'opacity ' + ms + 'ms ease, background ' + ms + 'ms ease';
      slotNode.style.background = '#fff3b0';
      later(function () {
        if (slotNode.parentNode) { slotNode.style.background = '#fffdf2'; }
      }, ms);
    }
    if (statusNode) { statusNode.textContent = 'Đã viết ' + label + ' vào ô trống'; }
    submit(choicesOf(q)[index] ? choicesOf(q)[index].value : null);
  }

  function reset() {
    clearTimers();
    locked = false;
    slotFilled = false;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    answers = [];
    slotNode = null;
    hintNode = null;
    statusNode = null;
  }

  function build() {
    var tokens = tokensOf(q);
    var choices = choicesOf(q);
    var cell = Math.max(72, knob('cellSizePx'));
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '272px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', {
      class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' }
    }, [q && q.text ? q.text : '']));

    var board = node('div', {
      class: 'kmg-chalkboard',
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
        justifyContent: 'center', flex: '1 1 auto', padding: '12px',
        borderRadius: '18px', background: '#245c4a', border: '6px solid #b98a4b'
      }
    });
    for (i = 0; i < tokens.length; i += 1) {
      (function (token, index) {
        if (token && token.type === 'slot') {
          slotNode = node('div', {
            class: 'kmg-slot', role: 'button', tabindex: '0',
            'data-index': String(index), 'aria-label': 'ô trống',
            style: {
              minWidth: cell + 'px', minHeight: cell + 'px', width: cell + 'px',
              height: cell + 'px', borderRadius: '10px', border: '3px dashed #d9f2c6',
              background: '#fffdf2', color: '#1f4b3b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: '800'
            }
          }, ['']);
          board.appendChild(slotNode);
          return;
        }
        board.appendChild(node('div', {
          class: 'kmg-token', 'data-index': String(index),
          'aria-label': tokenText(token),
          style: {
            minWidth: Math.max(64, cell * 0.7) + 'px', minHeight: cell + 'px',
            padding: '0 6px', borderRadius: '10px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#f4fff5', fontSize: '2rem', fontWeight: '800'
          }
        }, [tokenText(token)]));
      }(tokens[i], i));
    }
    root.appendChild(board);

    var keyRow = node('div', {
      class: 'kmg-number-keys',
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }
    });
    keyRow.appendChild(node('span', {
      text: 'Bấm số để viết vào ô:', style: { fontWeight: '700' }
    }));
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = choiceLabel(choice);
        var btn = node('button', {
          class: 'kmg-btn kmg-answer', type: 'button', 'data-index': String(index),
          'aria-label': 'Viết số ' + label,
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '14px',
            background: '#fffdf2', color: '#285443', border: '3px solid #9fd1ad',
            fontSize: '1.6rem', fontWeight: '800', cursor: 'pointer'
          }
        }, [label]);
        answers.push(btn);
        keyRow.appendChild(btn);
      }(choices[i], i));
    }
    root.appendChild(keyRow);

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
    var btn = closestClass(event.target, 'kmg-answer', root);
    if (btn && !locked && q) {
      var index = parseInt(btn.getAttribute('data-index'), 10);
      var choice = choicesOf(q)[index];
      if (choice) {
        var label = choiceLabel(choice);
        fillSlot(label, index);
      }
      return;
    }
    if (closestClass(event.target, 'kmg-slot', root)) {
      if (!slotFilled) { setHint('Chạm phím số bên dưới nhé'); }
      return;
    }
    if (closestClass(event.target, 'kmg-token', root)) {
      setHint('Chạm ô trống nhé');
    }
  });

  on(root, 'keydown', function (event) {
    if (destroyed || locked) { return; }
    if (event.key !== 'Enter' && event.key !== ' ') { return; }
    if (closestClass(event.target, 'kmg-slot', root)) {
      event.preventDefault();
      setHint('Chạm phím số bên dưới nhé');
    }
  });

  function pressHotspot(index) {
    var choice = choicesOf(q)[index];
    if (!choice) { return false; }
    fillSlot(choiceLabel(choice), index);
    return true;
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
    if (isNaN(index) || index < 1 || index > answers.length) { return false; }
    pressHotspot(index - 1);
    return true;
  }

  function destroy() {
    var i;
    if (destroyed) { return; }
    destroyed = true;
    clearTimers();
    for (i = 0; i < listeners.length; i += 1) {
      listeners[i].target.removeEventListener(listeners[i].type, listeners[i].fn, false);
    }
    listeners.length = 0;
    if (root.parentNode) { root.parentNode.removeChild(root); }
    q = null;
    answers = [];
    slotNode = null;
    hintNode = null;
    statusNode = null;
    slotFilled = false;
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
