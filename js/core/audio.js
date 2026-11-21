/**
 * Hiệu ứng âm thanh tổng hợp bằng WebAudio — không cần file âm thanh.
 * @namespace KM.Audio
 */
window.KM = window.KM || {};

KM.Audio = (function () {
  'use strict';

  /**
   * Tạo dịch vụ âm thanh.
   * @param {{enabled?: boolean, master?: number}} [options]
   * @returns {object} audio service
   */
  function create(options) {
    var opts = options || {};
    var enabled = opts.enabled !== false;
    var master = typeof opts.master === 'number' ? opts.master : 0.5;
    var ctx = null;

    function ensure() {
      if (!enabled) {
        return null;
      }
      if (!ctx) {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
          return null;
        }
        try {
          ctx = new Ctor();
        } catch (error) {
          ctx = null;
        }
      }
      if (ctx && ctx.state === 'suspended' && ctx.resume) {
        ctx.resume();
      }
      return ctx;
    }

    function tone(freq, delay, duration, type, volume) {
      var audio = ensure();
      if (!audio) {
        return;
      }
      var start = audio.currentTime + (delay || 0);
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, (volume || 0.2) * master),
        start + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    }

    function slide(from, to, duration, type, volume) {
      var audio = ensure();
      if (!audio) {
        return;
      }
      var start = audio.currentTime;
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = type || 'sawtooth';
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, (volume || 0.12) * master),
        start + 0.03
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    }

    /** Kích hoạt AudioContext sau thao tác đầu tiên của người dùng. */
    function unlock() {
      ensure();
    }

    function tap() {
      tone(640, 0, 0.06, 'sine', 0.14);
    }

    function correct() {
      tone(523.25, 0, 0.12, 'triangle', 0.3);
      tone(659.25, 0.1, 0.12, 'triangle', 0.3);
      tone(783.99, 0.2, 0.24, 'triangle', 0.26);
    }

    function wrong() {
      tone(246.94, 0, 0.14, 'sine', 0.22);
      tone(196, 0.13, 0.22, 'sine', 0.18);
    }

    function star() {
      tone(1046.5, 0.22, 0.1, 'triangle', 0.24);
      tone(1318.5, 0.32, 0.18, 'triangle', 0.22);
    }

    function engine() {
      slide(90, 190, 0.42, 'sawtooth', 0.1);
      tone(320, 0.1, 0.08, 'square', 0.05);
    }

    /** Ba tiếng đếm và tiếng xuất phát. */
    function startRace() {
      tone(440, 0.55, 0.09, 'square', 0.14);
      tone(440, 1.05, 0.09, 'square', 0.14);
      tone(440, 1.55, 0.09, 'square', 0.14);
      tone(880, 2.05, 0.28, 'triangle', 0.28);
    }

    function win() {
      var notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach(function (freq, index) {
        tone(freq, index * 0.12, 0.26, 'triangle', 0.28);
      });
      tone(1318.5, 0.52, 0.45, 'triangle', 0.24);
    }

    /** @param {boolean} value */
    function setEnabled(value) {
      enabled = value !== false;
      if (!enabled) {
        return;
      }
      ensure();
    }

    return {
      unlock: unlock,
      tap: tap,
      correct: correct,
      wrong: wrong,
      star: star,
      engine: engine,
      startRace: startRace,
      win: win,
      setEnabled: setEnabled,
      isEnabled: function () { return enabled; }
    };
  }

  return { create: create };
}());
