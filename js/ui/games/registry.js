/**
 * Registry ánh xạ gameId → factory createGame. Không chứa state học tập.
 * @namespace KM.GameRegistry
 * @see docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md
 * @see docs/architecture/game-module-interface.md
 */
window.KM = window.KM || {};

KM.GameRegistry = (function () {
  'use strict';

  /** @type {Object<string, Function>} */
  var factories = Object.create(null);

  /**
   * Đăng ký một hoặc nhiều factory.
   * Hỗ trợ `register({ id: factory })` và `register(id, factory)`.
   * Factory không hợp lệ sẽ bị `KM.GameContract.assert` từ chối ngay.
   *
   * @param {object|string} map Bảng `{gameId: createGame}` hoặc một gameId.
   * @param {Function} [factory] Factory dùng khi đối số đầu là gameId.
   * @returns {number} Số factory đã đăng ký.
   */
  function register(map, factory) {
    var source = map;
    if (typeof map === 'string') {
      source = {};
      source[map] = factory;
    }
    if (!source || typeof source !== 'object') {
      return 0;
    }
    var count = 0;
    Object.keys(source).forEach(function (gameId) {
      var createGame = source[gameId];
      if (KM.GameContract && typeof KM.GameContract.assert === 'function') {
        KM.GameContract.assert(createGame);
      }
      factories[gameId] = createGame;
      count += 1;
    });
    return count;
  }

  /**
   * Lấy factory theo gameId. Id không tồn tại trả null, không ném lỗi.
   * @param {string} gameId
   * @returns {Function|null}
   */
  function get(gameId) {
    if (!gameId) {
      return null;
    }
    return Object.prototype.hasOwnProperty.call(factories, gameId)
      ? factories[gameId]
      : null;
  }

  /**
   * @param {string} gameId
   * @returns {boolean}
   */
  function has(gameId) {
    return get(gameId) !== null;
  }

  return {
    register: register,
    get: get,
    has: has
  };
}());
