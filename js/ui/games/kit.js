/**
 * KM.GameKit — helper dùng chung cho 18 minigame Giai đoạn C.
 *
 * Nguồn thiết kế: design/quick-specs/all-21-distinct-games.md (mục 0 + mục 2),
 * docs/architecture/game-module-interface.md, ADR-0002/ADR-0003.
 *
 * Kit CHỈ dựng DOM/phản hồi thị giác và gọi `onAnswer(choice.value)` đúng 1 lần.
 * Không đụng LessonSession/Progress/Question/RNG/speech/storage. Không tự huỷ
 * sprite handle (lesson shell sở hữu) — chỉ đổi state qua setState/setMotion.
 *
 * API: node/el, findChoice, isReduced, spriteAction, reducedClass, makeGrid,
 * tuneNumber, register, base(options, spec) → instance 5 phương thức.
 * ES5-safe, không import/export.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.GameKit = (function () {
  'use strict';

  var STAGE_CLASSES = ['is-correct', 'is-wrong'];

  /** Nút chạm tối thiểu 64px, dùng cho mọi thao tác chính. */
  var BTN_STYLE = {
    'min-width': '64px',
    'min-height': '64px',
    border: '3px solid rgba(255,255,255,0.96)',
    'border-radius': '18px',
    background: 'rgba(255,255,255,0.9)',
    color: '#22324a',
    'font-size': 'clamp(1.2rem, 3.4vw, 1.8rem)',
    'font-weight': '900',
    'line-height': '1.1',
    cursor: 'pointer',
    'touch-action': 'manipulation',
    padding: '6px 10px',
    'box-shadow': '0 5px 0 rgba(35,52,77,0.18)'
  };

  /** @returns {HTMLElement} Dùng Components.el khi có, fallback nội bộ. */
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
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (prop) {
          if (value[prop] != null) {
            el.style.setProperty(prop, String(value[prop]));
          }
        });
      } else if (key === 'on' && typeof value === 'object') {
        Object.keys(value).forEach(function (type) {
          el.addEventListener(type, value[type]);
        });
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    });
    append(el, children);
    return el;
  }

  function append(host, kids) {
    if (kids == null) {
      return;
    }
    if (Array.isArray(kids)) {
      kids.forEach(function (kid) { append(host, kid); });
    } else if (kids.nodeType) {
      host.appendChild(kids);
    } else {
      host.appendChild(document.createTextNode(String(kids)));
    }
  }

  var el = node;

  /** G1: choice đầu tiên có value === v (đọc thêm dạng chuỗi cho câu text). */
  function findChoice(question, value) {
    var list = (question && question.choices) || [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].value === value) {
        return list[i];
      }
    }
    for (i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].value != null && String(list[i].value) === String(value)) {
        return list[i];
      }
    }
    return null;
  }

  function isReduced(explicit) {
    if (explicit === true) {
      return true;
    }
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** Chỉ đổi frame của sprite do shell sở hữu; KHÔNG gọi destroy(). */
  function spriteAction(sprite, name) {
    if (!sprite || typeof sprite.setState !== 'function') {
      return;
    }
    try {
      sprite.setState(name);
    } catch (error) {
      // Sprite là trang trí: lỗi không được làm gãy gameplay.
    }
  }

  function spriteMotion(sprite, enabled) {
    if (!sprite || typeof sprite.setMotion !== 'function') {
      return;
    }
    try {
      sprite.setMotion(!!enabled);
    } catch (error) {
      // Bỏ qua — shell vẫn giữ quyền sở hữu handle.
    }
  }

  function reducedClass(target, reduced) {
    if (target && target.classList && reduced) {
      target.classList.add('is-reduced');
    }
    return target;
  }

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

  /** Lưới ô bấm được (≥64px). Trả wrap + cells + at(row,col). */
  function makeGrid(k, options) {
    var opts = options || {};
    var rows = Math.max(1, opts.rows || 3);
    var cols = Math.max(1, opts.cols || 3);
    var wrap = node('div', {
      'class': (opts.cellClass || 'km-cell') + '-wrap',
      'style': {
        display: 'grid',
        'grid-template-columns': 'repeat(' + cols + ', minmax(64px, 1fr))',
        gap: String(opts.gap || 8) + 'px',
        'justify-content': 'center'
      }
    });
    var cells = [];
    var index = 0;
    var r;
    var c;
    for (r = 0; r < rows; r += 1) {
      for (c = 0; c < cols; c += 1) {
        (function (row, col, at) {
          var cell = node('button', {
            'class': opts.cellClass || 'km-cell',
            type: 'button',
            'data-cell': String(at),
            'data-row': String(row),
            'data-col': String(col),
            'aria-label': opts.label ? opts.label(at, row, col) : 'Ô thứ ' + (at + 1),
            'style': {
              'min-width': '64px',
              'min-height': '64px',
              border: '3px solid rgba(255,255,255,0.95)',
              'border-radius': '16px',
              background: k && k.reduced ? '#ffffff' : 'rgba(255,255,255,0.82)',
              color: '#25334a',
              'font-size': '1.6rem',
              'font-weight': '900',
              cursor: 'pointer',
              'touch-action': 'manipulation',
              padding: '4px'
            }
          });
          cells.push(cell);
          wrap.appendChild(cell);
        }(r, c, index));
        index += 1;
      }
    }
    return {
      wrap: wrap,
      cells: cells,
      at: function (row, col) {
        if (row < 0 || row >= rows || col < 0 || col >= cols) {
          return null;
        }
        return cells[row * cols + col];
      }
    };
  }

  /** Tìm con gần nhất có data-attr (dùng cho listener uỷ quyền). */
  function closestData(from, boundary, attr) {
    var target = from;
    while (target && target !== boundary) {
      if (target.getAttribute && target.getAttribute(attr) != null) {
        return target;
      }
      target = target.parentNode;
    }
    return null;
  }

  function register(gameId, factory) {
    var registry = KM.GameRegistry;
    if (!registry || typeof registry.register !== 'function') {
      return;
    }
    registry.register(gameId, factory);
  }

  /**
   * Khung dùng chung: hợp đồng 5 phương thức + dọn timer/listener/node + hint.
   * spec = {gameId, lessonId, tribute, prefix, hint, build(k), render(k,q),
   *         onRight(k,result), onWrong(k,choice), celebrate(k)}
   */
  function base(options, spec) {
    var opts = options || {};
    var ctx = opts.ctx || {};
    var mount = opts.mount || null;
    var sprite = opts.sprite || null;
    var reduced = isReduced(opts.reducedMotion);
    var t = gameTuning(ctx);
    var onAnswer = typeof opts.onAnswer === 'function' ? opts.onAnswer : function () {};

    var timers = [];
    var listeners = [];
    var ownNodes = [];
    var celebration = null;
    var celebrationTimer = null;
    var stage = null;
    var ownStage = false;
    var root = null;
    var hintNode = null;
    var q = opts.question || null;
    var locked = false;
    var done = false;
    var stageClass = 'game-stage--' + (spec.prefix || 'km');

    var wrongMs = tuneNumber(t, ['wrongShakeMs'], 360);
    var celebrateMs = tuneNumber(t, ['celebrateMs'], 900);

    function later(fn, delay) {
      var id = window.setTimeout(fn, Math.max(0, delay));
      timers.push(id);
      return id;
    }

    function track(target, type, handler) {
      if (!target || typeof target.addEventListener !== 'function') {
        return;
      }
      target.addEventListener(type, handler);
      listeners.push({ node: target, type: type, handler: handler });
    }

    function add(child) {
      if (child && root) {
        root.appendChild(child);
      }
      return child;
    }

    function hint(text) {
      if (hintNode) {
        hintNode.textContent = text;
      }
    }

    function find(value) {
      return findChoice(q, value);
    }

    /** G1 + guard chặn trả lời 2 lần. @returns {boolean} */
    function answer(value) {
      if (locked || done || !q) {
        return false;
      }
      var choice = findChoice(q, value);
      if (!choice) {
        hint('Bé chọn lại nhé.');
        return false;
      }
      locked = true;
      spriteAction(sprite, 'action');
      onAnswer(choice.value);
      return true;
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

    function flash(ok) {
      if (!stage) {
        return;
      }
      stage.classList.remove(ok ? 'is-wrong' : 'is-correct');
      stage.classList.add(ok ? 'is-correct' : 'is-wrong');
      later(function () {
        if (stage) {
          stage.classList.remove(ok ? 'is-wrong' : 'is-correct');
        }
      }, wrongMs);
    }

    var k = {
      options: opts,
      ctx: ctx,
      mount: mount,
      sprite: sprite,
      reduced: reduced,
      t: t,
      spec: spec,
      stage: null,
      root: null,
      hintNode: null,
      get q() { return q; },
      get locked() { return locked; },
      get done() { return done; },
      node: node,
      el: el,
      btn: function (attrs, children) {
        var source = attrs || {};
        var merged = {};
        var key;
        for (key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            merged[key] = source[key];
          }
        }
        var style = {};
        Object.keys(BTN_STYLE).forEach(function (prop) { style[prop] = BTN_STYLE[prop]; });
        Object.keys(source.style || {}).forEach(function (prop) {
          style[prop] = source.style[prop];
        });
        merged.style = style;
        merged.type = source.type || 'button';
        return node('button', merged, children);
      },
      find: find,
      findChoice: findChoice,
      track: track,
      later: later,
      add: add,
      hint: hint,
      answer: answer,
      flash: flash,
      makeGrid: function (o) { return makeGrid(k, o); },
      closestData: closestData,
      spriteAction: function (name) { spriteAction(sprite, name); },
      spriteMotion: function (enabled) { spriteMotion(sprite, enabled); },
      reducedClass: function (target) { return reducedClass(target, reduced); },
      tune: function (names, fallback) { return tuneNumber(t, names, fallback); },
      tuneString: function (names, fallback) { return tuneString(t, names, fallback); }
    };

    function build() {
      if (mount && mount.classList && mount.classList.contains('game-stage')) {
        stage = mount;
      } else {
        ownStage = true;
        stage = node('div', { 'class': 'game-stage', 'data-game': spec.gameId });
      }
      k.stage = stage;
      stage.classList.add(stageClass);
      if (reduced) {
        stage.classList.add('is-reduced');
      }

      root = node('div', {
        'class': (spec.prefix || 'km') + '-root',
        'role': 'group',
        'aria-label': spec.tribute || spec.gameId,
        'style': {
          position: 'relative',
          zIndex: '2',
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'stretch',
          gap: '6px',
          padding: '32px 10px 8px',
          'min-height': '148px'
        }
      });
      k.root = root;
      reducedClass(root, reduced);

      hintNode = node('p', {
        'class': (spec.prefix || 'km') + '-hint',
        role: 'status',
        'aria-live': 'polite',
        text: spec.hint || 'Chạm vào đáp án đúng nhé!',
        'style': {
          margin: '2px 0 0',
          'text-align': 'center',
          'font-size': 'clamp(0.85rem, 2.4vw, 1rem)',
          'font-weight': '800',
          color: '#25334a'
        }
      });
      k.hintNode = hintNode;

      if (spec.build) {
        spec.build(k);
      }
      if (hintNode.parentNode !== root) {
        root.appendChild(hintNode);
      }
      stage.appendChild(root);
      if (ownStage && mount && mount.appendChild) {
        mount.appendChild(stage);
      }
    }

    function render(question) {
      q = question || null;
      locked = false;
      done = false;
      clearCelebration();
      if (stage) {
        STAGE_CLASSES.forEach(function (name) { stage.classList.remove(name); });
      }
      hint(spec.hint || 'Chạm vào đáp án đúng nhé!');
      spriteAction(sprite, 'idle');
      if (spec.render) {
        spec.render(k, q);
      }
    }

    function onCorrect(result) {
      done = true;
      locked = true;
      flash(true);
      spriteAction(sprite, 'cheer');
      if (spec.onRight) {
        spec.onRight(k, result);
      }
      return result;
    }

    function onWrong(choice) {
      locked = false; // G3: bé được thử lại, không mất sao/không đổi câu.
      done = false;
      flash(false);
      spriteAction(sprite, 'idle');
      if (spec.onWrong) {
        spec.onWrong(k, choice);
      }
      return choice;
    }

    function celebrate() {
      clearCelebration();
      if (spec.celebrate) {
        spec.celebrate(k, reduced);
        return;
      }
      celebration = node('div', {
        'class': (spec.prefix || 'km') + '-celebrate',
        'aria-hidden': 'true',
        'style': {
          position: 'absolute',
          inset: '0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-around',
          'pointer-events': 'none',
          'font-size': 'clamp(1.4rem, 4vw, 2.4rem)'
        }
      });
      var glyphs = reduced ? ['🎉'] : ['🎉', '⭐', '🌈', '🎉', '✨', '⭐'];
      glyphs.forEach(function (glyph, index) {
        var piece = node('span', {
          'class': (spec.prefix || 'km') + '-celebrate-piece',
          text: glyph,
          'style': reduced ? {} : { animation: 'km-pop 700ms ease ' + (index * 70) + 'ms both' }
        });
        celebration.appendChild(piece);
      });
      stage.appendChild(celebration);
      ownNodes.push(celebration);
      celebrationTimer = window.setTimeout(function () {
        celebrationTimer = null;
        clearCelebration();
      }, reduced ? 900 : celebrateMs);
    }

    function destroy() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
      clearCelebration();
      listeners.forEach(function (item) {
        if (item.node && typeof item.node.removeEventListener === 'function') {
          item.node.removeEventListener(item.type, item.handler);
        }
      });
      listeners = [];
      ownNodes.forEach(function (child) {
        if (child && child.parentNode) {
          child.parentNode.removeChild(child);
        }
      });
      ownNodes = [];
      if (stage) {
        STAGE_CLASSES.forEach(function (name) { stage.classList.remove(name); });
        stage.classList.remove(stageClass);
        if (reduced) {
          stage.classList.remove('is-reduced');
        }
        if (ownStage && stage.parentNode) {
          stage.parentNode.removeChild(stage);
        }
      }
      stage = null;
      root = null;
      hintNode = null;
      q = null;
      sprite = null;
      k.stage = null;
      k.root = null;
      k.hintNode = null;
    }

    build();
    render(q);

    return {
      render: render,
      onCorrect: onCorrect,
      onWrong: onWrong,
      celebrate: celebrate,
      destroy: destroy
    };
  }

  return {
    node: node,
    el: el,
    append: append,
    findChoice: findChoice,
    isReduced: isReduced,
    spriteAction: spriteAction,
    spriteMotion: spriteMotion,
    reducedClass: reducedClass,
    gameTuning: gameTuning,
    tuneNumber: tuneNumber,
    tuneString: tuneString,
    makeGrid: makeGrid,
    closestData: closestData,
    register: register,
    base: base
  };
}());
