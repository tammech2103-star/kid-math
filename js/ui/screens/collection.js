/**
 * Màn "Bộ sưu tập McQueen": lưới 7×3 các mảnh ghép, ảnh đầy đủ khi hoàn thành.
 * ADR-0002: đọc mảnh qua `ctx.puzzle` (hoặc tạo service từ progress nếu chưa wired).
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.collection = (function () {
  'use strict';

  var el = KM.Components.el;

  /**
   * @param {object} ctx
   * @returns {object|null} service puzzle, hoặc null nếu module chưa được tải.
   */
  function resolvePuzzle(ctx) {
    if (ctx.puzzle && typeof ctx.puzzle.pieces === 'function') {
      return ctx.puzzle;
    }
    if (window.KM.Puzzle && ctx.progress) {
      return KM.Puzzle.create({
        progress: ctx.progress,
        curriculum: ctx.curriculum,
        tuning: ctx.tuning
      });
    }
    return null;
  }

  /**
   * @param {object} ctx
   * @returns {object} screen handle
   */
  function collectionScreen(ctx) {
    var puzzle = resolvePuzzle(ctx);
    var grid = puzzle && typeof puzzle.grid === 'function'
      ? puzzle.grid()
      : { cols: 7, rows: 3 };
    var total = puzzle && typeof puzzle.total === 'function'
      ? puzzle.total()
      : grid.cols * grid.rows;
    var owned = puzzle ? puzzle.pieces() : [];
    var complete = puzzle ? puzzle.isComplete() : false;

    var titleNode = el('h1', {
      class: 'collection-title',
      text: 'Bộ sưu tập McQueen',
      tabindex: '-1'
    });

    /** @returns {HTMLElement} nút về nhà, dùng ở đầu và cuối màn. */
    function backButton(className) {
      return el('button', {
        class: 'btn btn-soft btn-small ' + className,
        type: 'button',
        on: {
          click: function () {
            ctx.audio.tap();
            ctx.navigate('home');
          }
        }
      }, ['🏠 Về nhà']);
    }

    var topbar = el('header', { class: 'topbar collection-topbar' }, [
      backButton('collection-back'),
      el('div', { class: 'brand-copy' }, [
        titleNode,
        el('p', { text: '21 mảnh ghép · Mỗi bài học một mảnh' })
      ]),
      el('div', {
        class: 'collection-count',
        role: 'img',
        'aria-label': 'Bé đã ghép ' + owned.length + ' trên ' + total + ' mảnh'
      }, [
        el('span', { class: 'collection-count-icon', text: '🧩', 'aria-hidden': 'true' }),
        el('span', { class: 'collection-count-value', text: owned.length + '/' + total })
      ])
    ]);

    var gridNode = el('div', {
      class: 'puzzle-grid',
      role: 'list',
      'aria-label': 'Bộ sưu tập ' + total + ' mảnh ghép'
    });
    gridNode.style.setProperty('--puzzle-cols', String(grid.cols));
    gridNode.style.setProperty('--puzzle-rows', String(grid.rows));

    var i;
    for (i = 0; i < total; i += 1) {
      var piece = KM.PuzzleUI.pieceNode(i, {
        revealed: owned.indexOf(i) !== -1,
        puzzle: puzzle
      });
      piece.setAttribute('role', 'listitem');
      gridNode.appendChild(piece);
    }

    var cardChildren = [
      el('p', {
        class: 'collection-intro',
        text: 'Hoàn thành mỗi bài học để nhận một mảnh ghép. Chơi lại bài cũ không ' +
          'làm tăng số mảnh nhé!'
      })
    ];

    if (complete) {
      cardChildren.push(el('div', { class: 'collection-complete' }, [
        el('img', {
          class: 'collection-full',
          src: puzzle.src(),
          alt: 'Bức tranh McQueen hoàn chỉnh',
          draggable: 'false'
        }),
        el('p', {
          class: 'collection-cheer',
          text: 'Tuyệt vời! Bé đã ghép đủ ' + total +
            ' mảnh và có bức tranh McQueen hoàn chỉnh!'
        })
      ]));
    }

    cardChildren.push(gridNode);
    cardChildren.push(el('p', {
      class: 'collection-foot',
      text: 'Đã ghép ' + owned.length + '/' + total + ' mảnh'
    }));
    cardChildren.push(backButton('collection-back-bottom'));

    var card = el('section', {
      class: 'collection-card' + (complete ? ' is-complete' : '')
    }, cardChildren);

    var screen = el('div', {
      class: 'screen collection' + (complete ? ' is-complete' : '')
    }, [topbar, card]);

    ctx.root.appendChild(screen);
    titleNode.focus({ preventScroll: true });

    return {
      destroy: function () {
        /* Màn collection không giữ timer hay listener riêng. */
      }
    };
  }

  return collectionScreen;
}());
