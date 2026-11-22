/**
 * Minigame bài `b1` — ném trái cây vào mục tiêu số (cảm hứng: Super Mario Odyssey).
 * Design: design/quick-specs/all-21-distinct-games.md mục 02 (arena/a, động tác "ném").
 * Mọi giá trị nộp đi đều lấy từ question.choices qua k.answer() của KM.GameKit.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioOdyssey = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'mario-odyssey';
  var ARC = [
    { left: '12%', top: '46%' },
    { left: '45%', top: '6%' },
    { left: '78%', top: '46%' }
  ];

  function countFor(q, k) {
    var groups = q && q.visual && q.visual.groups;
    var n = groups && groups.length && typeof groups[0].count === 'number'
      ? groups[0].count
      : (q && typeof q.answer === 'number' ? q.answer : 0);
    n = Math.max(0, Math.min(12, Math.round(n)));
    return Math.min(n, Math.max(k.tune(['maxObjects'], 5), n));
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b1',
      tribute: 'Super Mario Odyssey',
      prefix: 'mo',
      hint: 'Chạm một vòng tròn số để ném trái cây tới đó nhé!',

      build: function (k) {
        var field = K.node('div', {
          'class': 'mo-field',
          'style': {
            position: 'relative',
            'min-height': '152px',
            'border-radius': '20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))'
          }
        });
        var launcher = K.node('div', {
          'class': 'mo-launcher',
          'style': {
            position: 'absolute',
            left: '8%',
            bottom: '8%',
            'min-width': '64px',
            'min-height': '64px',
            display: 'flex',
            'flex-wrap': 'wrap',
            'align-items': 'center',
            'justify-content': 'center',
            'max-width': '34%',
            'font-size': 'clamp(1.4rem, 4vw, 2rem)',
            'z-index': '2'
          }
        });
        var targets = K.node('div', {
          'class': 'mo-targets',
          'style': { position: 'absolute', inset: '0' }
        });
        field.appendChild(launcher);
        field.appendChild(targets);
        k.field = field;
        k.launcher = launcher;
        k.targets = targets;

        k.track(field, 'click', function (event) {
          if (K.closestData(event.target, field, 'data-target')) {
            return;
          }
          k.hint('Bé nhắm vào ô số nhé');
        });
        k.add(field);
      },

      render: function (k, q) {
        var total = countFor(q, k);
        var groups = q && q.visual && q.visual.groups;
        var glyph = groups && groups[0] && groups[0].glyph ? groups[0].glyph : '🍎';
        var i;
        k.launcher.textContent = total === 0 ? '0 quả' : '';
        k.launcher.style.transform = '';
        for (i = 0; i < total; i += 1) {
          k.launcher.appendChild(K.node('span', {
            text: glyph,
            'aria-hidden': 'true'
          }));
        }
        while (k.targets.firstChild) {
          k.targets.removeChild(k.targets.firstChild);
        }
        var choices = (q && q.choices) || [];
        for (i = 0; i < choices.length && i < ARC.length; i += 1) {
          (function (choice, pos) {
            var target = k.btn({
              'class': 'mo-target',
              'data-target': String(choice.value),
              'aria-label': 'Ném vào số ' + (choice.label != null ? choice.label : choice.value),
              'style': {
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                width: 'clamp(68px, 18vw, 98px)',
                'min-height': '68px',
                'border-radius': '50%',
                background: 'radial-gradient(circle at 35% 28%, #fff8dc, #ffd166 62%, #f3a712)',
                color: '#6b4400',
                'font-size': 'clamp(1.5rem, 4.5vw, 2.2rem)'
              }
            }, [String(choice.label)]);
            K.reducedClass(target, k.reduced);
            k.track(target, 'click', function (event) {
              event.stopPropagation();
              if (!k.reduced) {
                k.launcher.style.transition = 'transform 320ms ease';
                k.launcher.style.transform = 'translate(16px, -18px)';
                k.later(function () { k.launcher.style.transform = ''; }, 320);
              }
              k.answer(choice.value);
            });
            k.targets.appendChild(target);
          }(choices[i], ARC[i]));
        }
      },

      onWrong: function (k) {
        k.hint('Chưa đúng, bé nhắm lại ô số nhé!');
        if (!k.reduced) {
          k.targets.style.transform = 'translateX(4px)';
          k.later(function () { k.targets.style.transform = ''; }, 260);
        }
      }
    });
  }

  KM.Games.marioOdyssey = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
