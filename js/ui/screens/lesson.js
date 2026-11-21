/**
 * Màn hình chơi một bài: hiển thị câu hỏi, lựa chọn, phản hồi và chuyển câu.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.lesson = (function () {
  'use strict';

  var el = KM.Components.el;
  var Components = KM.Components;
  var Visuals = KM.Visuals;

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
    var choiceButtons = [];
    var earnedStars = 0;
    var locked = false;
    var finished = false;
    var questionSpeakTimer = null;

    var screen = el('div', { class: 'screen lesson' });
    var race = ctx.race.create({
      total: questions.length,
      player: ctx.racers.player,
      opponents: ctx.racers.opponentsForLesson(lesson.id)
    });
    var raceUI = ctx.raceUI.create({ race: race, ctx: ctx, screen: screen });

    function later(callback, delay) {
      var id = window.setTimeout(callback, delay);
      timers.push(id);
      return id;
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

    var raceStatus = el('span', {
      class: 'race-status',
      text: '🏁 Cuộc đua · Câu 1/' + questions.length
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

    var progressRow = el('div', { class: 'progress-row' }, [raceStatus, meter]);
    var raceSlot = el('div', { class: 'race-slot' });

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

    var visualSlot = el('div', { class: 'visual-slot' });
    var equationSlot = el('div', { class: 'equation-slot' });
    var choicesNode = el('div', { class: 'choices' });

    var questionCard = el('section', { class: 'question-card', 'aria-label': 'Câu hỏi' }, [
      el('div', { class: 'question-head' }, [questionText, speakReplay]),
      visualSlot,
      equationSlot,
      choicesNode
    ]);

    var foot = el('div', { class: 'lesson-foot' });

    screen.appendChild(header);
    screen.appendChild(progressRow);
    screen.appendChild(raceSlot);
    screen.appendChild(questionCard);
    screen.appendChild(foot);
    raceSlot.appendChild(raceUI.hud);
    ctx.root.appendChild(screen);

    function speakCurrent() {
      var question = session.current();
      if (question) {
        ctx.speech.speak(question.say);
      }
    }

    function choiceContent(question, choice) {
      if (question.choiceRender === 'shape') {
        return [Visuals.shapeSvg(choice.shape, {
          size: 62,
          color: ctx.curriculum.shapes[choice.shape].color,
          label: choice.label
        })];
      }
      if (question.choiceRender === 'glyph') {
        return [el('span', { class: 'choice-glyph', text: choice.glyph, 'aria-hidden': 'true' })];
      }
      if (question.choiceRender === 'number') {
        return [el('span', { class: 'choice-value', text: choice.label })];
      }
      if (question.choiceRender === 'sign') {
        return [el('span', { class: 'choice-sign', text: choice.label })];
      }
      var styleVars = {};
      if (choice.badgeBg) {
        styleVars['--badge-bg'] = choice.badgeBg;
      }
      if (choice.color) {
        styleVars['--badge-ink'] = choice.color;
      }
      return [el('span', {
        class: 'choice-text-stack' + (choice.badge ? ' is-badge' : ''),
        'data-icon': choice.icon || '',
        style: Object.keys(styleVars).length ? styleVars : null
      }, [
        el('span', { class: 'choice-label', text: choice.label })
      ])];
    }

    function renderChoices(question) {
      choiceButtons = [];
      while (choicesNode.firstChild) {
        choicesNode.removeChild(choicesNode.firstChild);
      }
      choicesNode.className = 'choices choices-' + question.choiceRender +
        ' choices-count-' + question.choices.length;
      question.choices.forEach(function (choice) {
        var aria = choice.aria || (question.choiceRender === 'number'
          ? 'Số ' + choice.label
          : choice.label);
        var button = el('button', {
          class: 'choice choice-' + question.choiceRender,
          type: 'button',
          'data-value': String(choice.value),
          'aria-label': aria
        }, choiceContent(question, choice));
        button.addEventListener('click', function () {
          handlePick(question, choice, button);
        });
        choiceButtons.push(button);
        choicesNode.appendChild(button);
      });
    }

    function renderQuestion() {
      var question = session.current();
      if (!question) {
        finish();
        return;
      }
      locked = false;
      questionCard.classList.remove('is-correct');
      choicesNode.classList.remove('is-locked');
      questionText.textContent = question.text;

      while (visualSlot.firstChild) {
        visualSlot.removeChild(visualSlot.firstChild);
      }
      while (equationSlot.firstChild) {
        equationSlot.removeChild(equationSlot.firstChild);
      }

      if (question.visual) {
        var visual = el('div', {
          class: 'visual',
          role: 'img',
          'aria-label': question.visual.alt || ''
        });
        var rendered = Visuals.render(question.visual);
        if (rendered) {
          rendered.setAttribute('aria-hidden', 'true');
          visual.appendChild(rendered);
        }
        visualSlot.appendChild(visual);
      }
      if (question.equation) {
        var equation = Visuals.renderEquation(question.equation);
        if (equation) {
          equation.setAttribute('role', 'img');
          equation.setAttribute('aria-label', question.equation.alt || '');
          equationSlot.appendChild(equation);
        }
      }

      renderChoices(question);

      raceStatus.textContent = '🏁 Cuộc đua · Câu ' +
        (session.progress().index + 1) + '/' + session.progress().total;
      raceUI.update();
      foot.textContent = 'Chạm vào đáp án đúng';

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

    function handlePick(question, choice, button) {
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
        race.wrong();
        raceUI.update();
        ctx.audio.wrong();
        button.classList.add('is-wrong');
        Components.shake(button);
        Components.toast('Thử lại nhé! Bé làm được mà 💪', { tone: 'gentle', duration: 1600 });
        ctx.speech.speak('Chưa đúng. Bé thử lại nhé!');
        later(function () {
          button.classList.remove('is-wrong');
        }, tuning.timing.wrongHoldMs);
        return;
      }

      locked = true;
      choicesNode.classList.add('is-locked');
      Components.dismissToast();
      choiceButtons.forEach(function (item) {
        item.classList.remove('is-wrong');
      });
      button.classList.add('is-correct');
      race.correct(result.firstTry);
      race.completeQuestion();
      raceUI.update();
      ctx.audio.correct();
      ctx.audio.star();
      ctx.audio.engine();

      if (result.firstTry) {
        earnedStars += 1;
        meterValue.textContent = String(earnedStars);
        meter.setAttribute('aria-label', earnedStars + ' sao đạt được trong bài');
      }

      Components.carCelebration(screen, {
        title: 'Đúng rồi!',
        sub: result.firstTry ? '+1 ⭐' : 'Bé làm được rồi!',
        duration: tuning.timing.carPopMs
      });
      Components.confetti(screen, tuning.confetti.count, tuning.timing.confettiMs + 500);

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
      var raceSummary = race.settle();
      raceUI.update({ final: true });
      raceStatus.textContent = '🏁 Về đích!';
      var record = ctx.progress.recordResult(lesson.id, summary);
      later(function () {
        ctx.navigate('result', {
          lessonId: lesson.id,
          summary: summary,
          record: record,
          race: raceSummary
        });
      }, 900);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        ctx.navigate('home');
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        speakCurrent();
        return;
      }
      var index = parseInt(event.key, 10) - 1;
      if (index >= 0 && index < choiceButtons.length && !Number.isNaN(index)) {
        event.preventDefault();
        choiceButtons[index].click();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    raceUI.showIntro(function () {
      renderQuestion();
    });

    return {
      destroy: function () {
        timers.forEach(function (id) {
          window.clearTimeout(id);
        });
        document.removeEventListener('keydown', onKeyDown);
        raceUI.destroy();
        ctx.speech.stop();
      },
      debugState: function () {
        return { lesson: lesson, session: session, earnedStars: earnedStars };
      }
    };
  }

  return lessonScreen;
}());
