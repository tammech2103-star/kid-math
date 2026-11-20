/**
 * Test hạ tầng: số tiếng Việt, RNG tất định, lọc emoji cho giọng đọc.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  T.suite('Core — số tiếng Việt', function () {
    T.test('đọc đúng 0 đến 10', function () {
      var expected = [
        'không', 'một', 'hai', 'ba', 'bốn', 'năm',
        'sáu', 'bảy', 'tám', 'chín', 'mười'
      ];
      expected.forEach(function (word, index) {
        T.eq(KM.ViNumbers.toWords(index), word, 'số ' + index);
      });
    });

    T.test('countNoun ghép số và danh từ', function () {
      T.eq(KM.ViNumbers.countNoun(4, 'quả táo'), 'bốn quả táo');
      T.eq(KM.ViNumbers.countNoun(0, 'con cá'), 'không có con cá nào');
    });

    T.test('spoken đọc 0 là "số không" trong câu so sánh', function () {
      T.eq(KM.ViNumbers.spoken(0), 'số không');
      T.eq(KM.ViNumbers.spoken(3), 'ba');
      T.eq(KM.ViNumbers.spoken(10), 'mười');
    });

    T.test('capitalize viết hoa chữ đầu', function () {
      T.eq(KM.ViNumbers.capitalize('bé giỏi'), 'Bé giỏi');
      T.eq(KM.ViNumbers.capitalize(''), '');
    });
  });

  T.suite('Core — RNG', function () {
    T.test('cùng seed cho cùng dãy số', function () {
      var a = KM.Rng.create('bé-học-toán');
      var b = KM.Rng.create('bé-học-toán');
      var i;
      for (i = 0; i < 20; i += 1) {
        T.eq(a.next(), b.next(), 'lần ' + i);
      }
    });

    T.test('int luôn nằm trong khoảng', function () {
      var rng = KM.Rng.create(12345);
      var i;
      for (i = 0; i < 2000; i += 1) {
        var value = rng.int(-3, 7);
        T.ok(value >= -3 && value <= 7, 'giá trị ngoài khoảng: ' + value);
        T.ok(Number.isInteger(value), 'không phải số nguyên: ' + value);
      }
    });

    T.test('shuffle không sửa mảng gốc', function () {
      var source = [1, 2, 3, 4, 5];
      var rng = KM.Rng.create('x');
      var copy = rng.shuffle(source);
      T.deepEq(source, [1, 2, 3, 4, 5]);
      T.eq(copy.length, 5);
      T.eq(copy.slice().sort().join(','), '1,2,3,4,5');
    });

    T.test('chance(1) luôn đúng, chance(0) luôn sai', function () {
      var rng = KM.Rng.create(7);
      var i;
      for (i = 0; i < 100; i += 1) {
        T.eq(rng.chance(1), true);
        T.eq(rng.chance(0), false);
      }
    });
  });

  T.suite('Core — giọng đọc', function () {
    T.test('loại emoji trước khi đọc', function () {
      T.eq(KM.Speech.clean('Có mấy 🍎 quả táo? ⭐'), 'Có mấy quả táo?');
    });

    T.test('giữ dấu tiếng Việt', function () {
      T.eq(KM.Speech.clean('Đúng rồi! Bé giỏi quá!'), 'Đúng rồi! Bé giỏi quá!');
    });
  });
}());
