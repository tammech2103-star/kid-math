/**
 * Minigame bài `b14` — kéo khối bằng nhóm trợ lý (cảm hứng: Pikmin).
 * Design: quick-spec mục 15 (tray/b — yarn, động tác "kéo").
 * solid3d: identify → khối mang choice.shape (SVG); realWorld → khối mang
 * choice.glyph, KHÔNG ghi tên khối lên khối (tên chỉ ở q.text).
 * Edge: chạm nhóm trợ lý rồi chạm cỏ/trống → trợ lý về, không nộp, không phạt.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.pikmin = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'pikmin';

  function shape(kind, size, label) {
    if (KM.Visuals && typeof KM.Visuals.shapeSvg === 'function') {
      return KM.Visuals.shapeSvg(kind, { size: size || 64, label: label || kind });
    }
    return K.node('span', { text: '🔷', 'aria-hidden': 'true' });
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b14',
      tribute: 'Pikmin',
      prefix: 'pk',
      hint: 'Bé chạm nhóm trợ lý, rồi chạm khối để kéo ra nhé!',

      build: function (k) {
        var tray = K.node('div', {
          'class': 'pk-tray',
          'style': {
            position: 'relative', 'min-height': '250px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #fff8ee, #e9d8c2)',
            border: '3px solid #c7a888', padding: '8px'
          }
        });
        var stack = K.node('div', {
          'class': 'pk-stack',
          'style': {
            display: 'flex', 'flex-wrap': 'wrap', gap: '8px',
            'justify-content': 'center', 'align-items': 'flex-end',
            'min-height': '132px'
          }
        });
        var ground = K.node('div', {
          'class': 'pk-ground',
          'style': {
            'min-height': '52px', 'border-radius': '14px',
            background: '#f1f7df', border: '2px dashed #9cb87a',
            display: 'flex', 'align-items': 'center', 'justify-content': 'center',
            'font-size': '1.2rem'
          }
        }, [K.node('span', { text: '🌱 cỏ trống', 'aria-hidden': 'true' })]);
        var helpers = k.btn({
          'class': 'pk-helpers',
          'data-helpers': 'true',
          'aria-label': 'Chọn nhóm trợ lý Pikmin',
          'aria-pressed': 'false',
          text: '🔴🟡🔵 Pikmin',
          'style': {
            'min-height': '64px', width: '220px', 'border-radius': '18px',
            background: '#fff', color: '#6b4a2f', 'font-size': '1.05rem',
            'margin': '8px auto 0', display: 'block'
          }
        });

        tray.appendChild(stack);
        tray.appendChild(ground);
        tray.appendChild(helpers);

        k.tray = tray;
        k.stack = stack;
        k.ground = ground;
        k.helpers = helpers;
        k.helperSelected = false;

        k.resetScene = function (q) {
          var choices = (q && q.choices) || [];
          var isGlyph = !!(q && q.choiceRender === 'glyph');
          var i;
          k.helperSelected = false;
          k.helpers.setAttribute('aria-pressed', 'false');
          k.helpers.style.outline = 'none';
          while (k.stack.firstChild) {
            k.stack.removeChild(k.stack.firstChild);
          }
          for (i = 0; i < choices.length; i += 1) {
            (function (choice, at) {
              var label = choice.aria || choice.label || String(choice.value);
              var content = isGlyph
                ? [K.node('span', { text: choice.glyph || '📦', 'aria-hidden': 'true' })]
                : [shape(choice.shape, 64, label)];
              var block = k.btn({
                'class': 'pk-block',
                'data-block': String(at),
                'data-value': String(choice.value),
                'aria-label': 'Khối thứ ' + (at + 1) + ': ' + label,
                'style': {
                  'min-width': String(k.tune(['blockSizePx'], 76)) + 'px',
                  'min-height': String(k.tune(['blockSizePx'], 76)) + 'px',
                  'border-radius': '16px', background: '#fffdf7',
                  'font-size': '1.8rem', display: 'grid', 'place-items': 'center'
                }
              }, content);
              k.stack.appendChild(block);
            }(choices[i], i));
          }
        };

        k.track(k.helpers, 'click', function () {
          k.helperSelected = !k.helperSelected;
          k.helpers.setAttribute('aria-pressed', k.helperSelected ? 'true' : 'false');
          k.helpers.style.outline = k.helperSelected ? '4px solid #e08a3c' : 'none';
          k.hint(k.helperSelected
            ? 'Trợ lý đã sẵn sàng. Bé chạm vào một khối nhé!'
            : 'Trợ lý về dưới rồi. Bé chạm vào nhóm trợ lý nếu cần kéo khối.');
        });

        k.track(k.stack, 'click', function (event) {
          var block = K.closestData(event.target, k.stack, 'data-block');
          if (!block) {
            return;
          }
          if (!k.helperSelected) {
            k.hint('Bé chạm nhóm trợ lý trước đã nhé!');
            return;
          }
          if (!k.reduced) {
            block.style.transition = 'transform 420ms ease, opacity 420ms ease';
            block.style.transform = 'translateY(26px) scale(0.9)';
            block.style.opacity = '0.4';
          }
          k.answer(block.getAttribute('data-value'));
        });

        k.track(k.tray, 'click', function (event) {
          if (K.closestData(event.target, k.tray, 'data-block') ||
            K.closestData(event.target, k.tray, 'data-helpers')) {
            return;
          }
          if (k.helperSelected) {
            k.helperSelected = false;
            k.helpers.setAttribute('aria-pressed', 'false');
            k.helpers.style.outline = 'none';
            k.hint('Trợ lý quay về dưới rồi. Bé chọn lại rồi kéo khối nhé.');
          }
        });

        k.add(tray);
      },

      render: function (k, q) {
        k.resetScene(q);
      },

      onWrong: function (k) {
        k.resetScene(k.q);
        k.hint('Khối trượt lại chỗ cũ. Bé chọn trợ lý rồi kéo khối khác nhé!');
      }
    });
  }

  KM.Games.pikmin = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
