/**
 * Test sinh đề, phiên học và tiến độ. Chạy hàng nghìn câu để bắt lỗi biên.
 */
(function () {
  'use strict';
  var T = window.KMTest;
  var Q = KM.Questions;
  var C = KM.Curriculum;

  var CONFIGS = {
    count: { min: 0, max: 10, objects: ['apple', 'balloon', 'fish'] },
    compareGroups: { max: 10, objects: ['apple', 'fish'] },
    compareSign: { max: 10, modes: ['sign', 'number'] },
    compose: { max: 10, objects: ['fish'] },
    add: { max: 10, objects: ['apple'], missing: ['result', 'addend'] },
    subtract: { max: 10, objects: ['duck'] },
    factFamily: { max: 10 },
    sequence: { max: 10 },
    shape2d: { shapes: ['square', 'circle', 'triangle', 'rectangle'], modes: ['identify', 'count'], maxCount: 8 },
    solid3d: { modes: ['identify', 'realWorld'] },
    position: { modes: ['onUnder', 'leftRight'] }
  };

  function numTokens(tokens) {
    return tokens.filter(function (token) { return token.type === 'num'; })
      .map(function (token) { return Number(token.value); });
  }

  function slotIndex(tokens) {
    var i;
    for (i = 0; i < tokens.length; i += 1) {
      if (tokens[i].type === 'slot') {
        return i;
      }
    }
    return -1;
  }

  function operator(tokens) {
    var ops = tokens.filter(function (token) {
      return token.type === 'op' && token.value !== '=';
    });
    return ops.length ? ops[0].value : '';
  }

  function assertValid(question, label) {
    var errors = Q.validate(question);
    T.eq(errors.join('; '), '', label + ' — ' + errors.join('; '));
  }

  function assertNumbers(question, label) {
    if (question.choiceRender !== 'number') {
      return;
    }
    question.choices.forEach(function (choice) {
      T.ok(Number.isInteger(choice.value), label + ' lựa chọn không nguyên');
      T.ok(choice.value >= 0 && choice.value <= 10, label + ' lựa chọn ngoài 0–10: ' + choice.value);
    });
    T.ok(Number.isInteger(question.answer), label + ' đáp án không nguyên');
    T.ok(question.answer >= 0 && question.answer <= 10, label + ' đáp án ngoài 0–10');
  }

  T.suite('Questions — mọi dạng sinh đề hợp lệ', function () {
    T.test('11 dạng hoạt động đều có generator', function () {
      T.eq(Q.ACTIVITIES.length, 11);
      Q.ACTIVITIES.forEach(function (activity) {
        T.ok(CONFIGS[activity], 'thiếu config test cho ' + activity);
        var rng = KM.Rng.create('gen-' + activity);
        var question = Q.generate(activity, rng, CONFIGS[activity]);
        assertValid(question, activity);
        assertNumbers(question, activity);
      });
    });

    T.test('mỗi dạng sinh 250 câu đều hợp lệ', function () {
      Q.ACTIVITIES.forEach(function (activity) {
        var rng = KM.Rng.create('stress-' + activity);
        var i;
        for (i = 0; i < 250; i += 1) {
          var question = Q.generate(activity, rng, CONFIGS[activity]);
          assertValid(question, activity + '#' + i);
          assertNumbers(question, activity + '#' + i);
        }
      });
    });

    T.test('không có lựa chọn trùng giá trị', function () {
      var rng = KM.Rng.create('dupes');
      Q.ACTIVITIES.forEach(function (activity) {
        var i;
        for (i = 0; i < 100; i += 1) {
          var question = Q.generate(activity, rng, CONFIGS[activity]);
          var values = question.choices.map(function (choice) { return choice.value; });
          T.eq(new Set(values).size, values.length, activity + ' bị trùng lựa chọn');
        }
      });
    });

    T.test('câu đếm khớp số đồ vật trong hình', function () {
      var rng = KM.Rng.create('count-visual');
      var i;
      for (i = 0; i < 300; i += 1) {
        var question = Q.generate('count', rng, CONFIGS.count);
        T.eq(question.visual.groups[0].count, question.answer);
        if (question.answer === 0) {
          T.ok(question.cheer.indexOf('Không có') !== -1,
            'lời khen số 0 phải nói "Không có ... nào"');
        }
      }
    });

    T.test('so sánh nhóm đúng với số lượng', function () {
      var rng = KM.Rng.create('groups');
      var i;
      for (i = 0; i < 300; i += 1) {
        var question = Q.generate('compareGroups', rng, CONFIGS.compareGroups);
        var left = question.visual.groups[0].count;
        var right = question.visual.groups[1].count;
        var more = question.text.indexOf('nhiều hơn') !== -1;
        var expected = left === right ? 'equal'
          : (more ? (left > right ? 'left' : 'right') : (left < right ? 'left' : 'right'));
        T.eq(question.answer, expected, 'so sánh ' + left + ' và ' + right);
        var labels = question.choices.map(function (choice) {
          return choice.label;
        }).sort();
        T.deepEq(labels, ['Bằng nhau', 'Nhóm 1', 'Nhóm 2'].sort(), 'nhãn nhóm');
        question.choices.forEach(function (choice) {
          T.ok(choice.icon, 'thiếu biểu tượng cho ' + choice.label);
        });
        T.eq(question.visual.groups[0].label, 'Nhóm 1');
        T.eq(question.visual.groups[1].label, 'Nhóm 2');
        T.eq(question.visual.groups[0].badge, '1');
        T.eq(question.visual.groups[1].badge, '2');
      }
    });

    T.test('điền dấu đúng quan hệ', function () {
      var rng = KM.Rng.create('sign');
      var i;
      for (i = 0; i < 400; i += 1) {
        var question = Q.generate('compareSign', rng, { max: 10, modes: ['sign'] });
        var nums = numTokens(question.equation.tokens);
        var expected = nums[0] > nums[1] ? '>' : (nums[0] < nums[1] ? '<' : '=');
        T.eq(question.answer, expected, nums.join(' ? '));
        if (nums.indexOf(0) !== -1) {
          T.ok(question.cheer.toLowerCase().indexOf('số không') !== -1,
            'câu so sánh có số 0 phải đọc "số không"');
          T.ok(question.say.indexOf('số không') !== -1,
            'lời đọc câu so sánh có số 0 phải dùng "số không"');
        }
      }
    });

    T.test('tìm số thoả mãn chỉ có một đáp án đúng', function () {
      var rng = KM.Rng.create('missing-number');
      var i;
      for (i = 0; i < 400; i += 1) {
        var question = Q.generate('compareSign', rng, { max: 10, modes: ['number'] });
        var tokens = question.equation.tokens;
        var relation = operator(tokens);
        var boundary = numTokens(tokens)[0];
        var satisfies = function (value) {
          return relation === '>' ? value > boundary : value < boundary;
        };
        T.ok(satisfies(question.answer), 'đáp án không thoả ' + relation + ' ' + boundary);
        question.choices.forEach(function (choice) {
          if (choice.value !== question.answer) {
            T.ok(!satisfies(choice.value),
              'lựa chọn nhiễu cũng đúng: ' + choice.value + ' ' + relation + ' ' + boundary);
          }
        });
      }
    });

    T.test('phép cộng luôn đúng và tổng không quá 10', function () {
      var rng = KM.Rng.create('add');
      var i;
      var zeroSeen = false;
      for (i = 0; i < 400; i += 1) {
        var question = Q.generate('add', rng, CONFIGS.add);
        var tokens = question.equation.tokens;
        var nums = numTokens(tokens);
        var slot = slotIndex(tokens);
        var expected = slot === tokens.length - 1
          ? nums[0] + nums[1]
          : nums[1] - nums[0];
        T.eq(question.answer, expected, 'phép cộng sai');
        T.ok(nums[0] + (slot === tokens.length - 1 ? nums[1] : expected) <= 10, 'tổng vượt 10');
        if (nums.indexOf(0) !== -1) {
          zeroSeen = true;
          T.ok(question.say.toLowerCase().indexOf('số không') !== -1,
            'phép cộng có số 0 phải đọc "số không"');
        }
        if (question.answer === 0) {
          zeroSeen = true;
          T.ok(question.cheer.toLowerCase().indexOf('số không') !== -1,
            'đáp án 0 phải đọc "số không"');
        }
        if (slot === 2) {
          T.ok(question.visual.groups[1].masked, 'nhóm cần tìm phải bị che');
        }
      }
      T.ok(zeroSeen, 'cần có câu cộng với 0 như sách');
    });

    T.test('phép trừ luôn đúng và không âm', function () {
      var rng = KM.Rng.create('sub');
      var i;
      var zeroSeen = false;
      for (i = 0; i < 400; i += 1) {
        var question = Q.generate('subtract', rng, CONFIGS.subtract);
        var nums = numTokens(question.equation.tokens);
        T.eq(question.answer, nums[0] - nums[1], 'phép trừ sai');
        T.ok(question.answer >= 0, 'kết quả âm');
        T.ok(nums[0] <= 10, 'số bị trừ vượt 10');
        if (question.answer === 0) {
          zeroSeen = true;
          T.eq(nums[1], nums[0], 'trừ hết phải lấy đúng số ban đầu');
        }
      }
      T.ok(zeroSeen, 'cần có câu trừ ra 0 như sách');
    });

    T.test('bảng cộng trừ đúng quan hệ ba số', function () {
      var rng = KM.Rng.create('family');
      var i;
      for (i = 0; i < 400; i += 1) {
        var question = Q.generate('factFamily', rng, CONFIGS.factFamily);
        var tokens = question.equation.tokens;
        var nums = numTokens(tokens);
        var expected = operator(tokens) === '+' ? nums[0] + nums[1] : nums[0] - nums[1];
        T.eq(question.answer, expected, 'bảng cộng trừ sai');
      }
    });

    T.test('mấy và mấy khớp tổng', function () {
      var rng = KM.Rng.create('compose');
      var i;
      for (i = 0; i < 300; i += 1) {
        var question = Q.generate('compose', rng, CONFIGS.compose);
        var first = question.visual.groups[0].count;
        var second = question.visual.groups[1].count;
        if (question.text.indexOf('gồm') !== -1) {
          T.eq(question.answer, second, 'phần còn thiếu sai');
          T.ok(question.visual.groups[1].masked, 'nhóm thứ hai phải bị che');
        } else {
          T.eq(question.answer, first + second, 'tổng tách gộp sai');
        }
      }
    });

    T.test('dãy số thiếu đúng vị trí', function () {
      var rng = KM.Rng.create('sequence');
      var i;
      for (i = 0; i < 300; i += 1) {
        var question = Q.generate('sequence', rng, CONFIGS.sequence);
        var values = question.visual.values;
        var missing = values.indexOf(null);
        T.ok(missing > 0 && missing < values.length, 'vị trí thiếu không hợp lệ');
        var full = values.slice();
        full[missing] = question.answer;
        var step = full[1] - full[0];
        T.ok(Math.abs(step) === 1, 'bước nhảy phải là 1: ' + step);
        var k;
        for (k = 2; k < full.length; k += 1) {
          T.eq(full[k] - full[k - 1], step, 'dãy số không đều');
        }
        if (question.answer === 0) {
          T.ok(question.cheer.indexOf('số không') !== -1,
            'dãy số thiếu số 0 phải đọc "số không"');
        }
      }
    });

    T.test('đếm hình khớp số hình đã vẽ', function () {
      var rng = KM.Rng.create('shape-count');
      var i;
      for (i = 0; i < 250; i += 1) {
        var question = Q.generate('shape2d', rng, {
          shapes: ['square', 'circle', 'triangle', 'rectangle'],
          modes: ['count'],
          maxCount: 8
        });
        var targetKey = null;
        Object.keys(C.shapes).forEach(function (key) {
          if (question.text.indexOf(C.shapes[key].name) !== -1) {
            targetKey = key;
          }
        });
        T.ok(targetKey, 'không xác định được hình cần đếm');
        var actual = question.visual.items.filter(function (item) {
          return item.shape === targetKey;
        }).length;
        T.eq(question.answer, actual, 'đếm hình sai');
      }
    });

    T.test('nhận dạng hình có 3 lựa chọn và đáp án nằm trong đó', function () {
      var rng = KM.Rng.create('shape-id');
      var i;
      for (i = 0; i < 200; i += 1) {
        var question = Q.generate('shape2d', rng, {
          shapes: ['square', 'circle', 'triangle', 'rectangle'],
          modes: ['identify']
        });
        T.eq(question.choices.length, 3);
        T.eq(question.choiceRender, 'shape');
        T.ok(C.shapes[question.answer], 'đáp án không phải hình hợp lệ');
      }
    });

    T.test('khối 3D và vật thật đúng dạng', function () {
      var rng = KM.Rng.create('solid');
      var i;
      for (i = 0; i < 200; i += 1) {
        var question = Q.generate('solid3d', rng, CONFIGS.solid3d);
        if (question.choiceRender === 'shape') {
          T.ok(question.choices.length === 2, 'khối phải có 2 lựa chọn');
          T.ok(question.answer === 'cube' || question.answer === 'cuboid');
        } else {
          T.eq(question.choices.length, 3);
          T.eq(question.choiceRender, 'glyph');
        }
      }
    });

    T.test('vị trí có 4 lựa chọn và khớp hình', function () {
      var rng = KM.Rng.create('position');
      var i;
      for (i = 0; i < 200; i += 1) {
        var question = Q.generate('position', rng, CONFIGS.position);
        T.eq(question.choices.length, 4);
        T.eq(question.visual.rel, question.answer);
        T.ok(['on', 'under', 'left', 'right'].indexOf(question.answer) !== -1);
        var icons = {};
        question.choices.forEach(function (choice) {
          T.ok(choice.icon, 'thiếu mũi tên cho ' + choice.label);
          icons[choice.value] = choice.icon;
        });
        T.eq(icons.on, '↑');
        T.eq(icons.under, '↓');
        T.eq(icons.left, '←');
        T.eq(icons.right, '→');
      }
    });

    T.test('hoạt động lạ thì báo lỗi', function () {
      T.throws(function () {
        Q.generate('không-tồn-tại', KM.Rng.create(1), {});
      });
    });
  });

  T.suite('Questions — theo bài học', function () {
    T.test('mỗi bài sinh đúng số câu và hợp lệ', function () {
      C.lessons.forEach(function (lesson) {
        var session;
        for (session = 0; session < 8; session += 1) {
          var rng = KM.Rng.create('lesson-' + lesson.id + '-' + session);
          var list = Q.forLesson(lesson, rng, KM.Tuning);
          T.eq(list.length, C.questionCount(lesson, KM.Tuning), lesson.id + ' sai số câu');
          list.forEach(function (question, index) {
            assertValid(question, lesson.id + '#' + session + '-' + index);
            assertNumbers(question, lesson.id + '#' + session + '-' + index);
          });
        }
      });
    });

    T.test('bài luyện tập trộn nhiều dạng', function () {
      ['b6', 'b13', 'b16', 'b17', 'b18', 'b19', 'b20'].forEach(function (id) {
        var lesson = C.getLesson(id);
        var rng = KM.Rng.create('mix-' + id);
        var kinds = new Set(Q.forLesson(lesson, rng, KM.Tuning).map(function (question) {
          return question.kind;
        }));
        T.ok(kinds.size >= 2, id + ' chỉ có ' + kinds.size + ' dạng');
      });
    });

    T.test('câu hỏi liên tiếp không lặp dạng khi có nhiều phần', function () {
      var lesson = C.getLesson('b20');
      var rng = KM.Rng.create('mix-no-repeat');
      var list = Q.forLesson(lesson, rng, KM.Tuning);
      var i;
      for (i = 1; i < list.length; i += 1) {
        T.ok(list[i].kind !== list[i - 1].kind,
          'lặp dạng ' + list[i].kind + ' ở vị trí ' + i);
      }
    });
  });

  T.suite('LessonSession — tính điểm', function () {
    function makeSession(count) {
      var questions = [];
      var i;
      for (i = 1; i <= count; i += 1) {
        questions.push({ answer: i, cheer: 'Đúng rồi!' });
      }
      return KM.LessonSession.create({ questions: questions, tuning: KM.Tuning });
    }

    T.test('sai thì không đi tiếp và không mất sao', function () {
      var s = makeSession(5);
      var result = s.answer(99);
      T.eq(result.correct, false);
      T.eq(result.ignored, undefined);
      T.eq(s.progress().index, 0);
      T.eq(s.next(), true);
      T.eq(s.progress().index, 0);
    });

    T.test('đúng ngay lần đầu được 1 sao', function () {
      var s = makeSession(5);
      var result = s.answer(1);
      T.eq(result.correct, true);
      T.eq(result.firstTry, true);
      T.eq(result.stars, 1);
      T.eq(s.next(), true);
      T.eq(s.progress().index, 1);
    });

    T.test('đúng sau khi sai không tính lần đầu', function () {
      var s = makeSession(5);
      s.answer(2);
      var result = s.answer(1);
      T.eq(result.correct, true);
      T.eq(result.firstTry, false);
      T.eq(result.stars, 0);
    });

    T.test('trả lời lại sau khi đúng bị bỏ qua', function () {
      var s = makeSession(5);
      s.answer(1);
      var again = s.answer(1);
      T.eq(again.ignored, true);
    });

    T.test('hoàn thành tất cả ngay lần đầu được 3 sao', function () {
      var s = makeSession(5);
      var i;
      for (i = 1; i <= 5; i += 1) {
        s.answer(i);
        if (i < 5) {
          T.eq(s.next(), true);
        } else {
          T.eq(s.next(), false);
        }
      }
      var summary = s.summary();
      T.eq(summary.stars, 3);
      T.eq(summary.firstTryCorrect, 5);
      T.eq(summary.completed, true);
      T.eq(s.isFinished(), true);
    });

    T.test('đúng 3/5 lần đầu được 2 sao', function () {
      var s = makeSession(5);
      var i;
      for (i = 1; i <= 5; i += 1) {
        if (i > 3) {
          s.answer(99);
        }
        s.answer(i);
        s.next();
      }
      var summary = s.summary();
      T.eq(summary.stars, 2);
      T.eq(summary.firstTryCorrect, 3);
      T.eq(summary.bestStreak, 3);
    });

    T.test('đúng 2/5 lần đầu chỉ được 1 sao', function () {
      var s = makeSession(5);
      var i;
      for (i = 1; i <= 5; i += 1) {
        if (i > 2) {
          s.answer(99);
        }
        s.answer(i);
        s.next();
      }
      T.eq(s.summary().stars, 1);
    });

    T.test('chuỗi đúng dài nhất được ghi nhận', function () {
      var s = makeSession(5);
      var i;
      for (i = 1; i <= 5; i += 1) {
        if (i >= 4) {
          s.answer(99);
        }
        s.answer(i);
        s.next();
      }
      T.eq(s.summary().bestStreak, 3);
    });
  });

  T.suite('Progress — sao, mở khoá, lưu trữ', function () {
    function fakeStorage() {
      var data = null;
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

    function makeProgress(storage) {
      return KM.Progress.create({
        storage: storage || fakeStorage(),
        tuning: KM.Tuning,
        curriculum: KM.Curriculum
      });
    }

    T.test('màn đầu mở, màn sau khoá', function () {
      var p = makeProgress();
      T.eq(p.isUnlocked('intro'), true);
      T.eq(p.isUnlocked('b1'), false);
      T.eq(p.isUnlocked('b20'), false);
      T.eq(p.totalStars(), 0);
      T.eq(p.maxStars(), 63);
    });

    T.test('đạt 1 sao mở bài kế tiếp', function () {
      var p = makeProgress();
      var result = p.recordResult('intro', { stars: 1, firstTryCorrect: 4, bestStreak: 2 });
      T.eq(result.unlockedNext, true);
      T.eq(p.isUnlocked('b1'), true);
      T.eq(p.isUnlocked('b2'), false);
    });

    T.test('không ghi đè điểm cao bằng điểm thấp', function () {
      var p = makeProgress();
      p.recordResult('intro', { stars: 3, firstTryCorrect: 5, bestStreak: 5 });
      var result = p.recordResult('intro', { stars: 1, firstTryCorrect: 2, bestStreak: 1 });
      T.eq(p.starsFor('intro'), 3);
      T.eq(result.isNewBest, false);
      T.eq(result.stars, 3);
      T.eq(p.entryFor('intro').plays, 2);
    });

    T.test('tổng sao và thống kê chính xác', function () {
      var p = makeProgress();
      p.recordResult('intro', { stars: 2, firstTryCorrect: 4, bestStreak: 2 });
      p.recordResult('b1', { stars: 3, firstTryCorrect: 8, bestStreak: 8 });
      T.eq(p.totalStars(), 5);
      var stats = p.stats();
      T.eq(stats.stars, 5);
      T.eq(stats.completed, 2);
      T.eq(stats.totalLessons, 21);
      T.eq(stats.plays, 2);
    });

    T.test('mở khoá tất cả hoạt động', function () {
      var p = makeProgress();
      p.setSetting('unlockAll', true);
      T.eq(p.isUnlocked('b20'), true);
      T.eq(p.settings().unlockAll, true);
    });

    T.test('lưu và đọc lại tiến độ', function () {
      var storage = fakeStorage();
      var first = makeProgress(storage);
      first.recordResult('intro', { stars: 3, firstTryCorrect: 5, bestStreak: 5 });
      first.setSetting('speech', false);
      var second = makeProgress(storage);
      T.eq(second.starsFor('intro'), 3);
      T.eq(second.settings().speech, false);
      T.eq(second.isUnlocked('b1'), true);
    });

    T.test('đặt lại tiến độ giữ cài đặt', function () {
      var p = makeProgress();
      p.recordResult('intro', { stars: 3, firstTryCorrect: 5, bestStreak: 5 });
      p.setSetting('unlockAll', true);
      p.resetProgress();
      T.eq(p.totalStars(), 0);
      T.eq(p.settings().unlockAll, true);
      T.eq(p.isUnlocked('b20'), true);
    });

    T.test('đặt lại tất cả trả cài đặt về mặc định', function () {
      var p = makeProgress();
      p.setSetting('speech', false);
      p.setSetting('unlockAll', true);
      p.resetAll();
      T.eq(p.settings().speech, true);
      T.eq(p.settings().unlockAll, false);
    });
  });
}());
