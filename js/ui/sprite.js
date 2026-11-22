/**
 * Sprite runtime dùng chung cho 21 bài: đọc sheet WebP 4×4 (384×384, ô 96)
 * và vẽ một frame lên `<canvas class="km-sprite">`.
 *
 * Không phụ thuộc vào game, registry, session hay progress. Mọi instance chia sẻ
 * MỘT vòng requestAnimationFrame và MỘT listener resize; vòng lặp tự dừng khi
 * không còn instance nào. Khi `prefers-reduced-motion` (hoặc caller truyền
 * reducedMotion) runtime chỉ vẽ frame 0 và không bao giờ gọi rAF.
 *
 * @example
 * var handle = KM.Sprite.create({
 *   mount: heroHost,                       // HTMLElement làm chủ canvas
 *   src: 'Asset/sprites/intro.webp',
 *   state: 'idle',
 *   reducedMotion: false,
 *   motionMs: 120,
 *   frameSize: 96
 * });
 * handle.setState('cheer');                // idle|move|action|cheer
 * handle.setMotion(false);                 // đông frame lại, không chạy rAF
 * handle.destroy();                        // lesson shell gọi khi rời màn
 *
 * @namespace KM.Sprite
 * @see docs/architecture/ADR-0003-per-game-identity-and-sprite-runtime.md
 * @see design/art/sprite-style-guide.md mục 2
 */
window.KM = window.KM || {};

KM.Sprite = (function () {
  'use strict';

  /** @type {Object<string, number>} Hàng của từng trạng thái trong sheet. */
  var ROW = { idle: 0, move: 1, action: 2, cheer: 3 };

  /** @type {Object<string, number>} Hệ số tốc độ theo sprite-style-guide 2.3. */
  var SPEED = { idle: 1.25, move: 1, action: 0.8, cheer: 1 };

  /** @type {Object<string, Array<number>>} Kẹp ms/frame theo từng trạng thái. */
  var LIMITS = {
    idle: [100, 240],
    move: [80, 220],
    action: [80, 200],
    cheer: [100, 220]
  };

  var DEFAULT_MOTION_MS = 240;
  var DEFAULT_FRAME_SIZE = 96;
  var FRAME_COUNT = 4;

  /** @type {Array<object>} Các handle còn sống. */
  var instances = [];

  /** @type {Object<string, object>} Ảnh được decode một lần cho mỗi src. */
  var imageCache = Object.create(null);

  var rafId = null;
  var resizeBound = false;
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || null;
  var cancelRaf = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || null;

  /**
   * Đồng thời gian với timestamp của requestAnimationFrame.
   * @returns {number}
   */
  function now() {
    return window.performance && typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();
  }

  /**
   * @param {*} value
   * @param {number} fallback
   * @returns {number} Số dương hữu hạn, hoặc fallback.
   */
  function positiveNumber(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * @param {number} base motionMs của entry.
   * @returns {Object<string, number>} ms/frame đã làm tròn và kẹp cho 4 trạng thái.
   */
  function intervalsFor(base) {
    var result = {};
    Object.keys(ROW).forEach(function (name) {
      var pair = LIMITS[name];
      result[name] = Math.round(Math.max(pair[0],
        Math.min(pair[1], base * SPEED[name])));
    });
    return result;
  }

  /**
   * @param {object} instance
   * @returns {boolean} Có cần được vẽ tiếp bởi vòng lặp chung hay không.
   */
  function animating(instance) {
    return !instance.destroyed && instance.ready && instance.motion &&
      !instance.reduced && !!instance.ctx;
  }

  /** Vẽ frame hiện tại; không tạo object/gradient trong vòng lặp. */
  function draw(instance) {
    if (!instance || instance.destroyed || !instance.ctx || !instance.image) {
      return;
    }
    var reference = instance.motion ? now() : instance.freezeAt;
    var elapsed = Math.max(0, reference - instance.stateAt);
    var step = instance.intervals[instance.state] || DEFAULT_MOTION_MS;
    var index = Math.floor(elapsed / step);
    var row = ROW[instance.state] || 0;

    // ADR/sprite guide: action chạy đúng 1 vòng rồi về idle; cheer giữ frame cuối.
    if (instance.state === 'action' && index >= FRAME_COUNT) {
      instance.state = 'idle';
      instance.stateAt = reference;
      row = ROW.idle;
      index = 0;
    }
    if (instance.reduced) {
      row = ROW.idle;
      index = 0;
    }
    if (row === ROW.cheer && index >= FRAME_COUNT && !instance.reduced) {
      index = FRAME_COUNT - 1;
    }
    var col = instance.reduced ? 0 : index % FRAME_COUNT;

    instance.ctx.clearRect(0, 0, instance.cssWidth, instance.cssHeight);
    instance.ctx.drawImage(
      instance.image,
      col * instance.cellWidth, row * instance.cellHeight,
      instance.cellWidth, instance.cellHeight,
      0, 0, instance.cssWidth, instance.cssHeight
    );
  }

  /** Đảm bảo đúng một vòng rAF đang chạy khi có ít nhất một sprite hoạt động. */
  function ensureLoop() {
    if (!raf || rafId !== null) {
      return;
    }
    for (var i = 0; i < instances.length; i += 1) {
      if (animating(instances[i])) {
        rafId = raf(tick);
        return;
      }
    }
  }

  /** Hủy vòng rAF chung nếu không còn sprite nào cần chạy. */
  function stopLoopIfIdle() {
    if (rafId === null) {
      return;
    }
    for (var i = 0; i < instances.length; i += 1) {
      if (animating(instances[i])) {
        return;
      }
    }
    if (cancelRaf) {
      cancelRaf(rafId);
    }
    rafId = null;
  }

  /**
   * @param {number} timestamp DOMHighResTimeStamp từ rAF.
   */
  function tick(timestamp) {
    rafId = null;
    for (var i = 0; i < instances.length; i += 1) {
      if (animating(instances[i])) {
        draw(instances[i]);
      }
    }
    ensureLoop();
  }

  /** Đo lại canvas theo CSS và đặt lại transform sau mỗi lần đổi kích thước. */
  function measure(instance) {
    var canvas = instance.canvas;
    if (!canvas) {
      return;
    }
    var rect = typeof canvas.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : { width: 0, height: 0 };
    var width = rect.width;
    var height = rect.height;
    // Canvas chưa được CSS đặt kích thước có default 300×150 → ép về ô vuông.
    if (!(width > 0) || !(height > 0) || (width === 300 && height === 150)) {
      width = instance.frameSize;
      height = instance.frameSize;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    instance.cssWidth = width;
    instance.cssHeight = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    instance.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (instance.ctx) {
      instance.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      instance.ctx.imageSmoothingEnabled = true;
    }
  }

  /** Một listener resize duy nhất cho mọi sprite đang sống. */
  function onResize() {
    for (var i = 0; i < instances.length; i += 1) {
      measure(instances[i]);
      draw(instances[i]);
    }
  }

  function bindResize() {
    if (!resizeBound && window.addEventListener) {
      window.addEventListener('resize', onResize);
      resizeBound = true;
    }
  }

  function unbindResize() {
    if (resizeBound && window.removeEventListener) {
      window.removeEventListener('resize', onResize);
      resizeBound = false;
    }
  }

  /** Ảnh lỗi: ẩn canvas, giữ nguyên emoji/CSS fallback của game, không log lỗi. */
  function markFallback(instance) {
    instance.ready = false;
    instance.image = null;
    if (instance.canvas) {
      instance.canvas.hidden = true;
      instance.canvas.style.display = 'none';
    }
    if (instance.mount && instance.mount.classList) {
      instance.mount.classList.add('is-sprite-fallback');
    }
  }

  /**
   * Gắn một instance đã đăng ký vào ảnh trong cache (hoặc vào hàng chờ).
   * @param {object} instance
   * @param {object} cache
   */
  function applyImage(instance, cache) {
    if (instance.destroyed) {
      return;
    }
    if (cache.state !== 'ready') {
      markFallback(instance);
      return;
    }
    instance.ready = true;
    instance.image = cache.img;
    instance.cellWidth = cache.cellWidth;
    instance.cellHeight = cache.cellHeight;
    draw(instance);
    ensureLoop();
  }

  /** Phân phối kết quả decode cho mọi instance đang chờ cùng một src. */
  function flush(cache) {
    var waiting = cache.waiters;
    cache.waiters = [];
    for (var i = 0; i < waiting.length; i += 1) {
      applyImage(waiting[i], cache);
    }
    if (cache.state === 'error' && cache.img) {
      cache.img.onload = null;
      cache.img.onerror = null;
    }
  }

  /**
   * Tải (và cache) sheet theo src. Không set crossOrigin, không fetch.
   * @param {string} src
   * @param {object} instance
   */
  function loadImage(src, instance) {
    var cache = imageCache[src];
    if (!cache) {
      cache = imageCache[src] = {
        img: null, state: 'loading', cellWidth: 0, cellHeight: 0, waiters: []
      };
      var img = typeof Image === 'function' ? new Image() : null;
      cache.img = img;
      if (!img) {
        cache.state = 'error';
        flush(cache);
      } else {
        img.onload = function () {
          var width = img.naturalWidth || img.width;
          var height = img.naturalHeight || img.height;
          if (width > 0 && height > 0 && width % FRAME_COUNT === 0 &&
              height % FRAME_COUNT === 0) {
            cache.state = 'ready';
            cache.cellWidth = width / FRAME_COUNT;
            cache.cellHeight = height / FRAME_COUNT;
          } else {
            cache.state = 'error';
          }
          flush(cache);
        };
        img.onerror = function () {
          cache.state = 'error';
          flush(cache);
        };
        img.src = src;
      }
    }
    instance.cache = cache;
    if (cache.state === 'loading') {
      cache.waiters.push(instance);
    } else {
      applyImage(instance, cache);
    }
  }

  /** Bỏ đăng ký một instance khỏi hàng chờ của cache ảnh. */
  function forgetImage(instance) {
    var cache = instance.cache;
    if (!cache || !cache.waiters) {
      return;
    }
    var index = cache.waiters.indexOf(instance);
    if (index >= 0) {
      cache.waiters.splice(index, 1);
    }
  }

  /**
   * Tạo một sprite handle. Canvas do runtime tạo bên trong `mount`;
   * người gọi (lesson shell) chịu trách nhiệm gọi `destroy()`.
   *
   * @param {{mount: HTMLElement, src: string, state: string,
   *   reducedMotion: boolean, motionMs: number, frameSize: number}} options
   * @returns {{setState: Function, setMotion: Function, destroy: Function}}
   */
  function create(options) {
    var opts = options || {};
    var mount = opts.mount;

    /** @type {object} Handle an toàn khi mount thiếu (không ném lỗi). */
    function inert() {
      return {
        setState: function () {},
        setMotion: function () {},
        destroy: function () {}
      };
    }

    if (!mount || typeof mount.appendChild !== 'function') {
      return inert();
    }

    var mediaReduce = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var state = ROW[opts.state] != null ? opts.state : 'idle';
    var base = Math.max(16, Math.min(5000,
      positiveNumber(opts.motionMs, DEFAULT_MOTION_MS)));
    var started = now();

    var instance = {
      mount: mount,
      canvas: document.createElement('canvas'),
      ctx: null,
      image: null,
      cache: null,
      ready: false,
      destroyed: false,
      reduced: !!opts.reducedMotion || mediaReduce,
      motion: true,
      state: state,
      stateAt: started,
      freezeAt: started,
      intervals: intervalsFor(base),
      frameSize: positiveNumber(opts.frameSize, DEFAULT_FRAME_SIZE),
      cellWidth: DEFAULT_FRAME_SIZE,
      cellHeight: DEFAULT_FRAME_SIZE,
      cssWidth: DEFAULT_FRAME_SIZE,
      cssHeight: DEFAULT_FRAME_SIZE
    };

    instance.canvas.className = 'km-sprite';
    instance.canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(instance.canvas);
    measure(instance);
    instances.push(instance);
    bindResize();

    var src = typeof opts.src === 'string' && opts.src ? opts.src : null;
    if (src) {
      loadImage(src, instance);
    } else {
      markFallback(instance);
    }

    return {
      /**
       * Đổi trạng thái: idle/move lặp; action chạy 1 vòng rồi về idle;
       * cheer giữ frame cuối. Reduced-motion luôn vẽ idle frame 0.
       * @param {string} name
       */
      setState: function (name) {
        if (instance.destroyed || ROW[name] == null || instance.state === name) {
          return;
        }
        instance.state = name;
        instance.stateAt = now();
        instance.freezeAt = instance.stateAt;
        if (!animating(instance)) {
          draw(instance);
        }
        ensureLoop();
      },

      /**
       * Bật/tắt chuyển động. Tắt → đông frame hiện tại và dừng rAF chung
       * (nếu không còn instance nào khác đang chạy).
       * @param {boolean} enabled
       */
      setMotion: function (enabled) {
        if (instance.destroyed) {
          return;
        }
        var next = !!enabled && !instance.reduced;
        if (next === instance.motion) {
          return;
        }
        var changedAt = now();
        // Resume đúng pha hiện tại: thời gian paused không được tính vào frame.
        if (next) {
          instance.stateAt += Math.max(0, changedAt - instance.freezeAt);
        }
        instance.motion = next;
        instance.freezeAt = changedAt;
        if (next) {
          ensureLoop();
        } else {
          draw(instance);
          stopLoopIfIdle();
        }
      },

      /** Hủy đăng ký, xoá canvas, dọn cache chờ và dừng rAF/listener nếu rỗng. */
      destroy: function () {
        if (instance.destroyed) {
          return;
        }
        instance.destroyed = true;
        forgetImage(instance);
        var index = instances.indexOf(instance);
        if (index >= 0) {
          instances.splice(index, 1);
        }
        if (instance.ctx) {
          instance.ctx.clearRect(0, 0, instance.cssWidth, instance.cssHeight);
        }
        if (instance.canvas && instance.canvas.parentNode) {
          instance.canvas.parentNode.removeChild(instance.canvas);
        }
        if (mount && mount.classList) {
          mount.classList.remove('is-sprite-fallback');
        }
        instance.canvas = null;
        instance.ctx = null;
        instance.image = null;
        instance.cache = null;
        stopLoopIfIdle();
        if (instances.length === 0) {
          unbindResize();
        }
      }
    };
  }

  return { create: create };
}());
