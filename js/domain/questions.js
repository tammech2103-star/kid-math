/**
 * Sinh câu hỏi cho 11 dạng hoạt động. Hàm thuần, không chạm DOM.
 * Mọi câu hỏi tuân theo hợp đồng Question:
 * { kind, text, say, visual, equation, choices, choiceRender, answer, cheer }.
 * @namespace KM.Questions
 */
window.KM = window.KM || {};

KM.Questions = (function () {
  'use strict';

  var V = KM.ViNumbers;
  var C = KM.Curriculum;
  var G = KM.Tuning.generation;

  var ACTIVITIES = [
    'count', 'compareGroups', 'compareSign', 'compose', 'add', 'subtract',
    'factFamily', 'sequence', 'shape2d', 'solid3d', 'position'
  ];

  var CHOICE_RENDERERS = ['number', 'sign', 'text', 'glyph', 'shape'];

  var REAL_OBJECTS = {
    box: { glyph: '📦', name: 'cái hộp', solid: 'cuboid' },
    book: { glyph: '📕', name: 'quyển sách', solid: 'cuboid' },
    dice: { glyph: '🎲', name: 'khối xúc xắc', solid: 'cube' },
    ball: { glyph: '⚽', name: 'quả bóng', solid: 'none' },
    can: { glyph: '🥫', name: 'lon nước', solid: 'none' }
  };

  /** @returns {number} */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Sinh danh sách lựa chọn số, luôn chứa đáp án và không trùng nhau.
   * @param {object} rng
   * @param {number} answer
   * @param {number} count
   * @param {number} min
   * @param {number} max
   * @returns {Array<object>}
   */
  function numberChoices(rng, answer, count, min, max) {
    var wanted = Math.max(2, count);
    var low = clamp(Math.min(min, answer), 0, 10);
    var high = clamp(Math.max(max, answer), 0, 10);
    var pool = [];
    var value;

    for (value = low; value <= high; value += 1) {
      if (value !== answer) {
        pool.push(value);
      }
    }
    if (pool.length < wanted - 1) {
      pool = [];
      for (value = 0; value <= 10; value += 1) {
        if (value !== answer) {
          pool.push(value);
        }
      }
    }

    var picked = rng.shuffle(pool).slice(0, wanted - 1);
    picked.push(answer);
    return rng.shuffle(picked).map(function (item) {
      return { value: item, label: String(item) };
    });
  }

  /** @returns {object} token số */
  function num(value) {
    return { type: 'num', value: String(value) };
  }

  /** @returns {object} token phép tính */
  function op(value) {
    return { type: 'op', value: value };
  }

  /** @returns {object} token ô trống */
  function slot() {
    return { type: 'slot' };
  }

  /**
   * @param {Array<object>} tokens
   * @returns {string} Mô tả cho trình đọc màn hình.
   */
  function equationAlt(tokens) {
    return tokens.map(function (token) {
      if (token.type === 'slot') {
        return 'ô trống';
      }
      return token.value;
    }).join(' ');
  }

  /** Dạng 1: đếm đồ vật và chọn số. */
  function count(rng, config) {
    var cfg = config || {};
    var min = cfg.min != null ? cfg.min : 0;
    var max = cfg.max != null ? cfg.max : 10;
    var objectKeys = cfg.objects && cfg.objects.length ? cfg.objects : ['apple'];
    var total = rng.int(min, max);
    if (total === 0 && min === 0 && rng.chance(G.zeroReroll)) {
      total = rng.int(1, max);
    }
    var object = C.objects[rng.pick(objectKeys)];
    var text = 'Có mấy ' + object.noun + '?';

    return {
      kind: 'count',
      text: text,
      say: 'Đếm xem có mấy ' + object.noun + ' nhé.',
      visual: {
        kind: 'group',
        alt: 'Một nhóm ' + object.noun + ' để bé đếm.',
        groups: [{ glyph: object.glyph, count: total, name: object.noun }]
      },
      equation: null,
      choices: numberChoices(rng, total, G.optionCount, min, max),
      choiceRender: 'number',
      answer: total,
      cheer: total === 0
        ? 'Đúng rồi! Không có ' + object.noun + ' nào.'
        : 'Đúng rồi! ' + V.capitalize(V.toWords(total)) + ' ' + object.noun + '.'
    };
  }

  /** Dạng 2: so sánh số lượng hai nhóm. */
  function compareGroups(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var objectKeys = cfg.objects && cfg.objects.length ? cfg.objects : ['apple'];
    var object = C.objects[rng.pick(objectKeys)];
    var left = rng.int(1, max);
    var right;
    var askMore = rng.chance(G.askMore);
    var answer;

    if (rng.chance(G.equalGroups)) {
      right = left;
    } else {
      do {
        right = rng.int(1, max);
      } while (right === left);
    }

    if (left === right) {
      answer = 'equal';
    } else if (askMore) {
      answer = left > right ? 'left' : 'right';
    } else {
      answer = left < right ? 'left' : 'right';
    }

    var labels = [
      { value: 'left', label: 'Nhóm A' },
      { value: 'right', label: 'Nhóm B' },
      { value: 'equal', label: 'Bằng nhau' }
    ];

    return {
      kind: 'compareGroups',
      text: askMore ? 'Nhóm nào có nhiều hơn?' : 'Nhóm nào có ít hơn?',
      say: (askMore ? 'Nhóm nào có nhiều hơn?' : 'Nhóm nào có ít hơn?') +
        ' Bé nhìn hai nhóm và chọn đáp án nhé.',
      visual: {
        kind: 'groups',
        alt: 'Hai nhóm ' + object.noun + ': nhóm A và nhóm B.',
        groups: [
          { glyph: object.glyph, count: left, label: 'Nhóm A' },
          { glyph: object.glyph, count: right, label: 'Nhóm B' }
        ]
      },
      equation: null,
      choices: labels,
      choiceRender: 'text',
      answer: answer,
      cheer: 'Đúng rồi! Nhóm A có ' + V.toWords(left) + ', nhóm B có ' +
        V.toWords(right) + ' ' + object.noun + '.'
    };
  }

  /** Dạng 3: điền dấu >, <, = hoặc tìm số thoả mãn. */
  function compareSign(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var modes = cfg.modes && cfg.modes.length ? cfg.modes : ['sign'];
    var mode = rng.pick(modes);
    var signChoices = [
      { value: '>', label: '>', aria: 'Dấu lớn hơn' },
      { value: '<', label: '<', aria: 'Dấu bé hơn' },
      { value: '=', label: '=', aria: 'Dấu bằng' }
    ];
    var a;
    var b;
    var answer;
    var relation;
    var tokens;
    var choices;
    var text;
    var say;
    var cheer;
    var choiceRender = 'sign';

    if (mode === 'number') {
      choiceRender = 'number';
      b = rng.int(1, max - 2);
      relation = rng.chance(G.relationGreater) ? '>' : '<';
      var valid = [];
      var invalid = [];
      var x;
      for (x = 0; x <= max; x += 1) {
        var ok = relation === '>' ? x > b : x < b;
        if (ok) {
          valid.push(x);
        } else {
          invalid.push(x);
        }
      }
      var answerNumber = rng.pick(valid);
      var wrongNumbers = rng.shuffle(invalid).slice(0, G.optionCount - 1);
      choices = rng.shuffle([answerNumber].concat(wrongNumbers).map(function (item) {
        return { value: item, label: String(item) };
      }));
      answer = answerNumber;
      tokens = [slot(), op(relation), num(b)];
      text = 'Điền số thích hợp';
      say = 'Tìm số thích hợp. Ô trống ' +
        (relation === '>' ? 'lớn hơn ' : 'bé hơn ') + V.toWords(b) + '.';
      cheer = 'Đúng rồi! ' + V.spoken(answer) + ' ' +
        (relation === '>' ? 'lớn hơn ' : 'bé hơn ') + V.spoken(b) + '.';
    } else {
      a = rng.int(0, max);
      if (rng.chance(G.equalSigns)) {
        b = a;
      } else {
        do {
          b = rng.int(0, max);
        } while (b === a);
      }
      answer = a > b ? '>' : (a < b ? '<' : '=');
      tokens = [num(a), slot(), num(b)];
      choices = rng.shuffle(signChoices);
      text = 'Điền dấu thích hợp';
      say = 'So sánh ' + V.spoken(a) + ' và ' + V.spoken(b) +
        '. Bé chọn dấu lớn hơn, bé hơn hay bằng nhau?';
      var relationText = answer === '>' ? 'lớn hơn' : (answer === '<' ? 'bé hơn' : 'bằng');
      cheer = 'Đúng rồi! ' + V.capitalize(V.spoken(a)) + ' ' + relationText + ' ' + V.spoken(b) + '.';
    }

    return {
      kind: 'compareSign',
      text: text,
      say: say,
      visual: null,
      equation: { tokens: tokens, alt: equationAlt(tokens) },
      choices: choices,
      choiceRender: choiceRender,
      answer: answer,
      cheer: cheer
    };
  }

  /** Dạng 4: tách – gộp số (mấy và mấy). */
  function compose(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var objectKeys = cfg.objects && cfg.objects.length ? cfg.objects : ['fish'];
    var object = C.objects[rng.pick(objectKeys)];
    var total = rng.int(2, max);
    var first = rng.int(1, total - 1);
    var second = total - first;
    var askTotal = rng.chance(G.askTotal);
    var answer;
    var text;
    var say;
    var cheer;
    var groups;

    if (askTotal) {
      answer = total;
      text = first + ' và ' + second + ' được mấy?';
      say = V.capitalize(V.toWords(first)) + ' và ' + V.toWords(second) +
        ' được mấy?';
      cheer = 'Đúng rồi! ' + V.toWords(first) + ' và ' + V.toWords(second) +
        ' được ' + V.toWords(total) + '.';
      groups = [
        { glyph: object.glyph, count: first, name: object.noun },
        { glyph: object.glyph, count: second, name: object.noun }
      ];
    } else {
      answer = second;
      text = total + ' gồm ' + first + ' và mấy?';
      say = V.capitalize(V.toWords(total)) + ' gồm ' + V.toWords(first) +
        ' và mấy?';
      cheer = 'Đúng rồi! ' + V.toWords(total) + ' gồm ' + V.toWords(first) +
        ' và ' + V.toWords(second) + '.';
      groups = [
        { glyph: object.glyph, count: first, name: object.noun },
        { glyph: object.glyph, count: second, name: object.noun, masked: true }
      ];
    }

    return {
      kind: 'compose',
      text: text,
      say: say,
      visual: {
        kind: 'group',
        alt: 'Các nhóm ' + object.noun + ' để bé tách và gộp.',
        groups: groups
      },
      equation: null,
      choices: numberChoices(rng, answer, G.optionCount, 1, max),
      choiceRender: 'number',
      answer: answer,
      cheer: cheer
    };
  }

  /** Phép cộng có minh hoạ, hỗ trợ tìm số hạng còn thiếu. */
  function add(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var objectKeys = cfg.objects && cfg.objects.length ? cfg.objects : ['apple'];
    var object = C.objects[rng.pick(objectKeys)];
    var first = rng.chance(G.addZero) ? 0 : rng.int(1, max - 1);
    var second;
    if (first === 0) {
      second = rng.int(1, max);
    } else {
      second = rng.chance(G.addZero) ? 0 : rng.int(1, max - first);
    }
    var total = first + second;
    var missing = cfg.missing && cfg.missing.length ? cfg.missing : ['result'];
    var askAddend = missing.indexOf('addend') !== -1 && rng.chance(G.askAddend);
    var answer;
    var tokens;
    var text = 'Điền số thích hợp';
    var say;
    var cheer;

    if (askAddend) {
      answer = second;
      tokens = [num(first), op('+'), slot(), op('='), num(total)];
      say = V.capitalize(V.spoken(first)) + ' cộng mấy bằng ' +
        V.spoken(total) + '?';
      cheer = 'Đúng rồi! ' + V.spoken(first) + ' cộng ' + V.spoken(second) +
        ' bằng ' + V.spoken(total) + '.';
    } else {
      answer = total;
      tokens = [num(first), op('+'), num(second), op('='), slot()];
      say = V.capitalize(V.spoken(first)) + ' cộng ' + V.spoken(second) +
        ' bằng mấy?';
      cheer = 'Đúng rồi! ' + V.spoken(first) + ' cộng ' + V.spoken(second) +
        ' bằng ' + V.spoken(total) + '.';
    }

    return {
      kind: 'add',
      text: text,
      say: say,
      visual: {
        kind: 'group',
        alt: 'Hai nhóm ' + object.noun + ' để bé cộng.',
        operator: '+',
        groups: [
          { glyph: object.glyph, count: first, name: object.noun },
          { glyph: object.glyph, count: second, name: object.noun, masked: askAddend }
        ]
      },
      equation: { tokens: tokens, alt: equationAlt(tokens) },
      choices: numberChoices(rng, answer, G.optionCount, 0, max),
      choiceRender: 'number',
      answer: answer,
      cheer: cheer
    };
  }

  /** Phép trừ có minh hoạ gạch bớt. */
  function subtract(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var objectKeys = cfg.objects && cfg.objects.length ? cfg.objects : ['apple'];
    var object = C.objects[rng.pick(objectKeys)];
    var first = rng.int(2, max);
    var second = rng.chance(G.zeroSubtract) ? first : rng.int(1, first - 1);
    var answer = first - second;
    var tokens = [num(first), op('-'), num(second), op('='), slot()];

    return {
      kind: 'subtract',
      text: 'Điền số thích hợp',
      say: V.capitalize(V.toWords(first)) + ' trừ ' + V.toWords(second) +
        ' bằng mấy?',
      visual: {
        kind: 'group',
        alt: 'Nhóm ' + object.noun + ', gạch bớt ' + V.toWords(second) + '.',
        groups: [{
          glyph: object.glyph,
          count: first,
          crossedOut: second,
          name: object.noun
        }]
      },
      equation: { tokens: tokens, alt: equationAlt(tokens) },
      choices: numberChoices(rng, answer, G.optionCount, 0, max),
      choiceRender: 'number',
      answer: answer,
      cheer: 'Đúng rồi! ' + V.toWords(first) + ' trừ ' + V.toWords(second) +
        ' bằng ' + V.toWords(answer) + '.'
    };
  }

  /** Bảng cộng, bảng trừ: quan hệ giữa ba số trong cùng một "gia đình số". */
  function factFamily(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var first = rng.int(1, max - 1);
    var second = rng.int(1, max - first);
    var total = first + second;
    var isAdd = rng.chance(G.factAdd);
    var answer;
    var tokens;
    var say;
    var cheer;
    var other;

    if (isAdd) {
      answer = total;
      tokens = [num(first), op('+'), num(second), op('='), slot()];
      say = V.capitalize(V.toWords(first)) + ' cộng ' + V.toWords(second) +
        ' bằng mấy?';
      cheer = 'Đúng rồi! ' + V.toWords(first) + ' cộng ' + V.toWords(second) +
        ' bằng ' + V.toWords(total) + '.';
    } else {
      var subtractFirst = rng.chance(G.factSubtractFirst);
      other = subtractFirst ? first : second;
      answer = subtractFirst ? second : first;
      tokens = [num(total), op('-'), num(other), op('='), slot()];
      say = V.capitalize(V.toWords(total)) + ' trừ ' + V.toWords(other) +
        ' bằng mấy?';
      cheer = 'Đúng rồi! ' + V.toWords(total) + ' trừ ' + V.toWords(other) +
        ' bằng ' + V.toWords(answer) + '.';
    }

    return {
      kind: 'factFamily',
      text: 'Tính nhẩm rồi chọn số thích hợp',
      say: say,
      visual: null,
      equation: { tokens: tokens, alt: equationAlt(tokens) },
      choices: numberChoices(rng, answer, G.optionCount, 0, max),
      choiceRender: 'number',
      answer: answer,
      cheer: cheer
    };
  }

  /** Dãy số còn thiếu (đếm xuôi hoặc đếm ngược). */
  function sequence(rng, config) {
    var cfg = config || {};
    var max = cfg.max || 10;
    var length = 4;
    var ascending = rng.chance(G.ascending);
    var start = ascending ? rng.int(0, max - length) : rng.int(length, max);
    var numbers = [];
    var i;
    for (i = 0; i < length; i += 1) {
      numbers.push(ascending ? start + i : start - i);
    }
    var missingIndex = rng.int(1, length - 1);
    var answer = numbers[missingIndex];
    var shown = numbers.map(function (value, index) {
      return index === missingIndex ? null : value;
    });
    var shownText = shown.map(function (value) {
      return value == null ? 'ô trống' : String(value);
    }).join(', ');

    return {
      kind: 'sequence',
      text: 'Số nào còn thiếu?',
      say: 'Dãy số còn thiếu số nào? Bé đếm ' +
        (ascending ? 'tăng dần' : 'giảm dần') + ' nhé.',
      visual: {
        kind: 'sequence',
        alt: 'Dãy số: ' + shownText + '.',
        values: shown
      },
      equation: null,
      choices: numberChoices(rng, answer, G.optionCount, 0, max),
      choiceRender: 'number',
      answer: answer,
      cheer: 'Đúng rồi! Số còn thiếu là ' + V.spoken(answer) + '.'
    };
  }

  /** Hình phẳng: nhận dạng hoặc đếm hình trong bức tranh. */
  function shape2d(rng, config) {
    var cfg = config || {};
    var keys = cfg.shapes && cfg.shapes.length ? cfg.shapes : C.flatShapes;
    var modes = cfg.modes && cfg.modes.length ? cfg.modes : ['identify'];
    var mode = rng.pick(modes);
    var maxCount = cfg.maxCount || 6;
    var target = rng.pick(keys);
    var targetInfo = C.shapes[target];

    if (mode === 'identify') {
      var others = rng.shuffle(keys.filter(function (key) {
        return key !== target;
      })).slice(0, G.optionCount - 1);
      var choices = [target].concat(others).map(function (key) {
        return {
          value: key,
          label: C.shapes[key].name,
          shape: key,
          aria: C.shapes[key].name
        };
      });
      return {
        kind: 'shape2d',
        text: 'Hình nào là ' + targetInfo.name + '?',
        say: 'Hình nào là ' + targetInfo.name + '? Bé chọn hình đúng nhé.',
        visual: null,
        equation: null,
        choices: rng.shuffle(choices),
        choiceRender: 'shape',
        answer: target,
        cheer: 'Đúng rồi! Đây là ' + targetInfo.name + '.'
      };
    }

    var total = rng.int(3, Math.max(4, maxCount));
    var targetCount = rng.int(1, Math.max(1, total - 2));
    var items = [];
    for (var t = 0; t < targetCount; t += 1) {
      items.push(target);
    }
    while (items.length < total) {
      items.push(rng.pick(keys.filter(function (key) {
        return key !== target;
      })));
    }
    items = rng.shuffle(items);

    var slots = [
      { x: 18, y: 24 }, { x: 50, y: 20 }, { x: 81, y: 25 },
      { x: 27, y: 62 }, { x: 60, y: 63 }, { x: 84, y: 60 },
      { x: 15, y: 84 }, { x: 47, y: 86 }
    ];
    var positions = rng.shuffle(slots).slice(0, items.length);
    var drawn = items.map(function (key, index) {
      return {
        shape: key,
        x: positions[index].x,
        y: positions[index].y,
        size: rng.int(54, 74),
        color: C.shapes[key].color
      };
    });

    return {
      kind: 'shape2d',
      text: 'Có mấy ' + targetInfo.name + '?',
      say: 'Có mấy ' + targetInfo.name + '? Bé đếm thật kỹ nhé.',
      visual: {
        kind: 'shapes',
        alt: 'Một bức tranh gồm nhiều hình phẳng để bé đếm.',
        items: drawn
      },
      equation: null,
      choices: numberChoices(rng, targetCount, G.optionCount, 0, Math.max(4, maxCount)),
      choiceRender: 'number',
      answer: targetCount,
      cheer: 'Đúng rồi! Có ' + V.toWords(targetCount) + ' ' + targetInfo.name + '.'
    };
  }

  /** Khối 3D: nhận dạng khối hoặc vật thật có dạng khối. */
  function solid3d(rng, config) {
    var cfg = config || {};
    var modes = cfg.modes && cfg.modes.length ? cfg.modes : ['identify'];
    var mode = rng.pick(modes);
    var target = rng.pick(C.solidShapes);
    var targetInfo = C.shapes[target];

    if (mode === 'realWorld') {
      var correctKeys = Object.keys(REAL_OBJECTS).filter(function (key) {
        return REAL_OBJECTS[key].solid === target;
      });
      var wrongKeys = Object.keys(REAL_OBJECTS).filter(function (key) {
        return REAL_OBJECTS[key].solid !== target;
      });
      var correctKey = rng.pick(correctKeys);
      var picks = rng.shuffle(wrongKeys).slice(0, G.optionCount - 1).concat([correctKey]);
      var choices = picks.map(function (key) {
        var item = REAL_OBJECTS[key];
        return {
          value: key,
          label: item.name,
          glyph: item.glyph,
          aria: item.name
        };
      });
      return {
        kind: 'solid3d',
        text: 'Vật nào có dạng ' + targetInfo.name + '?',
        say: 'Vật nào có dạng ' + targetInfo.name + '?',
        visual: null,
        equation: null,
        choices: rng.shuffle(choices),
        choiceRender: 'glyph',
        answer: correctKey,
        cheer: 'Đúng rồi! ' + V.capitalize(REAL_OBJECTS[correctKey].name) +
          ' có dạng ' + targetInfo.name + '.'
      };
    }

    var shapeChoices = C.solidShapes.map(function (key) {
      return {
        value: key,
        label: C.shapes[key].name,
        shape: key,
        aria: C.shapes[key].name
      };
    });
    return {
      kind: 'solid3d',
      text: 'Hình nào là ' + targetInfo.name + '?',
      say: 'Hình nào là ' + targetInfo.name + '? Bé chọn khối đúng nhé.',
      visual: null,
      equation: null,
      choices: shapeChoices,
      choiceRender: 'shape',
      answer: target,
      cheer: 'Đúng rồi! Đây là ' + targetInfo.name + '.'
    };
  }

  /** Vị trí tương đối: trên, dưới, trái, phải. */
  function position(rng, config) {
    var cfg = config || {};
    var modes = cfg.modes && cfg.modes.length ? cfg.modes : ['onUnder', 'leftRight'];
    var mode = rng.pick(modes);
    var base = { glyph: '📦', name: 'cái hộp' };
    var itemPool = [
      { glyph: '⚽', name: 'quả bóng' },
      { glyph: '🍎', name: 'quả táo' },
      { glyph: '🎈', name: 'quả bóng bay' },
      { glyph: '⭐', name: 'ngôi sao' }
    ];
    var item = rng.pick(itemPool);
    var relation = mode === 'onUnder' ? rng.pick(['on', 'under']) : rng.pick(['left', 'right']);
    var labels = {
      on: 'Phía trên',
      under: 'Phía dưới',
      left: 'Bên trái',
      right: 'Bên phải'
    };
    var choices = rng.shuffle([
      { value: 'on', label: labels.on },
      { value: 'under', label: labels.under },
      { value: 'left', label: labels.left },
      { value: 'right', label: labels.right }
    ]);

    return {
      kind: 'position',
      text: V.capitalize(item.name) + ' ở phía nào của ' + base.name + '?',
      say: V.capitalize(item.name) + ' ở phía nào của ' + base.name + '?',
      visual: {
        kind: 'scene',
        alt: base.name + ' và ' + item.name + ' để bé xác định vị trí.',
        base: base,
        item: item,
        rel: relation
      },
      equation: null,
      choices: choices.map(function (choice) {
        return { value: choice.value, label: choice.label };
      }),
      choiceRender: 'text',
      answer: relation,
      cheer: 'Đúng rồi! ' + V.capitalize(item.name) + ' ở ' +
        labels[relation].toLowerCase() + ' ' + base.name + '.'
    };
  }

  var GENERATORS = {
    count: count,
    compareGroups: compareGroups,
    compareSign: compareSign,
    compose: compose,
    add: add,
    subtract: subtract,
    factFamily: factFamily,
    sequence: sequence,
    shape2d: shape2d,
    solid3d: solid3d,
    position: position
  };

  /**
   * Sinh một câu hỏi.
   * @param {string} activity
   * @param {object} rng
   * @param {object} [config]
   * @returns {object} Question
   */
  function generate(activity, rng, config) {
    var generator = GENERATORS[activity];
    if (!generator) {
      throw new Error('Unknown activity: ' + activity);
    }
    return generator(rng, config || {});
  }

  /**
   * Sinh danh sách câu hỏi cho một màn, trộn đều các phần nếu là bài luyện tập.
   * @param {object} lesson
   * @param {object} rng
   * @param {object} tuning
   * @returns {Array<object>}
   */
  function forLesson(lesson, rng, tuning) {
    var parts = lesson.parts && lesson.parts.length
      ? lesson.parts
      : [{ activity: lesson.activity, config: lesson.config || {} }];
    var total = C.questionCount(lesson, tuning);
    var queue = [];
    var guard = 0;

    do {
      queue = queue.concat(rng.shuffle(parts));
      guard += 1;
    } while (queue.length < total && guard < 50);
    queue = queue.slice(0, total);

    var i;
    var j;
    for (i = 1; i < queue.length; i += 1) {
      if (queue[i].activity === queue[i - 1].activity && parts.length > 1) {
        for (j = i + 1; j < queue.length; j += 1) {
          if (queue[j].activity !== queue[i - 1].activity) {
            var swap = queue[i];
            queue[i] = queue[j];
            queue[j] = swap;
            break;
          }
        }
      }
    }

    return queue.map(function (part) {
      return generate(part.activity, rng, part.config);
    });
  }

  /**
   * Kiểm tra hợp đồng Question, dùng cho test và phòng thủ khi phát triển.
   * @param {object} question
   * @returns {Array<string>} Danh sách lỗi (rỗng nếu hợp lệ).
   */
  function validate(question) {
    var errors = [];
    if (!question || typeof question !== 'object') {
      return ['question is not an object'];
    }
    if (!question.kind) {
      errors.push('missing kind');
    }
    if (typeof question.text !== 'string' || !question.text) {
      errors.push('missing text');
    }
    if (typeof question.say !== 'string' || !question.say) {
      errors.push('missing say');
    }
    if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 4) {
      errors.push('choices must contain 2-4 items');
    } else {
      var values = question.choices.map(function (choice) {
        return choice.value;
      });
      if (values.indexOf(question.answer) === -1) {
        errors.push('answer is not among choices');
      }
      if (values.filter(function (value, index) {
        return values.indexOf(value) === index;
      }).length !== values.length) {
        errors.push('duplicate choice values');
      }
      if (values.some(function (value) { return value == null; })) {
        errors.push('choice value is missing');
      }
    }
    if (CHOICE_RENDERERS.indexOf(question.choiceRender) === -1) {
      errors.push('invalid choiceRender');
    }
    if (question.visual && ['group', 'groups', 'shapes', 'scene', 'sequence'].indexOf(question.visual.kind) === -1) {
      errors.push('invalid visual kind');
    }
    if (question.equation && !Array.isArray(question.equation.tokens)) {
      errors.push('invalid equation');
    }
    return errors;
  }

  return {
    ACTIVITIES: ACTIVITIES.slice(),
    generate: generate,
    forLesson: forLesson,
    validate: validate
  };
}());
