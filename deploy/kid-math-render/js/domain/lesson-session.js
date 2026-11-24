/**
 * Một phiên học: giữ câu hiện tại, số lần thử, chuỗi đúng và tính sao cuối bài.
 * Không chạm DOM, không đọc localStorage.
 * @namespace KM.LessonSession
 */
window.KM = window.KM || {};

KM.LessonSession = (function () {
  'use strict';

  /**
   * @param {{questions: Array<object>, tuning: object}} options
   * @returns {object} session
   */
  function create(options) {
    var questions = (options.questions || []).slice();
    var tuning = options.tuning;
    var index = 0;
    var attempts = 0;
    var answered = false;
    var finished = questions.length === 0;
    var firstTryCorrect = 0;
    var correctCount = 0;
    var streak = 0;
    var bestStreak = 0;

    /** @returns {object|null} */
    function current() {
      if (finished) {
        return null;
      }
      return questions[index] || null;
    }

    /**
     * Ghi nhận một lần chọn đáp án.
     * @param {*} value
     * @returns {{correct: boolean, ignored?: boolean, firstTry?: boolean, stars?: number, streak?: number, cheer?: string}}
     */
    function answer(value) {
      var question = current();
      if (!question) {
        return { correct: false, ignored: true };
      }
      if (answered) {
        return { correct: false, ignored: true };
      }

      if (value !== question.answer) {
        attempts += 1;
        streak = 0;
        return { correct: false, firstTry: false, attempts: attempts };
      }

      var firstTry = attempts === 0;
      attempts += 1;
      answered = true;
      correctCount += 1;
      if (firstTry) {
        firstTryCorrect += 1;
      }
      streak += 1;
      if (streak > bestStreak) {
        bestStreak = streak;
      }

      return {
        correct: true,
        firstTry: firstTry,
        stars: firstTry ? 1 : 0,
        streak: streak,
        cheer: question.cheer
      };
    }

    /**
     * Sang câu kế tiếp. Chỉ gọi sau khi đã trả lời đúng.
     * @returns {boolean} false nếu bài đã kết thúc.
     */
    function next() {
      if (finished || !answered) {
        return !finished;
      }
      index += 1;
      attempts = 0;
      answered = false;
      if (index >= questions.length) {
        finished = true;
        return false;
      }
      return true;
    }

    /** @returns {{index: number, total: number, isAnswered: boolean}} */
    function progress() {
      return { index: index, total: questions.length, isAnswered: answered };
    }

    /**
     * @returns {{stars: number, firstTryCorrect: number, correctCount: number, total: number, bestStreak: number, firstTryRate: number, completed: boolean}}
     */
    function summary() {
      var total = questions.length;
      var rate = total ? firstTryCorrect / total : 0;
      var stars = 1;
      if (rate >= tuning.stars.three) {
        stars = 3;
      } else if (rate >= tuning.stars.two) {
        stars = 2;
      }
      return {
        stars: stars,
        firstTryCorrect: firstTryCorrect,
        correctCount: correctCount,
        total: total,
        bestStreak: bestStreak,
        firstTryRate: rate,
        completed: correctCount === total && total > 0
      };
    }

    return {
      current: current,
      answer: answer,
      next: next,
      progress: progress,
      summary: summary,
      isFinished: function () { return finished; }
    };
  }

  return { create: create };
}());
