/**
 * b15 / kirby — "Hộp tâm + 4 mây hướng".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #16, chi tiết bài 16)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Nguồn chân lý vị trí là q.visual.rel, KHÔNG đo vị trí pixel/CSS chồng lên nhau.
 * Mỗi mây là 1 hotspot lấy từ q.choices (position có 4 hướng ↑ ↓ ← →).
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['kirby'] = function (options) {
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
  var POS = {
    on: { left: 'calc(50% - 34px)', top: '2%' },
    under: { left: 'calc(50% - 34px)', top: 'calc(100% - 70px)' },
    left: { left: '2%', top: 'calc(50% - 34px)' },
    right: { left: 'calc(100% - 70px)', top: 'calc(50% - 34px)' }
  };
  var FALLBACK_ORDER = ['on', 'under', 'left', 'right'];

  var root = document.createElement('div');
  root.className = 'kmg-kirby' + (reduced ? ' is-reduced' : '');
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

  function btn(extraClass, attrs) {
    var node = el('button', attrs || {});
    node.type = 'button';
    node.className = 'kmg-btn kmg-kirby__' + extraClass;
    node.style.minWidth = '64px';
    node.style.minHeight = '64px';
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

  var promptNode = el('p', { class: 'kmg-kirby__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#8a4e6c'
  } });

  var boxNode = el('div', { class: 'kmg-kirby__box', 'aria-hidden': 'true', style: {
    position: 'absolute', left: 'calc(50% - 46px)', top: 'calc(50% - 46px)',
    width: '92px', height: '92px', borderRadius: '16px', background: '#fff6da',
    border: '3px solid #c99a4e', display: 'grid', placeItems: 'center',
    fontSize: '2.8rem', zIndex: '2'
  } }, ['📦']);

  var itemNode = el('div', { class: 'kmg-kirby__item', 'aria-hidden': 'true', style: {
    position: 'absolute', width: '48px', height: '48px', display: 'grid',
    placeItems: 'center', fontSize: '2rem', zIndex: '3',
    transition: reduced ? 'none' : 'left ' + tune('puffMs', 420) + 'ms ease, top ' + tune('puffMs', 420) + 'ms ease'
  } });

  var cloudsNode = el('div', { class: 'kmg-kirby__clouds', style: {
    position: 'absolute', left: '0', top: '0', right: '0', bottom: '0', zIndex: '4'
  } });

  var sceneNode = el('div', { class: 'kmg-kirby__scene', style: {
    position: 'relative', minHeight: '320px', borderRadius: '24px', overflow: 'hidden',
    border: '3px solid #eaa9c6', background: 'linear-gradient(180deg, #ffe8f2, #ffd2e5)'
  } }, [boxNode, itemNode, cloudsNode]);

  var hintNode = el('p', {
    class: 'kmg-kirby__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#8a4e6c' }
  });

  root.appendChild(promptNode);
  root.appendChild(sceneNode);
  root.appendChild(hintNode);

  function directionFor(choice, index) {
    var value = choice && choice.value != null ? String(choice.value) : '';
    if (POS[value]) {
      return value;
    }
    if (choice && choice.icon) {
      var icons = { '↑': 'on', '↓': 'under', '←': 'left', '→': 'right' };
      if (icons[choice.icon]) {
        return icons[choice.icon];
      }
    }
    return FALLBACK_ORDER[index] || 'on';
  }

  function drawClouds() {
    var list = (q && q.choices) || [];
    while (cloudsNode.firstChild) {
      cloudsNode.removeChild(cloudsNode.firstChild);
    }
    list.forEach(function (choice, index) {
      var direction = directionFor(choice, index);
      var place = POS[direction];
      var label = choice.label || String(choice.value);
      var cloud = btn('cloud', {
        'data-kirby-cloud': String(index),
        'aria-label': text('Mây ' + (choice.icon || '☁️') + ' ' + label)
      });
      cloud.style.cssText = 'position:absolute;width:68px;min-width:68px;min-height:68px;border-radius:999px;background:#fff;color:#b04d7c;font-size:1.5rem;box-shadow:0 0 0 6px rgba(255,255,255,0.48);display:grid;place-items:center;';
      cloud.style.left = place.left;
      cloud.style.top = place.top;
      var face = el('span', { 'aria-hidden': 'true', text: choice.icon || '☁️' });
      var cap = el('span', { text: label, style: { fontSize: '0.7rem', fontWeight: '800' } });
      cloud.appendChild(face);
      cloud.appendChild(cap);
      cloudsNode.appendChild(cloud);
    });
  }

  function drawScene() {
    var visual = (q && q.visual) || {};
    var base = visual.base || {};
    var item = visual.item || {};
    var relation = visual.rel;
    var place = POS[relation] || POS.on;
    boxNode.firstChild.textContent = base.glyph || '📦';
    itemNode.textContent = item.glyph || '⚽';
    itemNode.style.left = place.left;
    itemNode.style.top = place.top;
    itemNode.setAttribute('data-relation', String(relation || ''));
    promptNode.textContent = (q && q.text) || '';
    drawClouds();
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    clearTimers();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked');
    hintNode.textContent = text('Bé chạm vào đám mây chỉ hướng đúng nhé!');
    drawScene();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed) {
      return;
    }
    submit(choice.value);
  }

  on(cloudsNode, 'click', function (event) {
    var target = event.target;
    var cloud = null;
    while (target && target !== cloudsNode) {
      if (target.getAttribute && target.getAttribute('data-kirby-cloud') != null) {
        cloud = target;
        break;
      }
      target = target.parentNode;
    }
    if (!cloud) {
      return;
    }
    tap();
    activate(Number(cloud.getAttribute('data-kirby-cloud')));
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
    drawScene();
    hintNode.textContent = text('Gió thổi lại từ đầu. Bé chọn mây khác nhé!');
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
