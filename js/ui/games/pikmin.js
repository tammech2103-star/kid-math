/**
 * b14 / pikmin — "Cột khối len + trợ lý kéo".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #15, chi tiết bài 15)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Module tự chứa: chỉ đọc options.{mount,question,reducedMotion,audio},
 * phát duy nhất sự kiện km:answer trên mount. Không helper/registry dùng chung.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['pikmin'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var q = opts.question || null;
  var destroyed = false;
  var locked = false;
  var helperSelected = false;
  var timers = [];
  var listeners = [];
  var assetNodes = [];
  var YARN_ASSET = 'Asset/v2/kiln/yarn_block.png';

  var root = document.createElement('div');
  root.className = 'kmg-pikmin' + (reduced ? ' is-reduced' : '');
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

  function btn(extraClass, label, attrs) {
    var node = el('button', attrs || {});
    node.type = 'button';
    node.className = 'kmg-btn kmg-pikmin__' + extraClass;
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

  function dataAncestor(target, host, attribute) {
    var node = target;
    while (node && node !== host) {
      if (node.getAttribute && node.getAttribute(attribute) != null) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
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
      try { audio.tap(); } catch (error) { /* audio là hiệu ứng, không chặn trả lời */ }
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
      say(text('Bé chọn lại nhé!'));
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

  function say(message) {
    if (hintNode) {
      hintNode.textContent = message;
    }
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
    svg.setAttribute('width', '58');
    svg.setAttribute('height', '58');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label || kind || text('khối'));
    shape = document.createElementNS(ns, kind === 'circle' ? 'circle' : 'polygon');
    shape.setAttribute('fill', colors[kind] || '#6FE3B8');
    if (kind === 'circle') {
      shape.setAttribute('cx', '32');
      shape.setAttribute('cy', '32');
      shape.setAttribute('r', '24');
    } else if (kind === 'square') {
      shape.setAttribute('points', '10,10 54,10 54,54 10,54');
    } else if (kind === 'triangle') {
      shape.setAttribute('points', '32,8 58,56 6,56');
    } else if (kind === 'rectangle') {
      shape.setAttribute('points', '6,18 58,18 58,46 6,46');
    } else if (kind === 'cuboid') {
      shape.setAttribute('points', '4,20 44,12 60,22 20,32 20,52 4,42 44,32 60,42 44,52');
    } else {
      shape.setAttribute('points', '10,20 32,8 54,20 32,32 10,20 10,48 32,60 54,48 32,32');
    }
    svg.appendChild(shape);
    return svg;
  }

  function assetAllowed() {
    var manifest = window.KM && (KM.Assets || KM.AssetManifest);
    if (!manifest) {
      return false;
    }
    if (typeof manifest.has === 'function') {
      return !!manifest.has(YARN_ASSET);
    }
    if (typeof manifest === 'object' && manifest[YARN_ASSET] === true) {
      return true;
    }
    return false;
  }

  function addBlockArt(host, choice, glyphFallback) {
    var glyph = el('span', { class: 'kmg-pikmin__glyph', text: glyphFallback, 'aria-hidden': 'true' });
    glyph.style.fontSize = '2rem';
    host.appendChild(glyph);
    if (assetAllowed()) {
      var image = el('img', {
        class: 'kmg-pikmin__art',
        src: YARN_ASSET,
        alt: '',
        'aria-hidden': 'true',
        draggable: 'false'
      });
      image.style.cssText = 'position:absolute;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px);object-fit:contain;';
      image.onerror = function () {
        image.onerror = null;
        image.style.display = 'none';
        glyph.style.display = '';
      };
      glyph.style.display = 'none';
      host.appendChild(image);
      assetNodes.push(image);
    }
  }

  var promptNode = el('p', { class: 'kmg-pikmin__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#5d422c'
  } });
  var hintNode = el('p', {
    class: 'kmg-pikmin__hint',
    'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#8a5a2b' }
  });

  var columnNode = el('div', { class: 'kmg-pikmin__column', style: {
    display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
    minWidth: '104px', padding: '8px', borderRadius: '18px',
    background: 'rgba(255,255,255,0.72)', border: '2px solid #c7a888'
  } });

  var grassNode = el('div', { class: 'kmg-pikmin__grass', style: {
    flex: '1 1 180px', minHeight: '150px', minWidth: '120px', borderRadius: '18px',
    border: '2px dashed #9cb87a', background: '#eef7db',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '2rem', cursor: 'pointer'
  } }, [text('🌱')]);

  var yardNode = el('div', { class: 'kmg-pikmin__yard', style: {
    display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap',
    minHeight: '260px', borderRadius: '22px', padding: '8px',
    background: 'linear-gradient(180deg, #fff8ee, #e9d8c2)', border: '3px solid #c7a888'
  } }, [grassNode, columnNode]);

  var helperNode = btn('helpers', '', { 'aria-label': text('Chọn nhóm trợ lý len') });
  helperNode.textContent = text('🔴🟡🔵 ' + 'Trợ lý len');
  helperNode.style.cssText = 'display:block;margin:8px auto 0;width:240px;border-radius:18px;background:#fff;color:#6b4a2f;font-weight:800;font-size:1rem;';
  helperNode.setAttribute('aria-pressed', 'false');

  root.appendChild(promptNode);
  root.appendChild(yardNode);
  root.appendChild(helperNode);
  root.appendChild(hintNode);

  function setHelper(selected) {
    helperSelected = !!selected;
    helperNode.setAttribute('aria-pressed', helperSelected ? 'true' : 'false');
    helperNode.style.outline = helperSelected ? '4px solid #e08a3c' : 'none';
  }

  function drawBlocks() {
    var list = (q && q.choices) || [];
    var isGlyph = !!(q && q.choiceRender === 'glyph');
    while (columnNode.firstChild) {
      columnNode.removeChild(columnNode.firstChild);
    }
    list.forEach(function (choice, index) {
      var label = choice.aria || choice.label || String(choice.value);
      var block = btn('block', '', {
        'data-pikmin-block': String(index),
        'aria-label': text('Khối thứ ' + (index + 1) + ': ' + label)
      });
      block.style.cssText = 'position:relative;width:84px;min-width:84px;min-height:84px;border-radius:16px;background:#fffdf7;display:grid;place-items:center;';
      block.setAttribute('data-value', String(choice.value));
      if (isGlyph || !choice.shape) {
        addBlockArt(block, choice, choice.glyph || '📦');
      } else {
        block.appendChild(svgShape(choice.shape, label));
      }
      columnNode.appendChild(block);
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
    setHelper(false);
    promptNode.textContent = (q && q.text) || '';
    say(text('Chạm nhóm trợ lý, rồi chạm khối để kéo nhé!'));
    drawBlocks();
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    if (!choice || locked || destroyed) {
      return;
    }
    setHelper(true);
    submit(choice.value);
  }

  on(helperNode, 'click', function () {
    if (destroyed) {
      return;
    }
    tap();
    setHelper(!helperSelected);
    say(helperSelected
      ? text('Trợ lý sẵn sàng. Bé chạm vào một khối nhé!')
      : text('Trợ lý về dưới rồi.'));
  });

  on(columnNode, 'click', function (event) {
    var block = dataAncestor(event.target, columnNode, 'data-pikmin-block');
    if (!block) {
      return;
    }
    tap();
    if (!helperSelected) {
      say(text('Bé chạm nhóm trợ lý trước đã nhé!'));
      return;
    }
    if (!reduced) {
      block.style.transition = 'transform ' + tune('pullMs', 600) + 'ms ease, opacity ' + tune('pullMs', 600) + 'ms ease';
      block.style.transform = 'translateY(22px) scale(0.92)';
      block.style.opacity = '0.5';
    }
    submit(block.getAttribute('data-value'));
  });

  on(grassNode, 'click', function () {
    if (!helperSelected) {
      return;
    }
    setHelper(false);
    say(text('Trợ lý quay về dưới rồi. Bé chọn lại rồi kéo khối nhé.'));
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
    setHelper(false);
    drawBlocks();
    say(text('Khối trượt lại chỗ cũ. Bé chọn trợ lý rồi kéo khối khác nhé!'));
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
    assetNodes.forEach(function (image) { image.onerror = null; });
    assetNodes = [];
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
