/**
 * Hợp đồng tối thiểu giữa màn học và một module game.
 * Game chỉ là lớp trình bày/tương tác; mọi state học tập vẫn nằm ở LessonSession.
 * @namespace KM.GameContract
 * @see docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md
 * @see docs/architecture/game-module-interface.md
 */
window.KM = window.KM || {};

KM.GameContract = (function () {
  'use strict';

  /** @type {Array<string>} 5 phương thức bắt buộc của instance game. */
  var METHODS = ['render', 'onCorrect', 'onWrong', 'celebrate', 'destroy'];

  /**
   * Kiểm tra hợp đồng.
   * - Khi đăng ký: `game` là factory `createGame` → chỉ kiểm tra nó gọi được.
   * - Khi tạo xong: `game` là instance → kiểm tra đủ 5 phương thức.
   *
   * @param {Function|object} game Factory hoặc instance game cần kiểm tra.
   * @returns {boolean} true nếu hợp lệ; ném TypeError nếu không hợp lệ.
   */
  function assert(game) {
    if (typeof game === 'function') {
      return true;
    }
    if (!game || typeof game !== 'object') {
      throw new TypeError('GameContract: instance game phải là object.');
    }
    for (var i = 0; i < METHODS.length; i += 1) {
      if (typeof game[METHODS[i]] !== 'function') {
        throw new TypeError('GameContract: thiếu phương thức ' + METHODS[i] + '().');
      }
    }
    return true;
  }

  return {
    assert: assert,
    methods: METHODS.slice()
  };
}());
