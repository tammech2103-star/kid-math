/**
 * Minigame bài `b7` — thả viên thuốc vào chai (cảm hứng: Dr. Mario).
 * Design: quick-spec mục 08 (bench/a — chai đứng + khay viên, động tác "thả").
 * shape2d: identify → viên mang hình; count → viên mang số, hình cần đếm nằm ngoài chai.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.drMario = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'dr-mario';

  function shape(kind, size, label) {
    if (KM.Visuals && typeof KM.Visuals.shapeSvg === 'function') {
      return KM.Visuals.shapeSvg(kind, { size: size || 62, label: label || kind });
    }
    return K.node('span', { text: '🔷', 'aria-hidden': 'true' });
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b7',
      tribute: 'Dr. Mario',
      prefix: 'dm',
      hint: 'Chạm một viên trong khay để thả vào chai nhé!',

      build: function (k) {
        var bench = K.node('div', {
          'class': 'dm-bench',
          'style': {
            position: 'relative', 'min-height': '178px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #f4fbff, #d8ecf7)',
            border: '3px solid #bcd8e6'
          }
        });
        var scene = K.node('div', {
          'class': 'dm-scene',
          'style': { position: 'absolute', left: '4%', top: '8%', width: '46%', height: '52%' }
        });
        var bottle = K.node('div', {
          'class': 'dm-bottle',
          'style': {
            position: 'absolute', left: 'calc(62% - 44px)', top: '10%',
            width: '88px', 'min-height': '96px', 'text-align': 'center',
            'font-size': '3rem', 'line-height': '1', 'z-index': '2'
          }
        }, [K.node('span', { text: '🧪', 'aria-hidden': 'true' })]);
        var mouth = K.node('div', {
          'class': 'dm-mouth',
          'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: 'calc(62% - 30px)', top: '16px',
            width: '60px', height: '16px', 'border-radius': '999px',
            background: 'rgba(38,94,130,0.18)', 'z-index': '1'
          }
        });
        var tray = K.node('div', {
          'class': 'dm-tray',
          'style': {
            position: 'absolute', left: '3%', right: '3%', bottom: '4px',
            display: 'flex', gap: '10px', 'overflow-x': 'auto',
            'padding': '6px', 'min-height': '84px', 'align-items': 'center',
            background: 'rgba(255,255,255,0.72)', 'border-radius': '18px'
          }
        });
        bench.appendChild(scene);
        bench.appendChild(bottle);
        bench.appendChild(mouth);
        bench.appendChild(tray);
        k.scene = scene;
        k.bottle = bottle;
        k.tray = tray;
        k.bench = bench;

        k.track(tray, 'click', function (event) {
          var pill = K.closestData(event.target, tray, 'data-pill');
          if (!pill) {
            k.hint('Thả vào chai nhé');
            return;
          }
          if (!k.reduced) {
            pill.style.transition = 'transform 420ms ease, opacity 420ms ease';
            pill.style.transform = 'translateY(-56px)';
            pill.style.opacity = '0.4';
            k.later(function () {
              pill.style.transform = '';
              pill.style.opacity = '';
            }, 420);
          }
          k.answer(pill.getAttribute('data-value'));
        });
        k.track(bench, 'click', function (event) {
          if (!K.closestData(event.target, bench, 'data-pill') &&
            !K.closestData(event.target, bench, 'data-bottle')) {
            k.hint('Thả vào chai nhé');
          }
        });
        k.add(bench);
      },

      render: function (k, q) {
        var isCount = !!(q && q.kind === 'shape2d' && q.choiceRender === 'number');
        var choices = (q && q.choices) || [];
        var items = q && q.visual && q.visual.items ? q.visual.items : [];
        var i;
        k.scene.textContent = '';
        while (k.tray.firstChild) {
          k.tray.removeChild(k.tray.firstChild);
        }
        items.forEach(function (item) {
          k.scene.appendChild(shape(item.shape, item.size || 54, item.shape));
        });
        if (isCount && items.length === 0) {
          k.scene.appendChild(K.node('span', {
            text: 'Không có hình nào để đếm',
            'style': { 'font-size': '0.9rem', 'font-weight': '700' }
          }));
        }
        for (i = 0; i < choices.length; i += 1) {
          (function (choice, index) {
            var isShape = choice.shape && !isCount;
            var label = isShape
              ? (choice.aria || choice.label || choice.shape)
              : (choice.label != null ? String(choice.label) : String(choice.value));
            var pill = k.btn({
              'class': 'dm-pill',
              'data-pill': String(index),
              'data-value': String(choice.value),
              'aria-label': isShape ? 'Thả hình ' + label + ' vào chai' : 'Thả số ' + label + ' vào chai',
              'style': {
                'min-width': '72px', 'min-height': '72px', 'border-radius': '24px',
                background: '#fffbe9', color: '#37445c', 'font-size': '1.35rem'
              }
            }, isShape
              ? [shape(choice.shape, 52, label)]
              : [label]);
            K.reducedClass(pill, k.reduced);
            k.tray.appendChild(pill);
          }(choices[i], i));
        }
      },

      onWrong: function (k) {
        k.hint('Chưa đúng, viên thuốc bay về khay. Bé thả lại nhé!');
        if (!k.reduced) {
          k.bottle.style.transform = 'rotate(-6deg)';
          k.later(function () { k.bottle.style.transform = ''; }, 300);
        }
      }
    });
  }

  KM.Games.drMario = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
