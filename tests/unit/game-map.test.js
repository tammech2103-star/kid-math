/**
 * Test bản đồ 21 minigame và registry KM.Games (ADR-0002/ADR-0004).
 * Mọi bài đều có module riêng, không còn contract/registry dùng chung.
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

  T.suite('KM.Games — 21 module độc lập', function () {
    function gameIds() {
      return KM.GameMap.all().map(function (entry) { return entry.gameId; });
    }

    function fixture() {
      return {
        text: 'Có bao nhiêu quả?',
        kind: 'count',
        answer: 2,
        choices: [{ value: 1, label: '1' }, { value: 2, label: '2' }],
        visual: { groups: [{ name: 'quả', glyph: '🍎', count: 2 }], values: [1, 2] },
        equation: { tokens: [], alt: '2 + 1 = ?' }
      };
    }

    function mountFor(gameId) {
      var mount = document.createElement('div');
      mount.style.position = 'absolute';
      mount.style.left = '-9999px';
      document.body.appendChild(mount);
      var game = KM.Games[gameId]({
        mount: mount, question: fixture(), audio: {}, reducedMotion: true
      });
      return { mount: mount, game: game };
    }

    T.test('cả 21 gameId đều có factory trong KM.Games', function () {
      gameIds().forEach(function (gameId) {
        T.eq(typeof KM.Games[gameId], 'function', 'thiếu factory ' + gameId);
      });
    });

    T.test('id lạ không có factory và không rơi về fallback', function () {
      T.eq(KM.Games['khong-ton-tai'], undefined);
      T.eq(KM.Games[''], undefined);
      T.eq(KM.Games['race'], undefined);
    });

    T.test('mỗi factory dựng root kmg-* và không render .choices', function () {
      gameIds().forEach(function (gameId) {
        var handle = mountFor(gameId);
        var root = handle.mount.firstElementChild;
        T.ok(root, gameId + ' không tạo root');
        T.ok(/^kmg-/.test(root.className), gameId + ' sai class root: ' + root.className);
        T.eq(handle.mount.querySelectorAll('.choices, .choice, .game-stage').length, 0,
          gameId + ' vẫn render hàng đáp án dùng chung');
        handle.game.destroy();
        if (handle.mount.parentNode) {
          handle.mount.parentNode.removeChild(handle.mount);
        }
      });
    });

    T.test('instance đủ 6 method và destroy gỡ root khỏi mount', function () {
      var methods = ['render', 'onWrong', 'onCorrect', 'celebrate', 'destroy', 'handleKey'];
      gameIds().forEach(function (gameId) {
        var handle = mountFor(gameId);
        methods.forEach(function (name) {
          T.eq(typeof handle.game[name], 'function', gameId + ' thiếu ' + name + '()');
        });
        handle.game.destroy();
        T.eq(handle.mount.children.length, 0, gameId + ' destroy không gỡ root');
        if (handle.mount.parentNode) {
          handle.mount.parentNode.removeChild(handle.mount);
        }
      });
    });
  });
}());
