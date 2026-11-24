/**
 * Giọng đọc tiếng Việt qua Web Speech API, có fallback im lặng.
 * @namespace KM.Speech
 */
window.KM = window.KM || {};

KM.Speech = (function () {
  'use strict';

  var EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

  /**
   * Bỏ emoji và khoảng trắng thừa trước khi đọc.
   * @param {string} text
   * @returns {string}
   */
  function clean(text) {
    return String(text || '')
      .replace(EMOJI_PATTERN, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @param {{enabled?: boolean, lang?: string, rate?: number, pitch?: number, volume?: number}} [options]
   * @returns {object} speech service
   */
  function create(options) {
    var opts = options || {};
    var synth = window.speechSynthesis || null;
    var enabled = opts.enabled !== false;
    var lang = opts.lang || 'vi-VN';
    var voice = null;
    var supported = !!(synth && window.SpeechSynthesisUtterance);

    function refreshVoice() {
      if (!synth || !synth.getVoices) {
        return;
      }
      var voices = synth.getVoices() || [];
      var vietnamese = voices.filter(function (item) {
        return String(item.lang || '').toLowerCase().indexOf('vi') === 0;
      });
      var preferred = vietnamese.filter(function (item) {
        return /linh|vietnam|tiếng việt/i.test(item.name || '');
      });
      voice = preferred[0] || vietnamese[0] || null;
    }

    if (synth) {
      refreshVoice();
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', refreshVoice);
      } else {
        synth.onvoiceschanged = refreshVoice;
      }
    }

    /**
     * Đọc một câu, ngắt câu đang đọc dở.
     * @param {string} text
     */
    function speak(text) {
      var content = clean(text);
      if (!enabled || !supported || !content || !voice) {
        return;
      }
      try {
        synth.cancel();
        var utterance = new window.SpeechSynthesisUtterance(content);
        utterance.lang = lang;
        utterance.rate = typeof opts.rate === 'number' ? opts.rate : 0.9;
        utterance.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1.05;
        utterance.volume = typeof opts.volume === 'number' ? opts.volume : 1;
        if (voice) {
          utterance.voice = voice;
        }
        synth.speak(utterance);
      } catch (error) {
        /* Trình duyệt không cho phép đọc: bỏ qua, game vẫn chạy bằng chữ. */
      }
    }

    function stop() {
      if (synth && synth.cancel) {
        try {
          synth.cancel();
        } catch (error) {
          /* ignore */
        }
      }
    }

    /** @param {boolean} value */
    function setEnabled(value) {
      enabled = value !== false;
      if (!enabled) {
        stop();
      }
    }

    /**
     * Thông tin để màn Phụ huynh hiển thị.
     * @returns {{supported: boolean, enabled: boolean, hasVietnameseVoice: boolean, voiceName: string}}
     */
    function status() {
      return {
        supported: supported,
        enabled: enabled,
        hasVietnameseVoice: !!voice,
        voiceName: voice ? voice.name : ''
      };
    }

    return {
      speak: speak,
      stop: stop,
      setEnabled: setEnabled,
      isEnabled: function () { return enabled; },
      status: status,
      clean: clean
    };
  }

  return { create: create, clean: clean };
}());
