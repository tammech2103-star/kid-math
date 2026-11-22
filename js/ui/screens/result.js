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
    /*
     * ADR-0002: mảnh thưởng theo HOÀN THÀNH, không theo hạng nhất/nhì.
     * award() idempotent nên chơi lại không tăng số mảnh. ctx.puzzle chưa wired
     * thì bỏ qua êm để các đợt trước vẫn chạy.
     */
    var award = null;
    if (ctx.puzzle && typeof ctx.puzzle.award === 'function') {
      try {
        award = ctx.puzzle.award(params.lessonId);
      } catch (error) {
        award = null;
      }
    }
    var puzzleTotal = award && typeof ctx.puzzle.total === 'function'
      ? ctx.puzzle.total()
      : (ctx.curriculum && ctx.curriculum.lessons ? ctx.curriculum.lessons.length : 21);
    var puzzleTuning = ctx.tuning && ctx.tuning.puzzle ? ctx.tuning.puzzle : {};

    var stars = Math.max(1, Math.min(3, record.stars || summary.stars || 1));
    var runStars = Math.max(1, Math.min(3, summary.stars || 1));
    var race = params.race || null;
    var place = race ? race.playerPlace : 0;
    var lost = place > 1;
    var canReplay = ctx.progress.settings().allowRetry !== false;
    var title = race
      ? (lost
        ? 'Bé về đích thứ hai!'
        : 'Vô địch! Bé giỏi quá!')
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
    if (canReplay) {
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
    }
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
      class: 'result-title' + (lost ? ' is-loss' : ''),
      tabindex: '-1',
      text: title
    });

    var podium = null;
    if (race) {
      var ordered = race.racers.slice().sort(function (a, b) {
        return a.place - b.place;
      });
      var stage = el('div', { class: 'podium-stage' }, ordered.map(function (racer) {
        var step = el('div', {
          class: 'podium-step' + (racer.place === 1 ? ' is-first' : ' is-second') +
            (racer.isPlayer ? ' is-player' : '')
        }, [
          racer.place === 1
            ? el('span', { class: 'podium-crown', text: '🏆', 'aria-hidden': 'true' })
            : null,
          el('img', {
            class: 'podium-thumb',
            src: racer.src,
            alt: '',
            loading: 'eager',
            draggable: 'false'
          }),
          el('div', { class: 'podium-block' }, [
            racer.isPlayer
              ? el('span', { class: 'podium-you', text: 'BÉ', 'aria-hidden': 'true' })
              : null,
            el('span', { class: 'podium-place', text: String(racer.place) })
          ]),
          el('span', { class: 'podium-name', text: racer.name })
        ]);
        step.setAttribute('aria-label', racer.name + ', hạng ' + racer.place);
        return step;
      }));
      podium = el('div', { class: 'result-podium' }, [
        el('span', { class: 'result-podium-title', text: 'Bục trao thưởng' }),
        stage
      ]);
    }

    var revealHandle = null;
    var puzzleStrip = award && award.index >= 0
      ? el('div', { class: 'result-puzzle-strip', role: 'status', 'aria-live': 'polite' }, [
        el('span', { class: 'result-puzzle-target', text: '🧩', 'aria-hidden': 'true' }),
        el('span', {
          text: (award.added ? '🎉 Nhận mảnh ' : '🧩 Mảnh ') +
            String(award.index + 1 < 10 ? '0' : '') + (award.index + 1) + '/' + puzzleTotal +
            (award.added ? '! Bé xem bộ sưu tập nhé!' : ' đã có trong bộ sưu tập!')
        })
      ])
      : null;

    var card = el('div', { class: 'result-card' + (lost ? ' is-loss' : '') }, [
      el('span', { class: 'result-eyebrow', text: lesson.label + ' · Trang ' + lesson.page }),
      race
        ? el('span', {
          class: 'result-place' + (lost ? ' is-second' : ''),
          text: lost ? '🥈 Hạng hai' : '🏆 Hạng nhất'
        })
        : null,
      titleNode,
      el('p', { class: 'result-lesson', text: lesson.title }),
      el('div', { class: 'result-car-wrap' + (lost ? ' is-loss' : '') }, [
        lost ? null : el('span', { class: 'speed-line speed-line-a', 'aria-hidden': 'true' }),
        lost ? null : el('span', { class: 'speed-line speed-line-b', 'aria-hidden': 'true' }),
        lost ? null : el('span', { class: 'speed-line speed-line-c', 'aria-hidden': 'true' }),
        lost ? el('span', {
          class: 'loss-puff loss-puff-a',
          text: '💨',
          'aria-hidden': 'true'
        }) : null,
        lost ? el('span', {
          class: 'loss-puff loss-puff-b',
          text: '💨',
          'aria-hidden': 'true'
        }) : null,
        el('img', {
          class: 'result-car',
          src: Components.CAR_SRC,
          alt: lost
            ? 'Chiếc xe của bé vừa về đích thứ hai'
            : 'Chiếc xe đua chúc mừng bé hoàn thành bài',
          draggable: 'false'
        })
      ]),
      lost
        ? el('p', {
          class: 'result-cheer',
          text: canReplay
            ? 'Cố lên nhé! Bé bấm "Chơi lại" để đua lại nào.'
            : 'Cố lên nhé! Lần sau bé sẽ nhanh hơn.'
        })
        : null,
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
      puzzleStrip,
      el('div', { class: 'result-actions' }, actions),
      el('p', {
        class: 'result-total',
        text: 'Tổng cộng: ' + ctx.progress.totalStars() + '/' + ctx.progress.maxStars() + ' sao'
      })
    ]);

    screen.appendChild(card);
    ctx.root.appendChild(screen);
    titleNode.focus({ preventScroll: true });

    if (puzzleStrip && KM.PuzzleUI && typeof KM.PuzzleUI.revealBanner === 'function') {
      revealHandle = KM.PuzzleUI.revealBanner({
        index: award.index,
        total: puzzleTotal,
        alreadyOwned: award.added === false,
        revealMs: puzzleTuning.revealMs,
        style: ctx.puzzle && typeof ctx.puzzle.styleFor === 'function'
          ? ctx.puzzle.styleFor(award.index)
          : undefined,
        target: puzzleStrip
      });
    }

    ctx.audio[lost ? 'lose' : 'win']();
    if (!lost) {
      Components.confetti(
        screen,
        Math.min(ctx.tuning.confetti.maxCount, Math.round(ctx.tuning.confetti.count * 1.3)),
        3200
      );
    }

    var message;
    if (race) {
      message = lost
        ? 'Bé về đích thứ hai. Cố lên nhé, lần sau bé sẽ nhanh hơn!'
        : 'Vô địch! Bé về đích hạng nhất. Giỏi quá!';
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
        if (revealHandle) {
          revealHandle.destroy();
          revealHandle = null;
        }
        ctx.speech.stop();
      }
    };
  }

  return resultScreen;
}());
