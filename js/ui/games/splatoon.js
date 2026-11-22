/**
 * b19 / splatoon — "Hàng rào 3 stencil + vòi súng góc".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #20, chi tiết bài 20)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * choiceRender === 'shape' → mỗi stencil chỉ chứa SVG + aria-label từ choice.aria,
 * KHÔNG hiện chữ. Chạm vùng trống → vệt mực trang trí tối đa 3, 0 sự kiện.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['splatoon'] = function (options) {
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
  var splats = [];

  var root = document.createElement('div');
  root.className = 'kmg-splatoon' + (reduced ? ' is-reduced' : '');
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
    node.className = 'kmg-btn kmg-splatoon__' + extraClass;
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
      try { audio.tap(); } catch (error) { /* hiệu ứng không chặn trả lời */ }
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
    svg.setAttribute('width', '62');
    svg.setAttribute('height', '62');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label || kind || text('hình'));
    shape = document.createElementNS(ns, kind === 'circle' ? 'circle' : 'polygon');
    shape.setAttribute('fill', colors[kind] || '#4FC3F7');
    if (kind === 'circle') {
      shape.setAttribute('cx', '32');
      shape.setAttribute('cy', '32');
      shape.setAttribute('r', '23');
    } else if (kind === 'square') {
      shape.setAttribute('points', '9,9 55,9 55,55 9,55');
    } else if (kind === 'triangle') {
      shape.setAttribute('points', '32,7 59,57 5,57');
    } else if (kind === 'rectangle') {
      shape.setAttribute('points', '5,18 59,18 59,46 5,46');
    } else if (kind === 'cuboid') {
      shape.setAttribute('points', '4,22 42,12 60,22 22,32 22,52 4,42 42,32 60,42 42,52');
    } else {
      shape.setAttribute('points', '10,20 32,8 54,20 32,32 10,20 10,48 32,60 54,48 32,32');
    }
    svg.appendChild(shape);
    return svg;
  }

  var promptNode = el('p', { class: 'kmg-splatoon__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#276b66'
  } });

  var fenceNode = el('div', { class: 'kmg-splatoon__fence', style: {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px',
    minHeight: '300px', padding: '10px 12px', borderRadius: '20px',
    background: 'linear-gradient(180deg, #e9fffb, #d7f1ea)', border: '3px solid #6cbdb1'
  } });

  var decorNode = el('div', { class: 'kmg-splatoon__decor', 'aria-hidden': 'true', style: {
    position: 'absolute', left: '0', top: '0', right: '0', bottom: '0',
    pointerEvents: 'none', zIndex: '1'
  } });
  fenceNode.appendChild(decorNode);

  var nozzleNode = el('div', { class: 'kmg-splatoon__nozzle', 'aria-hidden': 'true',
    text: '🔫',
    style: { position: 'absolute', left: '8px', bottom: '4px', fontSize: '1.8rem', zIndex: '3' }
  });
  fenceNode.appendChild(nozzleNode);

  var hintNode = el('p', {
    class: 'kmg-splatoon__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#276b66' }
  });

  root.appendChild(promptNode);
  root.appendChild(fenceNode);
  root.appendChild(hintNode);

  function drawStencils() {
    var list = (q && q.choices) || [];
    var shapeMode = !!(q && q.choiceRender === 'shape');
    var nodes = fenceNode.querySelectorAll('[data-splatoon-stencil]');
    var i;
    for (i = 0; i < nodes.length; i += 1) {
      if (nodes[i].parentNode) {
        nodes[i].parentNode.removeChild(nodes[i]);
      }
    }
    list.forEach(function (choice, index) {
      var label = choice.aria || choice.label || String(choice.value);
      var stencil = btn('stencil', {
        'data-splatoon-stencil': String(index),
        'aria-label': text(label)
      });
      stencil.style.cssText = 'position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:96px;border-radius:16px;background:#ffffff;border:3px dashed #79c8bc;';
      stencil.setAttribute('data-value', String(choice.value));
      if (shapeMode) {
        stencil.appendChild(svgShape(choice.shape || choice.value, label));
      } else {
        var glyph = el('span', { 'aria-hidden': 'true', text: choice.glyph || choice.icon || '🎨', style: { fontSize: '1.6rem' } });
        var caption = el('span', { text: choice.label || label, style: { fontWeight: '800', fontSize: '1rem' } });
        stencil.appendChild(glyph);
        stencil.appendChild(caption);
      }
      fenceNode.appendChild(stencil);
    });
  }

  function addSplat(event) {
    var max = Math.max(1, tune('maxDecorSplats', 3));
    var box = fenceNode.getBoundingClientRect();
    var dot;
    if (!box.width || !box.height) {
      return;
    }
    dot = el('span', {
      class: 'kmg-splatoon__splat',
      'aria-hidden': 'true',
      text: '💧',
      style: {
        position: 'absolute', fontSize: '1.3rem',
        left: Math.max(0, event.clientX - box.left - 14) + 'px',
        top: Math.max(0, event.clientY - box.top - 14) + 'px'
      }
    });
    decorNode.appendChild(dot);
    splats.push(dot);
    while (splats.length > max) {
      var old = splats.shift();
      if (old.parentNode) {
        old.parentNode.removeChild(old);
      }
    }
    if (!reduced) {
      later(function () {
        if (dot.parentNode) {
          dot.parentNode.removeChild(dot);
        }
        splats = splats.filter(function (item) { return item !== dot; });
      }, Math.max(1, tune('shotMs', 480)));
    }
  }

  function clearSplats() {
    splats.forEach(function (node) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    splats = [];
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    clearTimers();
    clearSplats();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked');
    promptNode.textContent = (q && q.text) || '';
    hintNode.textContent = text('Bé bắn màu vào khung đúng nhé!');
    drawStencils();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed) {
      return;
    }
    submit(choice.value);
  }

  on(fenceNode, 'click', function (event) {
    var target = event.target;
    var stencil = null;
    while (target && target !== fenceNode) {
      if (target.getAttribute && target.getAttribute('data-splatoon-stencil') != null) {
        stencil = target;
        break;
      }
      target = target.parentNode;
    }
    tap();
    if (stencil) {
      activate(Number(stencil.getAttribute('data-splatoon-stencil')));
      return;
    }
    addSplat(event);
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
    clearSplats();
    hintNode.textContent = text('Mực nhảy lại nè. Bé bắn khung khác nhé!');
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
    clearSplats();
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
