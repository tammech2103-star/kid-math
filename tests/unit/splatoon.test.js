/**
 * Regression: câu `position` có 4 đáp án từng chồng lên mục tiêu 1.
 * User đã sửa js/ui/games/splatoon.js (TARGET_SPOTS_4 + target 76px) — test này
 * khoá không cho hồi quy. Không sửa app code trong gói test này.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  function targets(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.sp-target'));
  }

  function lefts(list) {
    return list.map(function (node) { return node.style.left; });
  }

  function minWidths(list) {
    return list.map(function (node) { return parseFloat(node.style.minWidth); });
  }

  function question(count) {
    var labels = ['Trái', 'Giữa trái', 'Giữa phải', 'Phải'];
    var values = ['left', 'mid-left', 'mid-right', 'right'];
    var choices = [];
    for (var i = 0; i < count; i += 1) {
      choices.push({ value: values[i], label: labels[i], glyph: '🔷' });
    }
    return { kind: 'position', text: 'Chọn vị trí đúng?', choices: choices };
  }

  T.suite('Splatoon — regression b19 (4 mục tiêu)', function () {
    T.test('test_splatoon_four_choices_get_distinct_spots_and_touch_targets', function () {
      // Arrange
      var root4 = document.createElement('div');
      var root3 = document.createElement('div');
      document.body.appendChild(root4);
      document.body.appendChild(root3);
      var answers = [];
      var game4 = null;
      var game3 = null;

      try {
        // Act: 4 đáp án (câu position trong questions.js) → dải 4 vị trí.
        game4 = KM.Games.splatoon({
          mount: root4,
          ctx: {},
          question: question(4),
          onAnswer: function (value) { answers.push(value); }
        });
        var four = targets(root4);

        // Assert
        T.eq(four.length, 4, '4 đáp án phải ra đúng 4 mục tiêu');
        T.deepEq(lefts(four), ['2%', '26%', '50%', '74%'],
          '4 mục tiêu phải dùng TARGET_SPOTS_4, không chồng lên nhau');
        T.eq(new Set(lefts(four)).size, 4, '4 giá trị left phải khác nhau');
        minWidths(four).forEach(function (width, index) {
          T.ok(width >= 64, 'mục tiêu ' + index + ' phải ≥64px, nhận ' + width);
          T.eq(width, 76, 'mục tiêu 4 đáp án phải thu về 76px');
        });

        // Act: click đáp án đầu → onAnswer đúng 1 lần, click lại không nộp thêm.
        four[0].click();
        four[0].click();
        T.deepEq(answers, ['left']);

        // Act + Assert: 3 đáp án vẫn dùng 3 spot cũ, kích thước 88px.
        game3 = KM.Games.splatoon({
          mount: root3,
          ctx: {},
          question: question(3),
          onAnswer: function () {}
        });
        var three = targets(root3);
        T.eq(three.length, 3);
        T.deepEq(lefts(three), [
          '18%', 'calc(50% - 44px)', 'calc(82% - 88px)'
        ], '3 đáp án phải giữ nguyên 3 spot cũ');
        minWidths(three).forEach(function (width) {
          T.eq(width, 88, '3 đáp án giữ target 88px');
        });
      } finally {
        if (game4) { game4.destroy(); }
        if (game3) { game3.destroy(); }
        if (root4.parentNode) { root4.parentNode.removeChild(root4); }
        if (root3.parentNode) { root3.parentNode.removeChild(root3); }
      }
    });
  });
}());
