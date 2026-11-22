/**
 * Minigame bài `b20` — đua 1 đối 1 + bục trao thưởng (cảm hứng: Mario Kart 8).
 *
 * ADR-0002: giữ nguyên Race/RaceUI/result.js. Module này KHÔNG viết lại đua xe,
 * KHÔNG đụng bục trao thưởng ở màn result; nó chỉ thêm một lớp trang trí kiểu kart
 * + nền HD vào `mount`. `ctx.raceUI` (nếu có instance) chỉ được thêm class CSS,
 * không gọi lại create/showIntro/update. Game cũng không tự gọi onAnswer:
 * đáp án vẫn đi qua hàng đáp án của lesson.js như cũ.
 * Hợp đồng: createGame({ctx, question, mount, onAnswer, reducedMotion})
 *   -> { render, onCorrect, onWrong, celebrate, destroy }. ES5-safe.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioKart = (function () {
  'use strict';

  var LESSON_ID = 'b20';
  var TRIBUTE = 'Mario Kart 8';
  var DEFAULT_BG = 'Asset/hd/b20.webp';

  function gameTuning(ctx) {
    var tuning = (ctx && ctx.tuning) || {};
    return tuning.game || tuning.games || {};
  }

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

  function isReduced(explicit) {
    if (explicit === true) {
      return true;
    }
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** @returns {HTMLElement} */
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

  /**
   * Tạo lớp trang trí cho màn đua có sẵn.
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
    var stage = null;
    var ownStage = false;
    var ownNodes = [];
    var bg = null;
    var decor = null;
    var legLabel = null;
    var celebration = null;
    var celebrationTimer = null;
    var raceHud = null;
    var leg = 0;

    var boostMs = tuneNumber(t, ['kartBoostMs', 'boostMs'], 700);
    var wrongMs = tuneNumber(t, ['wrongShakeMs'], 600);
    var celebrateMs = tuneNumber(t, ['celebrateMs'], 1200);

    function later(fn, delay) {
      var id = window.setTimeout(fn, delay);
      timers.push(id);
      return id;
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

    /** Tìm RaceUI HUD đã có trong cùng lesson screen để "mặc áo" kart. */
    function findRaceHud() {
      var host = mount;
      while (host && host.parentNode &&
        !(host.classList && host.classList.contains('screen'))) {
        host = host.parentNode;
      }
      return host && typeof host.querySelector === 'function'
        ? host.querySelector('.race-hud')
        : null;
    }

    function setHudClass(name) {
      if (raceHud) {
        raceHud.classList.add(name);
        later(function () {
          if (raceHud) {
            raceHud.classList.remove(name);
          }
        }, boostMs);
      }
    }

    function build() {
      if (mount && mount.classList && mount.classList.contains('game-stage')) {
        // lesson.js đã tạo mount = .game-stage (game-module-interface.md).
        stage = mount;
        stage.classList.add('game-stage--kart');
        if (reduced) {
          stage.classList.add('is-reduced');
        }
      } else {
        ownStage = true;
        stage = node('div', {
          'class': 'game-stage game-stage--kart' + (reduced ? ' is-reduced' : ''),
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
          // Ảnh HD chưa có: gradient đường đua + emoji, KHÔNG log lỗi.
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
        node('span', { 'class': 'kart-rainbow', text: '🌈' }),
        node('span', { 'class': 'kart-cloud kart-cloud--a', text: '☁️' }),
        node('span', { 'class': 'kart-cloud kart-cloud--b', text: '☁️' })
      ]));

      if (!hasTributeLabel(mount)) {
        addChild(node('span', {
          'class': 'game-tribute',
          'data-tribute': LESSON_ID,
          text: '🎮 Cảm hứng: ' + TRIBUTE
        }));
      }

      decor = node('div', { 'class': 'kart-decor', 'aria-hidden': 'true' }, [
        node('span', { 'class': 'kart-flag', text: '🏁' }),
        node('span', { 'class': 'kart-boost', text: '💨' }),
        node('span', { 'class': 'kart-spark kart-spark--a', text: '✨' }),
        node('span', { 'class': 'kart-spark kart-spark--b', text: '✨' })
      ]);
      legLabel = node('p', {
        'class': 'kart-leg',
        role: 'status',
        'aria-live': 'polite',
        text: '🏁 Sẵn sàng lên xe!'
      });

      addChild(decor);
      addChild(legLabel);
      if (ownStage && mount && mount.appendChild) {
        mount.appendChild(stage);
      }

      // Chỉ thêm class trang trí cho HUD có sẵn; không tạo/sửa cuộc đua.
      raceHud = findRaceHud();
      if (raceHud) {
        raceHud.classList.add('is-kart-themed');
      }
    }

    /** Cập nhật nhãn chặng đua; không chạm race state. */
    function render(question) {
      leg += 1;
      if (stage) {
        stage.setAttribute('data-leg', String(leg));
      }
      if (legLabel) {
        legLabel.textContent = '🏁 Chặng ' + leg + ' — Chạm đáp án để tăng tốc!';
      }
      if (decor) {
        decor.classList.remove('is-boost', 'is-slip');
      }
      if (raceHud) {
        raceHud.classList.remove('is-boost', 'is-slip');
      }
    }

    /** Đúng: xe bắn tốc độ (chỉ là hiệu ứng trang trí). */
    function onCorrect(result) {
      if (stage) {
        stage.classList.add('is-correct');
      }
      if (decor && !reduced) {
        decor.classList.add('is-boost');
        var d = decor;
        later(function () { d.classList.remove('is-boost'); }, boostMs);
      }
      setHudClass('is-boost');
      return result;
    }

    /** Sai: trượt bánh nhẹ, không sửa race/points. */
    function onWrong(choice) {
      if (stage) {
        stage.classList.add('is-wrong');
        later(function () {
          if (stage) {
            stage.classList.remove('is-wrong');
          }
        }, wrongMs);
      }
      if (decor) {
        decor.classList.add('is-slip');
        var d = decor;
        later(function () { d.classList.remove('is-slip'); }, wrongMs);
      }
      setHudClass('is-slip');
      return choice;
    }

    /** Ăn mừng: cờ + cúp, không đụng podium của result.js. */
    function celebrate() {
      clearCelebration();
      celebration = node('div', { 'class': 'kart-celebrate', 'aria-hidden': 'true' });
      var glyphs = reduced ? ['🏆'] : ['🏆', '🎉', '🏁', '⭐', '🎉', '🏆'];
      glyphs.forEach(function (glyph, index) {
        var piece = node('span', { 'class': 'kart-celebrate-piece', text: glyph });
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

    /** Dọn timer + class đã thêm + node; giữ nguyên result/podium. */
    function destroy() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
      if (celebrationTimer != null) {
        window.clearTimeout(celebrationTimer);
        celebrationTimer = null;
      }
      clearCelebration();
      if (raceHud) {
        raceHud.classList.remove('is-kart-themed');
        raceHud.classList.remove('is-boost');
        raceHud.classList.remove('is-slip');
      }
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
        stage.classList.remove('game-stage--kart');
        stage.classList.remove('is-correct');
        stage.classList.remove('is-wrong');
        stage.classList.remove('is-fallback');
        stage.classList.remove('has-bg');
        stage.classList.remove('is-reduced');
        if (ownStage && stage.parentNode) {
          stage.parentNode.removeChild(stage);
        }
      }
      stage = null;
      bg = null;
      decor = null;
      legLabel = null;
      raceHud = null;
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

  function register(factory) {
    var registry = KM.GameRegistry;
    if (!registry) {
      return;
    }
    if (typeof registry.register === 'function') {
      registry.register('mario-kart', factory);
      return;
    }
    var buckets = ['factories', 'games'];
    var i;
    for (i = 0; i < buckets.length; i += 1) {
      if (registry[buckets[i]] && typeof registry[buckets[i]] === 'object') {
        registry[buckets[i]]['mario-kart'] = factory;
        return;
      }
    }
    registry['mario-kart'] = factory;
  }

  KM.Games.marioKart = createGame;
  KM.Games['mario-kart'] = createGame;
  KM.Games.createMarioKart = createGame;
  register(createGame);

  return createGame;
}());
