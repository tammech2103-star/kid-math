/**
 * Nội dung 21 màn bám sát Toán 1 Tập 1 (Kết nối tri thức với cuộc sống).
 * Mọi câu hỏi được sinh từ cấu hình ở đây, không viết cứng đề bài.
 * @namespace KM.Curriculum
 */
window.KM = window.KM || {};

KM.Curriculum = (function () {
  'use strict';

  /** Đồ vật minh hoạ (emoji) + danh từ tiếng Việt để đọc đề. */
  var objects = {
    apple: { glyph: '🍎', noun: 'quả táo' },
    banana: { glyph: '🍌', noun: 'quả chuối' },
    orange: { glyph: '🍊', noun: 'quả cam' },
    strawberry: { glyph: '🍓', noun: 'quả dâu' },
    grape: { glyph: '🍇', noun: 'chùm nho' },
    balloon: { glyph: '🎈', noun: 'quả bóng bay' },
    ball: { glyph: '⚽', noun: 'quả bóng' },
    fish: { glyph: '🐟', noun: 'con cá' },
    duck: { glyph: '🦆', noun: 'con vịt' },
    car: { glyph: '🚗', noun: 'chiếc xe' },
    star: { glyph: '⭐', noun: 'ngôi sao' },
    cookie: { glyph: '🍪', noun: 'cái bánh' }
  };

  /** Hình học phẳng và khối, kèm màu dùng khi vẽ SVG. */
  var shapes = {
    square: { name: 'hình vuông', color: '#FF8A5B' },
    circle: { name: 'hình tròn', color: '#4FC3F7' },
    triangle: { name: 'hình tam giác', color: '#FFD84D' },
    rectangle: { name: 'hình chữ nhật', color: '#9C7BF5' },
    cube: { name: 'khối lập phương', color: '#6FE3B8' },
    cuboid: { name: 'khối hộp chữ nhật', color: '#FFB020' }
  };

  var FLAT_SHAPES = ['square', 'circle', 'triangle', 'rectangle'];
  var SOLID_SHAPES = ['cube', 'cuboid'];
  var FRUIT = ['apple', 'banana', 'orange', 'strawberry', 'grape'];
  var TOYS = ['balloon', 'ball', 'car', 'star', 'cookie'];

  /** @returns {{activity: string, config: object}} */
  function part(activity, config) {
    return { activity: activity, config: config || {} };
  }

  var chapters = [
    {
      id: 'c1',
      title: 'Các số từ 0 đến 10',
      color: 'sky',
      summary: 'Đếm, nhận mặt số, so sánh và tách – gộp trong phạm vi 10.',
      lessons: [
        {
          id: 'intro', label: 'Mở đầu', title: 'Tiết học đầu tiên', page: 6, icon: '🚦',
          count: 5,
          parts: [part('count', { min: 1, max: 5, objects: FRUIT })]
        },
        {
          id: 'b1', label: 'Bài 1', title: 'Các số 0, 1, 2, 3, 4, 5', page: 8, icon: '🔢',
          parts: [part('count', { min: 0, max: 5, objects: FRUIT.concat(TOYS) })]
        },
        {
          id: 'b2', label: 'Bài 2', title: 'Các số 6, 7, 8, 9, 10', page: 14, icon: '🔟',
          parts: [part('count', { min: 5, max: 10, objects: TOYS.concat(FRUIT) })]
        },
        {
          id: 'b3', label: 'Bài 3', title: 'Nhiều hơn, ít hơn, bằng nhau', page: 20, icon: '⚖️',
          parts: [part('compareGroups', { max: 10, objects: ['apple', 'balloon', 'fish', 'star'] })]
        },
        {
          id: 'b4', label: 'Bài 4', title: 'So sánh số', page: 24, icon: '↔️',
          parts: [part('compareSign', { max: 10, modes: ['sign', 'number'] })]
        },
        {
          id: 'b5', label: 'Bài 5', title: 'Mấy và mấy', page: 32, icon: '🧩',
          parts: [part('compose', { max: 10, objects: ['fish', 'balloon', 'apple'] })]
        },
        {
          id: 'b6', label: 'Bài 6', title: 'Luyện tập chung', page: 38, icon: '🎯',
          parts: [
            part('count', { min: 0, max: 10, objects: FRUIT.concat(TOYS) }),
            part('compareGroups', { max: 10, objects: ['apple', 'duck', 'fish'] }),
            part('compareSign', { max: 10, modes: ['sign', 'number'] }),
            part('compose', { max: 10, objects: ['fish', 'balloon'] }),
            part('sequence', { max: 10 })
          ]
        }
      ]
    },
    {
      id: 'c2',
      title: 'Làm quen với một số hình phẳng',
      color: 'grape',
      summary: 'Nhận dạng, gọi tên và đếm hình vuông, tròn, tam giác, chữ nhật.',
      lessons: [
        {
          id: 'b7', label: 'Bài 7', title: 'Hình vuông, hình tròn, hình tam giác, hình chữ nhật', page: 46, icon: '🔷',
          parts: [part('shape2d', { shapes: FLAT_SHAPES, modes: ['identify', 'count'], maxCount: 6 })]
        },
        {
          id: 'b8', label: 'Bài 8', title: 'Thực hành lắp ghép, xếp hình', page: 50, icon: '🧱',
          parts: [part('shape2d', { shapes: FLAT_SHAPES, modes: ['count'], maxCount: 8 })]
        },
        {
          id: 'b9', label: 'Bài 9', title: 'Luyện tập chung', page: 54, icon: '🎨',
          parts: [
            part('shape2d', { shapes: FLAT_SHAPES, modes: ['identify', 'count'], maxCount: 6 }),
            part('sequence', { max: 10 }),
            part('count', { min: 0, max: 10, objects: TOYS })
          ]
        }
      ]
    },
    {
      id: 'c3',
      title: 'Phép cộng, phép trừ trong phạm vi 10',
      color: 'coral',
      summary: 'Cộng, trừ có minh hoạ, bảng cộng trừ và tìm số còn thiếu.',
      lessons: [
        {
          id: 'b10', label: 'Bài 10', title: 'Phép cộng trong phạm vi 10', page: 56, icon: '➕',
          parts: [part('add', { max: 10, objects: ['apple', 'ball', 'car', 'cookie'], missing: ['result'] })]
        },
        {
          id: 'b11', label: 'Bài 11', title: 'Phép trừ trong phạm vi 10', page: 68, icon: '➖',
          parts: [part('subtract', { max: 10, objects: ['apple', 'balloon', 'duck', 'star'] })]
        },
        {
          id: 'b12', label: 'Bài 12', title: 'Bảng cộng, bảng trừ trong phạm vi 10', page: 80, icon: '📋',
          parts: [part('factFamily', { max: 10 })]
        },
        {
          id: 'b13', label: 'Bài 13', title: 'Luyện tập chung', page: 86, icon: '🎯',
          parts: [
            part('add', { max: 10, objects: ['apple', 'star'], missing: ['result', 'addend'] }),
            part('subtract', { max: 10, objects: ['duck', 'cookie'] }),
            part('factFamily', { max: 10 })
          ]
        }
      ]
    },
    {
      id: 'c4',
      title: 'Làm quen với một số hình khối',
      color: 'mint',
      summary: 'Khối lập phương, khối hộp chữ nhật và vị trí trong không gian.',
      lessons: [
        {
          id: 'b14', label: 'Bài 14', title: 'Khối lập phương, khối hộp chữ nhật', page: 92, icon: '🧊',
          parts: [part('solid3d', { modes: ['identify', 'realWorld'] })]
        },
        {
          id: 'b15', label: 'Bài 15', title: 'Vị trí, định hướng trong không gian', page: 96, icon: '🧭',
          parts: [part('position', { modes: ['onUnder', 'leftRight'] })]
        },
        {
          id: 'b16', label: 'Bài 16', title: 'Luyện tập chung', page: 100, icon: '🎯',
          parts: [
            part('solid3d', { modes: ['identify', 'realWorld'] }),
            part('position', { modes: ['onUnder', 'leftRight'] }),
            part('shape2d', { shapes: FLAT_SHAPES, modes: ['identify', 'count'], maxCount: 6 })
          ]
        }
      ]
    },
    {
      id: 'c5',
      title: 'Ôn tập học kì 1',
      color: 'sun',
      summary: 'Ôn lại số, phép tính và hình học trước khi kết thúc Tập 1.',
      lessons: [
        {
          id: 'b17', label: 'Bài 17', title: 'Ôn tập các số trong phạm vi 10', page: 102, icon: '🔄',
          parts: [
            part('count', { min: 0, max: 10, objects: FRUIT.concat(TOYS) }),
            part('compareSign', { max: 10, modes: ['sign', 'number'] }),
            part('sequence', { max: 10 }),
            part('compose', { max: 10, objects: ['apple', 'fish'] })
          ]
        },
        {
          id: 'b18', label: 'Bài 18', title: 'Ôn tập phép cộng, phép trừ trong phạm vi 10', page: 106, icon: '🔄',
          parts: [
            part('add', { max: 10, objects: ['ball', 'cookie'], missing: ['result', 'addend'] }),
            part('subtract', { max: 10, objects: ['star', 'duck'] }),
            part('factFamily', { max: 10 })
          ]
        },
        {
          id: 'b19', label: 'Bài 19', title: 'Ôn tập hình học', page: 110, icon: '🔄',
          parts: [
            part('shape2d', { shapes: FLAT_SHAPES, modes: ['identify', 'count'], maxCount: 6 }),
            part('solid3d', { modes: ['identify', 'realWorld'] }),
            part('position', { modes: ['onUnder', 'leftRight'] })
          ]
        },
        {
          id: 'b20', label: 'Bài 20', title: 'Ôn tập chung', page: 112, icon: '🏁',
          count: 10,
          parts: [
            part('count', { min: 0, max: 10, objects: FRUIT.concat(TOYS) }),
            part('compareGroups', { max: 10, objects: ['apple', 'ball', 'fish'] }),
            part('compareSign', { max: 10, modes: ['sign', 'number'] }),
            part('compose', { max: 10, objects: ['fish', 'balloon'] }),
            part('add', { max: 10, objects: ['apple', 'car'], missing: ['result', 'addend'] }),
            part('subtract', { max: 10, objects: ['duck', 'cookie'] }),
            part('factFamily', { max: 10 }),
            part('sequence', { max: 10 }),
            part('shape2d', { shapes: FLAT_SHAPES, modes: ['identify', 'count'], maxCount: 6 }),
            part('solid3d', { modes: ['identify', 'realWorld'] }),
            part('position', { modes: ['onUnder', 'leftRight'] })
          ]
        }
      ]
    }
  ];

  var lessons = [];
  chapters.forEach(function (chapter) {
    chapter.lessons.forEach(function (lesson) {
      lesson.chapterId = chapter.id;
      lesson.chapterTitle = chapter.title;
      lesson.chapterColor = chapter.color;
      lessons.push(lesson);
    });
  });

  var byId = {};
  lessons.forEach(function (lesson) {
    byId[lesson.id] = lesson;
  });

  /**
   * @param {string} id
   * @returns {object|null}
   */
  function getLesson(id) {
    return byId[id] || null;
  }

  /**
   * @returns {number} Số câu mặc định của một màn.
   */
  function questionCount(lesson, tuning) {
    if (lesson && lesson.count) {
      return lesson.count;
    }
    return tuning ? tuning.questionsPerLesson : 8;
  }

  return {
    objects: objects,
    shapes: shapes,
    flatShapes: FLAT_SHAPES.slice(),
    solidShapes: SOLID_SHAPES.slice(),
    chapters: chapters,
    lessons: lessons,
    getLesson: getLesson,
    questionCount: questionCount
  };
}());
