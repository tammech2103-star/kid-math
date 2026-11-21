/**
 * Màn hình kết quả: xe thưởng cỡ lớn, sao, confetti và các bước tiếp theo.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.result = (function () {
  'use strict';

  var el = KM.Components.el;
  var Components = KM.Components;

  /**
   * @param {object} ctx
   * @param {{lessonId: string, summary: object, record: object}} params
   * @returns {object} screen handle
   */
  function resultScreen(ctx, params) {
    if (!params || !params.summary || !params.lessonId) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }

    var summary = params.summary;
    var record = params.record || { stars: summary.stars, isNewBest: false, nextLessonId: null };
    var lesson = ctx.curriculum.getLesson(params.lessonId);
    if (!lesson) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }
    var stars = Math.max(1, Math.min(3, record.stars || summary.stars || 1));
    var runStars = Math.max(1, Math.min(3, summary.stars || 1));
    var race = params.race || null;
    var place = race ? race.playerPlace : 0;
    var title = race
      ? (place === 1 ? 'Vô địch! Bé giỏi quá!' : 'Bé về đích hạng ' + place + '!')
      : (stars === 3
        ? 'Tuyệt vời! Bé giỏi quá!'
        : (stars === 2 ? 'Giỏi lắm! Bé cố thêm chút nữa nhé!' : 'Bé đã hoàn thành bài!'));

    var screen = el('div', { class: 'screen result' });
    var nextLesson = record.nextLessonId ? ctx.curriculum.getLesson(record.nextLessonId) : null;
    var nextUnlocked = nextLesson ? ctx.progress.isUnlocked(nextLesson.id) : false;

    var actions = [];
    if (nextLesson && nextUnlocked) {
      actions.push(el('button', {
        class: 'btn btn-primary btn-xl',
        type: 'button',
        on: {
          click: function () {
            ctx.audio.tap();
            ctx.navigate('lesson', { lessonId: nextLesson.id });
          }
        }
      }, ['▶ Bài tiếp: ' + nextLesson.label]));
    } else {
      actions.push(el('button', {
        class: 'btn btn-primary btn-xl',
        type: 'button',
        on: {
          click: function () {
            ctx.audio.tap();
            ctx.navigate('home');
          }
        }
      }, ['🏠 Về nhà']));
    }
    actions.push(el('button', {
      class: 'btn btn-soft',
      type: 'button',
      on: {
        click: function () {
          ctx.audio.tap();
          ctx.navigate('lesson', { lessonId: lesson.id });
        }
      }
    }, ['↻ Chơi lại']));
    if (nextLesson && nextUnlocked) {
      actions.push(el('button', {
        class: 'btn btn-ghost',
        type: 'button',
        on: {
          click: function () {
            ctx.audio.tap();
            ctx.navigate('home');
          }
        }
      }, ['Chọn bài khác']));
    }

    var titleNode = el('h1', {
      class: 'result-title',
      tabindex: '-1',
      text: title
    });

    var podium = null;
    if (race) {
      podium = el('div', { class: 'result-podium' }, [
        el('span', { class: 'result-podium-title', text: 'Kết quả cuộc đua' }),
        el('div', { class: 'podium-row' }, race.racers.map(function (racer) {
          return el('div', {
            class: 'podium-card' + (racer.isPlayer ? ' is-player' : '')
          }, [
            el('span', { class: 'podium-place', text: '#' + racer.place }),
            el('img', {
              class: 'podium-thumb',
              src: racer.src,
              alt: '',
              loading: 'eager',
              draggable: 'false'
            }),
            el('span', { class: 'podium-name', text: racer.name })
          ]);
        }))
      ]);
    }

    var card = el('div', { class: 'result-card' }, [
      el('span', { class: 'result-eyebrow', text: lesson.label + ' · Trang ' + lesson.page }),
      race
        ? el('span', {
          class: 'result-place',
          text: place === 1 ? '🏆 Hạng nhất' : '🏁 Hạng ' + place
        })
        : null,
      titleNode,
      el('p', { class: 'result-lesson', text: lesson.title }),
      el('div', { class: 'result-car-wrap' }, [
        el('span', { class: 'speed-line speed-line-a', 'aria-hidden': 'true' }),
        el('span', { class: 'speed-line speed-line-b', 'aria-hidden': 'true' }),
        el('span', { class: 'speed-line speed-line-c', 'aria-hidden': 'true' }),
        el('img', {
          class: 'result-car',
          src: Components.CAR_SRC,
          alt: 'Chiếc xe đua chúc mừng bé hoàn thành bài',
          draggable: 'false'
        })
      ]),
      el('div', { class: 'result-stars' }, [
        Components.stars(stars, { animate: true })
      ]),
      el('p', {
        class: 'result-stats',
        text: 'Đúng ngay lần đầu: ' + summary.firstTryCorrect + '/' + summary.total +
          ' · Chuỗi đúng dài nhất: ' + summary.bestStreak
      }),
      runStars < stars
        ? el('p', {
          class: 'result-run-stars',
          text: 'Lần này: ' + runStars + ' sao · Kỷ lục của bé: ' + stars + ' sao'
        })
        : null,
      record.isNewBest
        ? el('span', { class: 'result-record', text: '🏆 Kỷ lục mới của bé!' })
        : null,
      podium,
      el('div', { class: 'result-actions' }, actions),
      el('p', {
        class: 'result-total',
        text: 'Tổng cộng: ' + ctx.progress.totalStars() + '/' + ctx.progress.maxStars() + ' sao'
      })
    ]);

    screen.appendChild(card);
    ctx.root.appendChild(screen);
    titleNode.focus({ preventScroll: true });

    ctx.audio.win();
    Components.confetti(screen, Math.min(ctx.tuning.confetti.maxCount, Math.round(ctx.tuning.confetti.count * 1.3)), 3200);

    var message;
    if (race) {
      var placeWord = place === 1 ? 'nhất' : (place === 2 ? 'hai' : (place === 3 ? 'ba' : 'tư'));
      message = place === 1
        ? 'Vô địch! Bé về đích hạng nhất. Giỏi quá!'
        : 'Bé về đích hạng ' + placeWord + '. Giỏi lắm!';
    } else {
      message = runStars === stars
        ? (stars === 3
          ? 'Tuyệt vời! Bé đạt ba sao. Bé giỏi quá!'
          : (stars === 2
            ? 'Giỏi lắm! Bé đạt hai sao. Cố thêm chút nữa nhé!'
            : 'Bé đã hoàn thành bài học. Giỏi lắm!'))
        : 'Bé đã hoàn thành bài. Kỷ lục của bé là ' + stars + ' sao. Cố thêm nhé!';
    }
    var speechTimer = window.setTimeout(function () {
      ctx.speech.speak(message);
    }, ctx.tuning.timing.resultSpeakDelayMs);

    return {
      destroy: function () {
        window.clearTimeout(speechTimer);
        ctx.speech.stop();
      }
    };
  }

  return resultScreen;
}());
