/**
 * Minigame bài `b13` — đẩy bóng qua lại 2 bạn (cảm hứng: Mario & Luigi).
 * Design: quick-spec mục 14 (split/b — grid-paper, động tác "đẩy").
 * G2: mixed {add, subtract, factFamily}; ký hiệu +/− lấy từ q.equation.tokens.
 * Edge: bóng đã ở bạn phải → chạm lại không đi tiếp, không nộp, nhắc chọn thẻ.
 * Panel nền sáng ≥92% (risk b13) — vở ô li nền trắng, nét chì xanh đậm.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioAndLuigi = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'mario-and-luigi';

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
      lessonId: 'b13',
      tribute: 'Mario & Luigi',
      prefix: 'mal',
      hint: 'Bé chạm để đẩy bóng sang bạn bên phải, rồi chạm thẻ số nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'mal-board',
          'style': {
            position: 'relative', 'min-height': '250px', 'border-radius': '20px',
            background: '#fffef8', border: '3px solid #aac6df', padding: '10px'
          }
        });
        var leftLane = K.node('div', {
          'class': 'mal-lane mal-lane--left',
          'style': { position: 'absolute', left: '4%', top: '16%', 'font-size': '3rem', 'line-height': '1' }
        }, [K.node('span', { text: '🍄', 'aria-hidden': 'true' })]);
        var rightLane = K.node('div', {
          'class': 'mal-lane mal-lane--right',
          'style': { position: 'absolute', right: '4%', top: '16%', 'font-size': '3rem', 'line-height': '1' }
        }, [K.node('span', { text: '💚', 'aria-hidden': 'true' })]);
        var track = K.node('div', {
          'class': 'mal-track', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: '18%', right: '18%', top: '30%',
            height: '6px', 'border-radius': '999px', background: '#bcd7ec'
          }
        });
        var push = k.btn({
          'class': 'mal-push',
          'aria-label': 'Đẩy bóng sang bạn bên phải',
          text: '👉 Đẩy bóng',
          'style': {
            position: 'absolute', left: 'calc(50% - 84px)', top: '38%',
            width: '168px', 'min-height': '64px', 'border-radius': '18px',
            background: '#e8f4ff', color: '#254a70', 'font-size': '1.05rem'
          }
        });
        var ball = K.node('span', {
          'class': 'mal-ball', text: '🔴', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: 'calc(18% - 20px)', top: 'calc(30% - 18px)',
            'font-size': '2rem', 'z-index': '2',
            transition: k.reduced ? 'none' : 'left 380ms ease'
          }
        });
        var tokens = K.node('div', {
          'class': 'mal-tokens',
          'style': {
            position: 'absolute', left: '6%', right: '6%', top: '54%',
            display: 'flex', 'flex-wrap': 'wrap', gap: '6px',
            'justify-content': 'center', 'min-height': '56px'
          }
        });
        var cards = K.node('div', {
          'class': 'mal-cards',
          'style': {
            position: 'absolute', left: '4%', right: '4%', bottom: '8px',
            display: 'flex', 'flex-wrap': 'wrap', gap: '8px', 'justify-content': 'center'
          }
        });

        board.appendChild(leftLane);
        board.appendChild(rightLane);
        board.appendChild(track);
        board.appendChild(push);
        board.appendChild(ball);
        board.appendChild(tokens);
        board.appendChild(cards);

        k.board = board;
        k.ball = ball;
        k.push = push;
        k.tokens = tokens;
        k.cards = cards;
        k.atRight = false;
        k.tokenNodes = [];

        k.resetScene = function (q) {
          var list = (q && q.equation && q.equation.tokens) || [];
          var choices = (q && q.choices) || [];
          var i;
          k.atRight = false;
          k.ball.style.left = 'calc(18% - 20px)';
          k.tokens.textContent = '';
          k.tokenNodes = [];
          while (k.cards.firstChild) {
            k.cards.removeChild(k.cards.firstChild);
          }

          if (!list.length) {
            k.tokens.appendChild(K.node('span', {
              text: (q && q.text) || '',
              'style': { 'font-weight': '800', color: '#254a70' }
            }));
          }
          for (i = 0; i < list.length; i += 1) {
            (function (token, at) {
              var cell = K.node('span', {
                text: tokenText(token),
                'aria-hidden': 'true',
                'style': {
                  'min-width': '52px', 'min-height': '52px', padding: '4px 8px',
                  display: 'grid', 'place-items': 'center',
                  background: '#ffffff', border: '2px solid #aac6df',
                  'border-radius': '10px', color: '#254a70',
                  'font-size': '1.3rem', 'font-weight': '900', opacity: '0'
                }
              });
              k.tokenNodes.push(cell);
              k.tokens.appendChild(cell);
              if (!k.reduced) {
                k.later(function () { cell.style.opacity = '1'; }, 90 * (at + 1));
              } else {
                cell.style.opacity = '1';
              }
            }(list[i], i));
          }

          for (i = 0; i < choices.length; i += 1) {
            (function (choice, at) {
              var label = choice.label != null ? String(choice.label) : String(choice.value);
              k.cards.appendChild(k.btn({
                'class': 'mal-card',
                'data-card': String(at),
                'data-value': String(choice.value),
                'aria-label': 'Chọn thẻ ' + label,
                text: label,
                'style': {
                  'min-width': String(k.tune(['cardSizePx'], 76)) + 'px',
                  'min-height': String(k.tune(['cardSizePx'], 76)) + 'px',
                  'border-radius': '14px', background: '#ffffff',
                  color: '#254a70', 'font-size': '1.4rem'
                }
              }));
            }(choices[i], i));
          }
        };

        k.track(push, 'click', function () {
          if (k.atRight) {
            k.hint('Bấm thẻ số bên phải nhé.');
            return;
          }
          k.atRight = true;
          k.ball.style.left = 'calc(78% - 20px)';
          k.hint('Bóng đã sang bạn bên phải. Bé chạm thẻ số nhé!');
        });

        k.track(k.cards, 'click', function (event) {
          var card = K.closestData(event.target, k.cards, 'data-card');
          if (!card) {
            return;
          }
          if (!k.atRight) {
            k.hint('Bé đẩy bóng sang bạn bên phải trước nhé.');
            return;
          }
          k.answer(card.getAttribute('data-value'));
        });

        k.add(board);
      },

      render: function (k, q) {
        k.resetScene(q);
      },

      onWrong: function (k) {
        k.resetScene(k.q);
        k.hint('Bóng về bạn trái, các token ẩn lại. Bé đẩy lại nhé!');
      }
    });
  }

  KM.Games.marioAndLuigi = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
