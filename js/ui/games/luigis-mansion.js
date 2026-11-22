/**
 * luigis-mansion — Vòng xoáy hút bóng có đèn tâm (bài b11).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 12, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['luigis-mansion'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { suckMs: 420, spiralTurns: 2, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-luigis-mansion';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var answers = [];
  var balls = [];
  var vacuumed = 0;
  var suckTimer = null;
  var holding = false;
  var hintNode = null;
  var statusNode = null;
  var remainNode = null;
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
    suckTimer = null;
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

  function groupOf(question) {
    if (!question || !question.visual || !question.visual.groups || !question.visual.groups[0]) {
      return null;
    }
    return question.visual.groups[0];
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

  function countOf(value) {
    var number = value != null ? Number(value) : 0;
    return isNaN(number) ? 0 : number;
  }

  function firstCount() {
    var group = groupOf(q);
    return group ? countOf(group.count) : 0;
  }

  function crossedOut() {
    var group = groupOf(q);
    return group ? countOf(group.crossedOut) : 0;
  }

  function vacuumLimit() {
    return Math.min(firstCount(), crossedOut());
  }

  function remain() {
    return Math.max(0, firstCount() - vacuumed);
  }

  function updateRemain() {
    var text = 'Còn ' + remain() + ' cái';
    if (remainNode) { remainNode.textContent = text; }
    if (statusNode) { statusNode.textContent = text; }
  }

  function choiceLabel(choice) {
    if (renderOf(q) === 'shape') {
      return choice.aria || choice.label || choice.shape || String(choice.value);
    }
    return choice.label != null ? String(choice.label) : String(choice.value);
  }

  function ballPosition(index, total) {
    var radius;
    var angle;
    if (reduced) {
      radius = 34;
      angle = (total > 0 ? index / total : 0) * Math.PI * 2 - Math.PI / 2;
    } else {
      var spread = total > 1 ? index / (total - 1) : 0;
      radius = 20 + spread * 18;
      angle = spread * knob('spiralTurns') * Math.PI * 2 - Math.PI / 2;
    }
    return {
      left: (50 + radius * Math.cos(angle)) + '%',
      top: (50 + radius * Math.sin(angle)) + '%'
    };
  }

  function stopVacuum() {
    holding = false;
    if (suckTimer !== null) {
      window.clearTimeout(suckTimer);
      suckTimer = null;
    }
    root.classList.remove('is-vacuuming');
  }

  function vacuumNext() {
    var ball;
    var ms;
    if (!holding || locked || destroyed) { return; }
    if (vacuumed >= vacuumLimit()) { stopVacuum(); return; }
    ball = balls[vacuumed];
    if (!ball) { stopVacuum(); return; }
    ball.disabled = true;    ball.setAttribute('aria-pressed', 'true');
    ball.classList.add('is-vacuumed');
    vacuumed += 1;
    clearHint();
    tap();
    updateRemain();
    if (reduced) {
      ball.style.opacity = '0.2';
    } else {
      ms = knob('suckMs');
      ball.style.transition = 'left ' + ms + 'ms ease, top ' + ms + 'ms ease, opacity ' + ms + 'ms ease';
      ball.style.left = '50%';
      ball.style.top = '50%';
      ball.style.opacity = '0.2';
    }
    if (vacuumed >= vacuumLimit()) {
      stopVacuum();
      return;
    }
    suckTimer = later(vacuumNext, knob('suckMs'));
  }

  function startVacuum(ball) {
    var index = parseInt(ball.getAttribute('data-index'), 10);
    if (locked || destroyed) { return; }
    if (index !== vacuumed) {
      setHint(index < vacuumed
        ? 'Bé hút đủ ' + vacuumLimit() + ' cái thôi nhé'
        : 'Hút bóng kế tiếp nhé');
      return;
    }
    if (vacuumed >= vacuumLimit()) {
      setHint('Bé hút đủ ' + vacuumLimit() + ' cái thôi nhé');
      return;
    }
    holding = true;
    root.classList.add('is-vacuuming');
    vacuumNext();
  }

  function reset() {
    clearTimers();
    stopVacuum();
    locked = false;
    vacuumed = 0;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered', 'is-vacuuming');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    answers = [];
    balls = [];
    hintNode = null;
    statusNode = null;
    remainNode = null;
  }

  function build() {
    var choices = choicesOf(q);
    var total = firstCount();
    var glyph = groupOf(q) && groupOf(q).glyph ? groupOf(q).glyph : '🔵';
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '320px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', {
      class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' }
    }, [q && q.text ? q.text : '']));

    var stage = node('div', {
      class: 'kmg-vacuum-stage',
      style: {
        position: 'relative', width: '100%', maxWidth: '420px', minHeight: '284px',
        margin: '0 auto', borderRadius: '24px',
        background: 'radial-gradient(circle at 50% 50%, #4b3a70 0, #2a2146 62%, #1d1836 100%)',
        border: '3px solid #7a6bab', overflow: 'hidden'
      }
    });
    stage.appendChild(node('div', {
      class: 'kmg-spiral-guide', 'aria-hidden': 'true',
      style: {
        position: 'absolute', left: '50%', top: '50%', width: '220px', height: '220px',
        marginLeft: '-110px', marginTop: '-110px', borderRadius: '50%',
        border: '2px dashed rgba(255,238,170,0.45)'
      }
    }));
    stage.appendChild(node('div', {
      class: 'kmg-lantern', 'aria-label': 'Đèn lồng',
      style: {
        position: 'absolute', left: '50%', top: '50%', width: '80px', height: '80px',
        marginLeft: '-40px', marginTop: '-40px', borderRadius: '18px',
        background: '#ffd86b', border: '3px solid #fff2bd', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
        boxShadow: '0 0 22px rgba(255,216,107,0.65)'
      }
    }, ['🏮']));

    if (total === 0) {
      stage.appendChild(node('span', {
        style: {
          position: 'absolute', left: '50%', top: '22%', color: '#fff4c2',
          fontWeight: '700', fontSize: '1rem'
        }
      }, ['0 bóng']));
    }
    for (i = 0; i < total; i += 1) {
      (function (index) {
        var pos = ballPosition(index, total);
        var btn = node('button', {
          class: 'kmg-btn kmg-ball', type: 'button', 'data-index': String(index),
          'aria-label': 'Giữ để hút bóng thứ ' + (index + 1), 'aria-pressed': 'false',
          style: {
            position: 'absolute', left: pos.left, top: pos.top,
            marginLeft: '-32px', marginTop: '-32px',
            minWidth: '64px', minHeight: '64px', width: '64px', height: '64px',
            borderRadius: '50%', background: '#f3f0ff', color: '#5b4a91',
            border: '2px solid #c9bdf5', fontSize: '1.7rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }
        }, [glyph]);
        balls.push(btn);
        stage.appendChild(btn);
      }(i));
    }
    root.appendChild(stage);

    remainNode = node('p', {
      class: 'kmg-remain', style: { fontWeight: '800', minHeight: '24px' }
    }, ['Còn ' + remain() + ' cái']);
    root.appendChild(remainNode);

    var answerRow = node('div', {
      class: 'kmg-answers',
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }
    });
    answerRow.appendChild(node('span', {
      text: 'Bấm số bóng còn lại:', style: { fontWeight: '700' }
    }));
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = choiceLabel(choice);
        var btn = node('button', {
          class: 'kmg-btn kmg-answer', type: 'button', 'data-index': String(index),
          'aria-label': 'Chọn ' + label,
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '14px',
            background: '#fff8e6', color: '#46376f', border: '3px solid #a89bd4',
            fontSize: '1.6rem', fontWeight: '800', cursor: 'pointer'
          }
        }, [label]);
        answers.push(btn);
        answerRow.appendChild(btn);
      }(choices[i], i));
    }
    root.appendChild(answerRow);

    statusNode = node('p', { class: 'kmg-status', style: { minHeight: '24px', fontWeight: '700' } }, ['']);
    hintNode = node('p', {
      class: 'kmg-hint', 'aria-live': 'polite',
      style: { minHeight: '24px', color: '#ffe0a8', fontWeight: '700' }
    }, ['']);
    root.appendChild(statusNode);
    root.appendChild(hintNode);
  }

  on(root, 'pointerdown', function (event) {
    if (locked || destroyed) { return; }
    var ball = closestClass(event.target, 'kmg-ball', root);
    if (ball) {
      event.preventDefault();
      startVacuum(ball);
      return;
    }
    if (closestClass(event.target, 'kmg-lantern', root)) {
      setHint('Giữ bóng để hút vào đèn nhé');
    }
  });

  on(root, 'click', function (event) {
    if (locked || destroyed || !q) { return; }
    var btn = closestClass(event.target, 'kmg-answer', root);
    if (!btn) { return; }
    var index = parseInt(btn.getAttribute('data-index'), 10);
    if (choicesOf(q)[index]) { submit(choicesOf(q)[index].value); }
  });

  on(window, 'pointerup', stopVacuum);
  on(window, 'pointercancel', stopVacuum);

  function pressHotspot(index) {
    var choice = choicesOf(q)[index];
    if (!choice) { return false; }
    return submit(choice.value);
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
    balls = [];
    hintNode = null;
    statusNode = null;
    remainNode = null;
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
