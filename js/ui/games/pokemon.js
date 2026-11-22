/**
 * Minigame bài `b3` — quây lưới một nhóm sinh vật (cảm hứng: Pokémon).
 * Design: quick-spec mục 04 (arena/b — 2 cụm rời rạc, không lưới/không trục, động tác "quây").
 * Nhãn 3 đích lấy từ question.choices (left/right/equal), không hardcode.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.pokemon = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'pokemon';
  var SPOTS = [
    [12, 18], [34, 12], [58, 20], [78, 14], [20, 52],
    [46, 46], [68, 56], [86, 48], [12, 76], [38, 78],
    [62, 80], [84, 74]
  ];

  function choiceBy(choices, value) {
    var i;
    for (i = 0; i < choices.length; i += 1) {
      if (choices[i] && choices[i].value === value) {
        return choices[i];
      }
    }
    return null;
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b3',
      tribute: 'Pokémon',
      prefix: 'pk',
      hint: 'Chạm vào một cụm để thả lưới vây, hoặc chạm "Bằng nhau" nhé!',

      build: function (k) {
        var field = K.node('div', {
          'class': 'pk-field',
          'style': {
            position: 'relative',
            'min-height': '168px',
            'border-radius': '22px',
            background: 'linear-gradient(180deg, #fdf6e8, #eaf6dd)'
          }
        });
        var left = K.node('div', {
          'class': 'pk-cluster',
          'data-cluster': 'left',
          'style': { position: 'absolute', left: '4%', top: '12%', width: '43%', height: '76%' }
        });
        var right = K.node('div', {
          'class': 'pk-cluster',
          'data-cluster': 'right',
          'style': { position: 'absolute', right: '4%', top: '12%', width: '43%', height: '76%' }
        });
        var net = K.node('div', {
          'class': 'pk-net',
          'aria-hidden': 'true',
          'style': {
            position: 'absolute',
            left: '4%',
            top: '12%',
            width: '43%',
            height: '76%',
            border: '4px dashed #2d7d9a',
            'border-radius': '46% 54% 48% 52%',
            'pointer-events': 'none',
            'z-index': '3'
          }
        });
        var equalWrap = K.node('div', {
          'class': 'pk-equal-wrap',
          'style': {
            position: 'absolute',
            left: 'calc(50% - 50px)',
            bottom: '4px',
            'z-index': '4'
          }
        });
        field.appendChild(left);
        field.appendChild(right);
        field.appendChild(net);
        field.appendChild(equalWrap);
        k.field = field;
        k.left = left;
        k.right = right;
        k.net = net;
        k.equalWrap = equalWrap;

        k.track(field, 'click', function (event) {
          var cluster = K.closestData(event.target, field, 'data-cluster');
          var isEqual = K.closestData(event.target, field, 'data-equal');
          if (cluster) {
            var side = cluster.getAttribute('data-cluster');
            k.net.style.left = side === 'left' ? '4%' : '53%';
            if (!k.reduced) {
              k.net.style.transition = 'transform 260ms ease';
              k.net.style.transform = 'scale(1.06)';
              k.later(function () { k.net.style.transform = ''; }, 260);
            }
            k.hint('Đã quây nhóm ' + (side === 'left' ? '1' : '2') + '!');
            k.answer(side);
            return;
          }
          if (isEqual) {
            k.answer('equal');
            return;
          }
          if (!k.reduced && !k.locked) {
            k.net.style.transition = 'transform 220ms ease';
            k.net.style.transform = 'translateY(-6px)';
            k.later(function () { k.net.style.transform = ''; }, 220);
          }
          k.hint('Bé thả lưới trúng một cụm hoặc nút giữa nhé');
        });
        k.add(field);
      },

      render: function (k, q) {
        var groups = q && q.visual && q.visual.groups || [];
        var choices = (q && q.choices) || [];
        var equal = choiceBy(choices, 'equal');
        var i;
        k.net.style.transform = '';
        k.left.textContent = '';
        k.right.textContent = '';
        [[k.left, groups[0]], [k.right, groups[1]]].forEach(function (pair) {
          var host = pair[0];
          var group = pair[1];
          var count = group && typeof group.count === 'number' ? group.count : 0;
          var glyph = group && group.glyph ? group.glyph : '⭐';
          for (i = 0; i < count && i < SPOTS.length; i += 1) {
            host.appendChild(K.node('span', {
              'class': 'pk-critter',
              text: glyph,
              'aria-hidden': 'true',
              'style': {
                position: 'absolute',
                left: SPOTS[i][0] + '%',
                top: SPOTS[i][1] + '%',
                'font-size': 'clamp(1.3rem, 3.6vw, 2rem)',
                'line-height': '1'
              }
            }));
          }
        });
        while (k.equalWrap.firstChild) {
          k.equalWrap.removeChild(k.equalWrap.firstChild);
        }
        if (equal) {
          k.equalWrap.appendChild(k.btn({
            'class': 'pk-equal',
            'data-equal': '1',
            'aria-label': 'Chọn ' + (equal.label || 'Bằng nhau'),
            text: equal.icon ? equal.icon + ' ' + (equal.label || '') : (equal.label || '='),
            'style': {
              'min-width': '92px',
              background: '#fff3c4',
              color: '#6b4a00'
            }
          }));
        }
      },

      onWrong: function (k) {
        k.hint('Chưa đúng, bé thả lưới lại nhé!');
        k.net.style.left = '4%';
        if (!k.reduced) {
          k.net.style.transform = 'scale(0.92)';
          k.later(function () { k.net.style.transform = ''; }, 260);
        }
      }
    });
  }

  KM.Games.pokemon = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
