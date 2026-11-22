/**
 * Module game độc lập — "Thang gỗ đứng" (bài b2).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 3)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['donkey-kong-country'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không asset ngoài.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['donkey-kong-country'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-donkey-kong-country';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var locked = false;
  var timers = [];
  var nodes = [];
  var listeners = [];
  var hotspots = [];
  var climbed = 0;
  var totalRungs = 0;
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

  function rungCount(question) {
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
    climbed = 0;
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
    totalRungs = rungCount(q);
    var groups = (q && q.visual && q.visual.groups) || [];
    var first = groups[0] || {};
    var glyph = first.glyph || '🍌';
    var unit = 'nấc';
    var wrap = el('div', 'kmg-ladder-wrap');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

    var list = (q && q.choices) || [];
    var top = el('div', 'kmg-top-numbers');
    top.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;';
    for (i = 0; i < list.length; i += 1) {
      (function (choice) {
        var label = choice.label != null
          ? choice.label
          : (choice.glyph || choice.icon || choice.aria || String(choice.value));
        var b = makeButton('kmg-hotspot kmg-num', label, function () {
          if (locked) { return; }
          if (String(choice.value) !== String(climbed)) {
            hint('Leo từng nấc nhé!');
            return;
          }
          submit(choice.value);
        });
        b.setAttribute('aria-label', 'Chọn ' + label);
        hotspots.push(b);
        top.appendChild(b);
      }(list[i]));
    }
    wrap.appendChild(top);

    var ladder = el('div', 'kmg-ladder');
    var rungH = Math.max(64, tune('rungHeightPx', 42));
    ladder.style.cssText = 'display:flex;flex-direction:column-reverse;gap:8px;' +
      'min-height:64px;padding:8px;border-left:6px solid #8b5a2b;border-right:6px solid #8b5a2b;';
    if (totalRungs === 0) {
      ladder.appendChild(el('span', 'kmg-empty', '0 ' + name));
    } else {
      for (i = 0; i < totalRungs; i += 1) {
        (function (idx) {
          var rung = makeButton('kmg-rung', glyph, function () {
            if (locked) { return; }
            if (idx !== climbed) {
              hint('Leo từng nấc nhé!');
              return;
            }
            climbed += 1;
            rung.classList.add('is-climbed');
            countNode.textContent = 'Đã leo ' + climbed + ' ' + unit;
            tap();
          });
          rung.style.height = rungH + 'px';
          rung.setAttribute('aria-label', 'Nấc ' + (idx + 1));
          ladder.appendChild(rung);
        }(i));
      }
    }
    wrap.appendChild(ladder);

    countNode = el('div', 'kmg-count', 'Đã leo 0 ' + unit);
    countNode.setAttribute('aria-live', 'polite');
    wrap.appendChild(countNode);
    scene.appendChild(wrap);
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
    var rungs = root.querySelectorAll('.kmg-rung');
    var j;
    locked = false;
    climbed = 0;
    for (j = 0; j < rungs.length; j += 1) { rungs[j].classList.remove('is-climbed'); }
    if (countNode) { countNode.textContent = 'Đã leo 0 nấc'; }
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
