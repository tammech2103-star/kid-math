/**
 * Test runtime sprite 4×4 (ADR-0003 / sprite-style-guide 2.3).
 * Chạy cùng KMTest trong tests/test-runner.html. test-runner phải cài rAF/cancelRaf
 * stub TRƯỚC khi nạp js/ui/sprite.js vì module capture window.requestAnimationFrame lúc load.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var RAF = window.__KMTestRaf;

  function makeCtx() {
    return {
      calls: [],
      clearCount: 0,
      transforms: [],
      imageSmoothingEnabled: false,
      setTransform: function (a, b, c, d, e, f) {
        this.transforms.push([a, b, c, d, e, f]);
      },
      clearRect: function () { this.clearCount += 1; },
      drawImage: function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
        this.calls.push({ sx: sx, sy: sy, sw: sw, sh: sh, dx: dx, dy: dy, dw: dw, dh: dh });
      }
    };
  }

  /**
   * Cài fake Image + fake canvas, trả environment để test điều khiển time/frame.
   * @param {Function} body nhận env {clock, advance, images, canvases, handles, create, makeMount}
   */
  function withSpriteEnv(body) {
    var realCreate = document.createElement;
    var realImage = window.Image;
    var hadOwnImage = Object.prototype.hasOwnProperty.call(window, 'Image');
    var perf = window.performance;
    var realNow = perf && perf.now;
    var hadOwnNow = !!(perf && Object.prototype.hasOwnProperty.call(perf, 'now'));
    var realMatchMedia = window.matchMedia;
    var hadOwnMatchMedia = Object.prototype.hasOwnProperty.call(window, 'matchMedia');
    var clock = 1000;
    var images = [];
    var canvases = [];
    var handles = [];
    var rect = { width: 300, height: 150 };

    function FakeImage() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.onload = null;
      this.onerror = null;
      this._src = '';
      images.push(this);
    }
    Object.defineProperty(FakeImage.prototype, 'src', {
      get: function () { return this._src; },
      set: function (value) { this._src = value; }
    });

    function makeMount() {
      var classes = [];
      var children = [];
      return {
        classes: classes,
        children: children,
        classList: {
          add: function (name) { if (classes.indexOf(name) < 0) { classes.push(name); } },
          remove: function (name) {
            var at = classes.indexOf(name);
            if (at >= 0) { classes.splice(at, 1); }
          },
          contains: function (name) { return classes.indexOf(name) >= 0; }
        },
        appendChild: function (node) {
          children.push(node);
          node.parentNode = this;
          return node;
        },
        removeChild: function (node) {
          var at = children.indexOf(node);
          if (at >= 0) { children.splice(at, 1); }
          node.parentNode = null;
          return node;
        }
      };
    }

    function makeCanvas() {
      var ctx = makeCtx();
      var canvas = {
        className: '',
        hidden: false,
        width: 300,
        height: 150,
        parentNode: null,
        attrs: {},
        style: {
          setProperty: function (key, value) { this[key] = value; }
        },
        setAttribute: function (key, value) { this.attrs[key] = value; },
        getBoundingClientRect: function () { return rect; },
        getContext: function () { return ctx; }
      };
      canvas.ctx = ctx;
      canvases.push(canvas);
      return canvas;
    }

    document.createElement = function (tag) {
      if (String(tag).toLowerCase() === 'canvas') {
        return makeCanvas();
      }
      return realCreate.call(document, tag);
    };
    window.Image = FakeImage;
    if (perf) {
      perf.now = function () { return clock; };
    }
    window.matchMedia = function () { return { matches: false }; };
    if (RAF) { RAF.reset(); }

    var env = {
      images: images,
      canvases: canvases,
      handles: handles,
      makeMount: makeMount,
      rect: rect,
      clock: function () { return clock; },
      advance: function (ms) { clock += ms; },
      create: function (options) {
        var handle = KM.Sprite.create(options);
        handles.push(handle);
        return handle;
      }
    };

    try {
      body(env);
    } finally {
      handles.forEach(function (handle) {
        try { handle.destroy(); } catch (error) { /* test đã destroy thì bỏ qua */ }
      });
      document.createElement = realCreate;
      if (hadOwnImage) { window.Image = realImage; } else { delete window.Image; }
      if (perf) {
        if (hadOwnNow) { perf.now = realNow; } else { delete perf.now; }
      }
      if (hadOwnMatchMedia) { window.matchMedia = realMatchMedia; } else { delete window.matchMedia; }
      if (RAF) { RAF.reset(); }
    }
  }

  function readySheet(env, width, height) {
    var img = env.images[env.images.length - 1];
    img.naturalWidth = width || 384;
    img.naturalHeight = height || 384;
    img.onload();
    return img;
  }

  function last(calls) {
    return calls[calls.length - 1];
  }

  T.suite('Sprite runtime — sheet 4×4 (ADR-0003)', function () {
    T.test('test_sprite_create_appends_canvas_and_uses_frame_size_when_unstyled', function () {
      withSpriteEnv(function (env) {
        // Arrange: rect 300×150 là default canvas chưa được CSS đặt size.
        var mount = env.makeMount();

        // Act
        env.create({ mount: mount, frameSize: 80, motionMs: 120 });

        // Assert
        T.eq(mount.children.length, 1);
        var canvas = mount.children[0];
        T.eq(canvas.className, 'km-sprite');
        T.eq(canvas.attrs['aria-hidden'], 'true');
        T.eq(canvas.style.width, '80px');
        T.eq(canvas.style.height, '80px');
        T.ok(canvas.width > 0 && canvas.height > 0, 'canvas phải được đặt kích thước backing store');
        T.eq(canvas.ctx.transforms.length, 1, 'phải setTransform theo devicePixelRatio');
      });
    });

    T.test('test_sprite_loads_sheet_and_draws_idle_frame_zero', function () {
      withSpriteEnv(function (env) {
        // Arrange
        var mount = env.makeMount();
        env.create({ mount: mount, src: 'sprite-env-loaded.webp', frameSize: 96 });

        // Act
        readySheet(env, 384, 384);
        var call = last(env.canvases[0].ctx.calls);

        // Assert
        T.ok(call, 'phải vẽ ngay sau khi ảnh load');
        T.deepEq([call.sx, call.sy, call.sw, call.sh], [0, 0, 96, 96]);
        T.deepEq([call.dx, call.dy], [0, 0]);
        T.ok(call.dw > 0 && call.dh > 0);
        T.eq(mount.classList.contains('is-sprite-fallback'), false);
      });
    });

    T.test('test_sprite_state_intervals_follow_speed_and_limits', function () {
      withSpriteEnv(function (env) {
        // Arrange: motionMs 200 → idle 240 (kẹp), move 200, action 160, cheer 200.
        var mount = env.makeMount();
        var handle = env.create({
          mount: mount, src: 'sprite-env-intervals.webp', motionMs: 200
        });
        readySheet(env);

        // Act + Assert: move 200ms → cột 1, hàng 1.
        handle.setState('move');
        env.advance(200);
        RAF.flush(env.clock());
        var call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [96, 96]);

        // idle: 240ms → cột 1, hàng 0.
        handle.setState('idle');
        env.advance(240);
        RAF.flush(env.clock());
        call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [96, 0]);

        // action: 160ms → cột 1, hàng 2.
        handle.setState('action');
        env.advance(160);
        RAF.flush(env.clock());
        call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [96, 192]);

        // cheer: 600ms/200 = frame 3 → cột 3, hàng 3.
        handle.setState('cheer');
        env.advance(600);
        RAF.flush(env.clock());
        call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [288, 288]);
      });
    });

    T.test('test_sprite_reduced_motion_draws_only_idle_frame_zero_and_no_raf', function () {
      withSpriteEnv(function (env) {
        // Arrange
        var mount = env.makeMount();
        var handle = env.create({
          mount: mount,
          src: 'sprite-env-reduced.webp',
          reducedMotion: true,
          motionMs: 120
        });

        // Act
        readySheet(env);
        var countAfterLoad = env.canvases[0].ctx.calls.length;
        handle.setState('cheer'); // reduced → vẽ ngay 1 frame idle, KHÔNG xếp rAF
        var countAfterState = env.canvases[0].ctx.calls.length;
        env.advance(2000);
        RAF.flush(env.clock());

        // Assert
        T.eq(countAfterState, countAfterLoad + 1,
          'setState ở reduced motion vẽ đúng 1 frame idle');
        T.eq(RAF.pending(), 0, 'reduced motion không được xếp rAF');
        T.eq(env.canvases[0].ctx.calls.length, countAfterState,
          'reduced motion không vẽ thêm khi thời gian trôi');
        var call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [0, 0], 'luôn vẽ idle frame 0');
      });
    });

    T.test('test_sprite_set_motion_false_freezes_frame_and_stops_loop', function () {
      withSpriteEnv(function (env) {
        // Arrange
        var mount = env.makeMount();
        var handle = env.create({ mount: mount, src: 'sprite-env-motion.webp', motionMs: 200 });
        readySheet(env);
        handle.setState('move');
        env.advance(200);
        RAF.flush(env.clock());

        // Act: đông frame, rồi cho thời gian trôi tiếp.
        handle.setMotion(false);
        var countAfterFreeze = env.canvases[0].ctx.calls.length;
        env.advance(400);
        RAF.flush(env.clock());

        // Assert
        T.eq(RAF.pending(), 0, ' phải dừng vòng rAF chung');
        T.eq(env.canvases[0].ctx.calls.length, countAfterFreeze, 'không vẽ khi đã dừng');

        // Act + Assert: resume đúng pha, không cộng thời gian pause.
        handle.setMotion(true);
        T.eq(RAF.pending(), 1);
        env.advance(200);
        RAF.flush(env.clock());
        var call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [192, 96], 'resume phải nhảy đúng frame tiếp theo');
      });
    });

    T.test('test_sprite_action_returns_to_idle_and_cheer_holds_last_frame', function () {
      withSpriteEnv(function (env) {
        // Arrange
        var mount = env.makeMount();
        var handle = env.create({ mount: mount, src: 'sprite-env-cycle.webp', motionMs: 200 });
        readySheet(env);

        // Act: action chạy đúng 4 frame (160ms/frame) rồi về idle.
        handle.setState('action');
        env.advance(640);
        RAF.flush(env.clock());
        var call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [0, 0], 'action xong phải về idle frame 0');

        // Act + Assert: cheer giữ frame cuối dù thời gian vẫn chạy.
        handle.setState('cheer');
        env.advance(1000);
        RAF.flush(env.clock());
        call = last(env.canvases[0].ctx.calls);
        T.deepEq([call.sx, call.sy], [288, 288], 'cheer phải giữ frame 3');
      });
    });

    T.test('test_sprite_destroy_removes_canvas_and_handles_invalid_mount', function () {
      withSpriteEnv(function (env) {
        // Arrange
        var mount = env.makeMount();
        var canvas;
        var clearBefore;
        var handle = env.create({ mount: mount, src: 'sprite-env-destroy.webp' });
        readySheet(env);
        canvas = env.canvases[0];
        clearBefore = canvas.ctx.clearCount;
        T.eq(RAF.pending(), 1);

        // Act
        handle.destroy();

        // Assert
        T.eq(mount.children.length, 0, 'destroy phải gỡ canvas khỏi mount');
        T.ok(canvas.ctx.clearCount > clearBefore, 'destroy phải xoá nội dung canvas');
        T.eq(RAF.pending(), 0, 'destroy phải dừng rAF');
        handle.destroy(); // idempotent

        // Act + Assert: mount thiếu → handle inert, không ném lỗi.
        var inert = env.create({});
        T.eq(typeof inert.setState, 'function');
        T.eq(typeof inert.setMotion, 'function');
        T.eq(typeof inert.destroy, 'function');
        inert.setState('action');
        inert.setMotion(true);
        inert.destroy();

        // Act + Assert: không có src → fallback, canvas bị ẩn.
        var fallbackMount = env.makeMount();
        env.create({ mount: fallbackMount });
        T.eq(fallbackMount.classList.contains('is-sprite-fallback'), true);
        T.eq(fallbackMount.children[0].hidden, true);
      });
    });
  });
}());
