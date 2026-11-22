/**
 * Module game độc lập — "Vòng cung ném khăn" (bài b1).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 2)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['mario-odyssey'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không asset ngoài.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-odyssey'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-mario-odyssey';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var locked = false;
  var timers = [];
  var nodes = [];
  var listeners = [];
  var hotspots = [];
  var promptNode;
  var kindNode;
  var equationNode;
  var scene;
  var hintNode;
  var markNode;
  var i;

  function tune(name, fallback) {
    var g = (window.KM && KM.Tuning && KM.Tuning.game) || {};
    var v = g[name];
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = String(text); }
    return n;
  }

  function listen(node, type, fn) {
    node.addEventListener(type, fn, false);
    listeners.push([node, type, fn]);
  }

  function makeButton(cls, text, onClick) {
    var b = el('button', 'kmg-btn ' + cls, text);
    b.type = 'button';
    b.style.minWidth = '64px';
    b.style.minHeight = '64px';
    listen(b, 'click', onClick);
    return b;
  }

  function tap() {
    if (audio && typeof audio.tap === 'function') { audio.tap(); }
  }

  function find(v) {
    var list = (q && q.choices) || [];
    var j;
    if (v == null) { return null; }
    for (j = 0; j < list.length; j += 1) {
      if (String(list[j].value) === String(v)) { return list[j]; }
    }
    return null;
  }

  function hint(t) {
    if (hintNode) {
      hintNode.textContent = t;
      hintNode.classList.add('is-on');
    }
  }

  function clearHint() {
    if (hintNode) {
      hintNode.textContent = '';
      hintNode.classList.remove('is-on');
    }
  }

  function submit(v) {
    if (locked) { return false; }
    var found = find(v);
    if (!found) { hint('Bé chọn lại nhé!'); return false; }
    locked = true;
    mount.dispatchEvent(new CustomEvent('km:answer', {
      bubbles: true,
      detail: { value: found.value }
    }));
    tap();
    return true;
  }

  function renderEquation(node, question) {
    var eq = question && question.equation;
    var tokens;
    var j;
    node.textContent = '';
    if (!eq) { node.style.display = 'none'; return; }
    node.style.display = '';
    tokens = eq.tokens || [];
    for (j = 0; j < tokens.length; j += 1) {
      node.appendChild(el('span', 'kmg-token',
        tokens[j].type === 'slot' ? '?' : tokens[j].value));
    }
    if (!tokens.length && eq.alt) { node.textContent = eq.alt; }
    node.setAttribute('aria-label', eq.alt || node.textContent);
  }

  function arcPoint(index, total) {
    var t = total > 1 ? index / (total - 1) : 0.5;
    return {
      left: (26 + t * 58) + '%',
      top: (68 - 50 * 4 * t * (1 - t)) + '%'
    };
  }

  function render(next) {
    if (next) { q = next; }
    locked = false;
    hotspots = [];
    root.classList.remove('is-correct');
    root.classList.remove('is-celebrate');
    clearHint();
    if (markNode) { markNode.textContent = ''; markNode.classList.remove('is-on'); }

    promptNode.textContent = q && q.text ? q.text : '';
    kindNode.textContent = q && q.kind ? q.kind : '';
    root.setAttribute('data-kind', q && q.kind ? q.kind : '');
    renderEquation(equationNode, q);

    scene.textContent = '';
    var arcH = tune('arcHeightPx', 140);
    scene.style.position = 'relative';
    scene.style.minHeight = (arcH * 2) + 'px';
    scene.style.overflow = 'hidden';

    var sky = el('div', 'kmg-open-sky');
    sky.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:0;';
    listen(sky, 'click', function () {
      if (locked) { return; }
      hint('Bé nhắm vào ô số nhé!');
    });
    scene.appendChild(sky);

    var groups = (q && q.visual && q.visual.groups) || [];
    var first = groups[0] || {};
    var glyph = first.glyph || '🍎';
    var name = first.name || 'đồ';
    var total = first && typeof first.count === 'number' ? first.count : 0;
    if (!isFinite(total)) { total = 0; }
    total = Math.max(0, Math.min(tune('maxCoins', 10), total));

    var thrower = el('div', 'kmg-thrower');
    thrower.style.cssText = 'position:absolute;left:2%;bottom:2%;z-index:1;' +
      'display:flex;align-items:flex-end;gap:8px;min-height:64px;';
    thrower.appendChild(el('span', 'kmg-person', '🧒'));
    thrower.appendChild(el('span', 'kmg-scarf', '🧣'));
    var pile = el('div', 'kmg-pile');
    pile.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;max-width:180px;';
    if (total === 0) {
      pile.appendChild(el('span', 'kmg-empty', '0 ' + name));
    } else {
      for (i = 0; i < total; i += 1) { pile.appendChild(el('span', 'kmg-object', glyph)); }
    }
    pile.setAttribute('aria-label', total + ' ' + name);
    thrower.appendChild(pile);
    scene.appendChild(thrower);

    var list = (q && q.choices) || [];
    for (i = 0; i < list.length; i += 1) {
      (function (choice, index) {
        var label = choice.label != null
          ? choice.label
          : (choice.glyph || choice.icon || choice.aria || String(choice.value));
        var p = arcPoint(index, list.length);
        var b = makeButton('kmg-hotspot kmg-target', label, function () {
          if (locked) { return; }
          b.classList.add('is-picked');
          submit(choice.value);
        });
        b.style.position = 'absolute';
        b.style.left = p.left;
        b.style.top = p.top;
        b.style.zIndex = '2';
        b.style.marginLeft = '-32px';
        b.style.marginTop = '-32px';
        b.setAttribute('aria-label', 'Đích ' + label);
        hotspots.push(b);
        scene.appendChild(b);
      }(list[i], i));
    }
  }

  function handleKey(key) {
    var s = String(key);
    var idx;
    if (!/^[1-9]$/.test(s)) { return false; }
    idx = parseInt(s, 10) - 1;
    if (!hotspots[idx]) { return false; }
    hotspots[idx].click();
    return true;
  }

  function onWrong() {
    var targets = root.querySelectorAll('.kmg-target');
    var j;
    locked = false;
    for (j = 0; j < targets.length; j += 1) { targets[j].classList.remove('is-picked'); }
    root.classList.remove('is-correct');
    root.classList.remove('is-celebrate');
    if (markNode) { markNode.textContent = ''; markNode.classList.remove('is-on'); }
    hint('Thử lại nhé!');
  }

  function onCorrect() {
    root.classList.add('is-correct');
  }

  function celebrate() {
    root.classList.add('is-celebrate');
    if (markNode) { markNode.textContent = '✓'; markNode.classList.add('is-on'); }
  }

  function destroy() {
    for (i = 0; i < timers.length; i += 1) { clearTimeout(timers[i]); }
    timers = [];
    for (i = 0; i < listeners.length; i += 1) {
      listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], false);
    }
    listeners = [];
    for (i = 0; i < nodes.length; i += 1) {
      if (nodes[i].parentNode) { nodes[i].parentNode.removeChild(nodes[i]); }
    }
    nodes = [];
    if (root.parentNode) { root.parentNode.removeChild(root); }
    locked = true;
    hotspots = [];
  }

  promptNode = el('div', 'kmg-prompt');
  kindNode = el('span', 'kmg-kind');
  equationNode = el('div', 'kmg-equation');
  scene = el('div', 'kmg-scene');
  hintNode = el('div', 'kmg-hint');
  hintNode.setAttribute('aria-live', 'polite');
  markNode = el('span', 'kmg-mark');
  markNode.setAttribute('aria-hidden', 'true');

  root.appendChild(promptNode);
  root.appendChild(kindNode);
  root.appendChild(equationNode);
  root.appendChild(scene);
  root.appendChild(hintNode);
  root.appendChild(markNode);
  nodes.push(scene);
  nodes.push(hintNode);

  if (q) { render(q); }

  return {
    render: render,
    onWrong: onWrong,
    onCorrect: onCorrect,
    celebrate: celebrate,
    destroy: destroy,
    handleKey: handleKey
  };
};
