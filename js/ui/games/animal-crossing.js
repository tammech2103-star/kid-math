/**
 * Module game độc lập — "Hai luống nỉ chồng dọc" (bài b5).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 6)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['animal-crossing'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không asset ngoài.
 * actionValue = masked ? groups[1].count : groups[0].count + groups[1].count.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['animal-crossing'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-animal-crossing';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var locked = false;
  var timers = [];
  var nodes = [];
  var listeners = [];
  var hotspots = [];
  var planted = 0;
  var target = 0;
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

  function groupsOf(question) {
    return (question && question.visual && question.visual.groups) || [];
  }

  function actionValue(question) {
    var groups = groupsOf(question);
    var a = groups[0] && typeof groups[0].count === 'number' ? groups[0].count : 0;
    var b = groups[1] && typeof groups[1].count === 'number' ? groups[1].count : 0;
    if (groups.length === 2 && groups[1].masked === true) { return b; }
    return a + b;
  }

  function render(next) {
    if (next) { q = next; }
    locked = false;
    planted = 0;
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
    var groups = groupsOf(q);
    target = actionValue(q);
    if (!isFinite(target)) { target = 0; }
    target = Math.max(0, Math.min(tune('maxFlowers', 10), target));
    var cell = Math.max(64, tune('soilCellPx', 72));
    var glyph = (groups[0] && groups[0].glyph) || '🌸';

    var beds = el('div', 'kmg-beds');
    beds.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

    var bed1 = el('div', 'kmg-bed kmg-bed-known');
    bed1.setAttribute('aria-disabled', 'true');
    bed1.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;' +
      'padding:8px;border:3px solid #9b6b43;border-radius:16px;min-height:64px;';
    listen(bed1, 'click', function () {
      if (locked) { return; }
      hint('Luống này chỉ để nhìn nhé!');
    });
    var known = groups[0] && typeof groups[0].count === 'number' ? groups[0].count : 0;
    if (!isFinite(known)) { known = 0; }
    known = Math.max(0, Math.min(tune('maxFlowers', 10), known));
    if (known === 0) {
      bed1.appendChild(el('span', 'kmg-empty', '0'));
    } else {
      for (i = 0; i < known; i += 1) { bed1.appendChild(el('span', 'kmg-known-item', glyph)); }
    }
    beds.appendChild(bed1);

    var bed2 = el('div', 'kmg-bed kmg-bed-plant');
    bed2.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;' +
      'padding:8px;border:3px dashed #7a5230;border-radius:16px;max-width:' +
      (cell * 5 + 80) + 'px;';
    var cells = Math.min(tune('maxFlowers', 10), Math.max(5, target));
    for (i = 0; i < cells; i += 1) {
      (function (slotIndex) {
        var soil = makeButton('kmg-soil', '•', function () {
          if (locked) { return; }
          if (soil.classList.contains('is-planted')) { return; }
          if (planted >= target) {
            hint('Bé gieo đủ rồi nhé!');
            return;
          }
          planted += 1;
          soil.textContent = glyph;
          soil.classList.add('is-planted');
          countNode.textContent = 'Đã gieo ' + planted;
          tap();
        });
        soil.style.width = cell + 'px';
        soil.style.height = cell + 'px';
        soil.setAttribute('aria-label', 'Ô đất ' + (slotIndex + 1));
        bed2.appendChild(soil);
      }(i));
    }
    beds.appendChild(bed2);
    scene.appendChild(beds);

    countNode = el('div', 'kmg-count', 'Đã gieo 0');
    countNode.setAttribute('aria-live', 'polite');
    scene.appendChild(countNode);

    var list = (q && q.choices) || [];
    var nums = el('div', 'kmg-numbers');
    nums.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;';
    for (i = 0; i < list.length; i += 1) {
      (function (choice) {
        var label = choice.label != null
          ? choice.label
          : (choice.glyph || choice.icon || choice.aria || String(choice.value));
        var b = makeButton('kmg-hotspot kmg-num', label, function () {
          if (locked) { return; }
          if (String(choice.value) !== String(planted)) {
            hint('Bé gieo lại nhé!');
            return;
          }
          submit(target);
        });
        b.setAttribute('aria-label', 'Chọn ' + label);
        hotspots.push(b);
        nums.appendChild(b);
      }(list[i]));
    }
    scene.appendChild(nums);
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
    var soils = root.querySelectorAll('.kmg-soil');
    var j;
    locked = false;
    planted = 0;
    for (j = 0; j < soils.length; j += 1) {
      soils[j].textContent = '•';
      soils[j].classList.remove('is-planted');
    }
    if (countNode) { countNode.textContent = 'Đã gieo 0'; }
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
