/**
 * Minigame bài `b16` — chớp chọn thẻ lệnh (cảm hứng: WarioWare).
 * Design: quick-spec mục 17 (board/c — pop-art, động tác "chớp").
 * G2: mixed {solid3d, position, shape2d}; kind lạ → hiện tĩnh q.text/q.visual,
 * vẫn giữ thẻ đáp án, không tự nộp.
 * Edge: reducedMotion → bỏ windowMs/đồng hồ, thẻ tĩnh; hết giờ → thẻ đứng yên
 * nhưng vẫn bấm được (không trừ sao, không tự nộp); 2 chạm cùng khung → 1 onAnswer.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.warioware = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'warioware';

  function shape(kind, size, label) {
    if (KM.Visuals && typeof KM.Visuals.shapeSvg === 'function') {
      return KM.Visuals.shapeSvg(kind, { size: size || 64, label: label || kind });
    }
    return K.node('span', { text: '🔷', 'aria-hidden': 'true' });
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b16',
      tribute: 'WarioWare',
      prefix: 'ww',
      hint: 'Bé chạm nhanh thẻ đúng với lệnh ở giữa nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'ww-board',
          'style': {
            position: 'relative', 'min-height': '280px', 'border-radius': '22px',
            background: 'radial-gradient(circle at 50% 50%, #fff7e0 0 26%, #ffd9e8 27% 100%)',
            border: '4px solid #e46d8f', overflow: 'hidden'
          }
        });
        var command = K.node('div', {
          'class': 'ww-command',
          'style': {
            position: 'absolute', left: 'calc(50% - 100px)', top: 'calc(50% - 52px)',
            width: '200px', 'min-height': '104px', 'border-radius': '18px',
            background: '#ffffff', color: '#a32e55', 'z-index': '3',
            display: 'grid', 'place-items': 'center', padding: '6px',
            'font-size': '1rem', 'font-weight': '900', 'text-align': 'center'
          }
        });
        var ring = K.node('div', {
          'class': 'ww-ring', 'style': { position: 'absolute', inset: '0', 'z-index': '2' }
        });
        var timer = K.node('div', {
          'class': 'ww-timer', 'aria-live': 'polite',
          'style': {
            position: 'absolute', left: '0', right: '0', bottom: '4px',
            'text-align': 'center', 'font-size': '0.85rem', 'font-weight': '800', color: '#8b2e4e'
          }
        });

        board.appendChild(ring);
        board.appendChild(command);
        board.appendChild(timer);

        k.board = board;
        k.ring = ring;
        k.command = command;
        k.timer = timer;
        k.cardNodes = [];
        k.orbiting = false;
        k.expired = false;
        k.orbitTick = 0;
        k.orbitGen = 0;

        k.stopOrbit = function () {
          k.orbiting = false;
          k.orbitGen += 1; // thế hệ cũ tự thoát, không chồng timer khi render lại.
        };

        k.orbit = function (gen) {
          if (!k.orbiting || k.reduced || gen !== k.orbitGen) {
            return;
          }
          k.orbitTick += 1;
          var count = Math.max(1, k.cardNodes.length);
          k.cardNodes.forEach(function (card, at) {
            var angle = (at / count) * Math.PI * 2 + k.orbitTick * 0.09;
            card.style.left = 'calc(50% - 48px + ' + (Math.cos(angle) * 108) + 'px)';
            card.style.top = 'calc(50% - 48px + ' + (Math.sin(angle) * 82) + 'px)';
          });
          k.later(function () { k.orbit(gen); }, 90);
        };

        k.track(k.ring, 'click', function (event) {
          var card = K.closestData(event.target, k.ring, 'data-card');
          if (!card) {
            return;
          }
          k.answer(card.getAttribute('data-value')); // locked chặn thẻ thứ 2.
        });

        k.add(board);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var isShape = !!(q && q.choiceRender === 'shape');
        var isGlyph = !!(q && q.choiceRender === 'glyph');
        var supported = ['solid3d', 'position', 'shape2d'].indexOf(q && q.kind) >= 0;
        var windowMs = Math.max(3000, k.tune(['windowMs'], 5000));
        var i;

        k.stopOrbit();
        k.expired = false;
        k.orbitTick = 0;
        k.command.textContent = (q && q.text) || '';
        k.timer.textContent = k.reduced ? 'Chọn từ từ cũng được' : 'Đang chớp...';
        while (k.ring.firstChild) {
          k.ring.removeChild(k.ring.firstChild);
        }
        k.cardNodes = [];

        if (!supported && q && q.visual && q.visual.groups) {
          k.command.textContent = q.text + ' ' + q.visual.groups.map(function (g) {
            return (g.glyph || '') + (g.count || 0);
          }).join(' ');
        }

        for (i = 0; i < choices.length; i += 1) {
          (function (choice, at) {
            var label = choice.label != null ? String(choice.label) : String(choice.value);
            var content;
            if (isShape && choice.shape) {
              content = [shape(choice.shape, 64, choice.aria || label)];
            } else if (isGlyph && choice.glyph) {
              content = [K.node('span', { text: choice.glyph, 'aria-hidden': 'true' })];
            } else {
              content = [choice.icon || label];
            }
            var card = k.btn({
              'class': 'ww-card',
              'data-card': String(at),
              'data-value': String(choice.value),
              'aria-label': 'Thẻ ' + (at + 1) + ': ' + (choice.aria || label),
              'style': {
                position: 'absolute', left: 'calc(50% - 48px)', top: 'calc(50% - 48px)',
                'min-width': String(k.tune(['cardSizePx'], 96)) + 'px',
                'min-height': String(k.tune(['cardSizePx'], 96)) + 'px',
                'border-radius': '18px', background: '#ffffff',
                color: '#a32e55', 'font-size': '1.5rem',
                display: 'grid', 'place-items': 'center'
              }
            }, content);
            k.cardNodes.push(card);
            k.ring.appendChild(card);
          }(choices[i], i));
        }

        if (!k.reduced) {
          k.orbiting = true;
          k.orbit(k.orbitGen);
          (function (gen) {
            k.later(function () {
              if (gen !== k.orbitGen || k.expired) {
                return;
              }
              k.expired = true;
              k.stopOrbit();
              k.timer.textContent = 'Chọn từ từ cũng được';
            }, windowMs);
          }(k.orbitGen));
        }
      },

      onWrong: function (k) {
        k.stopOrbit();
        if (!k.reduced) {
          k.cardNodes.forEach(function (card) {
            card.style.transform = 'rotate(-6deg)';
          });
          k.later(function () {
            k.cardNodes.forEach(function (card) { card.style.transform = ''; });
            if (!k.expired) {
              k.orbiting = true;
              k.orbit(k.orbitGen);
            }
          }, 400);
        }
        k.hint('Thẻ lắc rồi thôi. Bé chọn lại thẻ đúng nhé!');
      }
    });
  }

  KM.Games.warioware = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
