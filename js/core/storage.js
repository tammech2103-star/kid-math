/**
 * Bọc localStorage với fallback bộ nhớ trong phiên và lưu theo phiên bản.
 * @namespace KM.Storage
 */
window.KM = window.KM || {};

KM.Storage = (function () {
  'use strict';

  /**
   * Thử ghi localStorage một lần để biết có dùng được trên file:// không.
   * @returns {boolean}
   */
  function probe() {
    try {
      var key = '__km_probe__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * @param {string} key
   * @returns {object} storage service
   */
  function create(key) {
    var persistent = probe();
    var memory = null;

    /**
     * @param {*} fallback Giá trị trả về khi chưa có dữ liệu.
     * @returns {*}
     */
    function load(fallback) {
      if (!persistent) {
        return memory === null ? fallback : memory;
      }
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        return fallback;
      }
    }

    /** @param {*} value */
    function save(value) {
      if (!persistent) {
        memory = value;
        return;
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        memory = value;
        persistent = false;
      }
    }

    function clear() {
      memory = null;
      if (!persistent) {
        return;
      }
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        /* ignore */
      }
    }

    return {
      load: load,
      save: save,
      clear: clear,
      isPersistent: function () { return persistent; }
    };
  }

  return { create: create };
}());
