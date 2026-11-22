/**
 * Module game độc lập — "Bàn ô xí ngầu 12 ô" (bài b6).
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md (bảng 21 giao diện, dòng 7)
 * Quyết định: docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md
 * Hợp đồng: KM.Games['mario-party'](options) -> { render, onWrong, onCorrect, celebrate, destroy, handleKey }
 * Kênh trả lời duy nhất: CustomEvent('km:answer', { bubbles:true, detail:{value} }) trên options.mount.
 * ES5 thuần; mọi số gameplay đọc từ KM.Tuning.game (có default an toàn). Không asset ngoài.
 * dieFace(r) = 1 + (r % 6): chỉ đổi mặt xí ngầu, không đổi question/choices, không phát event.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['mario-party'] = function (options) {
  if (!options) { options = {}; }
  var mount = options.mount;
  var q = options.question || null;
  var reduced = !!options.reducedMotion;
  var audio = options.audio || {};

  var root = document.createElement('div');
  root.className = 'kmg-mario-party';
  if (reduced) { root.classList.add('is-reduced'); }
  mount.appendChild(root);

  var locked = false;
  var timers = [];
  var nodes = [];
  var listeners = [];
  var hotspots = [];
  var rolls = 0;
  var dieNode;
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

  function dieFace(r) {
    return 1 + (r % 6);
  }

  function tokenRow(text) {
    var row = el('div', 'kmg-token-row');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;' +
      'align-items:center;min-height:64px;';
    row.appendChild(el('span', 'kmg-token-text', text));
    return row;
  }

  function visualTokens(question) {
    var visual = question && question.visual;
    var row = el('div', 'kmg-token-row');
    var groups;
    var values;
    var j;
    var count;
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;' +
      'align-items:center;min-height:64px;';

    if (!visual) { return null; }

    if (visual.kind === 'sequence' && visual.values) {
      values = visual.values;
      for (j = 0; j < values.length; j += 1) {
        row.appendChild(el('span', 'kmg-seq-cell',
          values[j] == null ? '?' : String(values[j])));
      }
      return row;
    }

    if (visual.groups && visual.groups.length) {
      groups = visual.groups;
      for (j = 0; j < groups.length; j += 1) {
        count = groups[j] && typeof groups[j].count === 'number' ? groups[j].count : 0;
        if (!isFinite(count)) { count = 0; }
        count = Math.max(0, Math.min(tune('maxCoins', 10), count));
        var pocket = el('span', 'kmg-pocket');
        pocket.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:2px;' +
          'max-width:160px;justify-content:center;';
        if (count === 0) {
          pocket.appendChild(el('span', 'kmg-empty', '0'));
        } else {
          var k;
          for (k = 0; k < count; k += 1) {
            pocket.appendChild(el('span', 'kmg-item', groups[j].glyph || '🍎'));
          }
        }
        row.appendChild(pocket);
      }
      return row;
    }

    if (question.equation && question.equation.tokens) {
      var tokens = question.equation.tokens;
      for (j = 0; j < tokens.length; j += 1) {
        row.appendChild(el('span', 'kmg-token',
          tokens[j].type === 'slot' ? '?' : tokens[j].value));
      }
      return row;
    }

    if (visual.alt) { return tokenRow(visual.alt); }
    return null;
  }

  function render(next) {
    if (next) { q = next; }
    locked = false;
    rolls = 0;
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
    var boardSize = Math.max(64, tune('tileSizePx', 80));
    var tiles = Math.max(5, Math.min(16, tune('boardTiles', 12)));
    var side = Math.ceil(tiles / 4) + 1;
    var board = el('div', 'kmg-board');
    board.style.cssText = 'position:relative;width:' + (boardSize * side) + 'px;' +
      'height:' + (boardSize * side) + 'px;max-width:100%;margin:0 auto;';

    for (i = 0; i < tiles; i += 1) {
      var angle = (i / tiles) * Math.PI * 2;
      var tile = el('div', 'kmg-tile');
      tile.style.position = 'absolute';
      tile.style.width = boardSize + 'px';
      tile.style.height = boardSize + 'px';
      tile.style.lineHeight = boardSize + 'px';
      tile.style.left = (50 + Math.cos(angle) * 36) + '%';
      tile.style.top = (50 + Math.sin(angle) * 36) + '%';
      tile.style.marginLeft = -(boardSize / 2) + 'px';
      tile.style.marginTop = -(boardSize / 2) + 'px';
      tile.style.textAlign = 'center';
      tile.style.borderRadius = '12px';
      tile.style.border = '2px solid #b98a4b';
      tile.style.background = 'rgba(255,255,255,0.75)';
      tile.textContent = '•';
      tile.setAttribute('aria-hidden', 'true');
      board.appendChild(tile);
    }

    var center = el('div', 'kmg-center');
    center.style.cssText = 'position:absolute;left:50%;top:50%;margin-left:-' +
      (boardSize * 1.6) + 'px;margin-top:-' + (boardSize * 1.6) + 'px;width:' +
      (boardSize * 3.2) + 'px;min-height:64px;z-index:2;text-align:center;';

    dieNode = makeButton('kmg-die', '🎲 ' + dieFace(rolls), function () {
      if (locked) { return; }
      rolls += 1;
      dieNode.textContent = '🎲 ' + dieFace(rolls);
      dieNode.setAttribute('aria-label', 'Xí ngầu mặt ' + dieFace(rolls));
      tap();
    });
    dieNode.setAttribute('aria-label', 'Xí ngầu mặt ' + dieFace(rolls));
    center.appendChild(dieNode);

    var tokens = visualTokens(q);
    if (tokens) { center.appendChild(tokens); }
    if (q && q.text) { center.appendChild(tokenRow(q.text)); }
    board.appendChild(center);
    scene.appendChild(board);

    var list = (q && q.choices) || [];
    var answers = el('div', 'kmg-answers');
    answers.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;';
    for (i = 0; i < list.length; i += 1) {
      (function (choice) {
        var label = choice.label != null
          ? choice.label
          : (choice.shape || choice.glyph || choice.icon || choice.aria || String(choice.value));
        var b = makeButton('kmg-hotspot kmg-num', label, function () {
          if (locked) { return; }
          b.classList.add('is-picked');
          submit(choice.value);
        });
        b.setAttribute('aria-label', choice.aria || label);
        hotspots.push(b);
        answers.appendChild(b);
      }(list[i]));
    }
    scene.appendChild(answers);
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
    rolls = 0;
    if (dieNode) {
      dieNode.textContent = '🎲 ' + dieFace(rolls);
      dieNode.setAttribute('aria-label', 'Xí ngầu mặt ' + dieFace(rolls));
    }
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
