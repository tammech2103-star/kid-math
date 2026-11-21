/**
 * Test đội đua: chọn đối thủ, điểm, xếp hạng, không có trạng thái thua.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var R = KM.Racers;
  var Race = KM.Race;
  var C = KM.Curriculum;

  function makeRace(lessonId, total) {
    return Race.create({
      total: total,
      player: R.player,
      opponents: R.opponentsForLesson(lessonId)
    });
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

    T.test('mỗi màn có 3 đối thủ khác nhau, không phải McQueen', function () {
      C.lessons.forEach(function (lesson) {
        var opponents = R.opponentsForLesson(lesson.id);
        T.eq(opponents.length, 3, lesson.id);
        var ids = opponents.map(function (racer) { return racer.id; });
        T.eq(new Set(ids).size, 3, lesson.id + ' trùng đối thủ');
        T.ok(ids.indexOf('mcqueen') === -1, lesson.id + ' có McQueen làm đối thủ');
      });
    });

    T.test('toàn bộ 28 nhân vật đều xuất hiện, mỗi người ít nhất 2 lần', function () {
      var counts = {};
      C.lessons.forEach(function (lesson) {
        R.opponentsForLesson(lesson.id).forEach(function (racer) {
          counts[racer.id] = (counts[racer.id] || 0) + 1;
        });
      });
      T.eq(Object.keys(counts).length, 28, 'không đủ 28 nhân vật');
      Object.keys(counts).forEach(function (id) {
        T.ok(counts[id] >= 2, id + ' chỉ xuất hiện ' + counts[id] + ' lần');
      });
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
      T.eq(summary.racers.length, 4);
      T.eq(summary.racers[0].isPlayer, true);
      T.eq(summary.racers[0].finalProgress, 100);
      summary.racers.forEach(function (racer) {
        T.ok(racer.finalProgress >= 0 && racer.finalProgress <= 100);
        T.ok(racer.place >= 1 && racer.place <= 4);
      });
    });

    T.test('đúng lại sau khi sai chỉ được nửa bước, có thể về hạng 3', function () {
      var race = makeRace('b1', 8);
      var i;
      for (i = 0; i < 8; i += 1) {
        race.wrong();
        race.correct(i < 4);
        race.completeQuestion();
      }
      var summary = race.summary();
      T.ok(Math.abs(summary.playerScore - 6.2) < 0.0001, 'điểm tay đua sai: ' + summary.playerScore);
      T.eq(summary.playerPlace, 3);
      var playerRow = summary.racers.filter(function (racer) {
        return racer.isPlayer;
      })[0];
      T.ok(playerRow.finalProgress < 100, 'tay đua hạng 3 phải dưới 100%');
      T.eq(summary.racers[0].finalProgress, 100);
      T.ok(summary.playerPlace >= 1 && summary.playerPlace <= 4);
    });

    T.test('sai không trừ điểm McQueen nhưng đối thủ nhích lên', function () {
      var race = makeRace('b2', 5);
      var before = race.liveRows();
      race.wrong();
      var after = race.liveRows();
      T.eq(after[0].score, before[0].score, 'McQueen bị trừ điểm');
      T.ok(after[1].score > before[1].score, 'đối thủ không nhích');
      T.ok(after[2].score > before[2].score, 'đối thủ không nhích');
    });

    T.test('HUD có 4 tay đua, tiến độ 0–100, hạng 1–4', function () {
      var race = makeRace('b3', 5);
      var rows = race.liveRows();
      T.eq(rows.length, 4);
      T.eq(rows[0].isPlayer, true);
      rows.forEach(function (row) {
        T.ok(row.progress >= 0 && row.progress <= 100);
        T.ok(row.rank >= 1 && row.rank <= 4);
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
