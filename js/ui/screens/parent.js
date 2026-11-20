/**
 * Khu vực phụ huynh: cổng bảo vệ bằng phép nhân, cài đặt, tiến độ và đặt lại.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.parent = (function () {
  'use strict';

  var el = KM.Components.el;
  var Components = KM.Components;

  /**
   * @param {object} ctx
   * @returns {object} screen handle
   */
  function parentScreen(ctx) {
    var screen = el('div', { class: 'screen parent' });
    var gateUnlocked = false;
    var resetArmed = false;
    var resetTimer = null;
    var factorA = ctx.rng.int(6, 9);
    var factorB = ctx.rng.int(6, 9);
    var gateAnswer = factorA * factorB;
    var gateChoices = ctx.rng.shuffle([
      gateAnswer,
      gateAnswer + factorA,
      gateAnswer - factorB
    ]);

    ctx.root.appendChild(screen);

    function topbar(title, subtitle) {
      return el('header', { class: 'topbar parent-topbar' }, [
        el('button', {
          class: 'icon-btn back-btn',
          type: 'button',
          'aria-label': 'Về nhà',
          on: {
            click: function () {
              ctx.audio.tap();
              ctx.navigate('home');
            }
          }
        }, ['←']),
        el('div', { class: 'brand-copy' }, [
          el('h1', { text: title, tabindex: '-1' }),
          el('p', { text: subtitle })
        ])
      ]);
    }

    function mount(node) {
      Components.clear(screen);
      screen.appendChild(node);
    }

    function renderGate() {
      var choices = gateChoices.map(function (value) {
        var button = el('button', {
          class: 'choice choice-number',
          type: 'button',
          'data-value': String(value),
          'aria-label': 'Số ' + value,
          on: {
            click: function () {
              if (value === gateAnswer) {
                gateUnlocked = true;
                ctx.audio.correct();
                renderDashboard();
              } else {
                ctx.audio.wrong();
                Components.shake(button);
                Components.toast('Chỉ dành cho phụ huynh thôi nhé! 🙂', { tone: 'gentle' });
              }
            }
          }
        }, [el('span', { class: 'choice-value', text: String(value) })]);
        return button;
      });

      var gateTitle = el('h2', { text: 'Khu vực phụ huynh', tabindex: '-1' });
      var card = el('div', { class: 'gate-card' }, [
        el('span', { class: 'gate-icon', text: '🔐', 'aria-hidden': 'true' }),
        gateTitle,
        el('p', {
          class: 'gate-desc',
          text: 'Để xem tiến độ và đổi cài đặt, phụ huynh trả lời câu hỏi sau:'
        }),
        el('p', { class: 'gate-question', text: factorA + ' × ' + factorB + ' = ?' }),
        el('div', { class: 'choices choices-number choices-count-3' }, choices),
        el('p', { class: 'gate-hint', text: 'Câu hỏi này giúp bé không vào nhầm khu vực cài đặt.' })
      ]);

      var wrap = el('div', { class: 'parent-wrap' }, [
        topbar('Dành cho phụ huynh', 'Xem tiến độ học của bé'),
        card
      ]);
      mount(wrap);
      gateTitle.focus({ preventScroll: true });
    }

    function switchControl(key, label) {
      var checked = ctx.progress.settings()[key];
      return el('button', {
        class: 'switch' + (checked ? ' is-on' : ''),
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        on: {
          click: function () {
            var actual = ctx.setSetting(key, !ctx.progress.settings()[key]);
            if (key === 'sfx' && actual) {
              ctx.audio.tap();
            }
            renderDashboard(label);
          }
        }
      }, [el('span', { class: 'switch-knob', 'aria-hidden': 'true' })]);
    }

    function settingRow(title, description, key) {
      return el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-copy' }, [
          el('strong', { text: title }),
          el('span', { text: description })
        ]),
        switchControl(key, title)
      ]);
    }

    function speechDescription() {
      var status = ctx.speech.status();
      if (!status.supported) {
        return 'Trình duyệt này không hỗ trợ đọc tiếng Việt. Bé vẫn học bằng chữ và hình.';
      }
      if (!status.hasVietnameseVoice) {
        return 'Máy chưa cài giọng tiếng Việt. Bé vẫn học bằng chữ và hình — hãy cài thêm giọng trong cài đặt hệ điều hành hoặc trình duyệt.';
      }
      return 'Đang dùng: ' + status.voiceName + '. Bé nghe đề và lời khen.';
    }

    function progressTable() {
      var sections = ctx.curriculum.chapters.map(function (chapter) {
        var rows = chapter.lessons.map(function (lesson) {
          var entry = ctx.progress.entryFor(lesson.id);
          var unlocked = ctx.progress.isUnlocked(lesson.id);
          return el('div', { class: 'progress-row' + (unlocked ? '' : ' is-locked') }, [
            el('div', { class: 'progress-copy' }, [
              el('strong', { text: lesson.label + ' · ' + lesson.title }),
              el('span', {
                text: unlocked
                  ? (entry.plays > 0 ? 'Đã chơi ' + entry.plays + ' lượt' : 'Chưa chơi')
                  : 'Chưa mở khoá'
              })
            ]),
            Components.stars(entry.stars, { small: true })
          ]);
        });
        return el('section', { class: 'progress-group' }, [
          el('h3', { text: chapter.title }),
          el('div', { class: 'progress-rows' }, rows)
        ]);
      });
      return el('div', { class: 'progress-table' }, sections);
    }

    function renderDashboard(focusLabel) {
      resetArmed = false;
      if (resetTimer) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }

      var stats = ctx.progress.stats();
      var status = ctx.speech.status();

      var statCards = el('div', { class: 'stat-grid' }, [
        el('div', { class: 'stat-card' }, [
          el('span', { class: 'stat-value', text: stats.stars + '/' + stats.maxStars }),
          el('span', { class: 'stat-label', text: 'Sao đã đạt' })
        ]),
        el('div', { class: 'stat-card' }, [
          el('span', { class: 'stat-value', text: stats.completed + '/' + stats.totalLessons }),
          el('span', { class: 'stat-label', text: 'Bài đã hoàn thành' })
        ]),
        el('div', { class: 'stat-card' }, [
          el('span', { class: 'stat-value', text: String(stats.plays) }),
          el('span', { class: 'stat-label', text: 'Lượt chơi' })
        ])
      ]);

      var storageNote = ctx.progress.isPersistent()
        ? 'Tiến độ được lưu trong trình duyệt trên máy này.'
        : 'Trình duyệt đang chặn lưu dữ liệu. Tiến độ chỉ còn trong phiên này — hãy mở bằng Chrome/Edge.';

      var settingsCard = el('section', { class: 'panel' }, [
        el('h2', { text: 'Cài đặt' }),
        settingRow('Đọc đề bằng giọng tiếng Việt', speechDescription(), 'speech'),
        settingRow('Hiệu ứng âm thanh', 'Tiếng đúng, tiếng xe và âm báo nhẹ khi chọn sai.', 'sfx'),
        settingRow('Mở khoá tất cả bài', 'Cho phép vào bất kỳ bài nào mà không cần hoàn thành bài trước.', 'unlockAll'),
        el('button', {
          class: 'btn btn-soft btn-small setting-test',
          type: 'button',
          on: {
            click: function () {
              var voiceStatus = ctx.speech.status();
              if (!ctx.progress.settings().speech) {
                Components.toast('Hãy bật giọng đọc trước nhé!', { tone: 'gentle' });
                return;
              }
              if (!voiceStatus.supported) {
                Components.toast('Trình duyệt này không hỗ trợ đọc tiếng Việt.', { tone: 'gentle' });
                return;
              }
              if (!voiceStatus.hasVietnameseVoice) {
                Components.toast('Máy chưa cài giọng tiếng Việt. Bé vẫn học bằng chữ và hình.', {
                  tone: 'gentle',
                  duration: 2600
                });
                return;
              }
              ctx.speech.speak('Xin chào! Đây là giọng đọc tiếng Việt của bé.');
            }
          }
        }, ['🔊 Nghe thử giọng đọc']),
        el('p', { class: 'panel-note', text: storageNote }),
        status.hasVietnameseVoice && !ctx.progress.settings().speech
          ? el('p', { class: 'panel-note', text: 'Giọng đọc đang tắt.' })
          : null
      ]);

      var resetButton = el('button', {
        class: 'btn btn-danger',
        type: 'button',
        on: {
          click: function () {
            if (!resetArmed) {
              resetArmed = true;
              resetButton.textContent = 'Bấm lần nữa để xoá tiến độ';
              resetButton.classList.add('is-armed');
              resetTimer = window.setTimeout(function () {
                resetArmed = false;
                if (resetButton.isConnected) {
                  resetButton.textContent = 'Đặt lại tiến độ học tập';
                  resetButton.classList.remove('is-armed');
                }
              }, ctx.tuning.timing.resetArmMs);
              return;
            }
            ctx.progress.resetProgress();
            ctx.audio.tap();
            Components.toast('Đã đặt lại tiến độ học tập.', { tone: 'success' });
            renderDashboard();
          }
        }
      }, ['Đặt lại tiến độ học tập']);

      var dangerPanel = el('section', { class: 'panel panel-danger' }, [
        el('h2', { text: 'Đặt lại' }),
        el('p', {
          class: 'panel-note',
          text: 'Xoá toàn bộ sao và lượt chơi của các bài. Cài đặt phía trên được giữ nguyên.'
        }),
        resetButton
      ]);

      var wrap = el('div', { class: 'parent-wrap' }, [
        topbar('Khu vực phụ huynh', 'Tiến độ và cài đặt của bé'),
        statCards,
        settingsCard,
        el('section', { class: 'panel' }, [
          el('h2', { text: 'Tiến độ từng bài' }),
          progressTable()
        ]),
        dangerPanel,
        el('p', { class: 'parent-foot', text: ctx.tuning.appName + ' · Phiên bản ' + ctx.tuning.appVersion })
      ]);

      mount(wrap);

      if (focusLabel) {
        var switches = screen.querySelectorAll('.switch');
        var i;
        for (i = 0; i < switches.length; i += 1) {
          if (switches[i].getAttribute('aria-label') === focusLabel) {
            switches[i].focus({ preventScroll: true });
            break;
          }
        }
      } else {
        var heading = screen.querySelector('.parent-topbar h1');
        if (heading) {
          heading.focus({ preventScroll: true });
        }
      }
    }

    if (gateUnlocked) {
      renderDashboard();
    } else {
      renderGate();
    }

    return {
      destroy: function () {
        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }
      }
    };
  }

  return parentScreen;
}());
