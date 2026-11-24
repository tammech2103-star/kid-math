/**
 * Test bộ sưu tập mảnh ghép Trường vui (ADR-0002).
 * Chạy cùng framework KMTest, không cần Node. Phủ normalize state cũ,
 * trao mảnh idempotent, lưới 7×3, CSS cắt ảnh và reset tiến độ.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  /** @param {object|null} seed Dữ liệu localStorage giả lập. */
  function fakeStorage(seed) {
    var data = seed === undefined ? null : seed;
    return {
      load: function (fallback) {
        return data === null ? fallback : JSON.parse(JSON.stringify(data));
      },
      save: function (value) {
        data = JSON.parse(JSON.stringify(value));
      },
      isPersistent: function () { return true; }
    };
  }

  function makeProgress(seed) {
    return KM.Progress.create({
      storage: fakeStorage(seed),
      tuning: KM.Tuning,
      curriculum: KM.Curriculum
    });
  }

  function makePuzzle(progress) {
    return KM.Puzzle.create({
      progress: progress,
      curriculum: KM.Curriculum,
      tuning: KM.Tuning
    });
  }

  T.suite('Puzzle — lưới 21 mảnh', function () {
    T.test('lưới mặc định 7×3 = 21 mảnh, đọc từ tuning', function () {
      var puzzle = makePuzzle(makeProgress());
      T.deepEq(puzzle.grid(), { cols: 7, rows: 3 });
      T.eq(puzzle.total(), 21);
      T.eq(puzzle.count(), 0);
      T.eq(puzzle.isComplete(), false);
      T.eq(puzzle.revealMs(), 900);
      T.ok(/school-reward\.svg$/.test(puzzle.src()), 'ảnh gốc sai: ' + puzzle.src());
    });

    T.test('indexFor theo đúng thứ tự curriculum', function () {
      var puzzle = makePuzzle(makeProgress());
      KM.Curriculum.lessons.forEach(function (lesson, index) {
        T.eq(puzzle.indexFor(lesson.id), index, 'index sai ở ' + lesson.id);
        T.eq(puzzle.lessonFor(index).id, lesson.id);
      });
      T.eq(puzzle.indexFor('khong-ton-tai'), -1);
      T.eq(puzzle.indexFor(''), -1);
      T.eq(puzzle.lessonFor(21), null);
    });

    T.test('styleFor cắt ảnh 700% 300% đúng các góc lưới', function () {
      var puzzle = makePuzzle(makeProgress());
      var first = puzzle.styleFor(0);
      var lastCol = puzzle.styleFor(6);
      var midRow = puzzle.styleFor(7);
      var last = puzzle.styleFor(20);
      T.eq(first['background-size'], '700% 300%');
      T.eq(first['background-position'], '0% 0%');
      T.eq(lastCol['background-position'], '100% 0%');
      T.eq(midRow['background-position'], '0% 50%');
      T.eq(last['background-position'], '100% 100%');
      T.eq(last['background-repeat'], 'no-repeat');
      T.ok(last['background-image'].indexOf('school-reward.svg') !== -1);
    });

    T.test('styleFor index ngoài lề về mảnh đầu', function () {
      var puzzle = makePuzzle(makeProgress());
      T.eq(puzzle.styleFor(-1)['background-position'], '0% 0%');
      T.eq(puzzle.styleFor(99)['background-position'], '0% 0%');
      T.eq(puzzle.styleFor('3')['background-position'], '50% 0%', 'index 3 = cột 3, hàng 0');
    });
  });

  T.suite('Puzzle — trao mảnh idempotent', function () {
    T.test('award trao đúng index và không cộng lại khi chơi lại', function () {
      var storage = fakeStorage();
      var progress = KM.Progress.create({
        storage: storage, tuning: KM.Tuning, curriculum: KM.Curriculum
      });
      var puzzle = makePuzzle(progress);
      var first = puzzle.award('intro');
      T.deepEq(first, { added: true, index: 0, isComplete: false });
      T.eq(puzzle.count(), 1);
      var again = puzzle.award('intro');
      T.deepEq(again, { added: false, index: 0, isComplete: false });
      T.eq(puzzle.count(), 1);
      T.deepEq(progress.puzzle().pieces, [0]);
      T.deepEq(storage.load(null).puzzle.pieces, [0]);
    });

    T.test('21 bài theo curriculum trao đủ 21 mảnh', function () {
      var progress = makeProgress();
      var puzzle = makePuzzle(progress);
      KM.Curriculum.lessons.forEach(function (lesson, index) {
        var result = puzzle.award(lesson.id);
        T.eq(result.added, true, 'không nhận mảnh bài ' + lesson.id);
        T.eq(result.index, index);
      });
      var expected = [];
      for (var i = 0; i < 21; i += 1) {
        expected.push(i);
      }
      T.eq(puzzle.count(), 21);
      T.deepEq(puzzle.pieces(), expected);
      T.eq(puzzle.isComplete(), true);
      T.deepEq(progress.puzzle().pieces.slice(0, 3), [0, 1, 2]);
    });

    T.test('award bài không tồn tại không đổi state', function () {
      var puzzle = makePuzzle(makeProgress());
      T.deepEq(puzzle.award('bai-khong-ton-tai'), {
        added: false, index: -1, isComplete: false
      });
      T.eq(puzzle.count(), 0);
    });

    T.test('thua vẫn nhận mảnh (chỉ cần hoàn thành, không cần hạng)', function () {
      var progress = makeProgress();
      var puzzle = makePuzzle(progress);
      progress.recordResult('b1', { stars: 1, firstTryCorrect: 2, bestStreak: 0 });
      var result = puzzle.award('b1');
      T.eq(result.added, true);
      T.eq(result.index, 1);
      T.eq(progress.starsFor('b1'), 1, 'mô phỏng về đích thứ hai = 1 sao');
      T.eq(puzzle.count(), 1, 'mảnh thưởng không phụ thuộc hạng nhất/nhì');
    });

    T.test('progress chỉ đọc vẫn trao mảnh trong phiên hiện tại', function () {
      var readOnly = {
        puzzle: function () { return { v: 1, pieces: [5] }; }
      };
      var puzzle = makePuzzle(readOnly);
      var result = puzzle.award('b5');
      T.eq(result.added, false, 'b5 đã có mảnh index 5');
      T.eq(result.index, 5);
      T.eq(puzzle.count(), 1);
      T.eq(puzzle.award('b6').added, true);
      T.deepEq(puzzle.pieces(), [5, 6]);
    });
  });

  T.suite('Puzzle — tương thích dữ liệu cũ & đặt lại', function () {
    T.test('state cũ thiếu puzzle vẫn giữ sao và cài đặt', function () {
      var old = {
        v: 1,
        settings: { speech: false, sfx: true, unlockAll: false },
        lessons: { intro: { stars: 2, best: 4, plays: 3, lastPlayed: 123 } }
      };
      var storage = fakeStorage(old);
      var progress = KM.Progress.create({
        storage: storage, tuning: KM.Tuning, curriculum: KM.Curriculum
      });
      T.eq(progress.starsFor('intro'), 2);
      T.eq(progress.settings().speech, false);
      T.eq(progress.settings().allowRetry, true);
      T.deepEq(progress.puzzle().pieces, []);
      T.eq(progress.awardPuzzlePiece(0), true);
      T.deepEq(storage.load(null).puzzle.pieces, [0]);
      T.eq(progress.starsFor('intro'), 2, 'trao mảnh không được sửa sao');
    });

    T.test('chuẩn hoá puzzle: bỏ trùng, sắp xếp, bỏ index ngoài lưới', function () {
      var raw = {
        v: 1,
        puzzle: { v: 1, pieces: [20, 3, 3, -1, 1.5, 21, '2'] }
      };
      var progress = KM.Progress.create({
        storage: fakeStorage(raw), tuning: KM.Tuning, curriculum: KM.Curriculum
      });
      var puzzle = makePuzzle(progress);
      T.deepEq(progress.puzzle().pieces, [2, 3, 20, 21]);
      T.deepEq(puzzle.pieces(), [2, 3, 20]);
      T.eq(puzzle.count(), 3);
    });

    T.test('resetProgress xoá mảnh nhưng giữ cài đặt', function () {
      var progress = makeProgress();
      var puzzle = makePuzzle(progress);
      progress.setSetting('speech', false);
      progress.setSetting('allowRetry', false);
      progress.recordResult('intro', { stars: 3, firstTryCorrect: 5, bestStreak: 5 });
      puzzle.award('intro');
      puzzle.award('b1');
      T.eq(puzzle.count(), 2);
      progress.resetProgress();
      T.eq(puzzle.count(), 0, 'resetProgress phải xoá mảnh theo ADR-0002');
      T.eq(progress.totalStars(), 0);
      T.eq(progress.settings().speech, false);
      T.eq(progress.settings().allowRetry, false);
    });

    T.test('resetAll xoá cả mảnh lẫn cài đặt', function () {
      var progress = makeProgress();
      var puzzle = makePuzzle(progress);
      progress.setSetting('unlockAll', true);
      puzzle.award('intro');
      progress.resetAll();
      T.eq(puzzle.count(), 0);
      T.eq(progress.settings().unlockAll, false);
      T.eq(progress.isUnlocked('b20'), false);
    });
  });
}());
