/**
 * Màn giới thiệu riêng cho từng bài trước khi vào màn học (ADR-0003).
 * Màn này KHÔNG tự redirect: `home.js` là nơi quyết định bỏ qua intro khi đã có cờ.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.gameIntro = (function () {
  'use strict';

  var el = KM.Components.el;
  var INTRO_PREFIX = 'km_game_intro_v1_';

  // sessionStorage có thể bị chặn trên file:// → giữ cờ trong bộ nhớ phiên hiện tại.
  KM._introFlags = KM._introFlags || Object.create(null);

  /**
   * @param {string} lessonId
   * @returns {string} Khóa sessionStorage của cờ intro.
   */
  function flagKey(lessonId) {
    return INTRO_PREFIX + lessonId;
  }

  /**
   * @param {string} lessonId
   * @returns {boolean} Bài này đã được xem intro trong phiên hiện tại hay chưa.
   */
  function hasSeen(lessonId) {
    if (!lessonId) {
      return false;
    }
    try {
      if (window.sessionStorage.getItem(flagKey(lessonId)) === '1') {
        return true;
      }
    } catch (error) {
      /* file:// có thể chặn storage; dùng bộ nhớ bên dưới. */
    }
    return KM._introFlags[lessonId] === '1';
  }

  /**
   * Chỉ ghi cờ khi bé chủ động bấm "Bắt đầu". Ghi cả bộ nhớ để fallback khi storage lỗi.
   * @param {string} lessonId
   */
  function markSeen(lessonId) {
    if (!lessonId) {
      return;
    }
    KM._introFlags[lessonId] = '1';
    try {
      window.sessionStorage.setItem(flagKey(lessonId), '1');
    } catch (error) {
      /* Bỏ qua lỗi storage; cờ bộ nhớ vẫn có hiệu lực trong phiên này. */
    }
  }

  /**
   * Ảnh cover tĩnh. Lỗi ảnh được xử lý im lặng: thử bg, rồi ẩn img để nền lộ ra.
   * @param {object} entry
   * @returns {HTMLElement}
   */
  function coverImage(entry) {
    var src = entry.cover || entry.bg || '';
    var fallback = entry.bg && entry.bg !== src ? entry.bg : null;
    var img = document.createElement('img');

    img.className = 'game-cover';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('loading', 'eager');
    img.setAttribute('decoding', 'async');
    img.setAttribute('draggable', 'false');

    img.addEventListener('error', function onError() {
      if (fallback) {
        fallback = null;
        img.src = entry.bg;
        return;
      }
      img.style.display = 'none';
      img.removeEventListener('error', onError);
    });
    img.src = src;
    return img;
  }

  /**
   * @param {object} ctx
   * @param {{lessonId: string, reason: string, preview: boolean}} params
   * @returns {object} screen handle
   */
  function gameIntro(ctx, params) {
    params = params || {};
    var lessonId = params.lessonId;
    var curriculum = ctx.curriculum;
    var map = KM.GameMap;
    var lesson = lessonId && curriculum && typeof curriculum.getLesson === 'function'
      ? curriculum.getLesson(lessonId)
      : null;
    var entry = lesson && map && typeof map.forLesson === 'function'
      ? map.forLesson(lessonId)
      : null;

    if (!lesson || !entry) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }
    var unlocked = !ctx.progress || typeof ctx.progress.isUnlocked !== 'function' ||
      ctx.progress.isUnlocked(lesson.id);
    if (!unlocked && !params.preview) {
      ctx.navigate('home');
      return { destroy: function () {} };
    }
    if (params.preview) {
      ctx.navigate('lesson', { lessonId: lessonId, preview: true });
      return { destroy: function () {} };
    }

    var finished = false;
    var title = entry.title || lesson.title;
    var introText = entry.introText || (title + '. ' + (entry.mechanic || '') + '.');
    var inputHint = entry.inputHint || '';
    var styleClass = entry.style ? ' style--' + entry.style : '';

    var screen = el('div', {
      class: 'screen game-intro' + styleClass,
      'data-lesson-id': lessonId,
      'data-reason': params.reason || 'first'
    });

    var coverFrame = el('div', { class: 'game-intro-cover' });
    if (entry.bg) {
      coverFrame.style.backgroundImage = 'url("' + entry.bg + '")';
    }
    coverFrame.appendChild(coverImage(entry));

    var copy = el('div', { class: 'game-intro-copy' }, [
      el('span', { class: 'game-intro-badge', text: 'Bài ' + (lesson.label || '') }),
      el('h1', { class: 'game-intro-title', text: title }),
      el('p', { class: 'game-intro-text', text: introText }),
      el('p', {
        class: 'game-intro-tribute',
        text: '🎮 Cảm hứng: ' + (entry.tribute || '')
      }),
      inputHint
        ? el('p', { class: 'game-intro-hint', text: '💡 ' + inputHint })
        : null
    ]);

    var startButton = el('button', {
      class: 'btn btn-primary btn-xl',
      type: 'button',
      on: { click: start }
    }, ['▶ Bắt đầu']);
    var homeButton = el('button', {
      class: 'btn btn-ghost',
      type: 'button',
      on: { click: goHome }
    }, ['← Về nhà']);

    screen.appendChild(coverFrame);
    screen.appendChild(copy);
    screen.appendChild(el('div', { class: 'game-intro-actions' }, [
      startButton,
      homeButton
    ]));
    ctx.root.appendChild(screen);

    /**
     * Ghi cờ rồi vào thẳng lesson; không truyền skipIntro (ADR-0003 §2).
     */
    function start() {
      if (finished) {
        return;
      }
      finished = true;
      markSeen(lessonId);
      ctx.audio.tap();
      ctx.navigate('lesson', { lessonId: lessonId });
    }

    /** Về nhà mà không ghi cờ → lần sau vẫn được xem intro. */
    function goHome() {
      if (finished) {
        return;
      }
      finished = true;
      ctx.audio.tap();
      ctx.navigate('home');
    }

    /**
     * @param {KeyboardEvent} event
     */
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        goHome();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        start();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    startButton.focus({ preventScroll: true });
    if (ctx.speech && typeof ctx.speech.speak === 'function') {
      ctx.speech.speak(introText);
    }

    return {
      destroy: function () {
        document.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  gameIntro.hasSeen = hasSeen;
  gameIntro.markSeen = markSeen;

  return gameIntro;
}());
