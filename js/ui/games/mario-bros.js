/**
 * Module game độc lập — "Hàng xu một chiều" (bài intro).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 1)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['mario-bros'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không asset ngoài.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-bros'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-mario-bros';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var locked = false;
  var timers = [];
  var nodes = [];
  var listeners = [];
  var hotspots = [];
  var collected = [];
  var groupName = 'đồ';
  var promptNode;
  var kindNode;
  var equationNode;
  var scene;
  var hintNode;
  var markNode;
  var countNode;
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

  function countFor(question) {
    var groups = (question && question.visual && question.visual.groups) || [];
    var first = groups[0];
    var n = first && typeof first.count === 'number'
      ? first.count
      : (question ? question.answer : 0);
    if (typeof n !== 'number' || !isFinite(n)) { n = 0; }
    return Math.max(0, Math.min(tune('maxCoins', 10), n));
  }

  function render(next) {
    if (next) { q = next; }
    locked = false;
    collected = [];
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
    var list = (q && q.choices) || [];
    var groups = (q && q.visual && q.visual.groups) || [];
    var first = groups[0] || {};
    var total = countFor(q);
    groupName = first.name || 'đồ';
    var glyph = first.glyph || '🪙';

    var strip = el('div', 'kmg-strip');
    strip.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;';
    var coinArea = el('div', 'kmg-coins');
    coinArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;min-height:64px;min-width:64px;';
    if (total === 0) {
      coinArea.appendChild(el('span', 'kmg-empty', '0 ' + groupName));
    } else {
      for (i = 0; i < total; i += 1) {
        (function (idx) {
          var coin = makeButton('kmg-coin', glyph, function () {
            if (locked) { return; }
            if (collected.indexOf(idx) !== -1) { return; }
            collected.push(idx);
            coin.classList.add('is-collected');
            countNode.textContent = collected.length + ' ' + groupName;
            tap();
          });
          coin.setAttribute('aria-label', groupName + ' ' + (idx + 1));
          coinArea.appendChild(coin);
        }(i));
      }
    }
    strip.appendChild(coinArea);

    var arrow = el('span', 'kmg-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    strip.appendChild(arrow);

    var numArea = el('div', 'kmg-numbers');
    numArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    for (i = 0; i < list.length; i += 1) {
      (function (choice) {
        var label = choice.label != null
          ? choice.label
          : (choice.glyph || choice.icon || choice.aria || String(choice.value));
        var b = makeButton('kmg-hotspot kmg-num', label, function () {
          if (locked) { return; }
          if (String(choice.value) !== String(collected.length)) {
            hint('Bé đếm lại nhé!');
            return;
          }
          submit(choice.value);
        });
        b.setAttribute('aria-label', 'Chọn ' + label);
        hotspots.push(b);
        numArea.appendChild(b);
      }(list[i]));
    }
    strip.appendChild(numArea);
    scene.appendChild(strip);

    countNode = el('div', 'kmg-count', '0 ' + groupName);
    countNode.setAttribute('aria-live', 'polite');
    scene.appendChild(countNode);
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

  function resetScene() {
    var coins = root.querySelectorAll('.kmg-coin');
    var j;
    locked = false;
    collected = [];
    for (j = 0; j < coins.length; j += 1) { coins[j].classList.remove('is-collected'); }
    if (countNode) { countNode.textContent = '0 ' + groupName; }
    root.classList.remove('is-correct');
    root.classList.remove('is-celebrate');
    if (markNode) { markNode.textContent = ''; markNode.classList.remove('is-on'); }
  }

  function onWrong() {
    resetScene();
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
