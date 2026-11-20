/**
 * Chuyển số 0–10 thành chữ tiếng Việt để giọng đọc phát âm tự nhiên.
 * @namespace KM.ViNumbers
 */
window.KM = window.KM || {};

KM.ViNumbers = (function () {
  'use strict';

  var WORDS = [
    'không', 'một', 'hai', 'ba', 'bốn', 'năm',
    'sáu', 'bảy', 'tám', 'chín', 'mười'
  ];

  /**
   * @param {number} value Số nguyên 0–10.
   * @returns {string} Chữ tiếng Việt, hoặc chuỗi số nếu ngoài phạm vi.
   */
  function toWords(value) {
    var n = Math.round(value);
    if (n >= 0 && n < WORDS.length) {
      return WORDS[n];
    }
    return String(value);
  }

  /**
   * Cách đọc số trong câu so sánh. Số 0 đọc là "số không" để tránh nhầm với
   * phủ định "không" (ví dụ "không bé hơn một").
   * @param {number} value
   * @returns {string}
   */
  function spoken(value) {
    var n = Math.round(value);
    if (n === 0) {
      return 'số không';
    }
    return toWords(n);
  }

  /**
   * @param {string} text
   * @returns {string} Chữ cái đầu viết hoa.
   */
  function capitalize(text) {
    if (!text) {
      return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Ví dụ: countNoun(4, 'quả táo') -> "bốn quả táo".
   * @param {number} value
   * @param {string} noun
   * @returns {string}
   */
  function countNoun(value, noun) {
    if (Math.round(value) === 0) {
      return 'không có ' + noun + ' nào';
    }
    return toWords(value) + ' ' + noun;
  }

  return {
    WORDS: WORDS.slice(),
    toWords: toWords,
    spoken: spoken,
    capitalize: capitalize,
    countNoun: countNoun
  };
}());
