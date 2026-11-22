/**
 * Bản đồ 21 minigame, xếp đúng thứ tự `KM.Curriculum.lessons`.
 * Mỗi entry là cấu hình tĩnh (không phải state): id game, tên cảm hứng, tiêu đề,
 * bảng màu, ảnh nền HD, cơ chế và đợt triển khai.
 * @namespace KM.GameMap
 * @see docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md
 * @see design/quick-specs/minigame-nintendo-2026-11-22.md
 */
window.KM = window.KM || {};

KM.GameMap = (function () {
  'use strict';

  /**
   * @typedef {object} GameEntry
   * @property {string} gameId Id dùng để đăng ký factory trong `KM.GameRegistry`.
   * @property {string} tribute Tên tựa game cảm hứng (chỉ ghi tên, không dùng tài sản).
   * @property {string} title Tiêu đề ngắn tiếng Việt hiển thị trong game.
   * @property {{sky:string, accent:string, ink:string}} palette Bảng màu riêng của game.
   * @property {string} bg Đường dẫn ảnh nền HD (WebP).
   * @property {string} mechanic Mô tả ngắn cơ chế chơi.
   * @property {number} phase Đợt triển khai (1 = mẫu, 2/3 = các đợt tiếp theo).
   */

  /** @type {Array<GameEntry>} */
  var entries = [
    {
      gameId: 'mario-bros',
      tribute: 'Super Mario Bros.',
      title: 'Nhảy nhặt đồng xu',
      palette: { sky: '#5C94FC', accent: '#FFD84D', ink: '#3A2317' },
      bg: 'Asset/hd/intro.webp',
      mechanic: 'Nhảy nhặt 1–5 đồng xu',
      phase: 1
    },
    {
      gameId: 'mario-odyssey',
      tribute: 'Super Mario Odyssey',
      title: 'Ném Cappy tìm số',
      palette: { sky: '#8AD7FF', accent: '#FF7A59', ink: '#243B5A' },
      bg: 'Asset/hd/b1.webp',
      mechanic: 'Ném Cappy vào mặt số đúng',
      phase: 2
    },
    {
      gameId: 'donkey-kong-country',
      tribute: 'Donkey Kong Country',
      title: 'Leo thang hái chuối',
      palette: { sky: '#A8E06A', accent: '#FFB020', ink: '#4A2C1A' },
      bg: 'Asset/hd/b2.webp',
      mechanic: 'Leo thang nhặt chuối 6–10',
      phase: 2
    },
    {
      gameId: 'pokemon',
      tribute: 'Pokémon',
      title: 'Bắt nhóm đúng',
      palette: { sky: '#DFF3A5', accent: '#F05A5A', ink: '#2E4A1F' },
      bg: 'Asset/hd/b3.webp',
      mechanic: 'Bắt nhóm nhiều hơn / ít hơn / bằng',
      phase: 2
    },
    {
      gameId: 'zelda',
      tribute: 'The Legend of Zelda',
      title: 'Mở rương so sánh',
      palette: { sky: '#9FD6A8', accent: '#F2C94C', ink: '#23423A' },
      bg: 'Asset/hd/b4.webp',
      mechanic: 'Mở rương bằng dấu > < =',
      phase: 2
    },
    {
      gameId: 'animal-crossing',
      tribute: 'Animal Crossing',
      title: 'Trồng hoa tách – gộp',
      palette: { sky: '#BFE9FF', accent: '#FF9BB3', ink: '#3E5B46' },
      bg: 'Asset/hd/b5.webp',
      mechanic: 'Trồng hoa vào 2 luống (tách – gộp)',
      phase: 1
    },
    {
      gameId: 'mario-party',
      tribute: 'Mario Party',
      title: 'Tung xí ngầu',
      palette: { sky: '#FFD6F0', accent: '#8E6CFF', ink: '#3B2A57' },
      bg: 'Asset/hd/b6.webp',
      mechanic: 'Tung xí ngầu đi ô, 5 dạng trộn',
      phase: 2
    },
    {
      gameId: 'dr-mario',
      tribute: 'Dr. Mario',
      title: 'Xếp viên thuốc',
      palette: { sky: '#EAF3FF', accent: '#FF5B6E', ink: '#2B3A66' },
      bg: 'Asset/hd/b7.webp',
      mechanic: 'Xếp viên thuốc đúng hình',
      phase: 2
    },
    {
      gameId: 'mario-maker',
      tribute: 'Super Mario Maker',
      title: 'Xếp khối thành tranh',
      palette: { sky: '#FCE3B4', accent: '#FF7B54', ink: '#4A3423' },
      bg: 'Asset/hd/b8.webp',
      mechanic: 'Xếp khối thành tranh rồi đếm',
      phase: 2
    },
    {
      gameId: 'mario-paint',
      tribute: 'Mario Paint',
      title: 'Tô màu theo mã',
      palette: { sky: '#FFF0F6', accent: '#7ED957', ink: '#3C3557' },
      bg: 'Asset/hd/b9.webp',
      mechanic: 'Tô màu theo mã hình / số',
      phase: 2
    },
    {
      gameId: 'yoshi-island',
      tribute: "Yoshi's Island",
      title: 'Yoshi nuốt trái',
      palette: { sky: '#C9F0A0', accent: '#FF8F3F', ink: '#35532E' },
      bg: 'Asset/hd/b10.webp',
      mechanic: 'Yoshi nuốt trái vào giỏ',
      phase: 3
    },
    {
      gameId: 'luigis-mansion',
      tribute: "Luigi's Mansion",
      title: 'Hút bóng bị trừ',
      palette: { sky: '#C8D2F2', accent: '#7CE0C0', ink: '#2E3352' },
      bg: 'Asset/hd/b11.webp',
      mechanic: 'Hút bóng bị trừ đi',
      phase: 3
    },
    {
      gameId: 'brain-age',
      tribute: 'Brain Age',
      title: 'Tính nhẩm bảng',
      palette: { sky: '#FFE9A8', accent: '#FF7F50', ink: '#4A3B2C' },
      bg: 'Asset/hd/b12.webp',
      mechanic: 'Tính nhẩm trên bảng',
      phase: 3
    },
    {
      gameId: 'mario-and-luigi',
      tribute: 'Mario & Luigi',
      title: 'Tìm số thiếu',
      palette: { sky: '#BFE4FF', accent: '#FF6B5B', ink: '#2E4160' },
      bg: 'Asset/hd/b13.webp',
      mechanic: 'Đội bạn tìm số thiếu',
      phase: 3
    },
    {
      gameId: 'pikmin',
      tribute: 'Pikmin',
      title: 'Dẫn Pikmin kéo khối',
      palette: { sky: '#D8F3A3', accent: '#FF6F61', ink: '#3B5230' },
      bg: 'Asset/hd/b14.webp',
      mechanic: 'Dẫn Pikmin kéo đúng khối',
      phase: 3
    },
    {
      gameId: 'kirby',
      tribute: 'Kirby',
      title: 'Thổi mây theo hướng',
      palette: { sky: '#FFD8EA', accent: '#FF6FA5', ink: '#5B3A57' },
      bg: 'Asset/hd/b15.webp',
      mechanic: 'Thổi mây theo ↑ ↓ ← →',
      phase: 3
    },
    {
      gameId: 'warioware',
      tribute: 'WarioWare',
      title: 'Microgame nhanh',
      palette: { sky: '#FFE066', accent: '#E34F3F', ink: '#3B2B22' },
      bg: 'Asset/hd/b16.webp',
      mechanic: 'Microgame nhanh 3 dạng',
      phase: 3
    },
    {
      gameId: 'super-smash-bros',
      tribute: 'Super Smash Bros.',
      title: 'Đấm đáp án đúng',
      palette: { sky: '#FFC94D', accent: '#E8453C', ink: '#3A2438' },
      bg: 'Asset/hd/b17.webp',
      mechanic: 'Đấm vào đáp án đúng',
      phase: 3
    },
    {
      gameId: 'fire-emblem',
      tribute: 'Fire Emblem',
      title: 'Đi quân tới ô đáp án',
      palette: { sky: '#B7C7E8', accent: '#E2B541', ink: '#26324F' },
      bg: 'Asset/hd/b18.webp',
      mechanic: 'Đi quân cờ tới ô đáp án',
      phase: 3
    },
    {
      gameId: 'splatoon',
      tribute: 'Splatoon',
      title: 'Bắn màu đúng hình',
      palette: { sky: '#FFD1E8', accent: '#FF4D8D', ink: '#3A2B4A' },
      bg: 'Asset/hd/b19.webp',
      mechanic: 'Bắn màu đúng hình',
      phase: 3
    },
    {
      gameId: 'mario-kart',
      tribute: 'Mario Kart 8',
      title: 'Đua xe về đích',
      palette: { sky: '#8DD9FF', accent: '#FFD84D', ink: '#243B5A' },
      bg: 'Asset/hd/b20.webp',
      mechanic: 'Đua 1 đối 1 + bục trao thưởng',
      phase: 1
    }
  ];

  if (typeof Object.freeze === 'function') {
    entries.forEach(function (entry) {
      Object.freeze(entry.palette);
      Object.freeze(entry);
    });
    Object.freeze(entries);
  }

  /**
   * Tìm entry theo lessonId bằng cách đối chiếu thứ tự với curriculum.lessons.
   * Tránh lặp lại danh sách id và không phụ thuộc thứ tự tải script.
   * @param {string} lessonId
   * @returns {GameEntry|null}
   */
  function forLesson(lessonId) {
    var lessons = KM.Curriculum && KM.Curriculum.lessons;
    if (!lessonId || !lessons) {
      return null;
    }
    for (var i = 0; i < lessons.length && i < entries.length; i += 1) {
      if (lessons[i].id === lessonId) {
        return entries[i];
      }
    }
    return null;
  }

  /**
   * @returns {Array<GameEntry>} Bản sao mảng cấu hình (21 entry).
   */
  function all() {
    return entries.slice();
  }

  /**
   * @param {string} lessonId
   * @returns {number|null} Đợt triển khai, hoặc null nếu không tìm thấy bài.
   */
  function phaseOf(lessonId) {
    var entry = forLesson(lessonId);
    return entry ? entry.phase : null;
  }

  return {
    forLesson: forLesson,
    all: all,
    phaseOf: phaseOf
  };
}());
