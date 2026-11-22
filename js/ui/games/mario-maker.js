/**
 * Minigame bài `b8` — xếp khối vào lưới (cảm hứng: Mario Maker).
 * Design: quick-spec mục 09 (tray/a — clay, động tác "xếp").
 * Luật: lưới 3×3, tranh mẫu mờ ở nền; chạm ô để đặt khối, chạm lại để bỏ.
 * Tự nộp khi số khối = q.answer. Nếu lưới đầy mà số khối không có trong
 * question.choices → KHÔNG nộp, hiện "Bè bớt 1 viên nhé", chạm bất kỳ ô để bỏ 1.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioMaker = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'mario-maker';
  var COLS = 3;

  function clearCells(k) {
    k.placed = [];
    k.blocked = false;
    k.cells.forEach(function (cell) {
      cell.textContent = '';
      cell.classList.remove('is-filled');
      cell.setAttribute('aria-pressed', 'false');
    });
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b8',
      tribute: 'Mario Maker',
      prefix: 'mm',
      hint: 'Chạm ô để xếp một khối. Chạm lại ô đó để bỏ khối nhé!',

      build: function (k) {
        var tray = K.node('div', {
          'class': 'mm-tray',
          'style': {
            position: 'relative', 'min-height': '200px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #fff6e6, #f4dfc4)',
            border: '3px solid #d8b98f', padding: '6px'
          }
        });
        var ghost = K.node('div', {
          'class': 'mm-ghost', 'aria-hidden': 'true',
          'style': {
            display: 'flex', 'flex-wrap': 'wrap', gap: '4px',
            'justify-content': 'center', 'align-items': 'center',
            'min-height': '40px', 'font-size': '0.85rem', color: '#7b6347'
          }
        });
        var holder = K.node('div', { 'class': 'mm-grid-holder', 'style': { 'margin-top': '4px' } });
        var done = K.node('div', {
          'class': 'mm-template-label', 'aria-hidden': 'true',
          text: 'Tranh mẫu (đếm số khối cần xếp)',
          'style': { 'text-align': 'center', 'font-size': '0.85rem', 'font-weight': '800', color: '#7b6347' }
        });

        k.tray = tray;
        k.ghost = ghost;
        k.holder = holder;
        k.cells = [];
        k.placed = [];
        k.blocked = false;
        k.capacity = 9;
        k.targetCount = 0;

        tray.appendChild(done);
        tray.appendChild(ghost);
        tray.appendChild(holder);

        k.track(holder, 'click', function (event) {
          var cell = K.closestData(event.target, holder, 'data-cell');
          if (!cell) {
            return;
          }
          var index = Number(cell.getAttribute('data-cell'));
          var at;

          if (k.blocked) {
            // Lưới đầy: chạm ô bất kỳ chỉ bỏ 1 khối (không nộp, không phạt).
            at = k.placed.pop();
            if (at != null && k.cells[at]) {
              k.cells[at].textContent = '';
              k.cells[at].classList.remove('is-filled');
              k.cells[at].setAttribute('aria-pressed', 'false');
            }
            k.blocked = false;
            k.hint('Đã bớt 1 viên. Bé xếp lại nhé!');
            return;
          }

          at = k.placed.indexOf(index);
          if (at >= 0) {
            k.placed.splice(at, 1);
            cell.textContent = '';
            cell.classList.remove('is-filled');
            cell.setAttribute('aria-pressed', 'false');
            return;
          }
          if (k.placed.length >= k.capacity) {
            return;
          }

          k.placed.push(index);
          cell.textContent = k.blockGlyph || '🧱';
          cell.classList.add('is-filled');
          cell.setAttribute('aria-pressed', 'true');

          if (k.placed.length === k.targetCount) {
            k.answer(k.placed.length);
          } else if (!k.find(k.placed.length)) {
            k.blocked = true;
            k.hint('Bè bớt 1 viên nhé.');
          }
        });

        k.add(tray);
      },

      render: function (k, q) {
        var answer = (q && q.answer) || 0;
        var capacity = Math.max(9, answer, k.tune(['gridCells', 'makerCells'], 9));
        var rows = Math.ceil(capacity / COLS);
        var grid;
        var i;
        var ghostCount;

        k.targetCount = answer;
        k.blockGlyph = '🧱';
        while (k.holder.firstChild) {
          k.holder.removeChild(k.holder.firstChild);
        }
        k.ghost.textContent = '';
        ghostCount = Math.min(answer, 12);
        for (i = 0; i < ghostCount; i += 1) {
          k.ghost.appendChild(K.node('span', {
            text: '▢', 'aria-hidden': 'true',
            'style': {
              'font-size': '1.4rem',
              opacity: String(k.tune(['ghostOpacity'], 0.25))
            }
          }));
        }
        if (ghostCount === 0) {
          k.ghost.appendChild(K.node('span', {
            text: 'Không cần xếp khối nào', 'style': { 'font-size': '0.85rem' }
          }));
        }

        grid = k.makeGrid({
          rows: rows, cols: COLS, cellClass: 'mm-cell',
          label: function (at) { return 'Ô thứ ' + (at + 1) + ', chạm để xếp hoặc bỏ khối'; }
        });
        k.cells = grid.cells;
        k.capacity = capacity;
        grid.cells.forEach(function (cell, at) {
          if (at >= capacity) {
            cell.style.display = 'none';
          }
        });
        k.holder.appendChild(grid.wrap);
        clearCells(k);
      },

      onWrong: function (k) {
        clearCells(k);
        k.hint('Chưa đúng, khối đã bỏ hết. Bé đếm tranh mẫu rồi xếp lại nhé!');
      }
    });
  }

  KM.Games.marioMaker = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
