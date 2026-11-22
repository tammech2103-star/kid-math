/**
 * b18 / fire-emblem — "Bàn cờ 4×3 đi từ ô (0,1)".
 * Nguồn: design/quick-specs/ui-redesign-21-distinct-screens.md
 *   (Hợp đồng module M1-M10, bảng 21 dòng #19, chi tiết bài 19)
 *   và docs/architecture/ADR-0004-independent-game-modules-and-skill-asset-pipeline.md.
 * Quân đứng ở ô (0,1); 3 (hoặc đúng q.choices.length) ô đích mang nhãn choice.
 * Đích được chọn → quân đi từng ô bằng CSS transition; reducedMotion bỏ đường đi.
 * Nhãn phép tính ở đầu bàn lấy từ q.equation.tokens.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games['fire-emblem'] = function (options) {
  'use strict';

  var opts = options || {};
  var mount = opts.mount || null;
  var reduced = !!opts.reducedMotion;
  var audio = opts.audio || {};
  var q = opts.question || null;
  var destroyed = false;
  var locked = false;
  var moving = false;
  var timers = [];
  var listeners = [];
  var cells = [];
  var COLS = 4;
  var ROWS = 3;
  var START = { c: 0, r: 1 };
  var TARGETS = [{ c: 3, r: 0 }, { c: 3, r: 1 }, { c: 3, r: 2 }, { c: 2, r: 0 }];

  var root = document.createElement('div');
  root.className = 'kmg-fire-emblem' + (reduced ? ' is-reduced' : '');
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

  function btn(extraClass, attrs, label) {
    var node = el('button', attrs || {});
    node.type = 'button';
    node.className = 'kmg-btn kmg-fire-emblem__' + extraClass;
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

  var promptNode = el('p', { class: 'kmg-fire-emblem__prompt', style: {
    margin: '0 0 8px', fontWeight: '800', fontSize: '1.05rem', color: '#3e5c68'
  } });

  var equationNode = el('p', { class: 'kmg-fire-emblem__equation', style: {
    margin: '0 0 8px', padding: '6px 10px', borderRadius: '12px',
    background: '#eaf7ff', border: '2px solid #8fc4dd', color: '#264f66',
    fontWeight: '900', fontSize: '1.2rem', textAlign: 'center'
  } });

  var boardNode = el('div', { class: 'kmg-fire-emblem__board', style: {
    position: 'relative', display: 'grid', gap: '8px', padding: '8px',
    borderRadius: '18px', background: 'linear-gradient(180deg, #f2fbf4, #dbeedf)',
    border: '3px solid #7ba98b'
  } });

  var hintNode = el('p', {
    class: 'kmg-fire-emblem__hint', 'aria-live': 'polite',
    style: { margin: '8px 0 0', minHeight: '1.5em', fontWeight: '700', color: '#3e5c68' }
  });

  root.appendChild(promptNode);
  root.appendChild(equationNode);
  root.appendChild(boardNode);
  root.appendChild(hintNode);

  var pieceNode = el('div', {
    class: 'kmg-fire-emblem__piece', 'aria-hidden': 'true',
    text: '♟️',
    style: {
      position: 'absolute', width: '64px', height: '64px', display: 'grid',
      placeItems: 'center', fontSize: '2rem', pointerEvents: 'none', zIndex: '3',
      transition: reduced ? 'none' : 'left ' + tune('stepMs', 280) + 'ms ease, top ' + tune('stepMs', 280) + 'ms ease'
    }
  });
  boardNode.appendChild(pieceNode);

  function cellSize() {
    return Math.max(64, tune('cellSizePx', 88));
  }

  function placePiece(cell) {
    var size = cellSize();
    pieceNode.style.left = (8 + cell.c * (size + 8)) + 'px';
    pieceNode.style.top = (8 + cell.r * (size + 8)) + 'px';
  }

  function drawEquation() {
    var tokens = (q && q.equation && q.equation.tokens) || [];
    equationNode.textContent = '';
    if (!tokens.length) {
      equationNode.textContent = (q && q.text) || '';
      return;
    }
    tokens.forEach(function (token) {
      var value = token.type === 'slot' ? '?' : token.value;
      equationNode.appendChild(el('span', { text: value + ' ', style: { whiteSpace: 'pre' } }));
    });
  }

  function drawBoard() {
    var list = (q && q.choices) || [];
    var size = cellSize();
    var row;
    var col;
    cells = [];
    boardNode.style.gridTemplateColumns = 'repeat(' + COLS + ', ' + size + 'px)';
    while (boardNode.firstChild) {
      boardNode.removeChild(boardNode.firstChild);
    }
    boardNode.appendChild(pieceNode);
    for (row = 0; row < ROWS; row += 1) {
      for (col = 0; col < COLS; col += 1) {
        var cell = el('div', {
          class: 'kmg-fire-emblem__cell',
          'data-fe-cell': col + ',' + row,
          style: {
            minWidth: size + 'px', minHeight: size + 'px', borderRadius: '12px',
            border: '2px solid #a9cbb3', background: (row + col) % 2 ? '#ffffff' : '#f3fbf4',
            display: 'grid', placeItems: 'center'
          }
        });
        if (col === START.c && row === START.r) {
          cell.setAttribute('data-fe-start', 'true');
          cell.style.background = '#d7e9ff';
        } else {
          var targetPosition = -1;
          var t;
          for (t = 0; t < TARGETS.length && t < list.length; t += 1) {
            if (TARGETS[t].c === col && TARGETS[t].r === row) {
              targetPosition = t;
              break;
            }
          }
          if (targetPosition >= 0) {
            var choice = list[targetPosition];
            var label = choice.label || String(choice.value);
            var flag = btn('target', {
              'data-fe-target': String(targetPosition),
              'aria-label': text('Ô đích thứ ' + (targetPosition + 1) + ': ' + label)
            }, '🎯 ' + label);
            flag.style.cssText = 'width:100%;border-radius:10px;background:#fff7d6;color:#6a531f;font-weight:900;font-size:1.1rem;';
            flag.setAttribute('data-value', String(choice.value));
            cell.appendChild(flag);
          }
        }
        boardNode.appendChild(cell);
        cells.push(cell);
      }
    }
    placePiece(START);
  }

  function pathTo(target) {
    var path = [];
    var c = START.c;
    var r = START.r;
    while (c !== target.c) {
      c += target.c > c ? 1 : -1;
      path.push({ c: c, r: r });
    }
    while (r !== target.r) {
      r += target.r > r ? 1 : -1;
      path.push({ c: c, r: r });
    }
    return path;
  }

  function activate(index) {
    var choice = q && q.choices && q.choices[index];
    var target;
    var path;
    var stepMs;
    if (!choice || locked || moving || destroyed) {
      return;
    }
    target = TARGETS[index];
    if (!target) {
      return;
    }
    path = pathTo(target);
    moving = true;
    if (reduced || !path.length) {
      placePiece(target);
      moving = false;
      submit(choice.value);
      return;
    }
    stepMs = Math.max(1, tune('stepMs', 280));
    path.forEach(function (step, stepIndex) {
      later(function () {
        if (destroyed) {
          return;
        }
        placePiece(step);
        if (stepIndex === path.length - 1) {
          moving = false;
          submit(choice.value);
        }
      }, stepMs * (stepIndex + 1));
    });
  }

  function render(question) {
    if (destroyed) {
      return;
    }
    q = question || q;
    locked = false;
    moving = false;
    clearTimers();
    root.classList.remove('is-correct', 'is-wrong', 'is-picked');
    promptNode.textContent = (q && q.text) || '';
    hintNode.textContent = text('Bé đi quân tới ô có số đã chọn nhé!');
    drawEquation();
    drawBoard();
  }

  on(boardNode, 'click', function (event) {
    var target = event.target;
    var flag = null;
    while (target && target !== boardNode) {
      if (target.getAttribute && target.getAttribute('data-fe-target') != null) {
        flag = target;
        break;
      }
      target = target.parentNode;
    }
    if (flag) {
      tap();
      activate(Number(flag.getAttribute('data-fe-target')));
      return;
    }
    hintNode.textContent = text('Bé chọn ô đích có số nhé!');
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
    moving = false;
    drawBoard();
    hintNode.textContent = text('Quân trở lại ô đầu. Bé đi lại nhé!');
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
    if (index >= q.choices.length || locked || moving || destroyed) {
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
