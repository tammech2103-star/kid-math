/**
 * Danh sách nhân vật đua xe lấy từ thư mục Asset.
 * Mỗi màn đua 1 đối 1: McQueen với một nhân vật. Đối thủ đổi theo màn và theo
 * số lần chơi lại, nên toàn bộ 28 nhân vật đều xuất hiện.
 * @namespace KM.Racers
 */
window.KM = window.KM || {};

KM.Racers = (function () {
  'use strict';

  var PLAYER = {
    id: 'mcqueen',
    name: 'McQueen',
    src: 'Asset/Mc_Queen.webp',
    color: '#d94132',
    isPlayer: true
  };

  var COLORS = [
    '#38b6e6', '#ff9f1c', '#6fe3b8', '#9c7bf5', '#ff6b5b', '#f5a800',
    '#2fa9dc', '#149a71', '#6b45d6', '#0e6d93', '#b45309', '#e8483a'
  ];

  var ROSTER_FILES = [
    ['blue-grit', 'Blue Grit', 'Blue_grit.webp'],
    ['boost', 'Boost', 'Boost.webp'],
    ['carla-veloso', 'Carla', 'Carla_veloso.webp'],
    ['chick-hicks', 'Chick', 'Chick_Hicks.webp'],
    ['dj', 'DJ', 'Dj.webp'],
    ['fillmore', 'Fillmore', 'Fillmore.webp'],
    ['finn-mcmissile', 'Finn', 'Finn_mcmissile.webp'],
    ['flo', 'Flo', 'Flo.webp'],
    ['francesco', 'Francesco', 'Francesco_bernoulli.webp'],
    ['guido', 'Guido', 'Guido.webp'],
    ['holly-shiftwell', 'Holly', 'Holly_shiftwell.webp'],
    ['idle-threat', 'Idle Threat', 'Idle_Threat.webp'],
    ['komodo', 'Komodo', 'Komodo.webp'],
    ['long-ge', 'Long Ge', 'LongGe.webp'],
    ['luigi', 'Luigi', 'Luigi.webp'],
    ['mater', 'Mater', 'MaterCars2Artwork.webp'],
    ['max-schnell', 'Max Schnell', 'Max_schnell.webp'],
    ['miguel', 'Miguel', 'Miguel_camino.webp'],
    ['pyotr', 'Pyotr', 'PyotrRacinovArtwork.webp'],
    ['raoul', 'Raoul', 'Raoul_caroule.webp'],
    ['sandy', 'Sandy', 'Sandy_dunes.webp'],
    ['sheriff', 'Sheriff', 'Sheriff.webp'],
    ['shifty', 'Shifty', 'Shifty_sidewinder.webp'],
    ['shu', 'Shu', 'Shu_todoroki.webp'],
    ['snot-rod', 'Snot Rod', 'Snot_rod.webp'],
    ['todd', 'Todd', 'ToddMarcus215render.webp'],
    ['wingo', 'Wingo', 'Wingo.webp'],
    ['yokoza', 'Yokoza', 'Yokoza.webp']
  ];

  var ROSTER = ROSTER_FILES.map(function (item, index) {
    return {
      id: item[0],
      name: item[1],
      src: 'Asset/' + item[2],
      color: COLORS[index % COLORS.length],
      isPlayer: false
    };
  });

  var order = KM.Rng.create('racer-order-v1').shuffle(ROSTER);

  /**
   * @param {string} lessonId
   * @returns {number} Vị trí bài trong chương trình, hoặc 0.
   */
  function lessonIndex(lessonId) {
    var lessons = KM.Curriculum.lessons;
    var i;
    for (i = 0; i < lessons.length; i += 1) {
      if (lessons[i].id === lessonId) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Đối thủ của một màn. Vòng xoay cố định theo bài và số lần chơi lại, nhờ đó
   * mỗi bài có một đối thủ ổn định và cả 28 nhân vật đều góp mặt khi bé chơi lại.
   * @param {string} lessonId
   * @param {number} [attempt] số lần đã chơi bài này trước đó (0 = lần đầu).
   * @returns {Array<object>}
   */
  function opponentsForLesson(lessonId, attempt) {
    var index = lessonIndex(lessonId);
    var count = Math.max(1, Number(KM.Tuning.race.opponentsPerRace) || 1);
    var offset = Math.max(0, Math.floor(Number(attempt) || 0));
    var out = [];
    var i;
    for (i = 0; i < count; i += 1) {
      out.push(order[(index + offset + i) % order.length]);
    }
    return out;
  }

  /**
   * @param {string} id
   * @returns {object|null}
   */
  function get(id) {
    if (id === PLAYER.id) {
      return PLAYER;
    }
    var i;
    for (i = 0; i < ROSTER.length; i += 1) {
      if (ROSTER[i].id === id) {
        return ROSTER[i];
      }
    }
    return null;
  }

  return {
    player: PLAYER,
    roster: ROSTER.slice(),
    all: [PLAYER].concat(ROSTER),
    opponentsForLesson: opponentsForLesson,
    get: get,
    rivalCount: ROSTER.length
  };
}());
