/**
 * Minigame bài `b5` — trồng hoa vào 2 luống, tách–gộp số
 * (cảm hứng: Animal Crossing).
 *
 * Theo ADR-0002: game CHỈ trình bày/tương tác và gọi onAnswer(choice.value).
 * Không đụng LessonSession/Progress/điểm; hàng đáp án của lesson.js giữ nguyên.
 * Art dựng mới (CSS pastel ấm + emoji), không copy asset Nintendo.
 * Hợp đồng createGame({ctx, question, mount, onAnswer, reducedMotion})
 *   -> { render, onCorrect, onWrong, celebrate, destroy }. ES5-safe.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.animalCrossing = (function () {
  'use strict';

  var LESSON_ID = 'b5';
  var TRIBUTE = 'Animal Crossing';
  var DEFAULT_BG = 'Asset/hd/b5.webp';

  /** @returns {object} ctx.tuning.game hoặc {} nếu chưa có. */
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

  /** Đọc 2 luống từ visual.groups của câu compose; fallback nếu thiếu. */
  function bedsFor(question, t) {
    var groups = question && question.visual && question.visual.groups;
    var cap = Math.max(tuneNumber(t, ['maxFlowers', 'flowerMax'], 5),
      typeof (question && question.answer) === 'number' ? question.answer : 5);
    if (groups && groups.length >= 2) {
      return [
        {
          count: Math.max(0, Math.min(cap, Math.round(groups[0].count || 0))),
          masked: !!groups[0].masked,
          glyph: groups[0].glyph || '🌷'
        },
        {
          count: Math.max(0, Math.min(cap, Math.round(groups[1].count || 0))),
          masked: !!groups[1].masked,
          glyph: groups[1].glyph || '🌼'
        }
      ];
    }
    var total = typeof (question && question.answer) === 'number' ? question.answer : 2;
    var first = Math.max(1, Math.round(total / 2));
    return [
      { count: Math.min(cap, first), masked: false, glyph: '🌷' },
      { count: Math.min(cap, Math.max(0, total - first)), masked: true, glyph: '🌼' }
    ];
  }

  /**
   * Tạo game trồng hoa.
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
    var bedsWrap = null;
    var hint = null;
    var basket = null;
    var celebration = null;
    var celebrationTimer = null;
    var currentQuestion = opts.question || null;

    var beds = [];
    var planted = [0, 0];
    var submitted = false;
    var done = false;

    var growMs = tuneNumber(t, ['flowerGrowMs', 'growMs'], 460);
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

    /** Nộp đáp án themed: số hoa đã trồng tổng hoặc luống bị che. */
    function submit() {
      if (submitted || done || !currentQuestion) {
        return;
      }
      var value = planted[0] + planted[1];
      // Câu dạng "tổng gồm first và mấy?" hỏi riêng luống thứ 2.
      var groups = currentQuestion.visual && currentQuestion.visual.groups;
      if (groups && groups.length >= 2 && groups[1].masked) {
        value = planted[1];
      }
      var choice = findChoice(currentQuestion, value);
      if (!choice) {
        return;
      }
      submitted = true; // chặn double-fire với hàng đáp án của lesson.js
      clearHint();
      onAnswer(choice.value);
    }

    function clearHint() {
      if (hint) {
        hint.textContent = 'Đã trồng xong! Bé giỏi quá 🎀';
      }
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

    /** Render lại 2 luống cho câu hiện tại. */
    function renderBeds() {
      if (!bedsWrap) {
        return;
      }
      while (bedsWrap.firstChild) {
        bedsWrap.removeChild(bedsWrap.firstChild);
      }
      beds.forEach(function (bed, bedIndex) {
        var flowers = node('div', {
          'class': 'ac-flowers',
          role: 'group',
          'aria-label': 'Luống hoa thứ ' + (bedIndex + 1) + ' có ' + bed.count + ' bông'
        });
        var i;
        for (i = 0; i < bed.count; i += 1) {
          var flower = node('button', {
            'class': 'ac-flower' + (bed.masked ? ' is-bud' : ''),
            type: 'button',
            'data-bed': String(bedIndex),
            'aria-label': 'Trồng bông hoa thứ ' + (i + 1) + ' ở luống ' + (bedIndex + 1)
          }, [
            node('span', {
              'class': 'ac-flower-glyph',
              text: bed.masked ? '🌱' : bed.glyph,
              'aria-hidden': 'true'
            })
          ]);
          if (reduced) {
            flower.classList.add('is-reduced');
          }
          flowers.appendChild(flower);
        }
        bedsWrap.appendChild(node('div', { 'class': 'ac-bed ac-bed--' + (bedIndex + 1) }, [
          node('span', { 'class': 'ac-bed-label', text: 'Luống ' + (bedIndex + 1) }),
          flowers,
          node('span', { 'class': 'ac-soil', 'aria-hidden': 'true' })
        ]));
      });
    }

    /** Một listener uỷ quyền cho cả hai luống — ổn định qua các lần render. */
    function handleBedClick(event) {
      var target = event.target;
      while (target && target !== bedsWrap &&
        !(target.classList && target.classList.contains('ac-flower'))) {
        target = target.parentNode;
      }
      if (!target || target === bedsWrap || done || target.classList.contains('is-planted')) {
        return;
      }
      var bedIndex = parseInt(target.getAttribute('data-bed'), 10);
      if (isNaN(bedIndex) || bedIndex < 0 || bedIndex >= beds.length) {
        return;
      }
      target.classList.add('is-planted');
      if (!reduced) {
        target.classList.add('is-growing');
        later(function () {
          target.classList.remove('is-growing');
        }, growMs);
      }
      var bud = target.querySelector('.ac-flower-glyph');
      if (bud && beds[bedIndex].masked) {
        bud.textContent = beds[bedIndex].glyph;
      }
      planted[bedIndex] += 1;
      if (hint) {
        hint.textContent = 'Bé đã trồng ' + (planted[0] + planted[1]) + ' bông hoa 🌸';
      }
      if (planted[bedIndex] >= beds[bedIndex].count &&
        planted[(bedIndex + 1) % 2] >= beds[(bedIndex + 1) % 2].count) {
        submit();
      }
    }

    function build() {
      if (mount && mount.classList && mount.classList.contains('game-stage')) {
        // lesson.js đã tạo mount = .game-stage (game-module-interface.md).
        stage = mount;
        stage.classList.add('game-stage--animal');
        if (reduced) {
          stage.classList.add('is-reduced');
        }
      } else {
        ownStage = true;
        stage = node('div', {
          'class': 'game-stage game-stage--animal' + (reduced ? ' is-reduced' : ''),
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
          // Ảnh HD chưa có: dùng gradient pastel + emoji, KHÔNG log lỗi.
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
        node('span', { 'class': 'fb-sun', text: '🌤️' }),
        node('span', { 'class': 'fb-grass', text: '🌿' }),
        node('span', { 'class': 'fb-butterfly', text: '🦋' }),
        node('span', { 'class': 'fb-flower', text: '🌷' })
      ]));

      if (!hasTributeLabel(mount)) {
        addChild(node('span', {
          'class': 'game-tribute',
          'data-tribute': LESSON_ID,
          text: '🎮 Cảm hứng: ' + TRIBUTE
        }));
      }

      bedsWrap = node('div', {
        'class': 'ac-garden',
        role: 'group',
        'aria-label': 'Hai luống hoa để bé tách và gộp'
      });
      track(bedsWrap, 'click', handleBedClick);

      hint = node('p', {
        'class': 'ac-hint',
        role: 'status',
        'aria-live': 'polite',
        text: 'Chạm vào từng bông hoa để trồng vào luống nhé!'
      });
      basket = node('div', { 'class': 'ac-basket', 'aria-hidden': 'true' }, [
        node('span', { text: '🧺' })
      ]);

      addChild(node('div', { 'class': 'ac-scene' }, [bedsWrap, hint, basket]));
      if (ownStage && mount && mount.appendChild) {
        mount.appendChild(stage);
      }
    }

    /** Cập nhật vườn hoa theo câu hiện tại. */
    function render(question) {
      currentQuestion = question || null;
      submitted = false;
      done = false;
      planted = [0, 0];
      beds = bedsFor(currentQuestion, t);
      clearCelebration();
      if (stage) {
        stage.classList.remove('is-correct', 'is-wrong', 'is-bloomed');
      }
      renderBeds();
      if (hint) {
        hint.textContent = 'Chạm vào từng bông hoa để trồng vào luống nhé!';
      }
    }

    /** Trả lời đúng: hoa nở rộ, giỏ hoa đầy. */
    function onCorrect(result) {
      done = true;
      submitted = true;
      if (stage) {
        stage.classList.add('is-correct');
        stage.classList.add('is-bloomed');
      }
      if (!reduced && bedsWrap) {
        var flowers = bedsWrap.querySelectorAll('.ac-flower');
        var i;
        for (i = 0; i < flowers.length; i += 1) {
          flowers[i].classList.add('is-bloom');
        }
      }
      return result;
    }

    /** Trả lời sai: lắc luống nhẹ và cho trồng lại. */
    function onWrong(choice) {
      if (stage) {
        stage.classList.add('is-wrong');
        later(function () {
          if (stage) {
            stage.classList.remove('is-wrong');
          }
        }, wrongMs);
      }
      planted = [0, 0];
      submitted = false;
      if (bedsWrap) {
        var flowers = bedsWrap.querySelectorAll('.ac-flower');
        var i;
        for (i = 0; i < flowers.length; i += 1) {
          flowers[i].classList.remove('is-planted');
          flowers[i].classList.remove('is-growing');
          flowers[i].classList.remove('is-bloom');
          var bud = flowers[i].querySelector('.ac-flower-glyph');
          var bedIndex = parseInt(flowers[i].getAttribute('data-bed'), 10);
          if (bud && beds[bedIndex] && beds[bedIndex].masked) {
            bud.textContent = '🌱';
          }
        }
      }
      if (hint) {
        hint.textContent = 'Chưa đúng, bé trồng lại nhé! 🌱';
      }
      return choice;
    }

    /** Ăn mừng: cánh hoa bay, tôn trọng reduced motion. */
    function celebrate() {
      clearCelebration();
      celebration = node('div', { 'class': 'ac-celebrate', 'aria-hidden': 'true' });
      var glyphs = reduced ? ['🌸'] : ['🌸', '🌼', '🌷', '✨', '🌸', '🌼'];
      glyphs.forEach(function (glyph, index) {
        var piece = node('span', { 'class': 'ac-celebrate-piece', text: glyph });
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

    /** Dọn toàn bộ timer/listener/node. */
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
        stage.classList.remove('game-stage--animal');
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
      bedsWrap = null;
      hint = null;
      basket = null;
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

  function register(factory) {
    var registry = KM.GameRegistry;
    if (!registry) {
      return;
    }
    if (typeof registry.register === 'function') {
      registry.register('animal-crossing', factory);
      return;
    }
    var buckets = ['factories', 'games'];
    var i;
    for (i = 0; i < buckets.length; i += 1) {
      if (registry[buckets[i]] && typeof registry[buckets[i]] === 'object') {
        registry[buckets[i]]['animal-crossing'] = factory;
        return;
      }
    }
    registry['animal-crossing'] = factory;
  }

  KM.Games.animalCrossing = createGame;
  KM.Games['animal-crossing'] = createGame;
  KM.Games.createAnimalCrossing = createGame;
  register(createGame);

  return createGame;
}());
