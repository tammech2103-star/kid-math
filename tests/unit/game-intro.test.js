/**
 * Test màn giới thiệu từng bài (ADR-0003): cờ session, render, điều hướng.
 * Chạy cùng KMTest trong tests/test-runner.html.
 * `game-intro.js` capture `KM.Components.el` lúc nạp → test-runner phải nạp
 * components.js TRƯỚC game-intro.js.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var PREFIX = 'km_game_intro_v1_';
  var FIXTURE = 'b1';

  function clearFlag(lessonId) {
    try {
      window.sessionStorage.removeItem(PREFIX + lessonId);
    } catch (error) { /* file:// có thể chặn storage */ }
    if (KM._introFlags) {
      delete KM._introFlags[lessonId];
    }
  }

  function makeCtx(navLog, unlocked) {
    var root = document.createElement('div');
    document.body.appendChild(root);
    return {
      root: root,
      curriculum: KM.Curriculum,
      progress: {
        isUnlocked: function () { return unlocked !== false; }
      },
      audio: { tap: function () {} },
      speech: { speak: function () {} },
      navigate: function (name, params) {
        navLog.push({ name: name, params: params || {} });
      },
      remove: function () {
        if (root.parentNode) {
          root.parentNode.removeChild(root);
        }
      }
    };
  }

  function buttons(screen) {
    return screen.querySelectorAll('button');
  }

  T.suite('GameIntro — màn giới thiệu 21 bài (ADR-0003)', function () {
    T.test('test_game_intro_flag_helpers_use_prefixed_session_key', function () {
      // Arrange
      clearFlag(FIXTURE);
      T.eq(KM.Screens.gameIntro.hasSeen(''), false);
      T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), false);

      // Act
      KM.Screens.gameIntro.markSeen(FIXTURE);

      // Assert
      T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), true);
      T.eq(window.sessionStorage.getItem(PREFIX + FIXTURE), '1');
      KM.Screens.gameIntro.markSeen('');
      T.eq(window.sessionStorage.getItem(PREFIX + ''), null);
      clearFlag(FIXTURE);
      T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), false);
    });

    T.test('test_game_intro_memory_flag_survives_storage_failure', function () {
      // Arrange
      clearFlag(FIXTURE);
      KM.Screens.gameIntro.markSeen(FIXTURE);

      // Act: giả lập sessionStorage chặn → chỉ còn cờ bộ nhớ.
      window.sessionStorage.removeItem(PREFIX + FIXTURE);

      // Assert
      T.eq(KM._introFlags[FIXTURE], '1');
      T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), true);
      clearFlag(FIXTURE);
    });

    T.test('test_game_intro_render_shows_cover_copy_and_actions', function () {
      // Arrange
      clearFlag(FIXTURE);
      var navLog = [];
      var ctx = makeCtx(navLog);
      var entry = KM.GameMap.forLesson(FIXTURE);
      var lesson = KM.Curriculum.getLesson(FIXTURE);
      var handle = null;

      try {
        // Act
        handle = KM.Screens.gameIntro(ctx, { lessonId: FIXTURE, reason: 'first' });
        var screen = ctx.root.querySelector('.game-intro');
        T.ok(screen, 'phải render màn .game-intro');
        T.ok(screen.classList.contains('style--' + entry.style), 'thiếu class style đặc trưng');
        T.eq(screen.getAttribute('data-lesson-id'), FIXTURE);
        T.eq(screen.getAttribute('data-reason'), 'first');

        // Assert
        var cover = screen.querySelector('.game-intro-cover');
        T.ok(cover, 'thiếu khung cover');
        T.eq(cover.style.backgroundImage, 'url("' + entry.bg + '")');
        var img = cover.querySelector('img.game-cover');
        T.ok(img, 'thiếu ảnh cover');
        T.eq(img.getAttribute('src'), entry.cover);
        T.eq(img.getAttribute('aria-hidden'), 'true');
        T.eq(img.getAttribute('loading'), 'eager');
        T.eq(img.getAttribute('decoding'), 'async');
        T.eq(img.getAttribute('draggable'), 'false');

        T.eq(screen.querySelector('.game-intro-badge').textContent,
          'Bài ' + lesson.label);
        T.eq(screen.querySelector('.game-intro-title').textContent,
          entry.title || lesson.title);
        T.eq(screen.querySelector('.game-intro-text').textContent, entry.introText);
        T.eq(screen.querySelector('.game-intro-hint').textContent,
          '💡 ' + entry.inputHint);
        T.ok(screen.querySelector('.game-intro-tribute').textContent.indexOf(entry.tribute) >= 0);
        T.eq(buttons(screen).length, 2, 'phải có 2 nút Bắt đầu / Về nhà');
        T.eq(navLog.length, 0, 'màn intro KHÔNG tự điều hướng');
      } finally {
        if (handle) { handle.destroy(); }
        ctx.remove();
        clearFlag(FIXTURE);
      }
    });

    T.test('test_game_intro_cover_image_falls_back_then_hides', function () {
      // Arrange
      var navLog = [];
      var ctx = makeCtx(navLog);
      var entry = KM.GameMap.forLesson(FIXTURE);
      var handle = null;

      try {
        // Act
        handle = KM.Screens.gameIntro(ctx, { lessonId: FIXTURE });
        var img = ctx.root.querySelector('img.game-cover');
        img.dispatchEvent(new Event('error'));

        // Assert: lỗi đầu chuyển sang bg.
        T.eq(img.getAttribute('src'), entry.bg);

        // Act + Assert: lỗi thứ hai ẩn ảnh, để nền lộ ra.
        img.dispatchEvent(new Event('error'));
        T.eq(img.style.display, 'none');
      } finally {
        if (handle) { handle.destroy(); }
        ctx.remove();
        clearFlag(FIXTURE);
      }
    });

    T.test('test_game_intro_start_marks_seen_and_navigates_once', function () {
      // Arrange
      clearFlag(FIXTURE);
      var navLog = [];
      var ctx = makeCtx(navLog);
      var handle = null;

      try {
        // Act
        handle = KM.Screens.gameIntro(ctx, { lessonId: FIXTURE });
        var start = ctx.root.querySelector('.btn-primary');
        start.click();
        start.click(); // guard chặn navigate lần 2

        // Assert
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'lesson');
        T.eq(navLog[0].params.lessonId, FIXTURE);
        T.eq(navLog[0].params.skipIntro, undefined, 'KHÔNG truyền skipIntro');
        T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), true);
      } finally {
        if (handle) { handle.destroy(); }
        ctx.remove();
        clearFlag(FIXTURE);
      }
    });

    T.test('test_game_intro_home_and_escape_do_not_mark_seen', function () {
      // Arrange
      clearFlag(FIXTURE);
      var navLog = [];
      var ctx = makeCtx(navLog);
      var handle = null;

      try {
        // Act: Esc
        handle = KM.Screens.gameIntro(ctx, { lessonId: FIXTURE });
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape', bubbles: true, cancelable: true
        }));

        // Assert
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'home');
        T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), false);
        handle.destroy();
        handle = null;

        // Act + Assert: nút Về nhà cũng không ghi cờ.
        navLog.length = 0;
        ctx.root.textContent = '';
        handle = KM.Screens.gameIntro(ctx, { lessonId: FIXTURE });
        ctx.root.querySelector('.btn-ghost').click();
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'home');
        T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), false);
      } finally {
        if (handle) { handle.destroy(); }
        ctx.remove();
        clearFlag(FIXTURE);
      }
    });

    T.test('test_game_intro_guards_redirect_invalid_locked_and_preview', function () {
      // Arrange
      clearFlag(FIXTURE);
      var navLog = [];
      var ctx = makeCtx(navLog);
      ctx.progress.isUnlocked = function () { return false; };
      var handles = [];

      try {
        // Act + Assert: lesson không tồn tại → home.
        handles.push(KM.Screens.gameIntro(ctx, { lessonId: 'khong-ton-tai' }));
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'home');

        // Act + Assert: bài bị khoá → home.
        navLog.length = 0;
        handles.push(KM.Screens.gameIntro(ctx, { lessonId: FIXTURE }));
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'home');

        // Act + Assert: preview vào thẳng lesson, KHÔNG ghi cờ.
        navLog.length = 0;
        handles.push(KM.Screens.gameIntro(ctx, { lessonId: FIXTURE, preview: true }));
        T.eq(navLog.length, 1);
        T.eq(navLog[0].name, 'lesson');
        T.eq(navLog[0].params.preview, true);
        T.eq(KM.Screens.gameIntro.hasSeen(FIXTURE), false);
        T.eq(ctx.root.querySelector('.game-intro'), null);
      } finally {
        handles.forEach(function (item) { item.destroy(); });
        ctx.remove();
        clearFlag(FIXTURE);
      }
    });
  });
}());
