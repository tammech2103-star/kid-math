/**
 * mario-and-luigi — Hai đường chuyền có bóng (bài b13).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 14, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-and-luigi'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { passMs: 500, passesPerQuestion: 2, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-mario-and-luigi';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var answers = [];
  var balls = [];
  var tokenViews = [];
  var revealed = [];
  var passes = 0;
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
    if (!token || token.type === 'slot') { return '?'; }
    if (token.value === '-') { return '−'; }
    return token.value != null ? String(token.value) : '?';
  }

  function choiceLabel(choice) {
    if (renderOf(q) === 'shape') {
      return choice.aria || choice.label || choice.shape || String(choice.value);
    }
    return choice.label != null ? String(choice.label) : String(choice.value);
  }

  function updateStatus() {
    if (!statusNode) { return; }
    if (passes >= knob('passesPerQuestion')) {
      statusNode.textContent = 'Đủ đường chuyền, bấm thẻ số nhé';
    } else if (passes > 0) {
      statusNode.textContent = 'Đẩy tiếp bóng nhé';
    } else {
      statusNode.textContent = '';
    }
  }

  function revealToken(index) {
    var token = tokensOf(q)[index];
    var view = tokenViews[index];
    if (revealed[index]) { return false; }
    revealed[index] = true;
    if (view) {
      view.textContent = tokenText(token);
      view.classList.add('is-revealed');
    }
    passes += 1;
    clearHint();
    tap();
    updateStatus();
    return true;
  }

  function passBall(ball) {
    var index = parseInt(ball.getAttribute('data-index'), 10);
    var ms = knob('passMs');
    if (locked || destroyed) { return; }
    if (!revealToken(index)) {
      setHint('Bấm thẻ số nhé');
      return;
    }
    ball.disabled = true;
    ball.setAttribute('aria-pressed', 'true');
    ball.classList.add('is-passed');
    if (reduced) {
      ball.style.opacity = '0.35';
      return;
    }
    ball.style.transition = 'transform ' + ms + 'ms ease, opacity ' + ms + 'ms ease';
    ball.style.transform = 'translateX(56px)';
    ball.style.opacity = '0.35';
    later(function () {
      if (ball.parentNode) { ball.style.transform = ''; }
    }, ms);
  }

  function reset() {
    clearTimers();
    locked = false;
    passes = 0;
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    answers = [];
    balls = [];
    tokenViews = [];
    revealed = [];
    hintNode = null;
    statusNode = null;
  }

  function build() {
    var tokens = tokensOf(q);
    var choices = choicesOf(q);
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '308px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', {
      class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' }
    }, [q && q.text ? q.text : '']));

    var tokenRow = node('div', {
      class: 'kmg-token-row',
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
        justifyContent: 'center', padding: '8px', borderRadius: '14px',
        background: 'rgba(255,255,255,0.82)', border: '2px solid #c7d9ef'
      }
    });
    for (i = 0; i < tokens.length; i += 1) {
      tokenViews[i] = node('span', {
        class: 'kmg-token-cell', 'data-index': String(i),
        'aria-label': 'ô thứ ' + (i + 1),
        style: {
          minWidth: '48px', minHeight: '56px', padding: '0 8px',
          borderRadius: '10px', background: '#f4f8ff', border: '2px dashed #9fb8d8',
          color: '#26456d', fontSize: '1.8rem', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }
      }, ['?']);
      tokenRow.appendChild(tokenViews[i]);
    }
    root.appendChild(tokenRow);

    var field = node('div', {
      class: 'kmg-pass-field',
      style: { display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 auto' }
    });
    for (i = 0; i < 2; i += 1) {
      (function (laneIndex) {
        var lane = node('div', {
          class: 'kmg-lane',
          style: {
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
            borderRadius: '999px', background: laneIndex === 0
              ? 'rgba(255,226,226,0.92)' : 'rgba(220,244,225,0.92)',
            border: '2px solid ' + (laneIndex === 0 ? '#efb3b3' : '#a8d8b4')
          }
        });
        lane.appendChild(node('span', {
          class: 'kmg-friend', 'aria-label': laneIndex === 0 ? 'Bạn đỏ' : 'Bạn xanh',
          style: { fontSize: '1.8rem', minWidth: '44px', textAlign: 'center' }
        }, [laneIndex === 0 ? '🔴' : '🟢']));
        var laneBalls = node('div', {
          class: 'kmg-lane-balls',
          style: { display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '1 1 auto' }
        });
        lane.appendChild(laneBalls);
        lane.appendChild(node('span', {
          class: 'kmg-friend', 'aria-hidden': 'true',
          style: { fontSize: '1.8rem', minWidth: '44px', textAlign: 'center' }
        }, [laneIndex === 0 ? '🟢' : '🔴']));
        field.appendChild(lane);
        balls[laneIndex] = laneBalls;
      }(i));
    }
    root.appendChild(field);

    var ballNodes = [];
    for (i = 0; i < tokens.length; i += 1) {
      (function (index) {
        var laneBalls = balls[index % 2];
        var btn = node('button', {
          class: 'kmg-btn kmg-ball', type: 'button', 'data-index': String(index),
          'aria-label': 'Đẩy bóng mang ô thứ ' + (index + 1), 'aria-pressed': 'false',
          style: {
            minWidth: '64px', minHeight: '64px', width: '64px', height: '64px',
            borderRadius: '50%', background: '#fffdf2', color: '#c07800',
            border: '3px solid #e6b44f', fontSize: '1.8rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }
        }, ['⚽']);
        ballNodes.push(btn);
        laneBalls.appendChild(btn);
      }(i));
    }
    balls = ballNodes;

    var cardRow = node('div', {
      class: 'kmg-answer-cards',
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }
    });
    cardRow.appendChild(node('span', {
      text: 'Chọn thẻ số:', style: { fontWeight: '700' }
    }));
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = choiceLabel(choice);
        var btn = node('button', {
          class: 'kmg-btn kmg-answer', type: 'button', 'data-index': String(index),
          'aria-label': 'Chọn thẻ ' + label,
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '14px',
            background: '#fffdf2', color: '#3f4d6d', border: '3px solid #9fb6d9',
            fontSize: '1.6rem', fontWeight: '800', cursor: 'pointer'
          }
        }, [label]);
        answers.push(btn);
        cardRow.appendChild(btn);
      }(choices[i], i));
    }
    root.appendChild(cardRow);

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
    var ball = closestClass(event.target, 'kmg-ball', root);
    if (ball) {
      passBall(ball);
      return;
    }
    var btn = closestClass(event.target, 'kmg-answer', root);
    if (btn && !locked && q) {
      var index = parseInt(btn.getAttribute('data-index'), 10);
      if (choicesOf(q)[index]) { submit(choicesOf(q)[index].value); }
    }
  });

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
    tokenViews = [];
    revealed = [];
    hintNode = null;
    statusNode = null;
    passes = 0;
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
