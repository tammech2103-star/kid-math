/**
 * Minigame bài `intro` — nhảy nhặt đồng xu (cảm hứng: Super Mario Bros.).
 *
 * Theo ADR-0002: module này CHỈ là lớp trình bày/tương tác. Mọi lựa chọn đều
 * đi ra ngoài qua `onAnswer(choice.value)`; game không đụng vào LessonSession,
 * Progress, sao hay điểm. Hàng đáp án của lesson.js được giữ nguyên.
 * Art dựng mới bằng CSS/emoji — không copy sprite/logo/nhạc Nintendo.
 *
 * Hợp đồng: createGame({ctx, question, mount, onAnswer, reducedMotion})
 *   -> { render(question), onCorrect(result), onWrong(choice), celebrate(), destroy() }
 * ES5-safe, mọi số gameplay đọc từ ctx.tuning.game (có default an toàn).
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioBros = (function () {
  'use strict';

  var LESSON_ID = 'intro';
  var TRIBUTE = 'Super Mario Bros.';
  var DEFAULT_BG = 'Asset/hd/intro.webp';

  /** @returns {object} Phần tuning.game, hoặc object rỗng nếu chưa có. */
  function gameTuning(ctx) {
    var tuning = (ctx && ctx.tuning) || {};
    return tuning.game || tuning.games || {};
  }

  /** Đọc số từ nhiều tên khoá dự phòng. @returns {number} */
  function tuneNumber(t, names, fallback) {
    var i;
    var value;
    for (i = 0; i < names.length; i += 1) {
      value = t && t[names[i]];
      if (typeof value === 'number' && isFinite(value)) {
        return value;
      }
    }
    return fallback;
  }

  /** Đọc chuỗi từ nhiều tên khoá dự phòng. @returns {string|null} */
  function tuneString(t, names, fallback) {
    var i;
    var value;
    for (i = 0; i < names.length; i += 1) {
      value = t && t[names[i]];
      if (typeof value === 'string' && value) {
        return value;
      }
    }
    return fallback;
  }

  /** @returns {boolean} Có tắt hoạt ảnh hay không. */
  function isReduced(explicit) {
    if (explicit === true) {
      return true;
    }
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** @returns {HTMLElement} Dùng Components.el khi có, không thì tự tạo. */
  function node(tag, attrs, children) {
    if (KM.Components && typeof KM.Components.el === 'function') {
      return KM.Components.el(tag, attrs, children);
    }
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value == null || value === false) {
        return;
      }
      if (key === 'class') {
        el.className = value;
      } else if (key === 'text') {
        el.textContent = value;
      } else if (key === 'on' && typeof value === 'object') {
        Object.keys(value).forEach(function (type) {
          el.addEventListener(type, value[type]);
        });
      } else {
        el.setAttribute(key, value === true ? '' : value);
      }
    });
    (function appendKids(host, kids) {
      if (kids == null) {
        return;
      }
      if (Array.isArray(kids)) {
        kids.forEach(function (kid) { appendKids(host, kid); });
      } else if (kids.nodeType) {
        host.appendChild(kids);
      } else {
        host.appendChild(document.createTextNode(String(kids)));
      }
    }(el, children));
    return el;
  }

  /** @returns {object|null} Choice có value bằng số cần nộp. */
  function findChoice(question, value) {
    var list = (question && question.choices) || [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].value === value) {
        return list[i];
      }
    }
    return null;
  }

  /** @returns {string} Đường dẫn ảnh nền HD, cho phép tuningoverride. */
  function assetPath(ctx, t) {
    var custom = tuneString(t, ['bg', 'background', 'asset', 'src'], null);
    if (custom) {
      return custom;
    }
    var hd = (ctx && ctx.tuning && ctx.tuning.hd) || {};
    var base = tuneString(hd, ['basePath', 'path'], 'Asset/hd/');
    if (!base) {
      return DEFAULT_BG;
    }
    if (base.charAt(base.length - 1) !== '/') {
      base += '/';
    }
    return base + LESSON_ID + '.webp';
  }

  /** Tránh nhân đôi nhãn nếu lesson.js đã thêm nhãn cảm hứng. @returns {boolean} */
  function hasTributeLabel(mount) {
    if (!mount) {
      return false;
    }
    if (mount.textContent && mount.textContent.indexOf('Cảm hứng') >= 0) {
      return true;
    }
    var host = mount.parentNode;
    if (host && host.textContent && host.textContent.indexOf('Cảm hứng') >= 0) {
      return true;
    }
    var found = document.querySelectorAll('.game-tribute, [data-tribute], .tribute-label');
    var i;
    for (i = 0; i < found.length; i += 1) {
      if (found[i].textContent && found[i].textContent.indexOf('Cảm hứng') >= 0) {
        return true;
      }
    }
    return false;
  }

  /** @returns {number} Số đồng xu cần đếm cho câu hiện tại. */
  function coinCount(question, t) {
    var groups = question && question.visual && question.visual.groups;
    var n = groups && groups.length && typeof groups[0].count === 'number'
      ? groups[0].count
      : (question && typeof question.answer === 'number' ? question.answer : 0);
    n = Math.max(0, Math.round(n));
    var cap = Math.max(tuneNumber(t, ['maxCoins', 'introMaxCoins'], 5), n);
    return Math.min(cap, n);
  }

  /**
   * Tạo một game intro.
   * @param {{ctx: object, question: object, mount: HTMLElement,
   *   onAnswer: Function, reducedMotion: boolean}} options
   * @returns {{render: Function, onCorrect: Function, onWrong: Function,
   *   celebrate: Function, destroy: Function}}
   */
  function createGame(options) {
    var opts = options || {};
    var ctx = opts.ctx || {};
    var mount = opts.mount || null;
    var onAnswer = typeof opts.onAnswer === 'function' ? opts.onAnswer : function () {};
    var reduced = isReduced(opts.reducedMotion);
    var t = gameTuning(ctx);

    var timers = [];
    var listeners = [];
    var stage = null;
    var ownStage = false;
    var ownNodes = [];
    var bg = null;
    var coinsWrap = null;
    var counter = null;
    var hint = null;
    var confirm = null;
    var celebration = null;
    var celebrationTimer = null;
    var currentQuestion = opts.question || null;

    var total = 0;
    var collected = 0;
    var submitted = false;
    var done = false;

    var popMs = tuneNumber(t, ['coinPopMs', 'popMs'], 280);
    var jumpMs = tuneNumber(t, ['jumpMs'], 520);
    var wrongMs = tuneNumber(t, ['wrongShakeMs'], 600);
    var celebrateMs = tuneNumber(t, ['celebrateMs'], 1200);

    function later(fn, delay) {
      var id = window.setTimeout(fn, delay);
      timers.push(id);
      return id;
    }

    function track(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push({ node: target, type: type, handler: handler });
    }

    /** Thêm node do game tạo vào stage; destroy chỉ xoá các node này. */
    function addChild(child) {
      if (!stage || !child) {
        return child;
      }
      stage.appendChild(child);
      ownNodes.push(child);
      return child;
    }

    /** Nhảy nhẹ lên khi trả lời đúng (bỏ qua nếu reduced motion). */
    function jump() {
      if (reduced || !stage) {
        return;
      }
      stage.classList.remove('is-jumping');
      void stage.offsetWidth;
      stage.classList.add('is-jumping');
      later(function () {
        if (stage) {
          stage.classList.remove('is-jumping');
        }
      }, jumpMs);
    }

    /** Nộp số xu đã đếm về lesson.js thông qua hợp đồng ADR-0002. */
    function submit() {
      if (submitted || done || !currentQuestion) {
        return;
      }
      var choice = findChoice(currentQuestion, collected);
      if (!choice) {
        return;
      }
      submitted = true; // chặn double-fire khi bé vừa chạm xu vừa bấm hàng đáp án
      jump();
      onAnswer(choice.value);
    }

    function clearCelebration() {
      if (celebrationTimer != null) {
        window.clearTimeout(celebrationTimer);
        celebrationTimer = null;
      }
      if (celebration && celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
      celebration = null;
    }

    function renderCoins(count) {
      if (!coinsWrap) {
        return;
      }
      while (coinsWrap.firstChild) {
        coinsWrap.removeChild(coinsWrap.firstChild);
      }
      var i;
      for (i = 0; i < count; i += 1) {
        var coin = node('button', {
          'class': 'mario-coin',
          type: 'button',
          'aria-label': 'Nhặt đồng xu thứ ' + (i + 1) + ' trong số ' + count,
          'data-coin': String(i + 1)
        }, [
          node('span', { 'class': 'mario-coin-glyph', text: '🪙', 'aria-hidden': 'true' })
        ]);
        if (reduced) {
          coin.classList.add('is-reduced');
        }
        coinsWrap.appendChild(coin);
      }
      if (confirm) {
        confirm.style.display = count === 0 ? '' : 'none';
      }
    }

    /** Một listener uỷ quyền cho toàn bộ đồng xu — không rò rỉ khi render lại. */
    function handleCoinClick(event) {
      var target = event.target;
      while (target && target !== coinsWrap &&
        !(target.classList && target.classList.contains('mario-coin'))) {
        target = target.parentNode;
      }
      if (!target || target === coinsWrap || done) {
        return;
      }
      if (target.classList.contains('is-collected')) {
        return;
      }
      target.classList.add('is-collected');
      collected += 1;
      if (counter) {
        counter.textContent = 'Đã nhặt ' + collected + ' đồng xu';
      }
      if (!reduced) {
        target.classList.add('is-pop');
        later(function () {
          target.classList.remove('is-pop');
        }, popMs);
      }
      if (collected >= total) {
        submit();
      }
    }

    function build() {
      if (mount && mount.classList && mount.classList.contains('game-stage')) {
        // lesson.js đã tạo mount = .game-stage (game-module-interface.md).
        stage = mount;
        stage.classList.add('game-stage--mario');
        if (reduced) {
          stage.classList.add('is-reduced');
        }
      } else {
        ownStage = true;
        stage = node('div', {
          'class': 'game-stage game-stage--mario' + (reduced ? ' is-reduced' : ''),
          'data-game': LESSON_ID
        });
      }

      var lessonOwnsBg = !!(mount && mount.style && mount.style.backgroundImage &&
        mount.style.backgroundImage !== 'none');
      if (lessonOwnsBg) {
        // lesson.js đã đặt ảnh HD từ game-map: chỉ dò load/fail để bật fallback.
        bg = typeof Image === 'function' ? new Image() : null;
        var match = String(mount.style.backgroundImage || '')
          .match(/url\(["']?([^"')]+)["']?\)/i);
        var probeSrc = match && match[1] ? match[1] : assetPath(ctx, t);
        if (bg) {
          bg.onerror = function () {
            bg.onerror = null;
            if (stage) {
              // Xoá inline background-image do lesson.js đặt để gradient fallback lộ ra.
              stage.style.backgroundImage = 'none';
              stage.classList.add('is-fallback');
            }
          };
          bg.onload = function () {
            if (stage) {
              stage.classList.add('has-bg');
            }
          };
          bg.setAttribute('src', probeSrc);
        }
      } else {
        bg = node('img', {
          'class': 'game-stage-bg',
          alt: '',
          'aria-hidden': 'true',
          draggable: 'false'
        });
        bg.onerror = function () {
          // Ảnh HD chưa có: fallback CSS + emoji, KHÔNG log lỗi, không làm gãy game.
          bg.onerror = null;
          bg.style.display = 'none';
          if (stage) {
            stage.classList.add('is-fallback');
          }
        };
        bg.onload = function () {
          // Ảnh có sẵn: ẩn lớp emoji để không phủ lên nền HD.
          if (stage) {
            stage.classList.add('has-bg');
          }
        };
        bg.setAttribute('src', assetPath(ctx, t));
        addChild(bg);
      }

      addChild(node('div', {
        'class': 'game-stage-fallback',
        'aria-hidden': 'true'
      }, [
        node('span', { 'class': 'fb-cloud fb-cloud--a', text: '☁️' }),
        node('span', { 'class': 'fb-cloud fb-cloud--b', text: '☁️' }),
        node('span', { 'class': 'fb-hill', text: '🏔️' }),
        node('span', { 'class': 'fb-bush', text: '🌿' })
      ]));

      if (!hasTributeLabel(mount)) {
        addChild(node('span', {
          'class': 'game-tribute',
          'data-tribute': LESSON_ID,
          text: '🎮 Cảm hứng: ' + TRIBUTE
        }));
      }

      addChild(node('div', { 'class': 'mario-hero', 'aria-hidden': 'true' }, [
        node('span', { 'class': 'mario-hero-hat' }),
        node('span', { 'class': 'mario-hero-face', text: '😃' })
      ]));

      coinsWrap = node('div', {
        'class': 'mario-coins',
        role: 'group',
        'aria-label': 'Những đồng xu để bé đếm'
      });
      track(coinsWrap, 'click', handleCoinClick);

      counter = node('p', {
        'class': 'mario-counter',
        role: 'status',
        'aria-live': 'polite'
      });
      hint = node('p', { 'class': 'mario-hint', text: 'Chạm vào từng đồng xu để đếm nhé!' });
      confirm = node('button', {
        'class': 'mario-confirm',
        type: 'button',
        'aria-label': 'Không có đồng xu nào, chọn số không',
        text: '🪙 0 — Đã đếm xong'
      });
      track(confirm, 'click', function () {
        collected = 0;
        submit();
      });

      addChild(node('div', { 'class': 'mario-scene' }, [
        coinsWrap,
        counter,
        hint,
        confirm
      ]));

      if (ownStage && mount && mount.appendChild) {
        mount.appendChild(stage);
      }
    }

    /** Cập nhật hoạt cảnh theo câu hiện tại — không tự sửa session. */
    function render(question) {
      currentQuestion = question || null;
      submitted = false;
      done = false;
      collected = 0;
      total = coinCount(currentQuestion, t);
      clearCelebration();
      if (stage) {
        stage.classList.remove('is-correct', 'is-wrong', 'is-jumping');
      }
      renderCoins(total);
      if (counter) {
        counter.textContent = 'Đã nhặt 0 đồng xu';
      }
      if (hint) {
        hint.textContent = total === 0
          ? 'Không có đồng xu nào. Bé chọn số 0 nhé!'
          : 'Chạm vào từng đồng xu để đếm nhé!';
      }
    }

    /** Phản hồi riêng khi bé trả lời đúng: nhảy mừng. */
    function onCorrect(result) {
      done = true;
      submitted = true;
      if (stage) {
        stage.classList.add('is-correct');
      }
      jump();
      return result;
    }

    /** Phản hồi riêng khi bé chọn sai: lắc nhẹ rồi cho đếm lại. */
    function onWrong(choice) {
      if (stage) {
        stage.classList.add('is-wrong');
        later(function () {
          if (stage) {
            stage.classList.remove('is-wrong');
          }
        }, wrongMs);
      }
      collected = 0;
      submitted = false;
      if (counter) {
        counter.textContent = 'Đã nhặt 0 đồng xu';
      }
      if (hint) {
        hint.textContent = 'Chưa đúng, bé đếm lại nhé!';
      }
      if (coinsWrap) {
        var coins = coinsWrap.querySelectorAll('.mario-coin');
        var i;
        for (i = 0; i < coins.length; i += 1) {
          coins[i].classList.remove('is-collected');
          coins[i].classList.remove('is-pop');
        }
      }
      return choice;
    }

    /** Ăn mừng hoàn thành bài: mưa xu + sao, tôn trọng reduced motion. */
    function celebrate() {
      clearCelebration();
      celebration = node('div', { 'class': 'mario-celebrate', 'aria-hidden': 'true' });
      var glyphs = reduced ? ['🎉'] : ['🪙', '⭐', '🎉', '🌟', '🪙', '🎉'];
      glyphs.forEach(function (glyph, index) {
        var piece = node('span', { 'class': 'mario-celebrate-piece', text: glyph });
        piece.style.setProperty('--i', String(index));
        celebration.appendChild(piece);
      });
      if (stage) {
        addChild(celebration);
      }
      celebrationTimer = window.setTimeout(function () {
        celebrationTimer = null;
        clearCelebration();
      }, reduced ? 900 : celebrateMs);
    }

    /** Dọn TOÀN BỘ timer/listener/node — gọi khi rời màn. */
    function destroy() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
      if (celebrationTimer != null) {
        window.clearTimeout(celebrationTimer);
        celebrationTimer = null;
      }
      listeners.forEach(function (item) {
        if (item.node) {
          item.node.removeEventListener(item.type, item.handler);
        }
      });
      listeners = [];
      clearCelebration();
      if (bg) {
        bg.onerror = null;
        bg.onload = null;
      }
      ownNodes.forEach(function (child) {
        if (child && child.parentNode) {
          child.parentNode.removeChild(child);
        }
      });
      ownNodes = [];
      if (stage) {
        stage.classList.remove('game-stage--mario');
        stage.classList.remove('is-correct');
        stage.classList.remove('is-wrong');
        stage.classList.remove('is-fallback');
        stage.classList.remove('has-bg');
        stage.classList.remove('is-reduced');
      stage.classList.remove('is-jumping');
        if (ownStage && stage.parentNode) {
          stage.parentNode.removeChild(stage);
        }
      }
      stage = null;
      bg = null;
      coinsWrap = null;
      counter = null;
      hint = null;
      confirm = null;
      currentQuestion = null;
    }

    build();
    render(opts.question || null);

    return {
      render: render,
      onCorrect: onCorrect,
      onWrong: onWrong,
      celebrate: celebrate,
      destroy: destroy
    };
  }

  // ES5-safe: đăng ký nếu registry đã tồn tại; nếu chưa, Lead nối sau bằng tay.
  function register(factory) {
    var registry = KM.GameRegistry;
    if (!registry) {
      return;
    }
    if (typeof registry.register === 'function') {
      registry.register('mario-bros', factory);
      return;
    }
    var buckets = ['factories', 'games'];
    var i;
    for (i = 0; i < buckets.length; i += 1) {
      if (registry[buckets[i]] && typeof registry[buckets[i]] === 'object') {
        registry[buckets[i]]['mario-bros'] = factory;
        return;
      }
    }
    registry['mario-bros'] = factory;
  }

  KM.Games.marioBros = createGame;
  KM.Games['mario-bros'] = createGame;
  KM.Games.createMarioBros = createGame;
  register(createGame);

  return createGame;
}());
