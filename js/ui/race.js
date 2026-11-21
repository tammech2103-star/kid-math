/**
 * Giao diện cuộc đua 1 đối 1: starting grid kiểu Feature.webp và HUD 2 làn.
 * Xe và thanh tiến độ được phóng to để nhìn rõ trên tablet.
 * @namespace KM.RaceUI
 */
window.KM = window.KM || {};

KM.RaceUI = (function () {
  'use strict';

  var el = KM.Components.el;

  function prefersReducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * @param {{race: object, ctx: object, screen: HTMLElement}} options
   * @returns {object}
   */
  function create(options) {
    var race = options.race;
    var ctx = options.ctx;
    var screen = options.screen;
    var laneElements = {};
    var introOverlay = null;
    var introTimers = [];
    var introDone = false;

    var hud = el('div', {
      class: 'race-hud',
      'aria-label': 'Cuộc đua'
    });
    var laneWrap = el('div', { class: 'race-lanes' });
    hud.appendChild(laneWrap);
    hud.appendChild(el('span', {
      class: 'race-finish-flag',
      text: '🏁',
      'aria-hidden': 'true'
    }));

    var initialRows = race.liveRows();
    laneWrap.style.setProperty('--race-count', String(initialRows.length));

    initialRows.forEach(function (row) {
      var fill = el('span', { class: 'race-fill' });
      fill.style.width = row.progress + '%';
      fill.style.background = row.color;
      var bar = el('div', {
        class: 'race-bar',
        role: 'progressbar',
        'aria-label': row.name,
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(Math.round(row.progress))
      }, [fill]);
      var lane = el('div', {
        class: 'race-lane' + (row.isPlayer ? ' is-player' : ''),
        'data-racer': row.id,
        role: 'group'
      }, [
        el('img', {
          class: 'race-thumb',
          src: row.src,
          alt: '',
          loading: 'eager',
          draggable: 'false'
        }),
        el('div', { class: 'race-lane-body' }, [
          el('div', { class: 'race-lane-top' }, [
            el('span', { class: 'race-name', text: row.name }),
            el('span', {
              class: 'race-rank',
              text: String(row.rank),
              'aria-hidden': 'true'
            })
          ]),
          bar
        ])
      ]);
      lane.setAttribute('aria-label', row.name + ', hạng ' + row.rank);
      laneElements[row.id] = {
        lane: lane,
        fill: fill,
        bar: bar,
        rank: lane.querySelector('.race-rank')
      };
      laneWrap.appendChild(lane);
    });

    /** Cập nhật vị trí các tay đua. */
    function update(state) {
      var opts = state || {};
      race.liveRows().forEach(function (row) {
        var entry = laneElements[row.id];
        if (!entry) {
          return;
        }
        entry.fill.style.width = row.progress + '%';
        entry.rank.textContent = String(row.rank);
        entry.bar.setAttribute('aria-valuenow', String(Math.round(row.progress)));
        entry.lane.setAttribute('aria-label',
          row.name + ', hạng ' + row.rank + ', ' + Math.round(row.progress) + ' phần trăm');
        entry.lane.classList.toggle('is-ahead', row.rank === 1);
      });
      if (opts.final) {
        hud.classList.add('is-finished');
      }
    }

    function clearIntroTimers() {
      introTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      introTimers = [];
    }

    function finishIntro(onDone) {
      if (introDone) {
        return;
      }
      introDone = true;
      clearIntroTimers();
      if (introOverlay && introOverlay.parentNode) {
        introOverlay.parentNode.removeChild(introOverlay);
      }
      introOverlay = null;
      if (typeof onDone === 'function') {
        onDone();
      }
    }

    /** Một ô xe trên vạch xuất phát. */
    function buildSlot(row) {
      var slot = el('div', {
        class: 'race-start-slot' + (row.isPlayer ? ' is-player' : '')
      }, [
        row.isPlayer
          ? el('span', { class: 'race-start-you', text: 'BÉ', 'aria-hidden': 'true' })
          : null,
        el('img', {
          class: 'race-start-car',
          src: row.src,
          alt: '',
          draggable: 'false'
        }),
        el('span', { class: 'race-start-name', text: row.name })
      ]);
      slot.setAttribute('aria-label', row.name + (row.isPlayer ? ', xe của bé' : ''));
      return slot;
    }

    /**
     * Hiện màn xuất phát, sau đó gọi onDone.
     * @param {Function} onDone
     */
    function showIntro(onDone) {
      var rows = race.liveRows();
      var gridOrder = rows.slice(1).concat([rows[0]]);
      var duel = gridOrder.length === 2;
      var reduce = prefersReducedMotion();
      var title = el('div', {
        class: 'race-intro-title',
        'aria-live': 'polite',
        text: reduce ? 'Cuộc đua bắt đầu!' : 'Sẵn sàng...'
      });
      var grid = el('div', {
        class: 'race-start-grid' + (duel ? ' is-duel' : '')
      });
      grid.style.setProperty('--race-count', String(gridOrder.length));
      if (duel) {
        grid.appendChild(buildSlot(gridOrder[0]));
        grid.appendChild(el('span', {
          class: 'race-vs',
          text: 'VS',
          'aria-hidden': 'true'
        }));
        grid.appendChild(buildSlot(gridOrder[1]));
      } else {
        gridOrder.forEach(function (row) {
          grid.appendChild(buildSlot(row));
        });
      }
      var skip = el('button', {
        class: 'btn btn-soft race-skip',
        type: 'button',
        on: {
          click: function () {
            if (ctx.audio) {
              ctx.audio.tap();
            }
            finishIntro(onDone);
          }
        }
      }, ['Bỏ qua']);
      var card = el('div', { class: 'race-intro-card' }, [
        el('span', { class: 'race-banner', text: 'CÚP ĐUA TOÁN 1' }),
        title,
        grid,
        el('div', { class: 'race-start-line', 'aria-hidden': 'true' }),
        skip
      ]);
      introOverlay = el('div', {
        class: 'race-intro',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Cuộc đua bắt đầu'
      }, [card]);
      introOverlay.addEventListener('click', function (event) {
        if (event.target === introOverlay) {
          finishIntro(onDone);
        }
      });
      screen.appendChild(introOverlay);
      introDone = false;
      if (ctx.audio) {
        if (typeof ctx.audio.startRace === 'function') {
          ctx.audio.startRace();
        } else {
          ctx.audio.engine();
        }
      }
      if (reduce) {
        introTimers.push(window.setTimeout(function () {
          finishIntro(onDone);
        }, 900));
        return;
      }
      introTimers.push(window.setTimeout(function () { title.textContent = '3'; }, 600));
      introTimers.push(window.setTimeout(function () { title.textContent = '2'; }, 1100));
      introTimers.push(window.setTimeout(function () { title.textContent = '1'; }, 1600));
      introTimers.push(window.setTimeout(function () {
        title.textContent = 'GO!';
        title.classList.add('is-go');
      }, 2050));
      introTimers.push(window.setTimeout(function () {
        finishIntro(onDone);
      }, 2450));
    }

    function destroy() {
      clearIntroTimers();
      if (introOverlay && introOverlay.parentNode) {
        introOverlay.parentNode.removeChild(introOverlay);
      }
      introOverlay = null;
    }

    update();

    return {
      hud: hud,
      update: update,
      showIntro: showIntro,
      destroy: destroy
    };
  }

  return { create: create };
}());
