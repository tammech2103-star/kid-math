/**
 * Điểm khởi động: tạo service, router màn hình, splash và cài đặt dùng chung.
 * @namespace KM.App
 */
window.KM = window.KM || {};

(function () {
  'use strict';

  var tuning = KM.Tuning;
  var Components = KM.Components;
  var el = Components.el;
  var root = document.getElementById('app');

  var storage = KM.Storage.create(tuning.storageKey);
  var progress = KM.Progress.create({
    storage: storage,
    tuning: tuning,
    curriculum: KM.Curriculum
  });
  var settings = progress.settings();
  var audio = KM.Audio.create({
    enabled: settings.sfx,
    master: tuning.audio.master
  });
  var speech = KM.Speech.create({
    enabled: settings.speech,
    lang: tuning.speech.lang,
    rate: tuning.speech.rate,
    pitch: tuning.speech.pitch,
    volume: tuning.speech.volume
  });
  var rng = KM.Rng.create(Date.now() + ':' + Math.random());
  var currentScreen = null;

  /**
   * @param {string} key
   * @param {boolean} value
   * @returns {boolean} giá trị sau khi đổi
   */
  function setSetting(key, value) {
    var actual = progress.setSetting(key, value);
    if (key === 'speech') {
      speech.setEnabled(actual);
    }
    if (key === 'sfx') {
      audio.setEnabled(actual);
    }
    return actual;
  }

  /**
   * Chuyển màn hình, dọn màn cũ trước khi dựng màn mới.
   * @param {string} name
   * @param {object} [params]
   */
  function navigate(name, params) {
    if (currentScreen && typeof currentScreen.destroy === 'function') {
      currentScreen.destroy();
    }
    speech.stop();
    Components.clear(root);
    Components.dismissToast();
    document.body.dataset.screen = name;
    document.title = name === 'home'
      ? tuning.appName
      : tuning.appName + ' · ' + (name === 'lesson' ? 'Đang học' : (name === 'result' ? 'Kết quả' : 'Phụ huynh'));

    var factory = KM.Screens[name];
    if (typeof factory !== 'function') {
      console.error('Unknown screen:', name);
      Components.toast('Không mở được màn hình. Bé tải lại trang nhé!', { tone: 'error', duration: 4000 });
      return;
    }
    try {
      currentScreen = factory(ctx, params || {}) || {};
    } catch (error) {
      console.error('Screen failed:', error);
      Components.toast('Có lỗi nhỏ xảy ra. Bé tải lại trang nhé!', { tone: 'error', duration: 4000 });
      currentScreen = {};
    }
  }

  var ctx = {
    root: root,
    tuning: tuning,
    curriculum: KM.Curriculum,
    progress: progress,
    audio: audio,
    speech: speech,
    rng: rng,
    questions: KM.Questions,
    lessonSession: KM.LessonSession,
    navigate: navigate,
    setSetting: setSetting
  };

  function buildSplash() {
    var screen = el('div', { class: 'screen splash' });
    var card = el('div', { class: 'splash-card' }, [
      el('span', { class: 'splash-eyebrow', text: 'Toán lớp 1 · Tập 1' }),
      el('h1', { class: 'splash-title', text: tuning.appName }),
      el('p', { class: 'splash-sub', text: 'Kết nối tri thức với cuộc sống' }),
      el('div', { class: 'splash-car-wrap' }, [
        el('span', { class: 'splash-spark splash-spark-a', text: '⭐', 'aria-hidden': 'true' }),
        el('span', { class: 'splash-spark splash-spark-b', text: '✨', 'aria-hidden': 'true' }),
        el('img', {
          class: 'splash-car',
          src: Components.CAR_SRC,
          alt: 'Chiếc xe đua phần thưởng',
          draggable: 'false'
        })
      ]),
      el('p', { class: 'splash-note', text: 'Trả lời đúng, xe đua sẽ xuất hiện và tặng bé những ngôi sao!' }),
      el('button', {
        class: 'btn btn-primary btn-xl splash-start',
        type: 'button',
        on: {
          click: function () {
            audio.unlock();
            audio.tap();
            try {
              window.sessionStorage.setItem('km_intro_seen', '1');
            } catch (error) {
              /* ignore */
            }
            navigate('home');
            speech.speak('Chào bé! Chúng mình cùng học toán nhé!');
          }
        }
      }, ['▶ Bấm để bắt đầu']),
      el('p', { class: 'splash-small', text: 'Dành cho bé 6 tuổi · Chơi offline trên máy' })
    ]);
    screen.appendChild(card);
    root.appendChild(screen);
    document.body.dataset.screen = 'splash';
    document.title = tuning.appName;
    currentScreen = { destroy: function () {} };
  }

  var seenIntro = false;
  try {
    seenIntro = window.sessionStorage.getItem('km_intro_seen') === '1';
  } catch (error) {
    seenIntro = false;
  }

  if (seenIntro) {
    navigate('home');
  } else {
    buildSplash();
  }

  window.KMApp = {
    ctx: ctx,
    navigate: navigate,
    version: tuning.appVersion,
    screens: Object.keys(KM.Screens),
    current: function () { return currentScreen; }
  };
}());
