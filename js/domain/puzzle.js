/**
 * Bộ sưu tập 21 mảnh ghép Trường vui — logic thuần, không đụng DOM.
 * ADR-0002: lưu trong `progress.state.puzzle`, trao theo HOÀN THÀNH bài học,
 * không phụ thuộc hạng nhất/nhì. Mọi thông số đọc từ `tuning.puzzle`
 * với default an toàn nếu tuning.js chưa cập nhật.
 * @namespace KM.Puzzle
 */
window.KM = window.KM || {};

KM.Puzzle = (function () {
  'use strict';

  var DEFAULT_COLS = 7;
  var DEFAULT_ROWS = 3;
  var DEFAULT_REVEAL_MS = 900;
  var DEFAULT_SRC = 'Asset/v2/vex/school-reward.svg';

  /** @param {*} value @param {number} fallback @param {number} min @param {number} max */
  function clampInt(value, fallback, min, max) {
    var number = Number(value);
    if (!isFinite(number) || Math.floor(number) !== number) {
      return fallback;
    }
    return Math.max(min, Math.min(max, number));
  }

  /**
   * Đọc cấu hình puzzle. `ctx.tuning.puzzle` có thể chưa tồn tại ở các đợt trước.
   * @param {object} tuning
   * @returns {{cols: number, rows: number, revealMs: number}}
   */
  function readConfig(tuning) {
    var source = tuning || (window.KM.Tuning || {});
    var config = source.puzzle && typeof source.puzzle === 'object' ? source.puzzle : {};
    return {
      cols: clampInt(config.cols, DEFAULT_COLS, 1, 21),
      rows: clampInt(config.rows, DEFAULT_ROWS, 1, 21),
      revealMs: clampInt(config.revealMs, DEFAULT_REVEAL_MS, 0, 10000)
    };
  }

  /** @returns {string} Đường dẫn ảnh gốc, dùng chung với Components. */
  function src() {
    return window.KM.Components && KM.Components.PUZZLE_SRC
      ? KM.Components.PUZZLE_SRC
      : DEFAULT_SRC;
  }

  /** @param {number} value @returns {string} Tỷ lệ phần trăm gọn (tối đa 4 chữ số). */
  function percent(value) {
    return String(Number(value.toFixed(4)));
  }

  /**
   * Tạo service bộ sưu tập.
   * @param {{progress: object, curriculum: object, tuning: object}} options
   * @returns {object} service theo hợp đồng ADR-0002
   */
  function create(options) {
    var opts = options || {};
    var progress = opts.progress || null;
    var curriculum = opts.curriculum || (window.KM.Curriculum || null);
    var config = readConfig(opts.tuning);
    var cols = config.cols;
    var rows = config.rows;
    var totalCount = cols * rows;
    var lessons = curriculum && Array.isArray(curriculum.lessons) ? curriculum.lessons : [];
    /* Mảnh trao trong phiên này khi progress là mock chỉ đọc (phục vụ unit test). */
    var granted = [];

    /**
     * @param {number} index
     * @returns {boolean}
     */
    function validIndex(index) {
      var value = Number(index);
      return isFinite(value) && Math.floor(value) === value && value >= 0 && value < totalCount;
    }

    /** @param {string} lessonId @returns {number} index theo thứ tự curriculum, hoặc -1. */
    function indexFor(lessonId) {
      var i;
      if (!lessonId) {
        return -1;
      }
      for (i = 0; i < lessons.length; i += 1) {
        if (lessons[i].id === lessonId) {
          return i < totalCount ? i : -1;
        }
      }
      return -1;
    }

    /**
     * @param {number} index
     * @returns {object|null} bài học tương ứng (tiện hiển thị nhãn mảnh).
     */
    function lessonFor(index) {
      return validIndex(index) ? lessons[index] || null : null;
    }

    /**
     * Danh sách index đã có, gộp cả mảnh vừa trao trong phiên hiện tại.
     * @returns {Array<number>} bản sao, đã sort, không trùng.
     */
    function pieces() {
      var list = [];
      var seen = {};
      var stored = [];
      if (progress && typeof progress.puzzle === 'function') {
        var snapshot = progress.puzzle();
        stored = snapshot && Array.isArray(snapshot.pieces) ? snapshot.pieces : [];
      }
      stored = stored.concat(granted);
      stored.forEach(function (value) {
        var index = Number(value);
        if (!validIndex(index) || seen[index]) {
          return;
        }
        seen[index] = true;
        list.push(index);
      });
      list.sort(function (a, b) { return a - b; });
      return list;
    }

    /**
     * @param {number} index
     * @returns {boolean}
     */
    function hasIndex(index) {
      return validIndex(index) && pieces().indexOf(Number(index)) !== -1;
    }

    /**
     * @param {string} lessonId
     * @returns {boolean}
     */
    function has(lessonId) {
      var index = indexFor(lessonId);
      return index >= 0 && hasIndex(index);
    }

    /** @returns {number} Số mảnh đang có. */
    function count() {
      return pieces().length;
    }

    /** @returns {number} Tổng số mảnh (cols × rows). */
    function total() {
      return totalCount;
    }

    /** @returns {boolean} Đã đủ bộ chưa. */
    function isComplete() {
      return count() >= totalCount;
    }

    /** @returns {{cols: number, rows: number}} Kích thước lưới. */
    function grid() {
      return { cols: cols, rows: rows };
    }

    /** @returns {number} Thời gian hiệu ứng nhận mảnh, đọc từ tuning. */
    function revealMs() {
      return config.revealMs;
    }

    /**
     * Trao mảnh cho một bài. Idempotent: chơi lại không tăng số mảnh.
     * @param {string} lessonId
     * @returns {{added: boolean, index: number, isComplete: boolean}}
     */
    function award(lessonId) {
      var index = indexFor(lessonId);
      var complete = isComplete();
      if (index < 0) {
        return { added: false, index: -1, isComplete: complete };
      }
      if (hasIndex(index)) {
        return { added: false, index: index, isComplete: complete };
      }
      if (progress && typeof progress.awardPuzzlePiece === 'function') {
        progress.awardPuzzlePiece(index);
      } else {
        granted.push(index);
      }
      return { added: true, index: index, isComplete: isComplete() };
    }

    /**
     * CSS cắt ảnh: không sinh 21 file, dùng background-size/position.
     * @param {number} index
     * @returns {object} style đưa thẳng cho Components.el (thuộc tính dấu gạch ngang).
     */
    function styleFor(index) {
      var value = validIndex(index) ? Number(index) : 0;
      var column = value % cols;
      var row = Math.floor(value / cols);
      var x = cols > 1 ? (column / (cols - 1)) * 100 : 0;
      var y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
      return {
        'background-image': 'url("' + src() + '")',
        'background-size': (cols * 100) + '% ' + (rows * 100) + '%',
        'background-position': percent(x) + '% ' + percent(y) + '%',
        'background-repeat': 'no-repeat'
      };
    }

    return {
      pieces: pieces,
      has: has,
      award: award,
      count: count,
      total: total,
      isComplete: isComplete,
      grid: grid,
      src: src,
      styleFor: styleFor,
      /* Tiện ích bổ sung, không bắt buộc trong hợp đồng. */
      hasIndex: hasIndex,
      indexFor: indexFor,
      lessonFor: lessonFor,
      revealMs: revealMs
    };
  }

  return { create: create, src: src };
}());
