/**
 * Test đội đua 1 đối 1: chọn đối thủ, điểm, xếp hạng, không có trạng thái thua.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var R = KM.Racers;
  var Race = KM.Race;
  var C = KM.Curriculum;
  var EPS = 0.0001;

  function makeRace(lessonId, total, attempt) {
    return Race.create({
      total: total,
      player: R.player,
      opponents: R.opponentsForLesson(lessonId, attempt || 0)
    });
  }

  function approx(actual, expected, label) {
    T.ok(Math.abs(actual - expected) < EPS,
      (label || 'giá trị') + ': mong đợi ' + expected + ', nhận ' + actual);
  }

  function playerRow(summary) {
    return summary.racers.filter(function (racer) {
      return racer.isPlayer;
    })[0];
  }

  T.suite('Racers — đội hình', function () {
    T.test('có McQueen và 28 đối thủ', function () {
      T.eq(R.rivalCount, 28);
      T.eq(R.roster.length, 28);
      T.eq(R.player.id, 'mcqueen');
      T.ok(R.player.src.indexOf('Mc_Queen.webp') !== -1);
    });

    T.test('id và file không trùng, đều là webp trong Asset', function () {
      var ids = R.all.map(function (racer) { return racer.id; });
      var files = R.all.map(function (racer) { return racer.src; });
      T.eq(new Set(ids).size, ids.length, 'id trùng');
      T.eq(new Set(files).size, files.length, 'file trùng');
      R.all.forEach(function (racer) {
        T.ok(/^Asset\/.+\.webp$/.test(racer.src), 'sai đường dẫn: ' + racer.src);
        T.ok(racer.name, 'thiếu tên: ' + racer.id);
        T.ok(racer.color, 'thiếu màu: ' + racer.id);
      });
    });

    T.test('mỗi màn có đúng 1 đối thủ, không phải McQueen', function () {
      C.lessons.forEach(function (lesson) {
        var opponents = R.opponentsForLesson(lesson.id, 0);
        T.eq(opponents.length, 1, lesson.id);
        T.ok(opponents[0].id !== 'mcqueen', lesson.id + ' có McQueen làm đối thủ');
      });
    });

    T.test('21 màn đầu tiên có 21 đối thủ khác nhau', function () {
      var ids = C.lessons.map(function (lesson) {
        return R.opponentsForLesson(lesson.id, 0)[0].id;
      });
      T.eq(ids.length, 21);
      T.eq(new Set(ids).size, 21, 'đối thủ bị lặp giữa các màn');
    });

    T.test('chơi lại đổi đối thủ; 28 lần chơi phủ đủ 28 nhân vật', function () {
      var first = R.opponentsForLesson('b1', 0)[0].id;
      var second = R.opponentsForLesson('b1', 1)[0].id;
      T.ok(first !== second, 'chơi lại vẫn gặp đối thủ cũ');

      var seen = {};
      var i;
      for (i = 0; i < 28; i += 1) {
        seen[R.opponentsForLesson('b1', i)[0].id] = true;
      }
      T.eq(Object.keys(seen).length, 28, 'không đủ 28 nhân vật sau 28 lần chơi');
    });
  });

  T.suite('Race — điểm và xếp hạng', function () {
    T.test('mọi câu đúng ngay lần đầu: McQueen vô địch', function () {
      var race = makeRace('b1', 8);
      var i;
      for (i = 0; i < 8; i += 1) {
        race.correct(true);
        race.completeQuestion();
      }
      var summary = race.summary();
      T.eq(summary.playerScore, 8);
      T.eq(summary.playerPlace, 1);
      T.eq(summary.racers.length, 2);
      T.eq(summary.racers[0].isPlayer, true);
      T.eq(summary.racers[0].finalProgress, 100);
      summary.racers.forEach(function (racer) {
        T.ok(racer.finalProgress >= 0 && racer.finalProgress <= 100);
        T.ok(racer.place >= 1 && racer.place <= 2);
      });
    });

    T.test('sai cả 8 câu rồi làm lại: McQueen về nhì, không có trạng thái thua', function () {
      var race = makeRace('b1', 8);
      var i;
      for (i = 0; i < 8; i += 1) {
        race.wrong();
        race.correct(false);
        race.completeQuestion();
      }
      var summary = race.summary();
      approx(summary.playerScore, 4.4, 'điểm McQueen');
      T.eq(summary.playerPlace, 2);
      T.eq(summary.wrongs, 8);
      T.eq(summary.answered, 8);
      T.eq(playerRow(summary).place, 2);
      T.eq(summary.racers[0].finalProgress, 100, 'người thắng phải 100%');
      T.ok(playerRow(summary).finalProgress < 100, 'người về nhì phải dưới 100%');
    });

    T.test('sai 1 câu vẫn có thể vô địch', function () {
      var race = makeRace('b1', 8);
      var i;
      for (i = 0; i < 8; i += 1) {
        if (i === 0) {
          race.wrong();
          race.correct(false);
        } else {
          race.correct(true);
        }
        race.completeQuestion();
      }
      var summary = race.summary();
      approx(summary.playerScore, 7.55, 'điểm McQueen');
      T.eq(summary.playerPlace, 1);
    });

    T.test('sai không trừ điểm McQueen nhưng đối thủ nhích lên', function () {
      var race = makeRace('b2', 5);
      var before = race.liveRows();
      race.wrong();
      var after = race.liveRows();
      T.eq(after[0].score, before[0].score, 'McQueen bị trừ điểm');
      T.ok(after[1].score > before[1].score, 'đối thủ không nhích');
      T.eq(after.length, 2);
    });

    T.test('HUD có 2 tay đua, tiến độ 0–100, hạng 1–2', function () {
      var race = makeRace('b3', 5);
      var rows = race.liveRows();
      T.eq(rows.length, 2);
      T.eq(rows[0].isPlayer, true);
      rows.forEach(function (row) {
        T.ok(row.progress >= 0 && row.progress <= 100);
        T.ok(row.rank >= 1 && row.rank <= 2);
      });
    });

    T.test('settle lặp lại không đổi kết quả', function () {
      var race = makeRace('b4', 5);
      race.correct(true);
      race.completeQuestion();
      var first = race.settle();
      var second = race.settle();
      T.eq(second.playerPlace, first.playerPlace);
      T.eq(second.playerScore, first.playerScore);
      T.eq(second.racers[0].finalProgress, first.racers[0].finalProgress);
    });
  });
}());
