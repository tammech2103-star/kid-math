/**
 * Test dữ liệu chương trình: đủ 21 màn, thứ tự trang, tham chiếu hợp lệ.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var C = KM.Curriculum;
  var validActivities = KM.Questions.ACTIVITIES;

  T.suite('Curriculum — cấu trúc', function () {
    T.test('có đúng 5 chủ đề và 21 màn', function () {
      T.eq(C.chapters.length, 5);
      T.eq(C.lessons.length, 21);
    });

    T.test('mã bài không trùng', function () {
      var ids = C.lessons.map(function (lesson) { return lesson.id; });
      T.eq(new Set(ids).size, ids.length);
    });

    T.test('nhãn bài không trùng', function () {
      var labels = C.lessons.map(function (lesson) { return lesson.label; });
      T.eq(new Set(labels).size, labels.length);
    });

    T.test('số trang tăng dần theo sách', function () {
      var pages = C.lessons.map(function (lesson) { return lesson.page; });
      var sorted = pages.slice().sort(function (a, b) { return a - b; });
      T.deepEq(pages, sorted);
    });

    T.test('mỗi màn có ít nhất một phần và đúng dạng hoạt động', function () {
      C.lessons.forEach(function (lesson) {
        T.ok(lesson.parts && lesson.parts.length > 0, lesson.id + ' thiếu parts');
        lesson.parts.forEach(function (part) {
          T.ok(validActivities.indexOf(part.activity) !== -1,
            lesson.id + ' dùng hoạt động lạ: ' + part.activity);
          T.ok(part.config && typeof part.config === 'object',
            lesson.id + ' thiếu config');
        });
      });
    });

    T.test('mỗi màn có số câu trong khoảng 5–12', function () {
      C.lessons.forEach(function (lesson) {
        var count = C.questionCount(lesson, KM.Tuning);
        T.ok(count >= 5 && count <= 12, lesson.id + ' có ' + count + ' câu');
      });
    });

    T.test('tham chiếu đồ vật đều tồn tại', function () {
      C.lessons.forEach(function (lesson) {
        lesson.parts.forEach(function (part) {
          (part.config.objects || []).forEach(function (key) {
            T.ok(C.objects[key], lesson.id + ' thiếu đồ vật ' + key);
          });
        });
      });
    });

    T.test('tham chiếu hình đều tồn tại', function () {
      C.lessons.forEach(function (lesson) {
        lesson.parts.forEach(function (part) {
          (part.config.shapes || []).forEach(function (key) {
            T.ok(C.shapes[key], lesson.id + ' thiếu hình ' + key);
          });
        });
      });
    });

    T.test('mọi màn đều lấy được bằng id', function () {
      C.lessons.forEach(function (lesson) {
        T.eq(C.getLesson(lesson.id), lesson);
      });
      T.eq(C.getLesson('không-có'), null);
    });

    T.test('chủ đề có màu hợp lệ', function () {
      var allowed = ['sky', 'grape', 'coral', 'mint', 'sun'];
      C.chapters.forEach(function (chapter) {
        T.ok(allowed.indexOf(chapter.color) !== -1, chapter.id + ' màu lạ');
        chapter.lessons.forEach(function (lesson) {
          T.eq(lesson.chapterId, chapter.id);
        });
      });
    });
  });
}());
