/**
 * Toàn bộ thông số hành vi của game. Không hardcode giá trị gameplay ở nơi khác.
 * @namespace KM.Tuning
 */
window.KM = window.KM || {};

KM.Tuning = (function () {
  'use strict';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object') {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  return deepFreeze({
    appName: 'Bé Vui Học Toán 1',
    appVersion: '1.0.0',
    storageKey: 'kidmath.v1',
    questionsPerLesson: 8,
    stars: {
      three: 0.9,
      two: 0.6
    },
    race: {
      opponentsPerRace: 1,
      rivalPaces: [0.86],
      wrongPenalty: 0.04,
      retryScore: 0.55
    },
    generation: {
      optionCount: 3,
      zeroReroll: 0.55,
      equalGroups: 0.22,
      askMore: 0.65,
      relationGreater: 0.5,
      equalSigns: 0.2,
      askTotal: 0.6,
      askAddend: 0.35,
      addZero: 0.12,
      zeroSubtract: 0.18,
      factAdd: 0.5,
      factSubtractFirst: 0.5,
      ascending: 0.65
    },
    timing: {
      correctHoldMs: 1500,
      wrongHoldMs: 900,
      carPopMs: 1300,
      confettiMs: 1500,
      questionSpeakDelayMs: 320,
      resultSpeakDelayMs: 450,
      resetArmMs: 3500
    },
    confetti: {
      count: 60,
      maxCount: 90
    },
    speech: {
      lang: 'vi-VN',
      rate: 0.9,
      pitch: 1.05,
      volume: 1
    },
    audio: {
      master: 0.5
    }
  });
}());
