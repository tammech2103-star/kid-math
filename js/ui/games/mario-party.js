/**
 * Minigame bài `b6` — tung xí ngầu đi vòng bàn (cảm hứng: Mario Party).
 * Design: quick-spec mục 07 (board/a — 12 ô + xí ngầu tâm, động tác "tung").
 * G2: dispatch theo question.kind; kind lạ → hiện tĩnh q.text/q.visual, vẫn giữ hàng đáp án.
 */
window.KM = window.KM || {};
KM.Games = KM.Games || {};

KM.Games.marioParty = (function () {
  'use strict';

  var K = KM.GameKit;
  var GAME_ID = 'mario-party';
  var FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  var TILES = 12;
  var KIND_ICON = {
    count: '🔢',
    compareGroups: '⚖️',
    compareSign: '↔️',
    compose: '🧩',
    sequence: '🔀'
  };
  var KIND_TILE = { count: 1, compareGroups: 4, compareSign: 7, compose: 10, sequence: 5 };

  function tokenStrip(k, q) {
    var wrap = K.node('div', {
      'style': {
        display: 'flex', 'flex-wrap': 'wrap', gap: '6px',
        'align-items': 'center', 'justify-content': 'center', 'min-height': '52px'
      }
    });
    if (q && q.kind === 'sequence' && q.visual && q.visual.values) {
      q.visual.values.forEach(function (value) {
        wrap.appendChild(K.node('span', {
          text: value == null ? '?' : String(value),
          'aria-hidden': 'true',
          'style': {
            'min-width': '44px', 'min-height': '44px', padding: '4px 8px',
            'border-radius': '12px', background: '#fff', color: '#23324a',
            display: 'grid', 'place-items': 'center', 'font-weight': '900'
          }
        }));
      });
      return wrap;
    }
    var groups = q && q.visual && q.visual.groups;
    if (groups && groups.length) {
      groups.forEach(function (group) {
        wrap.appendChild(K.node('span', {
          text: (group.glyph || '⭐') + ' ' + (group.count || 0),
          'aria-hidden': 'true',
          'style': { 'font-size': '1.3rem', padding: '2px 6px' }
        }));
      });
      return wrap;
    }
    var tokens = q && q.equation && q.equation.tokens;
    if (tokens) {
      tokens.forEach(function (token) {
        wrap.appendChild(K.node('span', {
          text: token.type === 'slot' ? '?' : String(token.value),
          'aria-hidden': 'true',
          'style': { 'font-size': '1.3rem', padding: '2px 6px', 'font-weight': '900' }
        }));
      });
      return wrap;
    }
    wrap.appendChild(K.node('span', {
      text: q && q.text ? q.text : '',
      'style': { 'font-size': '1rem', 'font-weight': '700' }
    }));
    return wrap;
  }

  function createGame(options) {
    return K.base(options, {
      gameId: GAME_ID,
      lessonId: 'b6',
      tribute: 'Mario Party',
      prefix: 'mp',
      hint: 'Chạm xí ngầu để đi vòng bàn, rồi chạm ô đáp án nhé!',

      build: function (k) {
        var board = K.node('div', {
          'class': 'mp-board',
          'style': {
            position: 'relative', 'min-height': '176px', 'border-radius': '24px',
            background: 'radial-gradient(circle at 50% 50%, #fff6d8 0 28%, #f2d7ff 29% 100%)'
          }
        });
        var ring = K.node('div', { 'class': 'mp-ring', 'style': { position: 'absolute', inset: '0' } });
        var info = K.node('div', {
          'class': 'mp-info',
          'style': {
            position: 'absolute', left: '18%', top: '24%', width: '64%',
            'min-height': '52px', display: 'grid', 'place-items': 'center', 'z-index': '2'
          }
        });
        var diceWrap = K.node('div', {
          'style': { position: 'absolute', left: 'calc(50% - 40px)', bottom: '6%', 'z-index': '4' }
        });
        var die = k.btn({
          'class': 'mp-die',
          'aria-label': 'Tung xí ngầu',
          text: FACES[0],
          'style': {
            'min-width': '80px', 'min-height': '80px', 'border-radius': '20px',
            background: '#fff', color: '#7e3fa8', 'font-size': '2rem'
          }
        });
        var token = K.node('span', {
          'class': 'mp-token', text: '🔴', 'aria-hidden': 'true',
          'style': { position: 'absolute', 'font-size': '1.5rem', 'z-index': '3', transition: k.reduced ? 'none' : 'left 240ms ease, top 240ms ease' }
        });
        var answers = K.node('div', {
          'class': 'mp-answers',
          'style': {
            position: 'relative', display: 'flex', 'flex-wrap': 'wrap', gap: '8px',
            'justify-content': 'center'
          }
        });
        diceWrap.appendChild(die);
        ring.appendChild(token);
        board.appendChild(ring);
        board.appendChild(info);
        board.appendChild(diceWrap);
        k.board = board;
        k.ring = ring;
        k.info = info;
        k.token = token;
        k.die = die;
        k.answers = answers;
        k.rolls = 0;

        k.track(die, 'click', function () {
          k.rolls += 1;
          k.die.textContent = FACES[k.rolls % FACES.length];
          var face = (k.rolls % 6) + 1;
          var tile = (KIND_TILE[k.currentKind] || 0) + face;
          k.moveToken(tile);
          k.hint('Xí ngầu ra ' + face + '. Bộ đáp án vẫn là của câu này nhé!');
        });
        k.moveToken = function (tile) {
          var index = ((tile % TILES) + TILES) % TILES;
          var angle = (index / TILES) * Math.PI * 2 - Math.PI / 2;
          k.token.style.left = (50 + Math.cos(angle) * 40) + '%';
          k.token.style.top = (50 + Math.sin(angle) * 40) + '%';
        };
        k.track(answers, 'click', function (event) {
          var tile = K.closestData(event.target, answers, 'data-answer');
          if (tile) {
            k.answer(tile.getAttribute('data-value'));
          }
        });
        k.add(board);
        k.add(answers);
      },

      render: function (k, q) {
        var choices = (q && q.choices) || [];
        var kind = q && q.kind;
        var i;
        k.currentKind = kind;
        k.rolls = 0;
        k.die.textContent = FACES[0];
        k.moveToken(KIND_TILE[kind] || 0);
        while (k.info.firstChild) {
          k.info.removeChild(k.info.firstChild);
        }
        k.info.appendChild(tokenStrip(k, q));
        while (k.answers.firstChild) {
          k.answers.removeChild(k.answers.firstChild);
        }
        for (i = 0; i < choices.length; i += 1) {
          k.answers.appendChild(k.btn({
            'class': 'mp-answer',
            'data-answer': String(i),
            'data-value': String(choices[i].value),
            'aria-label': 'Chọn đáp án ' + (choices[i].label != null ? choices[i].label : choices[i].value),
            text: choices[i].label != null ? String(choices[i].label) : String(choices[i].value),
            'style': { background: '#fffdf4', color: '#5b2f7c', 'min-width': '72px' }
          }));
        }
      },

      onWrong: function (k) {
        k.moveToken(KIND_TILE[k.currentKind] || 0);
        k.die.textContent = FACES[0];
        k.rolls = 0;
        k.hint('Quân cờ về ô đầu. Bé tung lại xí ngầu nhé!');
      }
    });
  }

  KM.Games.marioParty = createGame;
  KM.Games[GAME_ID] = createGame;
  K.register(GAME_ID, createGame);
  return createGame;
}());
