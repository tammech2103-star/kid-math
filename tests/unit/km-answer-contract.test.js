/**
 * Hợp đồng mới của 21 module game độc lập (ADR-0004).
 * Mỗi module tự render trong mount và trả đáp án duy nhất qua
 * CustomEvent('km:answer', { bubbles: true, detail: { value } }).
 * Không dùng onAnswer, không render hàng .choices dùng chung.
 */
(function () {
  'use strict';
  var T = window.KMTest;

  var MODULE_IDS = [
    'mario-bros', 'mario-odyssey', 'donkey-kong-country', 'pokemon', 'zelda',
    'animal-crossing', 'mario-party', 'dr-mario', 'mario-maker', 'mario-paint',
    'yoshi-island', 'luigis-mansion', 'brain-age', 'mario-and-luigi', 'pikmin',
    'kirby', 'warioware', 'super-smash-bros', 'fire-emblem', 'splatoon',
    'mario-kart'
  ];

  function makeMount() {
    var mount = document.createElement('div');
    mount.className = 'km-test-mount';
    mount.style.position = 'absolute';
    mount.style.left = '-9999px';
    document.body.appendChild(mount);
    return mount;
  }

  function destroyMount(mount) {
    if (mount && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
  }

  function captureAnswers(mount) {
    var answers = [];
    mount.addEventListener('km:answer', function (event) {
      answers.push({
        value: event.detail && event.detail.value,
        bubbles: event.bubbles,
        targetTag: event.target && event.target.tagName
      });
    }, false);
    return answers;
  }

  function question(overrides) {
    var base = {
      text: 'Có bao nhiêu quả?',
      kind: 'count',
      answer: 2,
      choices: [
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' }
      ],
      visual: {
        groups: [{ name: 'quả', glyph: '🍎', count: 2 }],
        values: [1, 2, 3]
      },
      equation: {
        tokens: [{ type: 'num', value: 2 }, { type: 'op', value: '+' },
          { type: 'num', value: 1 }, { type: 'op', value: '=' }, { type: 'slot' }],
        alt: '2 + 1 = ?'
      }
    };
    var key;
    for (key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        base[key] = overrides[key];
      }
    }
    return base;
  }

  function mountGame(gameId, q, options) {
    var mount = makeMount();
    var factory = KM.Games[gameId];
    var extra = options || {};
    var game = factory({
      mount: mount,
      question: q,
      reducedMotion: !!extra.reducedMotion,
      index: extra.index || 0,
      lesson: extra.lesson,
      audio: {}
    });
    return { mount: mount, game: game };
  }

  T.suite('km:answer — hợp đồng chung của 21 module', function () {
    T.test('click mario-bros phát km:answer với value đúng choice', function () {
      var q = question({
        answer: 0,
        choices: [{ value: 0, label: '0' }, { value: 1, label: '1' }],
        visual: { groups: [{ name: 'quả', glyph: '🍎', count: 0 }] }
      });
      var handle = mountGame('mario-bros', q);
      var answers = captureAnswers(handle.mount);
      var button = handle.mount.querySelector('.kmg-num');
      T.ok(button, 'mario-bros không render hotspot số');
      button.click();
      T.eq(answers.length, 1, 'mario-bros phải phát đúng 1 sự kiện');
      T.deepEq(answers[0], {
        value: 0, bubbles: true, targetTag: 'DIV'
      });
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('handleKey zelda phát km:answer với value đúng choice', function () {
      var q = question({ answer: 2 });
      var handle = mountGame('zelda', q);
      var answers = captureAnswers(handle.mount);
      T.eq(handle.game.handleKey('2'), true, 'zelda phải nhận phím 2');
      T.eq(answers.length, 1, 'zelda phải phát đúng 1 sự kiện từ bàn phím');
      T.eq(answers[0].value, 2, 'giá trị zelda trả sai');
      T.eq(answers[0].bubbles, true);
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('click mario-kart phát km:answer với value đúng choice', function () {
      var q = question({ answer: 3 });
      var handle = mountGame('mario-kart', q, {
        lesson: KM.Curriculum.getLesson('b20'), index: 0
      });
      var answers = captureAnswers(handle.mount);
      var options = handle.mount.querySelectorAll('.is-current .kmg-mario-kart__opt');
      T.eq(options.length, 3, 'mario-kart phải render 3 option');
      options[2].click();
      T.eq(answers.length, 1, 'mario-kart phải phát đúng 1 sự kiện');
      T.eq(answers[0].value, 3, 'giá trị mario-kart trả sai');
      T.eq(answers[0].bubbles, true);
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('mario-bros không phát khi value không còn trong choices', function () {
      var q = question({ answer: 0, choices: [{ value: 0, label: '0' }],
        visual: { groups: [{ name: 'quả', glyph: '🍎', count: 0 }] } });
      var handle = mountGame('mario-bros', q);
      var answers = captureAnswers(handle.mount);
      var button = handle.mount.querySelector('.kmg-num');
      q.choices.length = 0;
      button.click();
      T.eq(answers.length, 0, 'giá trị cũ không được phát khi đã khỏi choices');
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('zelda không phát khi value không còn trong choices', function () {
      var q = question({ answer: 2 });
      var handle = mountGame('zelda', q);
      var answers = captureAnswers(handle.mount);
      var button = handle.mount.querySelector('.kmg-hotspot');
      q.choices.length = 0;
      button.click();
      T.eq(answers.length, 0, 'giá trị cũ không được phát khi đã khỏi choices');
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('mario-kart không phát khi option đã không còn choice', function () {
      var q = question({ answer: 3 });
      var handle = mountGame('mario-kart', q, {
        lesson: KM.Curriculum.getLesson('b20'), index: 0
      });
      var answers = captureAnswers(handle.mount);
      var button = handle.mount.querySelector('.is-current .kmg-mario-kart__opt');
      q.choices.length = 0;
      button.click();
      T.eq(answers.length, 0, 'option rỗng không được phát km:answer');
      handle.game.destroy();
      destroyMount(handle.mount);
    });

    T.test('sự kiện km:answer đi từ root module lên mount shell', function () {
      var outer = makeMount();
      var inner = document.createElement('div');
      var answers = [];
      outer.appendChild(inner);
      outer.addEventListener('km:answer', function (event) {
        answers.push({ value: event.detail.value, fromRoot: event.target === inner });
      }, false);
      inner.dispatchEvent(new CustomEvent('km:answer', {
        bubbles: true,
        detail: { value: 2 }
      }));
      T.deepEq(answers, [{ value: 2, fromRoot: true }]);
      destroyMount(outer);
    });
  });
}());
