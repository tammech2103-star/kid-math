/**
 * Minigame bài `b18` — đi quân tới ô đáp án (cảm hứng: Fire Emblem).
 * Design: quick-spec mục 19 (board/d — woodcut, động tác "đi").
 * G2: mixed {add, subtract, factFamily}; nhãn đầu bàn lấy từ q.equation.tokens.
 * Edge: chạm lại ô đang đứng → KHÔNG đi, KHÔNG nộp. Quân đi từng ô rồi nộp
 * sau khi tới đích (≤ stepMs * cols). Panel nền sáng ≥92% (risk b18).
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.fireEmblem = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'fire-emblem';
  var COLS = 4;
  var ROWS = 3;
  var START_ROW = 1;
  var START_COL = 0;

  function headerText(q) {
    var tokens = (q && q.equation && q.equation.tokens) || [];
    if (!tokens.length) {
      return (q && q.text) || '';
    }
    return tokens.map(function (token) {
      return token.type === 'slot' ? '?' : String(token.value);
    }).join(' ');
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b18',
      tribute: 'Fire Emblem',
      prefix: 'fe',
      hint: 'Bé chạm ô đáp án để quân đi tới đó nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'fe-board',
          'style': {
            position: 'relative', 'min-height': '270px', 'border-radius': '18px',
            background: '#fff8e8', border: '3px solid #b08a52', padding: '8px'
          }
        });
        var header = K.node('div', {
          'class': 'fe-header',
          'style': {
            'text-align': 'center', 'min-height': '44px', 'font-size': '1.35rem',
            'font-weight': '900', color: '#4b3418'
          }
        });
        var field = K.node('div', { 'class': 'fe-field', 'style': { position: 'relative', 'margin-top': '6px' } });
        var piece = K.node('div', {
          'class': 'fe-piece', text: '♞', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', 'font-size': '2.2rem', 'z-index': '3',
            'pointer-events': 'none', transition: k.reduced ? 'none' : 'left 180ms ease, top 180ms ease'
          }
        });

        board.appendChild(header);
        board.appendChild(field);
        field.appendChild(piece);

        k.board = board;
        k.header = header;
        k.field = field;
        k.piece = piece;
        k.tiles = [];
        k.walkGen = 0;

        k.placePiece = function (row, col) {
          var tile = k.tiles[row * COLS + col];
          if (!tile) {
            return;
          }
          k.piece.style.left = (tile.offsetLeft + tile.offsetWidth / 2 - 18) + 'px';
          k.piece.style.top = (tile.offsetTop + tile.offsetHeight / 2 - 22) + 'px';
        };

        k.track(k.field, 'click', function (event) {
          var tile = K.closestData(event.target, k.field, 'data-cell');
          if (!tile) {
            return;
          }
          var row = Number(tile.getAttribute('data-row'));
          var col = Number(tile.getAttribute('data-col'));
          if (row === START_ROW && col === START_COL) {
            k.hint('Quân đang đứng ở ô này rồi. Bé chọn ô có số nhé!');
            return;
          }
          if (tile.getAttribute('data-value') == null) {
            return;
          }
          var gen = ++k.walkGen;
          var stepMs = Math.max(180, Math.min(400, k.tune(['stepMs'], 220)));
          var walk = function (at) {
            if (gen !== k.walkGen) {
              return;
            }
            k.placePiece(START_ROW, at);
            if (at >= col) {
              k.answer(tile.getAttribute('data-value'));
              return;
            }
            k.later(function () { walk(at + 1); }, stepMs);
          };
          if (k.reduced) {
            k.placePiece(START_ROW, col);
            k.answer(tile.getAttribute('data-value'));
          } else {
            walk(START_COL + 1);
          }
        });

        k.add(board);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var grid;
        var i;
        k.walkGen += 1;
        k.header.textContent = headerText(q);
        k.header.setAttribute('aria-label', (q && q.equation && q.equation.alt) || (q && q.text) || 'Bàn cờ');
        while (k.field.firstChild) {
          k.field.removeChild(k.field.firstChild);
        }
        k.field.appendChild(k.piece);

        grid = k.makeGrid({
          rows: ROWS, cols: COLS, cellClass: 'fe-tile',
          gap: 6,
          label: function (at) { return 'Ô thứ ' + (at + 1); }
        });
        k.tiles = grid.cells;
        k.field.appendChild(grid.wrap);

        for (i = 0; i < choices.length && i < COLS - 1; i += 1) {
          (function (choice, at) {
            var tile = k.tiles[START_ROW * COLS + at + 1];
            var label = choice.label != null ? String(choice.label) : String(choice.value);
            if (!tile) {
              return;
            }
            tile.setAttribute('data-value', String(choice.value));
            tile.setAttribute('aria-label', 'Ô đích ' + label);
            tile.textContent = label;
            tile.style.background = '#ffffff';
            tile.style.color = '#4b3418';
          }(choices[i], i));
        }
        k.tiles[START_ROW * COLS + START_COL].setAttribute('aria-label', 'Ô quân đứng, không phải đáp án');
        k.placePiece(START_ROW, START_COL);
      },

      onWrong: function (k) {
        k.walkGen += 1;
        k.placePiece(START_ROW, START_COL);
        if (!k.reduced) {
          k.tiles.forEach(function (tile) {
            if (tile.getAttribute('data-value') != null) {
              tile.style.opacity = '0.35';
              k.later(function () { tile.style.opacity = ''; }, 400);
            }
          });
        }
        k.hint('Quân về ô cũ rồi. Bé đi tới ô đích nhé!');
      }
    });
  }

  KM.Games.fireEmblem = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
