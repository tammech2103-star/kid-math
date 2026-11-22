/**
 * b16 / warioware — "Carousel 3 thẻ lệnh".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #17, chi tiết bài 17)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Đồng hồ mềm từ KM.Tuning.game.windowMs (mặc định 5000): hết giờ KHÔNG phạt,
 * KHÔNG tự nộp, thẻ vẫn bấm được. reducedMotion → bỏ đồng hồ và mọi quay.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['warioware'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var q = opts.question || null;
  var destroyed = false;
  var locked = false;
  var expired = false;
  var timers = [];
  var listeners = [];

  var root = document.createElement('div');
  root.className = 'kmg-warioware' + (reduced ? ' is-reduced' : '');
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
    node.className = 'kmg-btn kmg-warioware__' + extraClass;
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
      try { audio.tap(); } catch (error) { /* audio là hiệu ứng đi qua */ }
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

  function svgShape(kind, label) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    var shape;
    var colors = {
      square: '#FF8A5B', circle: '#4FC3F7', triangle: '#FFD84D',
      rectangle: '#9C7BF5', cube: '#6FE3B8', cuboid: '#FFB020'
    };
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '64');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label || kind || text('hình'));
    shape = document.createElementNS(ns, kind === 'circle' ? 'circle' : 'polygon');
    shape.setAttribute('fill', colors[kind] || '#6FE3B8');
    if (kind === 'circle') {
      shape.setAttribute('cx', '32');
      shape.setAttribute('cy', '32');
      shape.setAttribute('r', '23');
    } else if (kind === 'square') {
      shape.setAttribute('points', '10,10 54,10 54,54 10,54');
    } else if (kind === 'triangle') {
      shape.setAttribute('points', '32,8 58,56 6,56');
    } else if (kind === 'rectangle') {
      shape.setAttribute('points', '5,18 59,18 59,46 5,46');
    } else {
      shape.setAttribute('points', '10,20 32,8 54,20 32,32 10,20 10,48 32,60 54,48 32,32');
    }
    svg.appendChild(shape);
    return svg;
  }

  var promptNode = el('p', { class: 'kmg-warioware__command', style: {
    margin: '0 0 8px', padding: '8px 12px', borderRadius: '16px',
    background: '#fff9e6', border: '3px solid #e46d8f', color: '#a32e55',
    fontWeight: '900', fontSize: '1.1rem', textAlign: 'center'
  } });

  var timerNode = el('p', {
    class: 'kmg-warioware__timer', 'aria-live': 'polite',
    style: { margin: '0', fontWeight: '800', color: '#8b2e4e', fontSize: '0.9rem' }
  });

  var cardsNode = el('div', { class: 'kmg-warioware__cards', style: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
    alignItems: 'center', minHeight: '230px', padding: '12px',
    borderRadius: '22px', background: 'radial-gradient(circle at 50% 40%, #fff7e0, #ffd9e8)'
  } });

  var hintNode = el('p', {
    class: 'kmg-warioware__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#8b2e4e' }
  });

  root.appendChild(promptNode);
  root.appendChild(timerNode);
  root.appendChild(cardsNode);
  root.appendChild(hintNode);

  function drawCards() {
    var list = (q && q.choices) || [];
    var shapeMode = q && q.choiceRender === 'shape';
    var glyphMode = q && q.choiceRender === 'glyph';
    var size = Math.max(64, tune('cardSizePx', 120));
    var tilt = [-5, 0, 5, -3];
    while (cardsNode.firstChild) {
      cardsNode.removeChild(cardsNode.firstChild);
    }
    list.forEach(function (choice, index) {
      var label = choice.aria || choice.label || String(choice.value);
      var card = btn('card', {
        'data-wario-card': String(index),
        'aria-label': text('Thẻ ' + (index + 1) + ': ' + label)
      });
      card.style.width = size + 'px';
      card.style.height = size + 'px';
      card.style.borderRadius = '18px';
      card.style.background = index % 2 ? '#fff1a8' : '#ffffff';
      card.style.border = '4px solid #e46d8f';
      card.style.color = '#8b2e4e';
      card.style.fontWeight = '900';
      card.style.display = 'grid';
      card.style.placeItems = 'center';
      card.style.fontSize = '1.5rem';
      if (!reduced) {
        card.style.transform = 'rotate(' + (tilt[index] || 0) + 'deg)';
      }
      if (shapeMode && choice.shape) {
        card.appendChild(svgShape(choice.shape, label));
      } else {
        var face = el('span', { 'aria-hidden': 'true', text: choice.glyph || choice.icon || '' });
        var caption = el('span', {
          text: glyphMode ? (choice.label || label) : (choice.label || label),
          style: { fontSize: '0.8rem', fontWeight: '800' }
        });
        card.appendChild(face);
        card.appendChild(caption);
      }
      cardsNode.appendChild(card);
    });
  }

  function startTimer() {
    if (reduced) {
      timerNode.textContent = text('Chọn từ từ cũng được');
      return;
    }
    timerNode.textContent = text('Đang chớp...');
    later(function () {
      if (destroyed || locked) {
        return;
      }
      expired = true;
      timerNode.textContent = text('Chọn từ từ cũng được');
      hintNode.textContent = text('Chọn từ từ cũng được');
      root.classList.add('is-slow');
    }, Math.max(3000, tune('windowMs', 5000)));
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    expired = false;
    clearTimers();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked', 'is-slow');
    promptNode.textContent = (q && q.text) || '';
    hintNode.textContent = text('Bé chạm thẻ đúng với lệnh phía trên nhé!');
    drawCards();
    startTimer();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed) {
      return;
    }
    submit(choice.value);
  }

  on(cardsNode, 'click', function (event) {
    var target = event.target;
    var card = null;
    while (target && target !== cardsNode) {
      if (target.getAttribute && target.getAttribute('data-wario-card') != null) {
        card = target;
        break;
      }
      target = target.parentNode;
    }
    if (!card) {
      return;
    }
    tap();
    activate(Number(card.getAttribute('data-wario-card')));
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
    expired = false;
    hintNode.textContent = text('Thẻ nhảy lại nè. Bé chọn thẻ khác nhé!');
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
