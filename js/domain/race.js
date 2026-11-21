/**
 * Luật cuộc đua của một màn: điểm của McQueen và 3 đối thủ, xếp hạng, tiến độ.
 * Không có trạng thái "thua" — mọi bé đều về đích và nhận sao theo số câu đúng.
 * @namespace KM.Race
 */
window.KM = window.KM || {};

KM.Race = (function () {
  'use strict';

  var R = KM.Tuning.race;
  var RIVAL_PACES = R.rivalPaces;
  var WRONG_PENALTY = R.wrongPenalty;
  var RETRY_SCORE = R.retryScore;
  var EPSILON = 0.0001;

  function compareRacers(a, b) {
    if (Math.abs(b.score - a.score) > EPSILON) {
      return b.score - a.score;
    }
    if (a.isPlayer !== b.isPlayer) {
      return a.isPlayer ? -1 : 1;
    }
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  }

  /**
   * @param {{total: number, player: object, opponents: Array<object>}} options
   * @returns {object} race
   */
  function create(options) {
    var total = Math.max(1, Number(options.total) || 1);
    var player = Object.assign({}, options.player, {
      score: 0,
      pace: 0,
      isPlayer: true
    });
    var rivals = (options.opponents || []).map(function (racer, index) {
      return Object.assign({}, racer, {
        score: 0,
        pace: RIVAL_PACES[index] || 0.76,
        isPlayer: false
      });
    });
    var racers = [player].concat(rivals);
    var answered = 0;
    var wrongs = 0;
    var settled = false;

    function ranked() {
      return racers.slice().sort(compareRacers);
    }

    /** Đúng: McQueen tăng tốc; đúng lại sau khi sai chỉ được nửa bước. */
    function correct(firstTry) {
      if (settled) {
        return;
      }
      player.score += firstTry ? 1 : RETRY_SCORE;
    }

    /** Sai: các đối thủ nhích lên một chút, không trừ điểm của bé. */
    function wrong() {
      if (settled) {
        return;
      }
      wrongs += 1;
      rivals.forEach(function (rival) {
        rival.score += WRONG_PENALTY;
      });
    }

    /** Gọi một lần sau khi trả lời đúng; đối thủ chạy thêm một chặng. */
    function completeQuestion() {
      if (settled) {
        return;
      }
      answered += 1;
      rivals.forEach(function (rival) {
        rival.score += rival.pace;
      });
      if (answered >= total) {
        settle();
      }
    }

    /** Chốt hạng và quy đổi về % để vẽ đường đua. */
    function settle() {
      if (settled) {
        return summary();
      }
      settled = true;
      var sorted = ranked();
      sorted.forEach(function (racer, index) {
        racer.place = index + 1;
      });
      var maxScore = racers.reduce(function (max, racer) {
        return Math.max(max, racer.score);
      }, 0);
      racers.forEach(function (racer) {
        racer.finalProgress = maxScore > 0
          ? Math.max(0, Math.min(100, (racer.score / maxScore) * 100))
          : 0;
      });
      return summary();
    }

    /**
     * Trạng thái để vẽ HUD; luôn trả về đúng thứ tự player + rivals.
     * @returns {Array<object>}
     */
    function liveRows() {
      var sorted = ranked();
      var ranks = {};
      sorted.forEach(function (racer, index) {
        ranks[racer.id] = index + 1;
      });
      return racers.map(function (racer) {
        var progress = racer.finalProgress != null
          ? racer.finalProgress
          : Math.min(100, (racer.score / total) * 100);
        return {
          id: racer.id,
          name: racer.name,
          src: racer.src,
          color: racer.color,
          isPlayer: racer.isPlayer,
          score: racer.score,
          rank: ranks[racer.id],
          progress: Math.max(0, Math.min(100, progress))
        };
      });
    }

    /** @returns {object} */
    function summary() {
      var sorted = ranked();
      var playerPlace = player.place || (sorted.findIndex(function (racer) {
        return racer.isPlayer;
      }) + 1);
      return {
        total: total,
        answered: answered,
        wrongs: wrongs,
        playerScore: player.score,
        playerPlace: playerPlace,
        settled: settled,
        racers: sorted.map(function (racer) {
          return {
            id: racer.id,
            name: racer.name,
            src: racer.src,
            color: racer.color,
            isPlayer: racer.isPlayer,
            score: racer.score,
            place: racer.place || 0,
            finalProgress: racer.finalProgress != null ? racer.finalProgress : 0
          };
        })
      };
    }

    return {
      total: total,
      correct: correct,
      wrong: wrong,
      completeQuestion: completeQuestion,
      settle: settle,
      liveRows: liveRows,
      summary: summary,
      isSettled: function () { return settled; }
    };
  }

  return { create: create };
}());
