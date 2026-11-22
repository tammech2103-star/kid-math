/**
 * yoshi-island — Ray nuốt có miệng cuối (bài b10).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (dòng bảng 11, mục Formulas).
 * Kiến trúc: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa, classic script ES5, không dùng helper hay registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['yoshi-island'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount;
  var q = opts.question || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var DEFAULTS = { swallowMs: 280, mouthCapacity: 10, celebrateMs: 900, wrongShakeMs: 360 };

  var root = document.createElement('div');
  root.className = 'kmg-yoshi-island';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var timers = [];
  var listeners = [];
  var answers = [];
  var fruits = [];
  var eaten = {};
  var swallowed = 0;
  var hintNode = null;
  var statusNode = null;
  var countNode = null;
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

  function groupsOf(question) {
    if (!question || !question.visual || !question.visual.groups) { return []; }
    return question.visual.groups;
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

  function groupCount(group) {
    var count = group && group.count != null ? Number(group.count) : 0;
    return isNaN(count) ? 0 : count;
  }

  function sumGroups(question) {
    var groups = groupsOf(question);
    var total = 0;
    var i;
    for (i = 0; i < groups.length; i += 1) { total += groupCount(groups[i]); }
    return total;
  }

  function isMasked(question) {
    var groups = groupsOf(question);
    return groups.length === 2 && groups[1].masked === true;
  }

  function actionValue(question) {
    var groups = groupsOf(question);
    return isMasked(question) ? groupCount(groups[1]) : sumGroups(question);
  }

  function submitChoice(index) {
    var choice = choicesOf(q)[index];
    var computed;
    if (!choice) { return false; }
    computed = actionValue(q);
    if (String(computed) === String(choice.value)) { return submit(computed); }
    return submit(choice.value);
  }

  function choiceLabel(choice) {
    if (renderOf(q) === 'shape') {
      return choice.aria || choice.label || choice.shape || String(choice.value);
    }
    return choice.label != null ? String(choice.label) : String(choice.value);
  }

  function updateCount() {
    if (!countNode) { return; }
    countNode.textContent = swallowed === 0
      ? 'Chưa nuốt quả nào'
      : 'Đã nuốt ' + swallowed + ' quả';
  }

  function swallow(el, key) {
    var ms = knob('swallowMs');
    if (eaten[key]) {
      setHint('Bé nuốt mỗi quả một lần nhé');
      return;
    }
    if (swallowed >= knob('mouthCapacity')) {
      setHint('Giỏ đầy rồi bé ơi');
      return;
    }
    eaten[key] = true;
    swallowed += 1;
    clearHint();
    tap();
    updateCount();
    if (!el) { return; }
    el.disabled = true;
    el.setAttribute('aria-pressed', 'true');
    if (reduced) {
      el.style.opacity = '0.28';
      return;
    }
    el.style.transition = 'opacity ' + ms + 'ms ease, transform ' + ms + 'ms ease';
    el.style.opacity = '0.28';
    el.style.transform = 'translateY(-10px) scale(0.84)';
    later(function () {
      if (el.parentNode) { el.style.transform = ''; }
    }, ms);
  }

  function reset() {
    clearTimers();
    locked = false;
    swallowed = 0;
    eaten = {};
    root.classList.remove('is-correct', 'is-celebrating', 'is-wrong', 'has-hint', 'is-answered');
    while (root.firstChild) { root.removeChild(root.firstChild); }
    answers = [];
    fruits = [];
    hintNode = null;
    statusNode = null;
    countNode = null;
  }

  function build() {
    var choices = choicesOf(q);
    var groups = groupsOf(q);
    var isIdentify = renderOf(q) === 'shape';
    var capacity = knob('mouthCapacity');
    var made = 0;
    var g;
    var i;

    reset();
    applyStyle(root, {
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '8px', minHeight: '276px', fontFamily: 'inherit'
    });
    root.appendChild(node('div', {
      class: 'kmg-kicker', style: { fontSize: '1.05rem', fontWeight: '700' }
    }, [q && q.text ? q.text : '']));

    var strip = node('div', {
      class: 'kmg-fruit-strip',
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end',
        flex: '1 1 auto', padding: '8px', borderRadius: '18px',
        background: 'rgba(236,255,232,0.86)', border: '3px solid #b7dda6'
      }
    });

    for (g = 0; g < groups.length; g += 1) {
      (function (group, groupIndex) {
        var total = groupCount(group);
        var plate = node('div', {
          class: 'kmg-plate',
          style: {
            display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
            padding: '6px', borderRadius: '14px', background: 'rgba(255,255,255,0.72)'
          }
        }, [node('span', {
          text: group.label || ('Đống ' + (groupIndex + 1)),
          style: { fontSize: '0.85rem', fontWeight: '700' }
        })]);
        var row = node('div', {
          class: 'kmg-plate-row',
          style: { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }
        });
        if (total === 0) {
          row.appendChild(node('span', {
            text: '0 quả',
            style: { fontSize: '0.95rem', fontWeight: '800', color: '#4f7a45' }
          }));
        }
        for (i = 0; i < total && made < capacity; i += 1, made += 1) {
          (function (fruitIndex, key) {
            var glyph = group.glyph || '🍎';
            var btn = node('button', {
              class: 'kmg-btn kmg-fruit', type: 'button',
              'data-group': String(groupIndex), 'data-fruit': String(fruitIndex),
              'data-key': key, 'aria-label': 'Nuốt quả thứ ' + (fruitIndex + 1),
              'aria-pressed': 'false',
              style: {
                minWidth: '64px', minHeight: '64px', width: '64px', height: '64px',
                borderRadius: '50%', background: '#fff4d6', border: '2px solid #d8a94f',
                fontSize: '1.8rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }
            }, [glyph]);
            fruits.push({ el: btn, key: key });
            row.appendChild(btn);
          }(i, groupIndex + ':' + i));
        }
        plate.appendChild(row);
        strip.appendChild(plate);
      }(groups[g], g));
    }
    root.appendChild(strip);

    var mouthRow = node('div', {
      class: 'kmg-mouth-row',
      style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
    });
    var mouth = node('div', {
      class: 'kmg-mouth', role: 'button', tabindex: '0', 'aria-label': 'Giỏ của Yoshi',
      style: {
        minWidth: '72px', minHeight: '72px', borderRadius: '18px',
        background: '#ffd66b', border: '3px solid #a96d17', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', cursor: 'pointer'
      }
    }, ['🧺']);
    mouthRow.appendChild(mouth);
    countNode = node('span', {
      class: 'kmg-count', style: { fontWeight: '700', minWidth: '128px' }
    }, ['Chưa nuốt quả nào']);
    mouthRow.appendChild(countNode);
    root.appendChild(mouthRow);

    var answerRow = node('div', {
      class: 'kmg-answers',
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }
    });
    answerRow.appendChild(node('span', {
      text: 'Bấm số quả đã nuốt:', style: { fontWeight: '700' }
    }));
    for (i = 0; i < choices.length; i += 1) {
      (function (choice, index) {
        var label = choiceLabel(choice);
        var content = [];
        if (isIdentify && choice.shape) { content.push('▢ '); }
        content.push(label);
        var btn = node('button', {
          class: 'kmg-btn kmg-answer', type: 'button', 'data-index': String(index),
          'aria-label': 'Chọn ' + label,
          style: {
            minWidth: '64px', minHeight: '64px', borderRadius: '14px',
            background: '#fffdf2', color: '#3d532f', border: '3px solid #96c783',
            fontSize: '1.6rem', fontWeight: '800', cursor: 'pointer'
          }
        }, content);
        answers.push(btn);
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
    var fruit = closestClass(event.target, 'kmg-fruit', root);
    if (fruit && !locked) {
      swallow(fruit, fruit.getAttribute('data-key'));
      return;
    }
    var btn = closestClass(event.target, 'kmg-answer', root);
    if (btn && !locked && q) {
      submitChoice(parseInt(btn.getAttribute('data-index'), 10));
      return;
    }
    if (closestClass(event.target, 'kmg-mouth', root)) {
      setHint('Chạm quả để nuốt vào giỏ nhé');
    }
  });

  on(root, 'keydown', function (event) {
    if (destroyed || locked) { return; }
    if (event.key !== 'Enter' && event.key !== ' ') { return; }
    if (!closestClass(event.target, 'kmg-mouth', root)) { return; }
    event.preventDefault();
    setHint('Chạm quả để nuốt vào giỏ nhé');
  });

  function pressHotspot(index) {
    return submitChoice(index);
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
    fruits = [];
    eaten = {};
    hintNode = null;
    statusNode = null;
    countNode = null;
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
