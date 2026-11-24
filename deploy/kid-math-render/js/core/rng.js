/**
 * Seeded pseudo-random generator (mulberry32).
 * Dùng chung cho mọi hoạt động để đề bài tái lập được trong test.
 * @namespace KM.Rng
 */
window.KM = window.KM || {};

KM.Rng = (function () {
  'use strict';

  /**
   * Băm chuỗi thành seed 32-bit (FNV-1a).
   * @param {string} text
   * @returns {number}
   */
  function seedFromString(text) {
    var hash = 2166136261;
    var i;
    for (i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Tạo nguồn ngẫu nhiên có thể tái lập.
   * @param {number|string} [seed] Seed hoặc chuỗi seed.
   * @returns {{next: Function, int: Function, chance: Function, pick: Function, shuffle: Function}}
   */
  function create(seed) {
    var state;

    if (typeof seed === 'string') {
      state = seedFromString(seed);
    } else if (typeof seed === 'number' && isFinite(seed)) {
      state = seed >>> 0;
    } else {
      state = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }
    if (state === 0) {
      state = 0x9e3779b9;
    }

    /** @returns {number} Số thực trong [0, 1). */
    function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Số nguyên trong [min, max], bao gồm hai đầu.
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function int(min, max) {
      var low = Math.ceil(min);
      var high = Math.floor(max);
      if (high < low) {
        var swap = low;
        low = high;
        high = swap;
      }
      return low + Math.floor(next() * (high - low + 1));
    }

    /** @returns {boolean} true với xác suất p. */
    function chance(p) {
      return next() < p;
    }

    /** @returns {*} Một phần tử ngẫu nhiên. */
    function pick(list) {
      return list[int(0, list.length - 1)];
    }

    /** @returns {Array} Bản sao đã xáo trộn (không sửa mảng gốc). */
    function shuffle(list) {
      var out = list.slice();
      var i;
      for (i = out.length - 1; i > 0; i -= 1) {
        var j = int(0, i);
        var tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    }

    return { next: next, int: int, chance: chance, pick: pick, shuffle: shuffle };
  }

  return { create: create, seedFromString: seedFromString };
}());
