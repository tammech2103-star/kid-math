/**
 * b17 / super-smash-bros — "Ba bệ cờ chồng tầng".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #18, chi tiết bài 18)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Mỗi bệ chứa đúng 1 cờ = 1 phần tử q.choices; nhãn cờ lấy nguyên
 * choice.label (có thể là '>', '<', '=' hoặc số). Chạm bệ trống → 0 sự kiện.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['super-smash-bros'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var q = opts.question || null;
  var destroyed = false;
  var locked = false;
  var timers = [];
  var listeners = [];

  var root = document.createElement('div');
  root.className = 'kmg-super-smash-bros' + (reduced ? ' is-reduced' : '');
  if (mount) {
    mount.appendChild(root);
  }

  function text(value) {
    return typeof window.tr === 'function' ? window.tr(value) : value;
  }

  function append(host, kids) {
    if (kids == null) {
      return;
    }
    if (Array.isArray(kids)) {
      kids.forEach(function (kid) { append(host, kid); });
    } else if (kids && kids.nodeType) {
      host.appendChild(kids);
    } else {
      host.appendChild(document.createTextNode(String(kids)));
    }
  }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (key) {
      var value = a[key];
      if (value == null || value === false) {
        return;
      }
      if (key === 'class') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) { node.style[prop] = value[prop]; });
      } else {
        node.setAttribute(key, value === true ? '' : String(value));
      }
    });
    append(node, kids);
    return node;
  }

  function btn(extraClass, attrs, label) {
    var node = el('button', attrs || {});
    node.type = 'button';
    node.className = 'kmg-btn kmg-super-smash-bros__' + extraClass;
    node.style.minWidth = '64px';
    node.style.minHeight = '64px';
    if (label != null) {
      node.appendChild(document.createTextNode(String(label)));
    }
    return node;
  }

  function on(target, type, fn) {
    if (!target) {
      return;
    }
    target.addEventListener(type, fn, false);
    listeners.push({ target: target, type: type, fn: fn });
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { window.clearTimeout(id); });
    timers = [];
  }

  function tune(key, fallback) {
    var game = (window.KM && KM.Tuning && KM.Tuning.game) || {};
    var value = game[key];
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function tap() {
    if (audio && typeof audio.tap === 'function') {
      try { audio.tap(); } catch (error) { /* không ảnh hưởng câu trả lời */ }
    }
  }

  function find(question, value) {
    var list;
    var i;
    if (!question || value == null) {
      return null;
    }
    list = question.choices || [];
    for (i = 0; i < list.length; i += 1) {
      if (String(list[i].value) === String(value)) {
        return list[i];
      }
    }
    return null;
  }

  function submit(value) {
    var found;
    if (destroyed || locked) {
      return false;
    }
    found = find(q, value);
    if (!found) {
      hintNode.textContent = text('Bé chọn lại nhé!');
      return false;
    }
    locked = true;
    root.classList.add('is-picked');
    mount.dispatchEvent(new CustomEvent('km:answer', {
      bubbles: true,
      detail: { value: found.value }
    }));
    return true;
  }

  var promptNode = el('p', { class: 'kmg-super-smash-bros__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#6c4a2f'
  } });

  var towersNode = el('div', { class: 'kmg-super-smash-bros__towers', style: {
    display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px',
    borderRadius: '20px', background: 'linear-gradient(180deg, #fff4df, #e7d6c2)',
    border: '3px solid #b99773'
  } });

  var hintNode = el('p', {
    class: 'kmg-super-smash-bros__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#7a5334' }
  });

  root.appendChild(promptNode);
  root.appendChild(towersNode);
  root.appendChild(hintNode);

  function drawTowers() {
    var list = (q && q.choices) || [];
    while (towersNode.firstChild) {
      towersNode.removeChild(towersNode.firstChild);
    }
    list.forEach(function (choice, index) {
      var label = choice.label || String(choice.value);
      var platform = el('div', {
        class: 'kmg-super-smash-bros__platform',
        'data-sbs-platform': String(index),
        style: {
          borderRadius: '16px', border: '2px solid #a47a51',
          background: index % 2 ? '#f3e1c6' : '#f9ecd8', padding: '6px'
        }
      });
      var flag = btn('flag', {
        'data-sbs-flag': String(index),
        'aria-label': text('Cờ thứ ' + (index + 1) + ': ' + label)
      }, '🚩 ' + label);
      flag.style.cssText = 'display:block;width:100%;border-radius:14px;background:#fffdf5;color:#7a3f22;font-weight:900;font-size:1.35rem;';
      flag.setAttribute('data-value', String(choice.value));
      var ledge = el('div', {
        class: 'kmg-super-smash-bros__ledge',
        'aria-hidden': 'true',
        text: text('▁▁▁▁▁▁▁▁'),
        style: { textAlign: 'center', minHeight: '64px', lineHeight: '64px', color: '#b08a62', fontSize: '1.4rem' }
      });
      platform.appendChild(flag);
      platform.appendChild(ledge);
      towersNode.appendChild(platform);
    });
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    clearTimers();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked');
    promptNode.textContent = (q && q.text) || '';
    hintNode.textContent = text('Bé đấm vào lá cờ trên bệ nhé!');
    drawTowers();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed) {
      return;
    }
    submit(choice.value);
  }

  on(towersNode, 'click', function (event) {
    var target = event.target;
    var flag = null;
    while (target && target !== towersNode) {
      if (target.getAttribute && target.getAttribute('data-sbs-flag') != null) {
        flag = target;
        break;
      }
      target = target.parentNode;
    }
    tap();
    if (flag) {
      activate(Number(flag.getAttribute('data-sbs-flag')));
      return;
    }
    hintNode.textContent = text('Chạm vào cờ nhé!');
  });

  function onWrong() {
    if (destroyed) {
      return;
    }
    clearTimers();
    root.classList.remove('is-correct', 'is-picked');
    root.classList.add('is-wrong');
    later(function () { root.classList.remove('is-wrong'); }, tune('wrongShakeMs', 360));
    locked = false;
    drawTowers();
    hintNode.textContent = text('Cờ rung rung. Bé đấm cờ khác nhé!');
  }

  function onCorrect() {
    if (!destroyed) {
      root.classList.add('is-correct');
      root.classList.remove('is-wrong');
    }
  }

  function celebrate() {
    if (destroyed) {
      return;
    }
    root.classList.add('is-celebrate');
    later(function () { root.classList.remove('is-celebrate'); }, tune('celebrateMs', 900));
  }

  function handleKey(key) {
    var digit = String(key);
    var index;
    if (!/^[1-9]$/.test(digit) || !q || !q.choices) {
      return false;
    }
    index = Number(digit) - 1;
    if (index >= q.choices.length || locked || destroyed) {
      return false;
    }
    tap();
    activate(index);
    return true;
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    clearTimers();
    listeners.forEach(function (entry) {
      entry.target.removeEventListener(entry.type, entry.fn, false);
    });
    listeners = [];
    root.className = '';
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  render(q);
  return {
    render: render,
    onWrong: onWrong,
    onCorrect: onCorrect,
    celebrate: celebrate,
    handleKey: handleKey,
    destroy: destroy
  };
};
