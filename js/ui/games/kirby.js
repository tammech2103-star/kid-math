/**
 * Minigame bài `b15` — thổi vật theo hướng mây (cảm hứng: Kirby).
 * Design: quick-spec mục 16 (arena/c — cotton, động tác "thổi").
 * position: q.visual.rel là nguồn chân lý cho vị trí ban đầu; KHÔNG đo pixel
 * (kể cả khi CSS làm vật/hộp chồng lên nhau). 4 mây ↑↓←→ từ q.choices.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.kirby = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'kirby';
  var POS = {
    on: { left: 'calc(50% - 24px)', top: '8%' },
    under: { left: 'calc(50% - 24px)', top: '62%' },
    left: { left: '12%', top: 'calc(50% - 24px)' },
    right: { left: 'calc(88% - 48px)', top: 'calc(50% - 24px)' }
  };

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b15',
      tribute: 'Kirby',
      prefix: 'kb',
      hint: 'Bé chạm vào đám mây chỉ hướng đúng nhé!',

      build: function (k) {
        var arena = K.node('div', {
          'class': 'kb-arena',
          'style': {
            position: 'relative', 'min-height': '290px', 'border-radius': '24px',
            background: 'linear-gradient(180deg, #ffe8f2, #ffd2e5)',
            border: '3px solid #eaa9c6', overflow: 'hidden'
          }
        });
        var box = K.node('div', {
          'class': 'kb-box', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: 'calc(50% - 46px)', top: 'calc(50% - 46px)',
            width: '92px', height: '92px', display: 'grid', 'place-items': 'center',
            'border-radius': '16px', background: '#fff6da',
            border: '3px solid #c99a4e', 'font-size': '3rem', 'z-index': '2'
          }
        }, [K.node('span', { text: '📦' })]);
        var item = K.node('div', {
          'class': 'kb-item', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', 'font-size': '2.4rem', 'z-index': '3',
            transition: k.reduced ? 'none' : 'left 300ms ease, top 300ms ease'
          }
        });
        var clouds = K.node('div', {
          'class': 'kb-clouds',
          'style': { position: 'absolute', inset: '0', 'z-index': '4' }
        });
        var caption = K.node('div', {
          'class': 'kb-caption',
          'style': {
            position: 'absolute', left: '0', right: '0', bottom: '4px',
            'text-align': 'center', 'font-size': '0.9rem', 'font-weight': '800',
            color: '#8a4e6c'
          }
        });

        arena.appendChild(box);
        arena.appendChild(item);
        arena.appendChild(clouds);
        arena.appendChild(caption);

        k.arena = arena;
        k.box = box;
        k.item = item;
        k.clouds = clouds;
        k.caption = caption;

        k.resetScene = function (q) {
          var scene = (q && q.visual) || {};
          var base = scene.base || { glyph: '📦' };
          var thing = scene.item || { glyph: '⚽' };
          var choices = (q && q.choices) || [];
          var place = POS[scene.rel] || POS.on;
          var i;

          box.firstChild.textContent = base.glyph || '📦';
          item.textContent = thing.glyph || '⚽';
          item.style.left = place.left;
          item.style.top = place.top;
          k.caption.textContent = (q && q.text) || '';

          while (k.clouds.firstChild) {
            k.clouds.removeChild(k.clouds.firstChild);
          }
          for (i = 0; i < choices.length; i += 1) {
            (function (choice, at) {
              var position = POS[choice.value] || POS.on;
              var label = choice.label || String(choice.value);
              var cloud = k.btn({
                'class': 'kb-cloud',
                'data-cloud': String(at),
                'data-value': String(choice.value),
                'aria-label': 'Mây ' + (choice.icon || '☁️') + ' ' + label + ', thổi vật theo hướng này',
                text: (choice.icon || '☁️'),
                'style': {
                  position: 'absolute', left: position.left, top: position.top,
                  'min-width': '64px', 'min-height': '64px',
                  'border-radius': '999px', background: '#ffffff',
                  color: '#b04d7c', 'font-size': '1.6rem',
                  'box-shadow': '0 0 0 6px rgba(255,255,255,0.5)'
                }
              });
              k.clouds.appendChild(cloud);
            }(choices[i], i));
          }
        };

        k.track(k.clouds, 'click', function (event) {
          var cloud = K.closestData(event.target, k.clouds, 'data-cloud');
          if (!cloud) {
            return;
          }
          k.answer(cloud.getAttribute('data-value'));
        });

        k.add(arena);
      },

      render: function (k, q) {
        k.resetScene(q);
      },

      onWrong: function (k) {
        k.resetScene(k.q);
        if (!k.reduced) {
          k.clouds.style.transform = 'translateX(4px)';
          k.later(function () { k.clouds.style.transform = ''; }, 260);
        }
        k.hint('Vật về chỗ cũ rồi. Bé chọn mây hướng khác nhé!');
      }
    });
  }

  KM.Games.kirby = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
