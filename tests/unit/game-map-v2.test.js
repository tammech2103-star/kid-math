/**
 * Test nhận diện 21 bài theo GameMap v2 / ADR-0003.
 * Chạy cùng KMTest trong tests/test-runner.html, không cần Node.
 * Các canonical array ở đây là hợp đồng cố định: assert THEO THỨ TỰ,
 * không chỉ kiểm tra thuộc tập hợp hay khoảng giá trị.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  /** @type {Array<string>} 21 style id canonical, theo thứ tự curriculum. */
  var CANONICAL_STYLES = [
    'pixel-art', 'watercolor', 'carved-wood', 'paper-cut', 'wax-crayon',
    'felt-fabric', 'plastic-bricks', 'origami', 'clay', 'oil-paint', 'mosaic',
    'ink-wash', 'chalkboard', 'grid-paper', 'yarn', 'cotton', 'pop-art',
    'neon-vector', 'woodcut', 'spray-paint', 'patchwork'
  ];

  /** @type {Array<string>} 21 cặp layout/variant canonical, theo thứ tự curriculum. */
  var CANONICAL_LAYOUT_VARIANTS = [
    'rail/a', 'arena/a', 'rail/b', 'arena/b', 'book/a', 'split/a', 'board/a',
    'bench/a', 'tray/a', 'bench/b', 'rail/c', 'book/b', 'board/b', 'split/b',
    'tray/b', 'arena/c', 'board/c', 'arena/d', 'board/d', 'bench/c', 'track/a'
  ];

  /** @type {Array<number>} 21 motionMs canonical, theo thứ tự curriculum. */
  var CANONICAL_MOTION_MS = [
    120, 200, 180, 200, 160, 180, 140, 200, 160, 200, 160, 220, 180, 200,
    180, 200, 140, 180, 200, 160, 140
  ];

  var PALETTE_KEYS = ['sky', 'accent', 'ink'];
  var HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

  T.suite('GameMap v2 — nhận diện 21 bài (ADR-0003)', function () {
    T.test('test_game_map_v2_entry_has_eight_identity_fields', function () {
      // Arrange
      var list = KM.GameMap.all();
      var required = [
        'style', 'layout', 'variant', 'cover', 'sprite',
        'introText', 'inputHint', 'motionMs'
      ];

      // Act + Assert
      T.eq(list.length, 21, 'GameMap phải có đúng 21 entry');
      list.forEach(function (entry, index) {
        required.forEach(function (field) {
          T.ok(entry[field] !== undefined && entry[field] !== null && entry[field] !== '',
            'entry ' + index + ' (' + entry.gameId + ') thiếu ' + field);
        });
        T.eq(typeof entry.motionMs, 'number', 'motionMs phải là số ở ' + entry.gameId);
      });
    });

    T.test('test_game_map_v2_style_matches_canonical_order', function () {
      // Arrange
      var styles = KM.GameMap.all().map(function (entry) { return entry.style; });

      // Act + Assert
      T.deepEq(styles, CANONICAL_STYLES, 'style sai hoặc sai thứ tự');
      T.eq(new Set(styles).size, 21, '21 style id phải unique');
    });

    T.test('test_game_map_v2_layout_variant_matches_canonical_pairs', function () {
      // Arrange
      var pairs = KM.GameMap.all().map(function (entry) {
        return entry.layout + '/' + entry.variant;
      });

      // Act + Assert
      T.deepEq(pairs, CANONICAL_LAYOUT_VARIANTS, 'layout/variant sai hoặc sai thứ tự');
      var layouts = KM.GameMap.all().map(function (entry) { return entry.layout; });
      T.ok(layouts.every(function (name) {
        return ['rail', 'arena', 'book', 'split', 'board', 'bench', 'tray', 'track']
          .indexOf(name) >= 0;
      }), 'layout phải thuộc 8 archetype đã định nghĩa');
    });

    T.test('test_game_map_v2_motion_ms_matches_canonical_sequence', function () {
      // Arrange
      var values = KM.GameMap.all().map(function (entry) { return entry.motionMs; });

      // Act + Assert
      T.deepEq(values, CANONICAL_MOTION_MS, 'motionMs sai hoặc sai thứ tự');
      values.forEach(function (value, index) {
        T.ok(value >= 120 && value <= 220, 'motionMs ngoài [120,220] ở entry ' + index);
      });
    });

    T.test('test_game_map_v2_cover_and_sprite_paths_follow_lesson_id', function () {
      // Arrange
      var lessons = KM.Curriculum.lessons;

      // Act + Assert
      T.eq(lessons.length, 21, 'curriculum phải có đúng 21 bài');
      lessons.forEach(function (lesson) {
        var entry = KM.GameMap.forLesson(lesson.id);
        T.ok(entry, 'thiếu entry cho ' + lesson.id);
        T.eq(entry.cover, 'Asset/covers/' + lesson.id + '.webp',
          'sai đường dẫn cover của ' + lesson.id);
        T.eq(entry.sprite, 'Asset/sprites/' + lesson.id + '.webp',
          'sai đường dẫn sprite của ' + lesson.id);
        T.eq(entry.bg, 'Asset/hd/' + lesson.id + '.webp',
          'sai đường dẫn bg của ' + lesson.id);
      });
    });

    T.test('test_game_map_v2_intro_text_is_present_and_under_sixty_chars', function () {
      // Arrange + Act + Assert
      KM.GameMap.all().forEach(function (entry) {
        T.ok(entry.introText.length > 0, 'introText rỗng ở ' + entry.gameId);
        T.ok(entry.introText.length < 60,
          'introText phải < 60 ký tự ở ' + entry.gameId + ': ' + entry.introText.length);
      });
    });

    T.test('test_game_map_v2_input_hint_is_present_and_distinct_from_intro', function () {
      // Arrange + Act + Assert
      KM.GameMap.all().forEach(function (entry) {
        T.ok(entry.inputHint.length > 0, 'inputHint rỗng ở ' + entry.gameId);
        T.ok(entry.inputHint !== entry.introText,
          'inputHint không được trùng introText ở ' + entry.gameId);
      });
    });

    T.test('test_game_map_v2_palette_has_three_valid_hex_colors', function () {
      // Arrange
      var hexCount = 0;

      // Act + Assert
      KM.GameMap.all().forEach(function (entry) {
        T.deepEq(Object.keys(entry.palette).slice().sort(), PALETTE_KEYS.slice().sort(),
          'palette phải đúng 3 field sky/accent/ink ở ' + entry.gameId);
        PALETTE_KEYS.forEach(function (key) {
          T.ok(HEX_COLOR.test(entry.palette[key]),
            'palette.' + key + ' không phải #RRGGBB ở ' + entry.gameId + ': ' + entry.palette[key]);
          hexCount += 1;
        });
      });
      T.eq(hexCount, 63, 'phải có đúng 21 × 3 = 63 giá trị màu hex');
    });

    T.test('test_game_map_v2_entries_remain_frozen_with_stable_identity', function () {
      // Arrange
      var list = KM.GameMap.all();
      var lessons = KM.Curriculum.lessons;

      // Act + Assert
      list.forEach(function (entry, index) {
        T.eq(Object.isFrozen(entry), true, 'entry phải bị freeze: ' + entry.gameId);
        T.eq(Object.isFrozen(entry.palette), true, 'palette phải bị freeze: ' + entry.gameId);
        T.eq(KM.GameMap.forLesson(lessons[index].id), entry,
          'forLesson phải trả chính object đã freeze ở ' + lessons[index].id);
      });
      var copy = KM.GameMap.all();
      copy.pop();
      T.eq(KM.GameMap.all().length, 21, 'all() phải trả bản sao, không phải mảng gốc');
    });

    T.test('test_game_map_v2_for_lesson_and_phase_of_stay_consistent', function () {
      // Arrange + Act + Assert
      KM.Curriculum.lessons.forEach(function (lesson) {
        var entry = KM.GameMap.forLesson(lesson.id);
        T.eq(KM.GameMap.phaseOf(lesson.id), entry.phase,
          'phaseOf lệch phase của entry ở ' + lesson.id);
      });
      T.eq(KM.GameMap.forLesson('khong-ton-tai'), null);
      T.eq(KM.GameMap.phaseOf('khong-ton-tai'), null);
    });
  });
}());
