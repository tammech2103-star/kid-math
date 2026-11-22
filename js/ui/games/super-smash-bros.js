/**
 * Minigame bài `b17` — đấm cờ trên bệ (cảm hứng: Super Smash Bros.).
 * Design: quick-spec mục 18 (arena/d — neon-vector, động tác "đấm").
 * G2: mixed {count, compareSign, sequence, compose}; cờ mang choice.label
 * (số HOẶC dấu) — KHÔNG tự đổi dấu thành số.
 * Edge: chạm bệ trống (không có cờ) → nhân vật nhảy tại chỗ, không nộp.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.superSmashBros = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'super-smash-bros';

  function contextStrip(q) {
    var wrap = K.node('div', {
      'style': {
        display: 'flex', 'flex-wrap': 'wrap', gap: '4px',
        'align-items': 'center', 'justify-content': 'center', 'min-height': '48px'
      }
    });
    var values = q && q.visual && q.visual.values;
    var groups = q && q.visual && q.visual.groups;
    var tokens = q && q.equation && q.equation.tokens;
    if (values) {
      values.forEach(function (value) {
        wrap.appendChild(K.node('span', {
          text: value == null ? '?' : String(value), 'aria-hidden': 'true',
          'style': {
            'min-width': '40px', 'min-height': '40px', padding: '2px 6px',
            display: 'grid', 'place-items': 'center', 'border-radius': '10px',
            background: '#ffffff', color: '#2b2450', 'font-weight': '900'
          }
        }));
      });
      return wrap;
    }
    if (groups && groups.length) {
      groups.forEach(function (group) {
        wrap.appendChild(K.node('span', {
          text: (group.glyph || '⭐') + ' ' + (group.count || 0), 'aria-hidden': 'true',
          'style': { 'font-size': '1.2rem', padding: '2px 6px' }
        }));
      });
      return wrap;
    }
    if (tokens) {
      tokens.forEach(function (token) {
        wrap.appendChild(K.node('span', {
          text: token.type === 'slot' ? '?' : String(token.value), 'aria-hidden': 'true',
          'style': { 'font-weight': '900', 'font-size': '1.2rem', padding: '2px 6px' }
        }));
      });
      return wrap;
    }
    wrap.appendChild(K.node('span', {
      text: (q && q.text) || '', 'style': { 'font-weight': '700' }
    }));
    return wrap;
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b17',
      tribute: 'Super Smash Bros.',
      prefix: 'ssb',
      hint: 'Bé chạm cờ đáp án để nhân vật nhảy lên và đấm nhé!',

      build: function (k) {
        var arena = K.node('div', {
          'class': 'ssb-arena',
          'style': {
            position: 'relative', 'min-height': '270px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #2b2450, #46366f)',
            border: '3px solid #8e6ce0', padding: '6px', overflow: 'hidden'
          }
        });
        var info = K.node('div', {
          'class': 'ssb-info',
          'style': { position: 'relative', 'z-index': '2', 'min-height': '48px', color: '#fff' }
        });
        var platforms = K.node('div', {
          'class': 'ssb-platforms',
          'style': {
            position: 'relative', 'min-height': '160px', 'z-index': '2',
            display: 'flex', 'align-items': 'flex-end', gap: '6px',
            'justify-content': 'center', padding: '4px 2px'
          }
        });
        var hero = K.node('div', {
          'class': 'ssb-hero', text: '🦸', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: '8%', top: '58%', 'font-size': '2.4rem',
            'z-index': '4', transition: k.reduced ? 'none' : 'left 320ms ease, top 320ms ease'
          }
        });

        arena.appendChild(info);
        arena.appendChild(platforms);
        arena.appendChild(hero);

        k.arena = arena;
        k.info = info;
        k.platforms = platforms;
        k.hero = hero;
        k.flags = [];

        k.track(k.platforms, 'click', function (event) {
          var flag = K.closestData(event.target, k.platforms, 'data-flag');
          var platform = flag ? flag.parentNode : K.closestData(event.target, k.platforms, 'data-platform');
          if (!platform) {
            return;
          }
          k.hero.style.left = platform.getAttribute('data-hero-left');
          k.hero.style.top = platform.getAttribute('data-hero-top');
          if (!flag) {
            k.hint('Bệ này trống. Bé chạm vào cờ có số nhé!');
            return;
          }
          if (!k.reduced) {
            flag.style.transform = 'scale(1.18)';
            k.later(function () { flag.style.transform = ''; }, 280);
          }
          k.answer(flag.getAttribute('data-value'));
        });

        k.add(arena);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var platformCount = Math.max(3, k.tune(['platformCount'], 3));
        var i;
        k.info.textContent = '';
        k.info.appendChild(contextStrip(q));
        while (k.platforms.firstChild) {
          k.platforms.removeChild(k.platforms.firstChild);
        }
        k.hero.style.left = '8%';
        k.hero.style.top = '58%';

        for (i = 0; i < platformCount; i += 1) {
          (function (at) {
            var choice = choices[at];
            var label = choice ? (choice.label != null ? String(choice.label) : String(choice.value)) : '';
            var left = (8 + at * 28) + '%';
            var top = (58 - (at % 2) * 12) + '%';
            var platform = K.node('div', {
              'class': 'ssb-platform',
              'data-platform': String(at),
              'style': {
                position: 'relative', 'min-width': '72px', 'min-height': '96px',
                'border-radius': '14px 14px 6px 6px',
                background: choice ? '#6b56a8' : '#423668',
                border: '3px solid #a98ce8', left: left, top: top,
                display: 'grid', 'place-items': 'center'
              }
            });
            if (choice) {
              var flag = k.btn({
                'class': 'ssb-flag',
                'data-flag': String(at),
                'data-value': String(choice.value),
                'aria-label': 'Cờ thứ ' + (at + 1) + ': ' + label,
                text: label,
                'style': {
                  'min-width': '72px', 'min-height': '72px', 'border-radius': '12px',
                  background: '#fff8d8', color: '#30245c', 'font-size': '1.5rem'
                }
              });
              platform.appendChild(flag);
            } else {
              platform.appendChild(K.node('span', {
                text: '·', 'aria-hidden': 'true', 'style': { 'font-size': '1.6rem', color: '#a98ce8' }
              }));
            }
            platform.style.position = 'relative';
            platform.style.left = '0';
            platform.style.top = '0';
            k.platforms.appendChild(platform);
            // Vị trí để nhân vật nhảy tới lưu riêng (không dùng display flex làm nguồn chân lý).
            platform.setAttribute('data-hero-left', left);
            platform.setAttribute('data-hero-top', top);
          }(i));
        }
      },

      onWrong: function (k) {
        k.hero.style.left = '8%';
        k.hero.style.top = '58%';
        if (!k.reduced) {
          Array.prototype.forEach.call(k.platforms.querySelectorAll('[data-flag]'), function (flag) {
            flag.style.transform = 'rotate(-8deg)';
            k.later(function () { flag.style.transform = ''; }, 300);
          });
        }
        k.hint('Nhân vật về bệ 1 rồi. Bé đấm cờ khác nhé!');
      }
    });
  }

  KM.Games.superSmashBros = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
