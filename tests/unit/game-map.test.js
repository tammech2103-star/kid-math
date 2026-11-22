/**
 * Test bản đồ 21 minigame, registry và hợp đồng game (ADR-0002).
 * Đợt 1 chỉ có 3 factory mẫu; các bài còn lại dùng fallback theo thiết kế.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  function phase1Ids() {
    return ['mario-bros', 'animal-crossing', 'mario-kart'];
  }

  T.suite('GameMap — bản đồ 21 minigame', function () {
    T.test('đúng 21 entry và đủ trường dữ liệu', function () {
      var list = KM.GameMap.all();
      T.eq(list.length, 21);
      list.forEach(function (entry, index) {
        T.ok(entry.gameId, 'thiếu gameId ở entry ' + index);
        T.ok(entry.tribute, 'thiếu tribute ở entry ' + index);
        T.ok(entry.title, 'thiếu title ở entry ' + index);
        T.ok(entry.bg, 'thiếu bg ở entry ' + index);
        T.ok(entry.mechanic, 'thiếu mechanic ở entry ' + index);
        T.ok(entry.palette && entry.palette.sky && entry.palette.accent && entry.palette.ink,
          'thiếu palette ở ' + entry.gameId);
        T.ok(entry.phase === 1 || entry.phase === 2 || entry.phase === 3,
          'phase sai ở ' + entry.gameId);
      });
    });

    T.test('gameId duy nhất', function () {
      var list = KM.GameMap.all();
      var ids = list.map(function (entry) { return entry.gameId; });
      T.eq(new Set(ids).size, 21, 'gameId bị trùng');
      T.eq(new Set(list.map(function (entry) { return entry.tribute; })).size, 21,
        'tribute bị trùng');
    });

    T.test('tribute có mặt và 3 game mẫu đúng tên', function () {
      var expected = {
        intro: 'Super Mario Bros.',
        b5: 'Animal Crossing',
        b20: 'Mario Kart 8'
      };
      Object.keys(expected).forEach(function (lessonId) {
        var entry = KM.GameMap.forLesson(lessonId);
        T.ok(entry, 'thiếu entry cho ' + lessonId);
        T.eq(entry.tribute, expected[lessonId], 'tribute sai ở ' + lessonId);
      });
      KM.GameMap.all().forEach(function (entry) {
        T.ok(entry.tribute.length > 2, 'tribute quá ngắn: ' + entry.gameId);
      });
    });

    T.test('phase intro/b5/b20 = 1, bài khác ở đợt 2/3', function () {
      T.eq(KM.GameMap.phaseOf('intro'), 1);
      T.eq(KM.GameMap.phaseOf('b5'), 1);
      T.eq(KM.GameMap.phaseOf('b20'), 1);
      T.eq(KM.GameMap.phaseOf('b1'), 2);
      T.eq(KM.GameMap.phaseOf('b10'), 3);
      T.eq(KM.GameMap.phaseOf('khong-ton-tai'), null);
      var phase1 = KM.GameMap.all().filter(function (entry) {
        return entry.phase === 1;
      }).map(function (entry) { return entry.gameId; }).sort();
      T.deepEq(phase1, phase1Ids().slice().sort());
    });

    T.test('forLesson khớp thứ tự curriculum', function () {
      var list = KM.GameMap.all();
      KM.Curriculum.lessons.forEach(function (lesson, index) {
        var entry = KM.GameMap.forLesson(lesson.id);
        T.ok(entry, 'forLesson trả null cho ' + lesson.id);
        T.eq(entry, list[index], 'sai thứ tự entry ở ' + lesson.id);
      });
      T.eq(KM.GameMap.forLesson('khong-ton-tai'), null);
      T.eq(KM.GameMap.forLesson(''), null);
    });

    T.test('đường dẫn ảnh HD khớp lessonId', function () {
      KM.Curriculum.lessons.forEach(function (lesson) {
        var entry = KM.GameMap.forLesson(lesson.id);
        T.eq(entry.bg, 'Asset/hd/' + lesson.id + '.webp', 'sai bg của ' + lesson.id);
      });
    });
  });

  T.suite('GameRegistry & GameContract — ADR-0002', function () {
    T.test('3 factory Đợt 1 đã tự đăng ký', function () {
      phase1Ids().forEach(function (gameId) {
        T.eq(typeof KM.GameRegistry.get(gameId), 'function', 'thiếu factory ' + gameId);
        T.eq(KM.GameRegistry.has(gameId), true);
      });
    });

    T.test('registry.get trả null cho id lạ', function () {
      T.eq(KM.GameRegistry.get('khong-ton-tai'), null);
      T.eq(KM.GameRegistry.get(''), null);
      T.eq(KM.GameRegistry.has('khong-ton-tai'), false);
    });

    T.test('GameContract chấp nhận factory và instance đủ 5 method', function () {
      T.eq(KM.GameContract.assert(function () {}), true);
      var instance = {};
      KM.GameContract.methods.forEach(function (name) {
        instance[name] = function () {};
      });
      T.eq(KM.GameContract.assert(instance), true);
      T.deepEq(KM.GameContract.methods,
        ['render', 'onCorrect', 'onWrong', 'celebrate', 'destroy']);
    });

    T.test('GameContract chặn instance thiếu method', function () {
      T.throws(function () { KM.GameContract.assert(null); });
      T.throws(function () { KM.GameContract.assert({}); });
      KM.GameContract.methods.forEach(function (missing) {
        var broken = {};
        KM.GameContract.methods.forEach(function (name) {
          broken[name] = function () {};
        });
        delete broken[missing];
        T.throws(function () { KM.GameContract.assert(broken); },
          'phải chặn instance thiếu ' + missing + '()');
      });
    });
  });
}());
