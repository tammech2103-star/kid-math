/**
 * Minigame bài `b9` — vuốt sáp qua vùng đáp án (cảm hứng: Mario Paint).
 * Design: quick-spec mục 10 (bench/b — oil-paint, động tác "vuốt").
 * G2: mixed {shape2d, sequence, count}; kind lạ → hiện tĩnh q.text/q.visual,
 * vẫn giữ 3 vùng đáp án, không tự nộp.
 * Edge: nét đi qua 2 vùng → vùng đầu tiên đi vào thắng; locked chặn lần 2.
 * Nét ngắn dưới strokeMinPx coi là chạm, KHÔNG nộp (chỉ nhắc vuốt dài thêm).
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioPaint = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'mario-paint';

  function shape(kind, size, label) {
    if (KM.Visuals && typeof KM.Visuals.shapeSvg === 'function') {
      return KM.Visuals.shapeSvg(kind, { size: size || 62, label: label || kind });
    }
    return K.node('span', { text: '🔷', 'aria-hidden': 'true' });
  }

  function clearStroke(k) {
    while (k.stroke.firstChild) {
      k.stroke.removeChild(k.stroke.firstChild);
    }
    k.firstZone = null;
    k.startX = 0;
    k.startY = 0;
    k.drawing = false;
  }

  function zoneAt(k, target) {
    var zone = K.closestData(target, k.zones, 'data-zone');
    return zone || null;
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b9',
      tribute: 'Mario Paint',
      prefix: 'mpaint',
      hint: 'Bé vuốt ngón qua một vùng màu rồi nhấc tay lên nhé!',

      build: function (k) {
        var canvas = K.node('div', {
          'class': 'mpaint-canvas',
          'style': {
            position: 'relative', 'min-height': '220px', 'border-radius': '22px',
            background: '#fffdf8', border: '4px solid #b98c5a',
            padding: '8px', overflow: 'hidden'
          }
        });
        var visual = K.node('div', {
          'class': 'mpaint-visual',
          'style': {
            display: 'flex', 'flex-wrap': 'wrap', gap: '4px',
            'align-items': 'center', 'justify-content': 'center',
            'min-height': '64px'
          }
        });
        var zones = K.node('div', {
          'class': 'mpaint-zones',
          'style': {
            position: 'relative', 'z-index': '3', display: 'flex', 'flex-wrap': 'wrap',
            gap: '10px', 'justify-content': 'center', 'align-items': 'center',
            'min-height': '112px'
          }
        });
        var stroke = K.node('div', {
          'class': 'mpaint-stroke', 'aria-hidden': 'true',
          'style': { position: 'absolute', inset: '0', 'z-index': '2', 'pointer-events': 'none' }
        });

        canvas.appendChild(visual);
        canvas.appendChild(zones);
        canvas.appendChild(stroke);

        k.canvas = canvas;
        k.visual = visual;
        k.zones = zones;
        k.stroke = stroke;
        k.firstZone = null;
        k.startX = 0;
        k.startY = 0;
        k.drawing = false;

        function dot(event) {
          var rect;
          var mark;
          if (k.reduced) {
            return;
          }
          rect = canvas.getBoundingClientRect();
          mark = K.node('span', {
            'aria-hidden': 'true',
            'style': {
              position: 'absolute',
              left: (event.clientX - rect.left - 10) + 'px',
              top: (event.clientY - rect.top - 10) + 'px',
              width: '20px', height: '20px', 'border-radius': '50%',
              background: 'rgba(210,84,64,0.55)'
            }
          });
          stroke.appendChild(mark);
        }

        k.track(zones, 'pointerdown', function (event) {
          var zone = zoneAt(k, event.target);
          k.drawing = true;
          k.firstZone = zone;
          k.startX = event.clientX;
          k.startY = event.clientY;
          if (zone) {
            dot(event);
          }
        });

        k.track(zones, 'pointermove', function (event) {
          var zone;
          if (!k.drawing) {
            return;
          }
          zone = zoneAt(k, event.target);
          if (zone && !k.firstZone) {
            k.firstZone = zone; // vùng đầu tiên đi vào thắng.
          }
          dot(event);
        });

        k.track(zones, 'pointerup', function (event) {
          var zone;
          var distance;
          if (!k.drawing) {
            return;
          }
          zone = k.firstZone || zoneAt(k, event.target);
          distance = Math.sqrt(
            Math.pow(event.clientX - k.startX, 2) + Math.pow(event.clientY - k.startY, 2)
          );
          k.drawing = false;
          if (!zone) {
            clearStroke(k);
            return;
          }
          if (distance < k.tune(['strokeMinPx'], 40)) {
            clearStroke(k);
            k.hint('Bé vuốt dài thêm một chút nhé!');
            return;
          }
          k.answer(zone.getAttribute('data-value')); // locked chặn vùng thứ 2.
          k.later(function () { clearStroke(k); }, 260);
        });

        k.track(zones, 'pointercancel', function () {
          clearStroke(k);
        });

        k.add(canvas);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var kind = q && q.kind;
        var supported = ['shape2d', 'sequence', 'count'].indexOf(kind) >= 0;
        var isShape = !!(q && q.choiceRender === 'shape');
        var items = (q && q.visual && q.visual.items) || [];
        var values = (q && q.visual && q.visual.values) || [];
        var groups = (q && q.visual && q.visual.groups) || [];
        var i;

        clearStroke(k);
        k.visual.textContent = '';
        while (k.zones.firstChild) {
          k.zones.removeChild(k.zones.firstChild);
        }

        if (!supported) {
          k.visual.appendChild(K.node('p', {
            text: (q && q.text) || '',
            'style': { 'text-align': 'center', 'font-weight': '700', margin: '2px' }
          }));
        } else if (values.length) {
          values.forEach(function (value) {
            k.visual.appendChild(K.node('span', {
              text: value == null ? '?' : String(value),
              'aria-hidden': 'true',
              'style': {
                'min-width': '44px', 'min-height': '44px', padding: '4px 8px',
                display: 'inline-grid', 'place-items': 'center',
                background: '#fff', 'border-radius': '12px', 'font-weight': '900'
              }
            }));
          });
        } else if (items.length) {
          items.forEach(function (item) {
            k.visual.appendChild(shape(item.shape, item.size || 52, item.shape));
          });
        } else if (groups.length) {
          groups.forEach(function (group) {
            k.visual.appendChild(K.node('span', {
              text: (group.glyph || '⭐') + ' ' + (group.count || 0),
              'aria-hidden': 'true', 'style': { 'font-size': '1.3rem', padding: '2px 6px' }
            }));
          });
        }

        for (i = 0; i < choices.length; i += 1) {
          (function (choice, at) {
            var label = choice.label != null ? String(choice.label) : String(choice.value);
            var content = isShape && choice.shape
              ? [shape(choice.shape, 72, choice.aria || label)]
              : [label];
            k.zones.appendChild(k.btn({
              'class': 'mpaint-zone',
              'data-zone': String(at),
              'data-value': String(choice.value),
              'aria-label': 'Vùng ' + (at + 1) + ': ' + (choice.aria || label) + '. Vuốt qua để chọn',
              'style': {
                'min-width': String(k.tune(['zoneSizePx'], 112)) + 'px',
                'min-height': String(k.tune(['zoneSizePx'], 112)) + 'px',
                'border-radius': '20px', background: '#ffe9c7',
                'touch-action': 'none', display: 'grid', 'place-items': 'center'
              }
            }, content));
          }(choices[i], i));
        }
      },

      onWrong: function (k) {
        clearStroke(k);
        k.hint('Canvas trắng lại rồi. Bé vuốt lại vùng đúng nhé!');
      }
    });
  }

  KM.Games.marioPaint = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
