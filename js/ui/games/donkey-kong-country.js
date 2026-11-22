/**
 * Minigame bài `b2` — leo thang hái chuối (cảm hứng: Donkey Kong Country).
 * Design: quick-spec mục 03 (rail/b — trục dọc, mỗi nấc là 1 đồ vật, động tác "leo").
 * Chạm nấc kế tiếp mới được leo; chạm nấc #k khi chưa leo #k−1 → bỏ qua.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.donkeyKongCountry = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'donkey-kong-country';

  function rungCount(q, k) {
    var groups = q && q.visual && q.visual.groups;
    var n = groups && groups.length && typeof groups[0].count === 'number'
      ? groups[0].count
      : (q && typeof q.answer === 'number' ? q.answer : 0);
    n = Math.max(0, Math.min(12, Math.round(n)));
    var cap = Math.max(10, k.tune(['maxRungs'], 10));
    return Math.min(cap, n);
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b2',
      tribute: 'Donkey Kong Country',
      prefix: 'dk',
      hint: 'Chạm từng nấc thang từ dưới lên để leo hái chuối nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'dk-board',
          'style': {
            position: 'relative',
            display: 'flex',
            'flex-direction': 'column-reverse',
            'align-items': 'center',
            gap: '3px',
            'min-height': '168px',
 'max-height': '212px',
            'overflow-y': 'auto',
            padding: '4px 0'
          }
        });
        var rungs = K.node('div', {
          'class': 'dk-rungs',
          'style': {
            display: 'flex',
            'flex-direction': 'column-reverse',
            'align-items': 'center',
            gap: '3px'
          }
        });
        var done = k.btn({
          'class': 'dk-done',
          'aria-label': 'Đã hái xong, nộp số chuối',
          text: '🍌 Đã hái xong',
          'style': {
            display: 'none',
            'min-height': '64px',
            background: '#ffd166',
            color: '#5a3a00'
          }
        });
        board.appendChild(rungs);
        board.appendChild(done);
        k.rungs = rungs;
        k.doneBtn = done;
        k.climbed = 0;
        k.totalRungs = 0;

        k.track(rungs, 'click', function (event) {
          var target = K.closestData(event.target, rungs, 'data-rung');
          if (!target || k.doneBtn && k.climbed >= k.totalRungs) {
            return;
          }
          var index = parseInt(target.getAttribute('data-rung'), 10);
          if (isNaN(index) || index !== k.climbed) {
            k.hint('Bé leo nấc tiếp theo thôi nhé!');
            return;
          }
          target.classList.add('is-climbed');
          if (!k.reduced) {
            target.style.transition = 'transform 260ms ease';
            target.style.transform = 'translateX(8px)';
            k.later(function () { target.style.transform = ''; }, 260);
          }
          k.climbed += 1;
          if (k.climbed >= k.totalRungs) {
            k.doneBtn.style.display = '';
            k.hint('Đã hái đủ ' + k.climbed + ' quả. Bé bấm "Đã hái xong" nhé!');
          } else {
            k.hint('Đã leo ' + k.climbed + ' nấc rồi, leo tiếp nhé!');
          }
        });
        k.track(done, 'click', function () {
          k.answer(k.climbed);
        });
        k.add(board);
      },

      render: function (k, q) {
        var total = rungCount(q, k);
        var groups = q && q.visual && q.visual.groups;
        var glyph = groups && groups[0] && groups[0].glyph ? groups[0].glyph : '🍌';
        var i;
        k.totalRungs = total;
        k.climbed = 0;
        k.doneBtn.style.display = total === 0 ? '' : 'none';
        while (k.rungs.firstChild) {
          k.rungs.removeChild(k.rungs.firstChild);
        }
        for (i = 0; i < total; i += 1) {
          (function (index) {
            var rung = k.btn({
              'class': 'dk-rung',
              'data-rung': String(index),
              'aria-label': 'Leo nấc thứ ' + (index + 1) + ' trong số ' + total,
              'style': {
                'min-width': '76px',
                'min-height': '64px',
                background: index === 0 ? '#c98a4b' : '#e3ad6b',
                color: '#4a2f12',
                'font-size': '1.5rem'
              }
            }, [glyph]);
            K.reducedClass(rung, k.reduced);
            k.rungs.appendChild(rung);
          }(i));
        }
      },

      onWrong: function (k) {
        k.climbed = 0;
        k.doneBtn.style.display = k.totalRungs === 0 ? '' : 'none';
        var rungs = k.rungs.querySelectorAll('.dk-rung');
        var i;
        for (i = 0; i < rungs.length; i += 1) {
          rungs[i].classList.remove('is-climbed');
          rungs[i].style.transform = '';
        }
        k.hint('Chưa đúng, bé leo lại từ nấc đầu nhé!');
      }
    });
  }

  KM.Games.donkeyKongCountry = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
