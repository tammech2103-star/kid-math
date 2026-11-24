/**
 * Màn hình chủ: chọn bài theo 5 chủ đề, tổng sao, nút học tiếp và khu phụ huynh.
 * @namespace KM.Screens
 */
window.KM = window.KM || {};
KM.Screens = KM.Screens || {};

KM.Screens.home = (function () {
  'use strict';

  var el = KM.Components.el;
  var Components = KM.Components;

  /**
   * @param {object} ctx
   * @returns {object} screen handle
   */
  function home(ctx) {
    var screen = el('div', { class: 'screen home' });
    var tuning = ctx.tuning;
    var progress = ctx.progress;

    var nextLesson = progress.nextLesson();
    var allDone = progress.orderedLessons().every(function (lesson) {
      return progress.starsFor(lesson.id) > 0;
    });

    var homeTitle = el('h1', { text: tuning.appName, tabindex: '-1' });
    var header = el('header', { class: 'topbar' }, [
      el('div', { class: 'brand' }, [
        el('span', { class: 'brand-mark', text: '🚗', 'aria-hidden': 'true' }),
        el('div', { class: 'brand-copy' }, [
          homeTitle,
          el('p', { text: 'Toán lớp 1 · Tập 1 · Kết nối tri thức' })
        ])
      ]),
      el('div', { class: 'topbar-actions' }, [
        el('div', {
          class: 'star-total',
          role: 'img',
          'aria-label': 'Tổng cộng ' + progress.totalStars() + ' trên ' + progress.maxStars() + ' sao'
        }, [
          el('span', { class: 'star-total-icon', text: '⭐', 'aria-hidden': 'true' }),
          el('span', { class: 'star-total-value', text: progress.totalStars() }),
          el('span', { class: 'star-total-max', text: '/' + progress.maxStars() })
        ]),
        el('button', {
          class: 'btn btn-soft btn-small',
          type: 'button',
          on: {
            click: function () {
              ctx.audio.tap();
              ctx.navigate('parent');
            }
          }
        }, ['👨‍👩‍👧 Phụ huynh'])
      ])
    ]);

    var hero = el('section', { class: 'hero' }, [
      el('div', { class: 'hero-copy' }, [
        el('span', { class: 'eyebrow', text: 'Học mà chơi · Chơi mà học' }),
        el('h2', { text: 'Học toán cùng xe đua!' }),
        el('p', {
          text: 'Trả lời đúng, chiếc xe sẽ xuất hiện và tặng bé những ngôi sao. ' +
            'Bé sẵn sàng chưa nào?'
        }),
        el('div', { class: 'hero-actions' }, [
          el('button', {
            class: 'btn btn-primary btn-xl',
            type: 'button',
            on: {
              click: function () {
                ctx.audio.tap();
                ctx.navigate('lesson', { lessonId: nextLesson.id });
              }
            }
          }, [
            el('span', { class: 'btn-icon', text: allDone ? '🏁' : '▶', 'aria-hidden': 'true' }),
            el('span', {
              text: (allDone ? 'Ôn tập: ' : 'Học tiếp: ') + nextLesson.title
            })
          ]),
          el('button', {
            class: 'btn btn-ghost',
            type: 'button',
            on: {
              click: function () {
                ctx.audio.tap();
                var list = screen.querySelector('.chapter-list');
                if (list) {
                  var reduceMotion = window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  list.scrollIntoView({
                    behavior: reduceMotion ? 'auto' : 'smooth',
                    block: 'start'
                  });
                }
              }
            }
          }, ['Chọn bài'])
        ])
      ]),
      el('div', { class: 'hero-art' }, [
        el('span', { class: 'hero-spark hero-spark-a', text: '⭐', 'aria-hidden': 'true' }),
        el('span', { class: 'hero-spark hero-spark-b', text: '✨', 'aria-hidden': 'true' }),
        el('img', {
          class: 'hero-car',
          src: Components.CAR_SRC,
          alt: 'Chiếc xe đua màu đỏ tặng thưởng khi bé trả lời đúng',
          draggable: 'false'
        })
      ])
    ]);

    var strip = el('div', { class: 'how-strip' }, [
      el('div', { class: 'how-item' }, [
        el('span', { class: 'how-icon', text: '👂', 'aria-hidden': 'true' }),
        el('span', { text: 'Nghe cô đọc đề' })
      ]),
      el('div', { class: 'how-item' }, [
        el('span', { class: 'how-icon', text: '👆', 'aria-hidden': 'true' }),
        el('span', { text: 'Chạm đáp án đúng' })
      ]),
      el('div', { class: 'how-item' }, [
        el('span', { class: 'how-icon', text: '🏎️', 'aria-hidden': 'true' }),
        el('span', { text: 'Nhận xe và sao' })
      ])
    ]);

    var chapterList = el('div', { class: 'chapter-list' });

    ctx.curriculum.chapters.forEach(function (chapter) {
      var done = chapter.lessons.filter(function (lesson) {
        return progress.starsFor(lesson.id) > 0;
      }).length;

      var section = el('section', { class: 'chapter chapter-' + chapter.color }, [
        el('header', { class: 'chapter-head' }, [
          el('div', { class: 'chapter-title-wrap' }, [
            el('span', { class: 'chapter-dot', 'aria-hidden': 'true' }),
            el('h3', { text: chapter.title }),
            el('span', { class: 'chapter-meta', text: done + '/' + chapter.lessons.length + ' bài' })
          ]),
          el('p', { class: 'chapter-summary', text: chapter.summary })
        ]),
        el('div', { class: 'lesson-grid' }, chapter.lessons.map(function (lesson) {
          return lessonCard(lesson);
        }))
      ]);
      chapterList.appendChild(section);
    });

    function lessonCard(lesson) {
      var unlocked = progress.isUnlocked(lesson.id);
      var stars = progress.starsFor(lesson.id);
      var card = el('button', {
        class: 'lesson-card' + (unlocked ? '' : ' is-locked'),
        type: 'button',
        on: {
          click: function () {
            if (!unlocked) {
              ctx.audio.tap();
              Components.toast('Hoàn thành bài trước để mở bài này nhé! 🚀', { tone: 'gentle' });
              return;
            }
            ctx.audio.tap();
            ctx.navigate('lesson', { lessonId: lesson.id });
          }
        }
      }, [
        el('span', { class: 'lesson-icon', text: unlocked ? lesson.icon : '🔒', 'aria-hidden': 'true' }),
        el('span', { class: 'lesson-body' }, [
          el('span', { class: 'lesson-label', text: lesson.label }),
          el('span', { class: 'lesson-name', text: lesson.title }),
          el('span', { class: 'lesson-foot' }, [
            Components.stars(stars, { small: true }),
            el('span', { class: 'lesson-page', text: 'Trang ' + lesson.page })
          ])
        ]),
        unlocked ? null : el('span', { class: 'sr-only', text: 'Chưa mở khoá.' })
      ]);
      return card;
    }

    var footer = el('footer', { class: 'home-footer' }, [
      el('span', { text: 'Sách Toán 1 – Tập 1 · Nhà xuất bản Giáo dục Việt Nam' }),
      el('span', {
        text: progress.isPersistent()
          ? 'Tiến độ được lưu trên máy này'
          : 'Tiến độ chỉ lưu trong phiên này'
      })
    ]);

    screen.appendChild(header);
    screen.appendChild(hero);
    screen.appendChild(strip);
    screen.appendChild(chapterList);
    screen.appendChild(footer);
    ctx.root.appendChild(screen);
    homeTitle.focus({ preventScroll: true });

    return {
      destroy: function () {
        /* Home không giữ timer hay listener riêng. */
      }
    };
  }

  return home;
}());
