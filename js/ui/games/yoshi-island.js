/**
 * Minigame bài `b10` — nuốt trái vào giỏ (cảm hứng: Yoshi's Island).
 * Design: quick-spec mục 11 (rail/c — mosaic, động tác "nuốt").
 * add: actionValue = groups[1].masked ? groups[1].count : g0.count + g1.count.
 * Edge: g0.count=0 → đĩa 1 trống, hiện "0 quả"; tổng 10 → đúng 10 lần chạm,
 * chạm lần 11 không còn object để chạm (không tự nộp sai).
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.yoshiIsland = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'yoshi-island';

  function actionValue(q) {
    var groups = (q && q.visual && q.visual.groups) || [];
    var first = groups[0] ? Number(groups[0].count || 0) : 0;
    var second = groups[1] ? Number(groups[1].count || 0) : 0;
    var masked = !!(groups[1] && groups[1].masked);
    return masked ? second : first + second;
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b10',
      tribute: "Yoshi's Island",
      prefix: 'yi',
      hint: 'Bé chạm từng trái để Yoshi nuốt vào giỏ nhé!',

      build: function (k) {
        var rail = K.node('div', {
          'class': 'yi-rail',
          'style': {
            position: 'relative', 'min-height': '230px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #eaffd8, #bfe6a2)',
            border: '3px solid #8fc47a', padding: '6px'
          }
        });
        var plates = K.node('div', {
          'class': 'yi-plates',
          'style': { display: 'flex', gap: '8px', 'justify-content': 'center', 'min-height': '104px' }
        });
        var path = K.node('div', {
          'class': 'yi-path', 'aria-hidden': 'true',
          'style': { 'text-align': 'center', 'font-size': '1.6rem', color: '#4f8b3c' }
        }, [K.node('span', { text: '━━━━━▶ 🍃' })]);
        var basket = K.node('div', {
          'class': 'yi-basket',
          'style': {
            display: 'flex', 'flex-wrap': 'wrap', gap: '2px', 'align-items': 'center',
            'justify-content': 'center', 'align-content': 'center',
            'min-width': '96px', 'min-height': '72px', 'border-radius': '18px',
            background: '#fff3d0', border: '3px solid #a9802f',
            'font-size': '1.1rem'
          }
        });
        var basketLabel = K.node('div', {
          'class': 'yi-basket-label', text: 'Giỏ Yoshi',
          'style': { 'text-align': 'center', 'font-size': '0.85rem', 'font-weight': '800', color: '#4f8b3c' }
        });

        rail.appendChild(plates);
        rail.appendChild(path);
        rail.appendChild(basket);
        rail.appendChild(basketLabel);

        k.rail = rail;
        k.plates = plates;
        k.basket = basket;
        k.platesData = [];
        k.swallowed = 0;
        k.total = 0;

        k.resetScene = function (q) {
          var groups = (q && q.visual && q.visual.groups) || [];
          var i;
          k.platesData = groups;
          k.swallowed = 0;
          k.total = 0;
          k.basket.textContent = '';
          while (k.plates.firstChild) {
            k.plates.removeChild(k.plates.firstChild);
          }
          groups.forEach(function (group, groupIndex) {
            var count = Number(group.count || 0);
            var plate = K.node('div', {
              'class': 'yi-plate',
              'style': {
                'min-width': '120px', 'min-height': '96px', 'border-radius': '16px',
                background: '#fffdf0', border: '2px dashed #8fc47a', padding: '4px',
                display: 'flex', 'flex-wrap': 'wrap', gap: '2px',
                'align-items': 'center', 'justify-content': 'center', 'align-content': 'center'
              }
            });
            k.total += count;
            if (count === 0) {
              plate.appendChild(K.node('span', {
                text: '0 quả',
                'style': { 'font-size': '0.9rem', 'font-weight': '800', color: '#7a8b68' }
              }));
            }
            for (i = 0; i < count; i += 1) {
              (function (at) {
                var fruit = k.btn({
                  'class': 'yi-fruit',
                  'data-fruit': groupIndex + '-' + at,
                  'aria-label': group.glyph + ' quả thứ ' + (at + 1) + ', chạm để nuốt',
                  'style': {
                    'min-width': '64px', 'min-height': '64px', 'border-radius': '14px',
                    background: '#ffffff', 'font-size': '1.5rem'
                  }
                }, [group.glyph || '🍎']);
                plate.appendChild(fruit);
              }(i));
            }
            k.plates.appendChild(plate);
          });
        };

        k.track(k.plates, 'click', function (event) {
          var fruit = K.closestData(event.target, k.plates, 'data-fruit');
          if (!fruit || fruit.getAttribute('data-swallowed') === 'true') {
            return;
          }
          fruit.setAttribute('data-swallowed', 'true');
          if (!k.reduced) {
            fruit.style.transition = 'transform 260ms ease, opacity 260ms ease';
            fruit.style.transform = 'translateY(-18px)';
            fruit.style.opacity = '0.35';
          }
          k.basket.appendChild(K.node('span', {
            text: fruit.textContent, 'aria-hidden': 'true', 'style': { 'font-size': '1.2rem' }
          }));
          k.swallowed += 1;
          if (k.swallowed === k.total) {
            k.answer(actionValue(k.q));
          }
        });

        k.add(rail);
      },

      render: function (k, q) {
        k.resetScene(q);
      },

      onWrong: function (k) {
        k.resetScene(k.q);
        k.hint('Các trái bật ra chỗ cũ rồi. Bé đếm lại rồi nuốt nhé!');
      }
    });
  }

  KM.Games.yoshiIsland = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
