/**
 * Thành phần UI cho bộ sưu tập mảnh ghép: một ô mảnh và dải nhận mảnh.
 * ADR-0002: ô mảnh cắt từ một ảnh duy nhất bằng CSS, không sinh file mới.
 * @namespace KM.PuzzleUI
 */
window.KM = window.KM || {};
KM.PuzzleUI = (function () {
  'use strict';

  var el = KM.Components && KM.Components.el ? KM.Components.el : null;
  var DEFAULT_REVEAL_MS = 900;
  var shared = null;

  /** @param {number} value @returns {string} Số 2 chữ số, ví dụ 07. */
  function pad2(value) {
    return (Number(value) < 10 ? '0' : '') + Number(value);
  }

  /**
   * Service mặc định khi caller không truyền `puzzle` (fallback giữa các đợt).
   * @returns {object|null}
   */
  function sharedPuzzle() {
    if (shared === null && window.KM.Puzzle) {
      shared = KM.Puzzle.create({
        progress: null,
        curriculum: window.KM.Curriculum,
        tuning: window.KM.Tuning
      });
    }
    return shared;
  }

  /**
   * Style cắt ảnh dự phòng nếu domain puzzle chưa được tải.
   * @param {number} index
   * @returns {object}
   */
  function localStyle(index) {
    var source = window.KM.Tuning && KM.Tuning.puzzle ? KM.Tuning.puzzle : {};
    var cols = Number(source.cols) > 0 ? Math.floor(Number(source.cols)) : 7;
    var rows = Number(source.rows) > 0 ? Math.floor(Number(source.rows)) : 3;
    var value = Math.max(0, Math.min(cols * rows - 1, Math.floor(Number(index) || 0)));
    var column = value % cols;
    var row = Math.floor(value / cols);
    var x = cols > 1 ? (column / (cols - 1)) * 100 : 0;
    var y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
    return {
      'background-image': 'url("' + (KM.Components ? KM.Components.CAR_SRC : 'Asset/Mc_Queen.webp') + '")',
      'background-size': (cols * 100) + '% ' + (rows * 100) + '%',
      'background-position': Number(x.toFixed(4)) + '% ' + Number(y.toFixed(4)) + '%',
      'background-repeat': 'no-repeat'
    };
  }

  /**
   * @param {number} index
   * @param {object} [puzzle]
   * @returns {object} style CSS cho đúng ô ảnh.
   */
  function styleFor(index, puzzle) {
    var service = puzzle || sharedPuzzle();
    if (service && typeof service.styleFor === 'function') {
      return service.styleFor(index);
    }
    return localStyle(index);
  }

  /**
   * Tạo một ô trong lưới 7×3. Ô chưa có thì khung mờ + dấu `?`, ô có thì cắt ảnh thật.
   * @param {number} index index 0-based theo thứ tự curriculum.
   * @param {{revealed?: boolean, puzzle?: object, label?: string, style?: object}} [options]
   * @returns {HTMLElement}
   */
  function pieceNode(index, options) {
    var opts = options || {};
    var service = opts.puzzle || sharedPuzzle();
    var value = Math.max(0, Math.floor(Number(index) || 0));
    var total = service && typeof service.total === 'function' ? service.total() : 21;
    var revealed = opts.revealed === true;
    var label = opts.label || ('Mảnh ' + pad2(value + 1) + ' trên ' + total +
      (revealed ? '' : ' (chưa có)'));
    var style = opts.style || styleFor(value, service);
    var art = revealed
      ? el('span', { class: 'puzzle-piece-art', style: style, 'aria-hidden': 'true' })
      : el('span', { class: 'puzzle-piece-unknown', text: '?', 'aria-hidden': 'true' });

    return el('div', {
      class: 'puzzle-piece' + (revealed ? ' is-revealed' : ' is-locked'),
      role: 'img',
      'aria-label': label,
      dataset: { index: String(value) }
    }, [
      art,
      el('span', { class: 'puzzle-piece-no', text: pad2(value + 1), 'aria-hidden': 'true' })
    ]);
  }

  /** @param {object} options @returns {number} Thời gian hiệu ứng, ms. */
  function readDuration(options) {
    var value = Number(options.revealMs);
    if (!isFinite(value) || value <= 0) {
      var tuning = window.KM.Tuning;
      var configured = tuning && tuning.puzzle ? Number(tuning.puzzle.revealMs) : 0;
      value = isFinite(configured) && configured > 0 ? configured : DEFAULT_REVEAL_MS;
    }
    return Math.max(0, Math.min(10000, value));
  }

  /** @returns {boolean} Người dùng yêu cầu giảm chuyển động. */
  function reducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Dải "🎉 Nhận mảnh 07/21!" với mảnh nhỏ bay vào ô bộ sưu tập.
   * Tôn trọng reduced-motion: chỉ giữ text, bỏ qua chuyển động bay.
   * @param {{index: number, total: number, onDone?: Function, alreadyOwned?: boolean,
   *   revealMs?: number, puzzle?: object, style?: object, target?: HTMLElement,
   *   host?: HTMLElement}} options
   * @returns {{node: HTMLElement, destroy: Function, finish: Function}}
   */
  function revealBanner(options) {
    var opts = options || {};
    var index = Math.max(0, Math.floor(Number(opts.index) || 0));
    var total = Math.max(1, Math.floor(Number(opts.total) || 21));
    var already = opts.alreadyOwned === true;
    var quiet = reducedMotion();
    var duration = readDuration(opts);
    var message = already
      ? '🧩 Mảnh ' + pad2(index + 1) + '/' + total + ' đã có trong bộ sưu tập!'
      : '🎉 Nhận mảnh ' + pad2(index + 1) + '/' + total + '!';

    var fly = el('div', {
      class: 'puzzle-reveal-fly',
      style: opts.style || styleFor(index, opts.puzzle),
      'aria-hidden': 'true'
    });
    var ownTarget = !opts.target || typeof opts.target.appendChild !== 'function';
    var target = ownTarget
      ? el('span', { class: 'puzzle-reveal-target', text: '🧩', 'aria-hidden': 'true' })
      : opts.target;
    var children = [
      el('span', { class: 'puzzle-reveal-icon', text: already ? '🧩' : '🎉', 'aria-hidden': 'true' }),
      el('span', { class: 'puzzle-reveal-text', text: message }),
      fly
    ];
    if (ownTarget) {
      children.push(target);
    }
    var banner = el('div', {
      class: 'puzzle-reveal' + (quiet ? ' is-static' : ''),
      role: 'status',
      'aria-live': 'polite'
    }, children);
    banner.style.setProperty('--puzzle-reveal-ms', (duration / 1000) + 's');

    if (opts.host && typeof opts.host.appendChild === 'function') {
      opts.host.appendChild(banner);
    } else {
      document.body.appendChild(banner);
    }

    if (!quiet && fly.getBoundingClientRect && target.getBoundingClientRect) {
      var from = fly.getBoundingClientRect();
      var to = target.getBoundingClientRect();
      if (to.width > 0 || to.height > 0) {
        var dx = to.left + to.width / 2 - (from.left + from.width / 2);
        var dy = to.top + to.height / 2 - (from.top + from.height / 2);
        fly.style.setProperty('--fly-x', Math.round(dx) + 'px');
        fly.style.setProperty('--fly-y', Math.round(dy) + 'px');
      }
      banner.classList.add('is-flying');
    }

    var timer = null;
    var done = false;

    function clear() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }

    /** Kết thúc hiệu ứng, dọn node rồi báo cho caller. */
    function finish() {
      if (done) {
        return;
      }
      done = true;
      clear();
      if (typeof opts.onDone === 'function') {
        opts.onDone();
      }
    }

    /** Huỷ hiệu ứng, không gọi onDone. */
    function destroy() {
      if (done) {
        return;
      }
      done = true;
      clear();
    }

    timer = window.setTimeout(finish, quiet ? Math.min(duration, 400) : duration);
    return { node: banner, destroy: destroy, finish: finish };
  }

  return {
    pieceNode: pieceNode,
    revealBanner: revealBanner,
    styleFor: styleFor
  };
}());
