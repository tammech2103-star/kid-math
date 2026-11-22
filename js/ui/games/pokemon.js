/**
 * Module game độc lập — "Hai đảo giấy và lưới vây" (bài b3).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 4)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['pokemon'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không lưới toạ độ, không trục, không asset ngoài.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['pokemon'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-pokemon';
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

  function clusterButton(group, value, fallbackLabel) {
    var b = makeButton('kmg-cluster', '', function () {
      if (locked) { return; }
      b.classList.add('is-picked');
      submit(value);
    });
    var title = el('span', 'kmg-cluster-title',
      group && group.label ? group.label : (group && group.badge ? group.badge : fallbackLabel));
    b.appendChild(title);
    var dots = el('span', 'kmg-cluster-dots');
    dots.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:200px;';
    var count = group && typeof group.count === 'number' ? group.count : 0;
    if (!isFinite(count)) { count = 0; }
    count = Math.max(0, Math.min(tune('maxCoins', 10), count));
    if (count === 0) {
      dots.appendChild(el('span', 'kmg-empty', '0'));
    } else {
      var k;
      for (k = 0; k < count; k += 1) {
        dots.appendChild(el('span', 'kmg-item', (group && group.glyph) || '🍎'));
      }
    }
    b.appendChild(dots);
    b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;';
    b.setAttribute('aria-label', (title.textContent || fallbackLabel) + ' — ' + count);
    return b;
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
    var groups = (q && q.visual && q.visual.groups) || [];
    var gap = Math.max(80, Math.min(240, tune('clusterGapPx', 160)));
    var row = el('div', 'kmg-islands');
    row.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
      'flex-wrap:wrap;gap:' + gap + 'px;';

    row.appendChild(clusterButton(groups[0], 'left', 'Nhóm 1'));

    var net = el('div', 'kmg-net');
    net.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:center;' +
      'padding:12px;border:3px dashed #5b8c3a;border-radius:24px;min-width:64px;';
    listen(net, 'click', function (event) {
      if (locked) { return; }
      if (event.target !== net) { return; }
      net.classList.toggle('is-back');
      hint('Bé chạm vào đảo hoặc nút nhé!');
    });
    var list = (q && q.choices) || [];
    for (i = 0; i < list.length; i += 1) {
      (function (choice) {
        var icon = choice.icon != null ? choice.icon : (choice.aria || choice.glyph || '');
        var label = choice.label != null ? choice.label : String(choice.value);
        var b = makeButton('kmg-hotspot kmg-sign', (icon ? icon + ' ' : '') + label, function () {
          if (locked) { return; }
          b.classList.add('is-picked');
          submit(choice.value);
        });
        b.setAttribute('aria-label', choice.aria || label);
        hotspots.push(b);
        net.appendChild(b);
      }(list[i]));
    }
    row.appendChild(net);
    row.appendChild(clusterButton(groups[1], 'right', 'Nhóm 2'));
    scene.appendChild(row);
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
    var picked = root.querySelectorAll('.is-picked');
    var j;
    locked = false;
    for (j = 0; j < picked.length; j += 1) { picked[j].classList.remove('is-picked'); }
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
