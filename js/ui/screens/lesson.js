/**
 * Màn hình chơi một bài: shell tối giản quanh đúng một module game độc lập.
 *
 * Shell sở hữu LessonSession, sao, âm thanh, TTS và điều hướng. Module game
 * sở hữu toàn bộ nội dung trong `mount` và báo đáp án qua `km:answer`.
 * Không có hàng đáp án dùng chung, không có màn đua xe / bục trao thưởng.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.lesson = (function () {
  'use strict';

  var el = KM.Components.el;
  var Components = KM.Components;

  /**
   * @param {object} ctx
   * @param {{lessonId: string}} params
   * @returns {object} screen handle
   */
  function lessonScreen(ctx, params) {
    params = params || {};
    var lesson = ctx.curriculum.getLesson(params.lessonId);
    if (!lesson) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }
    if (!ctx.progress.isUnlocked(lesson.id) && !params.preview) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }

    var tuning = ctx.tuning;
    var settings = ctx.progress.settings();
    var questions = ctx.questions.forLesson(lesson, ctx.rng, tuning);
    var session = ctx.lessonSession.create({ questions: questions, tuning: tuning });
    var timers = [];
    var earnedStars = 0;
    var locked = false;
    var finished = false;
    var questionSpeakTimer = null;
    var game = null;
    var mount = null;
    var onAnswerEvent = null;

    var screen = el('div', { class: 'screen lesson' });

    function later(callback, delay) {
      var id = window.setTimeout(callback, delay);
      timers.push(id);
      return id;
    }

    /**
     * @returns {boolean} Bé cần bỏ hiệu ứng chuyển động hay không.
     */
    function prefersReducedMotion() {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /**
     * Dữ liệu tĩnh của bài; module game không gọi GameMap.
     * @returns {object|null}
     */
    function gameEntryFor(lessonId) {
      return KM.GameMap && typeof KM.GameMap.forLesson === 'function'
        ? KM.GameMap.forLesson(lessonId)
        : null;
    }

    /**
     * Gọi một phương thức tuỳ chọn của game; lỗi module không làm hỏng màn học.
     * @param {string} method
     * @param {*} [arg]
     */
    function callGame(method, arg) {
      if (!game || typeof game[method] !== 'function') {
        return;
      }
      try {
        game[method](arg);
      } catch (error) {
        console.error('[KM] game.' + method + ' failed:', error);
      }
    }

    var backButton = el('button', {
      class: 'icon-btn back-btn',
      type: 'button',
      'aria-label': 'Về nhà',
      on: {
        click: function () {
          ctx.audio.tap();
          ctx.navigate('home');
        }
      }
    }, ['←']);

    var speechButton = Components.iconButton({
      icon: settings.speech ? '🔊' : '🔇',
      label: 'Bật hoặc tắt giọng đọc',
      pressed: settings.speech,
      onClick: function () {
        var actual = ctx.setSetting('speech', !ctx.progress.settings().speech);
        speechButton.querySelector('.icon-btn-glyph').textContent = actual ? '🔊' : '🔇';
        speechButton.setAttribute('aria-pressed', actual ? 'true' : 'false');
        speechButton.classList.toggle('is-muted', !actual);
        if (actual) {
          ctx.speech.speak('Đã bật giọng đọc.');
        }
      }
    });

    var sfxButton = Components.iconButton({
      icon: settings.sfx ? '🎵' : '🔕',
      label: 'Bật hoặc tắt hiệu ứng âm thanh',
      pressed: settings.sfx,
      onClick: function () {
        var actual = ctx.setSetting('sfx', !ctx.progress.settings().sfx);
        sfxButton.querySelector('.icon-btn-glyph').textContent = actual ? '🎵' : '🔕';
        sfxButton.setAttribute('aria-pressed', actual ? 'true' : 'false');
        sfxButton.classList.toggle('is-muted', !actual);
        if (actual) {
          ctx.audio.tap();
        }
      }
    });

    var header = el('header', { class: 'lesson-top' }, [
      backButton,
      el('div', { class: 'lesson-heading' }, [
        el('span', { class: 'lesson-badge', text: lesson.label }),
        el('h1', { text: lesson.title })
      ]),
      el('div', { class: 'lesson-tools' }, [speechButton, sfxButton])
    ]);

    var progressText = el('span', {
      class: 'question-progress',
      text: 'Câu 1/' + questions.length
    });
    var meterValue = el('span', { class: 'star-meter-value', text: '0' });
    var meter = el('div', {
      class: 'star-meter',
      role: 'img',
      'aria-label': 'Số sao đạt được trong bài'
    }, [
      el('span', { class: 'star-meter-icon', text: '⭐', 'aria-hidden': 'true' }),
      meterValue
    ]);

    var progressRow = el('div', { class: 'progress-row' }, [progressText, meter]);

    var questionText = el('p', {
      class: 'question-text',
      'aria-live': 'polite',
      tabindex: '-1'
    });
    var speakReplay = el('button', {
      class: 'speak-replay',
      type: 'button',
      'aria-label': 'Nghe lại đề bài',
      on: {
        click: function () {
          speakCurrent();
        }
      }
    }, ['🔊 Nghe lại']);

    var questionCard = el('section', { class: 'question-card', 'aria-label': 'Câu hỏi' }, [
      el('div', { class: 'question-head' }, [questionText, speakReplay])
    ]);
    var foot = el('div', { class: 'lesson-foot' });

    screen.appendChild(header);
    screen.appendChild(progressRow);
    screen.appendChild(questionCard);
    screen.appendChild(foot);

    var gameEntry = gameEntryFor(lesson.id);
    var inputHint = 'Chạm vào đáp án đúng';
    if (gameEntry) {
      if (gameEntry.inputHint) {
        inputHint = gameEntry.inputHint;
      }
      if (gameEntry.introText) {
        questionCard.setAttribute('aria-description', gameEntry.introText);
      }

      var mountAttrs = {
        class: 'game-mount',
        'data-game-id': gameEntry.gameId
      };
      if (gameEntry.title) {
        mountAttrs['aria-label'] = gameEntry.title;
      }
      if (gameEntry.bg) {
        mountAttrs.style = {
          'background-image': 'url("' + gameEntry.bg + '")',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat'
        };
      }
      mount = el('div', mountAttrs);
      var palette = gameEntry.palette || {};
      if (palette.sky) {
        mount.style.setProperty('--game-sky', palette.sky);
      }
      if (palette.accent) {
        mount.style.setProperty('--game-accent', palette.accent);
      }
      if (palette.ink) {
        mount.style.setProperty('--game-ink', palette.ink);
      }
      questionCard.appendChild(mount);

      // Một kênh trả lời duy nhất: module phát km:answer trên chính mount.
      onAnswerEvent = function (event) {
        var detail = event && event.detail;
        if (!detail || detail.value == null) {
          return;
        }
        var question = session.current();
        if (!question || locked || finished) {
          return;
        }
        for (var i = 0; i < question.choices.length; i += 1) {
          if (String(question.choices[i].value) === String(detail.value)) {
            handlePick(question, question.choices[i]);
            return;
          }
        }
      };
      mount.addEventListener('km:answer', onAnswerEvent);

      var gameFactory = KM.Games && typeof KM.Games[gameEntry.gameId] === 'function'
        ? KM.Games[gameEntry.gameId]
        : null;
      if (gameFactory) {
        try {
          game = gameFactory({
            mount: mount,
            question: session.current(),
            reducedMotion: prefersReducedMotion(),
            audio: ctx.audio
          });
        } catch (error) {
          console.error('[KM] game init failed:', error);
          game = null;
        }
        if (game) {
          // Hợp đồng cũ có thể chờ các method bắt buộc; bỏ qua nếu chặn instance mới.
          try {
            if (KM.GameContract && typeof KM.GameContract.assert === 'function') {
              KM.GameContract.assert(game);
            }
          } catch (error) {
            /* Hợp đồng mới: mọi method đều tuỳ chọn. */
          }
        }
      }
    }

    ctx.root.appendChild(screen);

    function speakCurrent() {
      var question = session.current();
      if (question) {
        ctx.speech.speak(question.say);
      }
    }

    function renderQuestion() {
      var question = session.current();
      if (!question) {
        finish();
        return;
      }
      locked = false;
      questionCard.classList.remove('is-correct');
      questionText.textContent = question.text;

      // Module tự render visual/equation/hotspot trong mount.
      callGame('render', question);

      progressText.textContent = 'Câu ' + (session.progress().index + 1) +
        '/' + session.progress().total;
      foot.textContent = inputHint;

      if (questionSpeakTimer) {
        window.clearTimeout(questionSpeakTimer);
        questionSpeakTimer = null;
      }
      questionSpeakTimer = later(function () {
        questionSpeakTimer = null;
        if (!locked) {
          speakCurrent();
        }
      }, tuning.timing.questionSpeakDelayMs);

      questionText.focus({ preventScroll: true });
    }

    function handlePick(question, choice) {
      if (locked || finished) {
        return;
      }
      if (questionSpeakTimer) {
        window.clearTimeout(questionSpeakTimer);
        questionSpeakTimer = null;
      }
      var result = session.answer(choice.value);
      if (result.ignored) {
        return;
      }

      if (!result.correct) {
        callGame('onWrong', choice);
        ctx.audio.wrong();
        Components.toast('Thử lại nhé! Bé làm được mà 💪', { tone: 'gentle', duration: 1600 });
        ctx.speech.speak('Chưa đúng. Bé thử lại nhé!');
        return;
      }

      locked = true;
      callGame('onCorrect', result);
      ctx.audio.correct();
      ctx.audio.star();

      if (result.firstTry) {
        earnedStars += 1;
        meterValue.textContent = String(earnedStars);
        meter.setAttribute('aria-label', earnedStars + ' sao đạt được trong bài');
      }

      Components.dismissToast();
      Components.toast('Đúng rồi!', { tone: 'success', duration: 1400 });
      Components.confetti(screen, tuning.confetti.count, tuning.timing.confettiMs + 500);
      callGame('celebrate');

      later(function () {
        ctx.speech.speak(result.cheer);
      }, 120);
      later(advance, tuning.timing.correctHoldMs);
    }

    function advance() {
      if (finished) {
        return;
      }
      if (!session.next()) {
        finish();
        return;
      }
      renderQuestion();
    }

    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      var summary = session.summary();
      var record = ctx.progress.recordResult(lesson.id, summary);
      later(function () {
        ctx.navigate('result', {
          lessonId: lesson.id,
          summary: summary,
          record: record
        });
      }, 900);
    }

    function onKeyDown(event) {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        ctx.navigate('home');
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        speakCurrent();
        return;
      }
      if (!/^[1-9]$/.test(event.key) || !game || typeof game.handleKey !== 'function') {
        return;
      }
      try {
        if (game.handleKey(event.key) === true) {
          event.preventDefault();
        }
      } catch (error) {
        console.error('[KM] game.handleKey failed:', error);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    renderQuestion();

    return {
      destroy: function () {
        timers.forEach(function (id) {
          window.clearTimeout(id);
        });
        timers = [];
        document.removeEventListener('keydown', onKeyDown);
        if (mount && onAnswerEvent) {
          mount.removeEventListener('km:answer', onAnswerEvent);
        }
        if (game) {
          callGame('destroy');
          game = null;
        }
        ctx.speech.stop();
      },
      debugState: function () {
        return { lesson: lesson, session: session, earnedStars: earnedStars };
      }
    };
  }

  return lessonScreen;
}());
