/**
 * Minigame bài `b19` — bắn mực vào mục tiêu (cảm hứng: Splatoon).
 * Design: quick-spec mục 20 (bench/c — spray-paint, động tác "bắn").
 * G2: mixed {shape2d, solid3d, position}; kind lạ → hiện tĩnh q.text/q.visual.
 * Edge: choiceRender='shape' → mục tiêu CHỈ là SVG + aria-label từ choice.aria
 * (không render chữ, tránh lộ đáp án). Chạm vùng trống → vệt mực trang trí
 * ở layer dưới (pointer-events:none, tối đa 3), KHÔNG nộp, KHÔNG phạt.
 * Edge: câu position có 4 đáp án (js/domain/questions.js) → 4 mục tiêu xếp dải
 * ngang, thu về 76px để không chồng lên nhau trong khung đã nén OBS-01.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.splatoon = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'splatoon';
  var TARGET_SPOTS = [
    { left: '18%', top: '18%' },
    { left: 'calc(50% - 44px)', top: '10%' },
    { left: 'calc(82% - 88px)', top: '18%' }
  ];

  var TARGET_SPOTS_4 = [
    { left: '2%', top: '18%' },
    { left: '26%', top: '8%' },
    { left: '50%', top: '18%' },
    { left: '74%', top: '8%' }
  ];

  function shape(kind, size, label) {
    if (KM.Visuals && typeof KM.Visuals.shapeSvg === 'function') {
      return KM.Visuals.shapeSvg(kind, { size: size || 72, label: label || kind });
    }
    return K.node('span', { text: '🔷', 'aria-hidden': 'true' });
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b19',
      tribute: 'Splatoon',
      prefix: 'sp',
      hint: 'Bé bắn mực vào mục tiêu đúng nhé!',

      build: function (k) {
        var range = K.node('div', {
          'class': 'sp-range',
          'style': {
            position: 'relative', 'min-height': '280px', 'border-radius': '22px',
            background: '#fffdf8', border: '4px solid #a9d9c6', overflow: 'hidden'
          }
        });
        var decor = K.node('div', {
          'class': 'sp-decor', 'aria-hidden': 'true',
          'style': { position: 'absolute', inset: '0', 'z-index': '1', 'pointer-events': 'none' }
        });
        var stream = K.node('div', {
          'class': 'sp-stream', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: '44px', bottom: '46px',
            width: '4px', height: '4px', 'border-radius': '999px 999px 0 0',
            background: 'rgba(236,86,158,0.75)', 'z-index': '2',
            'pointer-events': 'none', transition: k.reduced ? 'none' : 'width 300ms ease, height 300ms ease, transform 300ms ease'
          }
        });
        var targets = K.node('div', {
          'class': 'sp-targets',
          'style': { position: 'absolute', inset: '0', 'z-index': '3' }
        });
        var gun = K.node('div', {
          'class': 'sp-gun', text: '🔫', 'aria-hidden': 'true',
          'style': { position: 'absolute', left: '8px', bottom: '6px', 'font-size': '2.4rem', 'z-index': '4' }
        });
        var caption = K.node('div', {
          'class': 'sp-caption',
          'style': {
            position: 'absolute', left: '0', right: '0', bottom: '4px',
            'text-align': 'center', 'font-size': '0.9rem', 'font-weight': '800', color: '#39765e'
          }
        });

        range.appendChild(decor);
        range.appendChild(stream);
        range.appendChild(targets);
        range.appendChild(gun);
        range.appendChild(caption);

        k.range = range;
        k.decor = decor;
        k.stream = stream;
        k.targets = targets;
        k.caption = caption;
        k.splats = [];

        k.clearStream = function () {
          k.stream.style.width = '4px';
          k.stream.style.height = '4px';
          k.stream.style.transform = '';
        };

        k.addSplat = function (event) {
          var rect = range.getBoundingClientRect();
          var maxSplats = Math.max(1, Math.min(3, k.tune(['maxDecorSplats'], 3)));
          var targetRects;
          var x = event.clientX - rect.left;
          var y = event.clientY - rect.top;
          var i;
          var overTarget = false;
          targetRects = targets.querySelectorAll('[data-target]');
          for (i = 0; i < targetRects.length; i += 1) {
            var box = targetRects[i].getBoundingClientRect();
            if (event.clientX >= box.left && event.clientX <= box.right &&
              event.clientY >= box.top && event.clientY <= box.bottom) {
              overTarget = true;
              break;
            }
          }
          if (overTarget) {
            return;
          }
          var splat = K.node('span', {
            'aria-hidden': 'true',
            'style': {
              position: 'absolute', left: (x - 28) + 'px', top: (y - 28) + 'px',
              width: '56px', height: '56px', 'border-radius': '48% 52% 45% 55%',
              background: 'rgba(236,86,158,0.45)',
              transition: k.reduced ? 'none' : 'opacity 400ms ease'
            }
          });
          decor.appendChild(splat);
          k.splats.push(splat);
          while (k.splats.length > maxSplats) {
            var old = k.splats.shift();
            if (old.parentNode) {
              old.parentNode.removeChild(old);
            }
          }
          k.later(function () {
            splat.style.opacity = '0';
            k.later(function () {
              if (splat.parentNode) {
                splat.parentNode.removeChild(splat);
              }
              var at = k.splats.indexOf(splat);
              if (at >= 0) {
                k.splats.splice(at, 1);
              }
            }, 420);
          }, 900);
        };

        k.track(k.targets, 'click', function (event) {
          var target = K.closestData(event.target, k.targets, 'data-target');
          if (!target) {
            return;
          }
          if (!k.reduced) {
            var rect = range.getBoundingClientRect();
            var box = target.getBoundingClientRect();
            var dx = box.left + box.width / 2 - rect.left - 44;
            var dy = box.top + box.height / 2 - rect.top - (rect.height - 46);
            k.stream.style.width = Math.max(4, Math.sqrt(dx * dx + dy * dy)) + 'px';
            k.stream.style.height = '10px';
            k.stream.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
            k.stream.style.transformOrigin = '0 50%';
          }
          k.answer(target.getAttribute('data-value'));
        });

        k.track(k.range, 'click', function (event) {
          if (K.closestData(event.target, k.range, 'data-target')) {
            return;
          }
          k.addSplat(event);
        });

        k.add(range);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var isShape = !!(q && q.choiceRender === 'shape');
        var supported = ['shape2d', 'solid3d', 'position'].indexOf(q && q.kind) >= 0;
        var spots = choices.length > 3 ? TARGET_SPOTS_4 : TARGET_SPOTS;
        var targetSize = k.tune(['targetRadiusPx'], 88);
        if (choices.length > 3) {
          targetSize = Math.max(64, Math.min(targetSize, 76));
        }
        var i;

        k.clearStream();
        while (k.decor.firstChild) {
          k.decor.removeChild(k.decor.firstChild);
        }
        k.splats = [];
        while (k.targets.firstChild) {
          k.targets.removeChild(k.targets.firstChild);
        }
        k.caption.textContent = !supported ? ((q && q.text) || '') : '';

        for (i = 0; i < choices.length; i += 1) {
          (function (choice, at) {
            var label = choice.aria || choice.label || String(choice.value);
            var content;
            var spot = spots[at] || spots[spots.length - 1];
            if (isShape && choice.shape) {
              content = [shape(choice.shape, 76, label)];
            } else if (choice.glyph) {
              content = [K.node('span', { text: choice.glyph, 'aria-hidden': 'true' })];
            } else {
              content = [K.node('span', { text: choice.icon || label, 'aria-hidden': 'true' })];
            }
            var target = k.btn({
              'class': 'sp-target',
              'data-target': String(at),
              'data-value': String(choice.value),
              'aria-label': 'Mục tiêu ' + (at + 1) + ': ' + label,
              'style': {
                position: 'absolute', left: spot.left, top: spot.top,
                'min-width': String(targetSize) + 'px',
                'min-height': String(targetSize) + 'px',
                'border-radius': '50%', background: '#ffffff',
                color: '#c1447e', 'font-size': '1.6rem',
                display: 'grid', 'place-items': 'center'
              }
            }, content);
            k.targets.appendChild(target);
          }(choices[i], i));
        }
      },

      onWrong: function (k) {
        k.clearStream();
        if (!k.reduced) {
          Array.prototype.forEach.call(k.targets.querySelectorAll('[data-target]'), function (target) {
            target.style.transform = 'translateY(4px)';
            k.later(function () { target.style.transform = ''; }, 280);
          });
        }
        k.hint('Mực bị hút ngược rồi. Bé bắn mục tiêu khác nhé!');
      }
    });
  }

  KM.Games.splatoon = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
