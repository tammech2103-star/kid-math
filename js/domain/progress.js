/**
 * Tiến độ học tập: sao từng bài, mở khoá tuần tự, cài đặt và đặt lại.
 * Nhận storage qua tham số để test được mà không cần localStorage thật.
 * ADR-0002: mảnh ghép McQueen nằm chung state `kidmath.v1` (không dùng key riêng).
 * @namespace KM.Progress
 */
window.KM = window.KM || {};

KM.Progress = (function () {
  'use strict';

  function defaultState() {
    return {
      v: 1,
      createdAt: Date.now(),
      settings: {
        speech: true,
        sfx: true,
        unlockAll: false,
        allowRetry: true
      },
      lessons: {},
      puzzle: { v: 1, pieces: [] }
    };
  }

  /**
   * Chuẩn hoá mảnh ghép: state cũ thiếu `puzzle` vẫn đọc được, không mất sao/cài đặt.
   * Chỉ giữ index nguyên không âm, loại trùng và sắp xếp tăng dần.
   * @param {*} raw
   * @returns {{v: number, pieces: Array<number>}}
   */
  function normalizePuzzle(raw) {
    var result = { v: 1, pieces: [] };
    if (!raw || typeof raw !== 'object') {
      return result;
    }
    if (Array.isArray(raw.pieces)) {
      var seen = {};
      raw.pieces.forEach(function (value) {
        var index = Number(value);
        if (!isFinite(index) || index < 0 || Math.floor(index) !== index || seen[index]) {
          return;
        }
        seen[index] = true;
        result.pieces.push(index);
      });
      result.pieces.sort(function (a, b) { return a - b; });
    }
    return result;
  }

  /**
   * @param {*} raw
   * @returns {object} state hợp lệ
   */
  function normalize(raw) {
    var state = defaultState();
    if (!raw || typeof raw !== 'object' || raw.v !== 1) {
      return state;
    }
    if (raw.settings && typeof raw.settings === 'object') {
      state.settings.speech = raw.settings.speech !== false;
      state.settings.sfx = raw.settings.sfx !== false;
      state.settings.unlockAll = raw.settings.unlockAll === true;
      state.settings.allowRetry = raw.settings.allowRetry !== false;
    }
    if (raw.lessons && typeof raw.lessons === 'object') {
      Object.keys(raw.lessons).forEach(function (id) {
        var entry = raw.lessons[id];
        if (!entry || typeof entry !== 'object') {
          return;
        }
        state.lessons[id] = {
          stars: Math.max(0, Math.min(3, Number(entry.stars) || 0)),
          best: Math.max(0, Number(entry.best) || 0),
          plays: Math.max(0, Number(entry.plays) || 0),
          lastPlayed: Number(entry.lastPlayed) || 0
        };
      });
    }
    state.puzzle = normalizePuzzle(raw.puzzle);
    return state;
  }

  /**
   * @param {{storage: object, tuning: object, curriculum: object}} options
   * @returns {object} progress service
   */
  function create(options) {
    var storage = options.storage;
    var tuning = options.tuning;
    var lessons = options.curriculum.lessons.slice();
    var state = normalize(storage.load(null));

    function save() {
      storage.save(state);
    }

    /** @returns {object} bản sao cài đặt. */
    function settings() {
      return {
        speech: state.settings.speech,
        sfx: state.settings.sfx,
        unlockAll: state.settings.unlockAll,
        allowRetry: state.settings.allowRetry
      };
    }

    /**
     * @param {string} key
     * @param {boolean} value
     * @returns {boolean} giá trị sau khi đổi.
     */
    function setSetting(key, value) {
      var allowed = ['speech', 'sfx', 'unlockAll', 'allowRetry'];
      if (allowed.indexOf(key) === -1) {
        return false;
      }
      state.settings[key] = value !== false;
      save();
      return state.settings[key];
    }

    /** @returns {number} */
    function starsFor(lessonId) {
      var entry = state.lessons[lessonId];
      return entry ? entry.stars : 0;
    }

    /** @returns {number} */
    function indexOf(lessonId) {
      var i;
      for (i = 0; i < lessons.length; i += 1) {
        if (lessons[i].id === lessonId) {
          return i;
        }
      }
      return -1;
    }

    /**
     * @param {string} lessonId
     * @returns {boolean}
     */
    function isUnlocked(lessonId) {
      if (state.settings.unlockAll) {
        return true;
      }
      var index = indexOf(lessonId);
      if (index <= 0) {
        return index === 0;
      }
      return starsFor(lessons[index - 1].id) >= 1;
    }

    /**
     * Ghi kết quả một bài.
     * @param {string} lessonId
     * @param {{stars: number, firstTryCorrect: number, bestStreak: number}} summary
     * @returns {{stars: number, isNewBest: boolean, totalStars: number, unlockedNext: boolean}}
     */
    function recordResult(lessonId, summary) {
      var entry = state.lessons[lessonId] || {
        stars: 0, best: 0, plays: 0, lastPlayed: 0
      };
      var stars = Math.max(0, Math.min(3, Number(summary.stars) || 0));
      var isNewBest = stars > entry.stars;

      entry.stars = Math.max(entry.stars, stars);
      entry.best = Math.max(entry.best, Number(summary.firstTryCorrect) || 0);
      entry.plays += 1;
      entry.lastPlayed = Date.now();
      state.lessons[lessonId] = entry;
      save();

      var index = indexOf(lessonId);
      var next = index >= 0 && index + 1 < lessons.length ? lessons[index + 1] : null;

      return {
        stars: entry.stars,
        isNewBest: isNewBest,
        totalStars: totalStars(),
        unlockedNext: !!(next && isUnlocked(next.id)),
        nextLessonId: next ? next.id : null
      };
    }

    /** @returns {number} */
    function totalStars() {
      return lessons.reduce(function (sum, lesson) {
        return sum + starsFor(lesson.id);
      }, 0);
    }

    /** @returns {number} */
    function maxStars() {
      return lessons.length * 3;
    }

    /**
     * @param {string} lessonId
     * @returns {{stars: number, best: number, plays: number, lastPlayed: number}}
     */
    function entryFor(lessonId) {
      var entry = state.lessons[lessonId];
      if (!entry) {
        return { stars: 0, best: 0, plays: 0, lastPlayed: 0 };
      }
      return {
        stars: entry.stars,
        best: entry.best,
        plays: entry.plays,
        lastPlayed: entry.lastPlayed
      };
    }

    /** @returns {{stars: number, maxStars: number, completed: number, totalLessons: number, plays: number}} */
    function stats() {
      var stars = 0;
      var completed = 0;
      var plays = 0;
      lessons.forEach(function (lesson) {
        var entry = state.lessons[lesson.id];
        if (!entry) {
          return;
        }
        stars += entry.stars;
        plays += entry.plays;
        if (entry.stars > 0) {
          completed += 1;
        }
      });
      return {
        stars: stars,
        maxStars: lessons.length * 3,
        completed: completed,
        totalLessons: lessons.length,
        plays: plays
      };
    }

    /**
     * Bài nên học tiếp: bài đầu tiên đã mở mà chưa có sao.
     * @returns {object} lesson
     */
    function nextLesson() {
      var i;
      for (i = 0; i < lessons.length; i += 1) {
        if (isUnlocked(lessons[i].id) && starsFor(lessons[i].id) === 0) {
          return lessons[i];
        }
      }
      return lessons[lessons.length - 1];
    }

    /**
     * @param {string} lessonId
     * @returns {object|null}
     */
    function nextLessonAfter(lessonId) {
      var index = indexOf(lessonId);
      if (index >= 0 && index + 1 < lessons.length) {
        return lessons[index + 1];
      }
      return null;
    }

    /** @returns {Array<object>} danh sách bài theo thứ tự sách. */
    function orderedLessons() {
      return lessons.slice();
    }

    /**
     * Bản sao của phần mảnh ghép để UI/domain đọc, không cho sửa state trực tiếp.
     * @returns {{v: number, pieces: Array<number>}}
     */
    function puzzle() {
      return { v: 1, pieces: state.puzzle.pieces.slice() };
    }

    /**
     * Trao một mảnh theo index (0-based, theo thứ tự curriculum). Idempotent.
     * @param {number} index
     * @returns {boolean} true nếu mảnh mới được thêm.
     */
    function awardPuzzlePiece(index) {
      var value = Number(index);
      if (!isFinite(value) || value < 0 || Math.floor(value) !== value) {
        return false;
      }
      if (state.puzzle.pieces.indexOf(value) !== -1) {
        return false;
      }
      state.puzzle.pieces.push(value);
      state.puzzle.pieces.sort(function (a, b) { return a - b; });
      save();
      return true;
    }

    /** Xoá toàn bộ sao, giữ cài đặt (và xoá mảnh theo ADR-0002). */
    function resetProgress() {
      var current = settings();
      state = defaultState();
      state.settings = current;
      save();
    }

    /** Xoá cả tiến độ lẫn cài đặt. */
    function resetAll() {
      state = defaultState();
      save();
    }

    /** @returns {boolean} localStorage có hoạt động không. */
    function isPersistent() {
      return typeof storage.isPersistent === 'function' ? storage.isPersistent() : true;
    }

    return {
      settings: settings,
      setSetting: setSetting,
      starsFor: starsFor,
      isUnlocked: isUnlocked,
      recordResult: recordResult,
      totalStars: totalStars,
      maxStars: maxStars,
      entryFor: entryFor,
      stats: stats,
      nextLesson: nextLesson,
      nextLessonAfter: nextLessonAfter,
      orderedLessons: orderedLessons,
      puzzle: puzzle,
      awardPuzzlePiece: awardPuzzlePiece,
      resetProgress: resetProgress,
      resetAll: resetAll,
      isPersistent: isPersistent,
      tuning: tuning
    };
  }

  return { create: create };
}());
