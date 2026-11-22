/**
 * Minigame bài `b12` — điền số vào ô trống (cảm hứng: Brain Age).
 * Design: quick-spec mục 13 (board/b — chalkboard, động tác "viết").
 * factFamily: q.equation.tokens → các ô; ô type='slot' là ô trống.
 * Bàn phím 3 choice; chạm một phím → điền vào slot rồi nộp ngay.
 * Edge: chạm ô đã có số → KHÔNG đổi, KHÔNG nộp; slot có thể ở giữa vẫn render đúng.
 * Panel nền sáng ≥92% (yêu cầu risk b12) với mực đậm.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.brainAge = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'brain-age';

  function tokenText(token) {
    if (!token) {
      return '';
    }
    if (token.type === 'slot') {
      return '?';
    }
    return String(token.value);
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b12',
      tribute: 'Brain Age',
      prefix: 'ba',
      hint: 'Bé chạm một số ở bàn phím để điền vào ô trống nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'ba-board',
          'style': {
            'min-height': '230px', 'border-radius': '20px',
            background: '#fffdf2', border: '3px solid #c9b27a',
            padding: '10px', display: 'flex', 'flex-direction': 'column',
            gap: '10px', 'align-items': 'center', 'justify-content': 'center'
          }
        });
        var equation = K.node('div', {
          'class': 'ba-equation', role: 'group',
          'style': {
            display: 'flex', 'flex-wrap': 'wrap', gap: '6px',
            'justify-content': 'center', 'min-height': '88px'
          }
        });
        var keypad = K.node('div', {
          'class': 'ba-keypad',
          'style': { display: 'flex', 'flex-wrap': 'wrap', gap: '10px', 'justify-content': 'center' }
        });

        board.appendChild(equation);
        board.appendChild(keypad);

        k.board = board;
        k.equation = equation;
        k.keypad = keypad;
        k.slotNode = null;

        k.track(k.equation, 'click', function (event) {
          var cell = K.closestData(event.target, k.equation, 'data-cell');
          if (cell && cell.getAttribute('data-slot') !== 'true') {
            k.hint('Ô này đã có số rồi. Bé điền vào ô trống nhé!');
          }
        });

        k.track(k.keypad, 'click', function (event) {
          var key = K.closestData(event.target, k.keypad, 'data-key');
          if (!key || !k.slotNode) {
            return;
          }
          if (k.slotNode.getAttribute('data-filled') === 'true') {
            return;
          }
          k.slotNode.textContent = key.getAttribute('data-label');
          k.slotNode.setAttribute('data-filled', 'true');
          k.answer(key.getAttribute('data-value'));
        });

        k.add(board);
      },

      render: function (k, q) {
        var tokens = (q && q.equation && q.equation.tokens) || [];
        var choices = (q && q.choices) || [];
        var i;
        k.equation.textContent = '';
        while (k.keypad.firstChild) {
          k.keypad.removeChild(k.keypad.firstChild);
        }
        k.slotNode = null;

        k.equation.setAttribute('aria-label',
          (q && q.equation && q.equation.alt) || (q && q.text) || 'Phép tính');

        if (!tokens.length) {
          k.equation.appendChild(K.node('span', {
            text: (q && q.text) || '',
            'style': { 'font-weight': '800', color: '#22324a' }
          }));
        }

        for (i = 0; i < tokens.length; i += 1) {
          (function (token, at) {
            var isSlot = token.type === 'slot';
            var cell = k.btn({
              'class': 'ba-cell',
              'data-cell': String(at),
              'data-slot': isSlot ? 'true' : 'false',
              'data-filled': 'false',
              'aria-label': isSlot ? 'Ô trống, chạm phím số để điền' : ('Ô số ' + tokenText(token)),
              text: isSlot ? '?' : tokenText(token),
              'style': {
                'min-width': String(k.tune(['cellSizePx'], 72)) + 'px',
                'min-height': String(k.tune(['cellSizePx'], 72)) + 'px',
                'border-radius': '14px',
                background: isSlot ? '#fff2b8' : '#ffffff',
                color: '#22324a', 'font-size': '1.5rem'
              }
            });
            if (isSlot) {
              k.slotNode = cell;
            }
            k.equation.appendChild(cell);
          }(tokens[i], i));
        }

        for (i = 0; i < choices.length; i += 1) {
          (function (choice, at) {
            var label = choice.label != null ? String(choice.label) : String(choice.value);
            k.keypad.appendChild(k.btn({
              'class': 'ba-key',
              'data-key': String(at),
              'data-value': String(choice.value),
              'data-label': label,
              'aria-label': 'Điền số ' + label + ' vào ô trống',
              text: label,
              'style': {
                'min-width': '76px', 'min-height': '76px', 'border-radius': '18px',
                background: '#ffffff', color: '#1f3c5c', 'font-size': '1.6rem'
              }
            }));
          }(choices[i], i));
        }
      },

      onWrong: function (k) {
        if (k.slotNode) {
          k.slotNode.textContent = '?';
          k.slotNode.setAttribute('data-filled', 'false');
        }
        k.hint('Chưa đúng, ô trống sáng lại. Bé thử số khác nhé!');
      }
    });
  }

  KM.Games.brainAge = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
