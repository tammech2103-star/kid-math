/**
 * Minigame bài `b4` — mở nắp rương quanh ổ khoá (cảm hứng: The Legend of Zelda).
 * Design: quick-spec mục 05 (book/a — 3 rương theo cung ~120°, động tác "mở").
 * TUYỆT ĐỐI không vẽ tai nhọn / áo xanh / glyph > < = khi choiceRender === 'number'.
 * Art tự sinh bằng CSS + emoji, không copy tài sản Nintendo.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.zelda = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'zelda';
  var SEATS = [
    { left: '6%', top: '10%' },
    { left: '38%', top: '48%' },
    { left: '70%', top: '10%' }
  ];

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b4',
      tribute: 'The Legend of Zelda',
      prefix: 'zd',
      hint: 'Chạm nắp rương để mở và chọn đáp án nhé!',

      build: function (k) {
        var book = K.node('div', {
          'class': 'zd-book',
          'style': {
            position: 'relative',
            'min-height': '168px',
            'border-radius': '20px',
            background: 'linear-gradient(90deg, #fff6df 0 48%, #f0d7a8 49% 51%, #fff9ec 52% 100%)',
            border: '3px solid #d9b989'
          }
        });
        var lock = K.node('div', {
          'class': 'zd-lock',
          'aria-hidden': 'true',
          text: '🔒',
          'style': {
            position: 'absolute',
            left: 'calc(50% - 22px)',
            top: '44%',
            'font-size': '2.4rem',
            'z-index': '1'
          }
        });
        var chests = K.node('div', {
          'class': 'zd-chests',
          'style': { position: 'absolute', inset: '0' }
        });
        book.appendChild(lock);
        book.appendChild(chests);
        k.book = book;
        k.lock = lock;
        k.chests = chests;

        k.track(chests, 'click', function (event) {
          var chest = K.closestData(event.target, chests, 'data-chest');
          if (!chest) {
            return;
          }
          var lid = chest.querySelector('.zd-lid');
          if (lid) {
            lid.classList.add('is-open');
          }
          k.answer(chest.getAttribute('data-value'));
        });
        k.add(book);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var isNumber = q && q.choiceRender === 'number';
        var i;
        k.lock.textContent = '🔒';
        k.lock.style.transform = '';
        while (k.chests.firstChild) {
          k.chests.removeChild(k.chests.firstChild);
        }
        for (i = 0; i < choices.length && i < SEATS.length; i += 1) {
          (function (choice, seat, index) {
            var value = choice.value;
            var label = choice.label != null ? String(choice.label) : String(value);
            var lid = K.node('span', {
              'class': 'zd-lid',
              'aria-hidden': 'true',
              text: '▤',
              'style': {
                display: 'block',
                'font-size': '1.5rem',
                'line-height': '1',
                'transform-origin': '50% 100%'
              }
            });
            var chest = k.btn({
              'class': 'zd-chest',
              'data-chest': String(index),
              'data-value': String(value),
              'aria-label': isNumber
                ? 'Mở rương số ' + label
                : 'Mở rương ' + (choice.aria || label),
              'style': {
                position: 'absolute',
                left: seat.left,
                top: seat.top,
                'min-width': '84px',
                'min-height': '84px',
                'border-radius': '18px 18px 10px 10px',
                background: 'linear-gradient(180deg, #f6c46b, #d18938)',
                color: '#593400',
                'font-size': 'clamp(1.1rem, 3.4vw, 1.6rem)'
              }
            }, [lid, K.node('span', {
              'class': 'zd-answer',
              text: label,
              'aria-hidden': 'true'
            })]);
            K.reducedClass(chest, k.reduced);
            k.chests.appendChild(chest);
          }(choices[i], SEATS[i], i));
        }
      },

      onWrong: function (k) {
        k.hint('Chưa đúng, nắp rương đã đóng lại. Bé mở rương khác nhé!');
        var lids = k.chests.querySelectorAll('.zd-lid');
        var i;
        for (i = 0; i < lids.length; i += 1) {
          lids[i].classList.remove('is-open');
        }
        if (!k.reduced) {
          k.lock.style.transform = 'rotate(-8deg)';
          k.later(function () { k.lock.style.transform = ''; }, 260);
        }
      }
    });
  }

  KM.Games.zelda = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
