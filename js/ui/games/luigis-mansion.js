/**
 * Minigame bài `b11` — hút bóng vào máy hút (cảm hứng: Luigi's Mansion).
 * Design: quick-spec mục 12 (book/b — ink-wash, động tác "hút").
 * subtract: first = groups[0].count, second = groups[0].crossedOut.
 * Dừng đúng second; remaining = first - vacuumed → nộp.
 * Edge: second === first → nút "👻 0 — Hết bóng rồi" hiện, bấm → onAnswer(0).
 * Edge: hút vượt second → chặn, nhắc "Bé hút đủ X cái thôi nhé", không nộp sai.
 * Reduced motion: bóng mờ dần tại chỗ, KHÔNG xoáy.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.luigisMansion = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'luigis-mansion';

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b11',
      tribute: "Luigi's Mansion",
      prefix: 'lm',
      hint: 'Bé chạm từng bóng để hút. Hút đủ số bóng bị gạch thì dừng nhé!',

      build: function (k) {
        var room = K.node('div', {
          'class': 'lm-room',
          'style': {
            position: 'relative', 'min-height': '250px', 'border-radius': '22px',
            background: 'linear-gradient(180deg, #f3f0ff, #ded6f3)',
            border: '3px solid #a99bc9', overflow: 'hidden'
          }
        });
        var swirl = K.node('div', {
          'class': 'lm-swirl', 'aria-hidden': 'true',
          'style': {
            position: 'absolute', left: 'calc(50% - 84px)', top: 'calc(50% - 84px)',
            width: '168px', height: '168px', 'border-radius': '50%',
            border: '6px dashed rgba(120,100,170,0.35)', 'z-index': '1'
          }
        });
        var balls = K.node('div', {
          'class': 'lm-balls',
          'style': { position: 'absolute', inset: '0', 'z-index': '2' }
        });
        var finish = k.btn({
          'class': 'lm-finish',
          'style': {
            position: 'absolute', left: 'calc(50% - 110px)', bottom: '10px',
            width: '220px', 'min-height': '64px', 'border-radius': '18px',
            background: '#fffdf4', color: '#4b3575', 'font-size': '1.1rem',
            display: 'none'
          }
        });

        room.appendChild(swirl);
        room.appendChild(balls);
        room.appendChild(finish);

        k.room = room;
        k.balls = balls;
        k.swirl = swirl;
        k.finish = finish;
        k.first = 0;
        k.second = 0;
        k.vacuumed = 0;
        k.remaining = 0;

        k.resetScene = function (q) {
          var groups = (q && q.visual && q.visual.groups) || [];
          var group = groups[0] || {};
          var first = Number(group.count || 0);
          var second = Number(group.crossedOut || 0);
          var i;
          k.first = first;
          k.second = Math.min(second, first);
          k.vacuumed = 0;
          k.remaining = first;
          k.finish.style.display = 'none';
          while (k.balls.firstChild) {
            k.balls.removeChild(k.balls.firstChild);
          }
          if (!k.reduced) {
            k.swirl.style.display = '';
          } else {
            k.swirl.style.display = 'none';
            k.balls.style.display = 'flex';
            k.balls.style.flexWrap = 'wrap';
            k.balls.style.gap = '6px';
            k.balls.style.alignContent = 'center';
            k.balls.style.justifyContent = 'center';
            k.balls.style.padding = '10px 44px 78px';
          }
          for (i = 0; i < first; i += 1) {
            (function (at) {
              var ball = k.btn({
                'class': 'lm-ball',
                'data-ball': String(at),
                'aria-label': 'Bóng thứ ' + (at + 1) + ', chạm để hút',
                'style': {
                  'min-width': '64px', 'min-height': '64px', 'border-radius': '50%',
                  background: '#ffffff', color: '#6a4fa0', 'font-size': '1.4rem'
                }
              }, ['👻']);
              if (!k.reduced) {
                var angle = (at / Math.max(1, first)) * Math.PI * 2 * k.tune(['spiralTurns'], 1);
                var radius = 28 + (at % 5) * 9;
                ball.style.position = 'absolute';
                ball.style.left = 'calc(50% - 32px + ' + (Math.cos(angle) * radius) + 'px)';
                ball.style.top = 'calc(50% - 32px + ' + (Math.sin(angle) * radius) + 'px)';
              }
              k.balls.appendChild(ball);
            }(i));
          }
          if (k.second === 0) {
            k.showFinish();
          }
        };

        k.showFinish = function () {
          k.remaining = k.first - k.vacuumed;
          k.finish.textContent = '👻 ' + k.remaining + (k.remaining === 0 ? ' — Hết bóng rồi' : ' — Xong rồi');
          k.finish.setAttribute('aria-label', 'Chọn ' + k.remaining + ' bóng còn lại');
          k.finish.style.display = '';
        };

        k.track(k.balls, 'click', function (event) {
          var ball = K.closestData(event.target, k.balls, 'data-ball');
          if (!ball || ball.getAttribute('data-vacuumed') === 'true') {
            return;
          }
          if (k.vacuumed >= k.second) {
            k.hint('Bé hút đủ ' + k.second + ' cái thôi nhé.');
            return;
          }
          ball.setAttribute('data-vacuumed', 'true');
          if (k.reduced) {
            ball.style.opacity = '0';
            k.later(function () { if (ball.parentNode) { ball.style.display = 'none'; } },
              k.tune(['suckMs'], 300));
          } else {
            ball.style.transition = 'transform 300ms ease, opacity 300ms ease';
            ball.style.transform = 'scale(0.2)';
            ball.style.opacity = '0';
            k.later(function () { if (ball.parentNode) { ball.style.display = 'none'; } }, 300);
          }
          k.vacuumed += 1;
          if (k.vacuumed === k.second) {
            if (k.first - k.vacuumed === 0) {
              k.showFinish();
            } else {
              k.answer(k.first - k.vacuumed);
            }
          }
        });

        k.track(k.finish, 'click', function () {
          k.answer(k.first - k.vacuumed);
        });

        k.add(room);
      },

      render: function (k, q) {
        k.resetScene(q);
      },

      onWrong: function (k) {
        k.resetScene(k.q);
        k.hint('Bóng về lại vòng rồi. Bé hút đúng số bóng bị gạch nhé!');
      }
    });
  }

  KM.Games.luigisMansion = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
