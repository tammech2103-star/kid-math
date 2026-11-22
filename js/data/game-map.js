/**
 * Bản đồ 21 minigame, xếp đúng thứ tự `KM.Curriculum.lessons`.
 * Mỗi entry là cấu hình tĩnh (không phải state): id game, tên cảm hứng, tiêu đề,
 * bảng màu, ảnh nền HD, cơ chế, đợt triển khai và nhận diện art (ADR-0003).
 * @namespace KM.GameMap
 * @see docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md
 * @see docs/architecture/ADR-0003-per-game-identity-and-sprite-runtime.md
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
   * @property {string} style Token art canonical (21 idunique, không phải gameId).
   * @property {string} layout Archetype stage: rail|arena|book|split|board|bench|tray|track.
   * @property {string} variant Biến thể cấu trúc trong archetype: a|b|c|d.
   * @property {string} cover Ảnh 16:9 cho thẻ bài và màn intro (`Asset/covers/<lessonId>.webp`).
   * @property {string} sprite Sprite sheet 4×4 (`Asset/sprites/<lessonId>.webp`).
   * @property {string} introText Câu giới thiệu riêng, tiếng Việt, ≤60 ký tự.
   * @property {string} inputHint Gợi ý thao tác ngắn, khác `introText`.
   * @property {number} motionMs Base ms/frame cho sprite runtime (bỏ qua khi reduced-motion).
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
      phase: 1,
      style: 'pixel-art',
      layout: 'rail',
      variant: 'a',
      cover: 'Asset/covers/intro.webp',
      sprite: 'Asset/sprites/intro.webp',
      introText: 'Cùng bé nhặt những đồng xu vui nhộn nhé!',
      inputHint: 'Chạm vào từng đồng xu để đếm.',
      motionMs: 120
    },
    {
      gameId: 'mario-odyssey',
      tribute: 'Super Mario Odyssey',
      title: 'Ném Cappy tìm số',
      palette: { sky: '#8AD7FF', accent: '#FF7A59', ink: '#243B5A' },
      bg: 'Asset/hd/b1.webp',
      mechanic: 'Ném Cappy vào mặt số đúng',
      phase: 2,
      style: 'watercolor',
      layout: 'arena',
      variant: 'a',
      cover: 'Asset/covers/b1.webp',
      sprite: 'Asset/sprites/b1.webp',
      introText: 'Chú cú tung khăn về ô số đúng.',
      inputHint: 'Chạm vào ô số bạn muốn chọn.',
      motionMs: 200
    },
    {
      gameId: 'donkey-kong-country',
      tribute: 'Donkey Kong Country',
      title: 'Leo thang hái chuối',
      palette: { sky: '#A8E06A', accent: '#FFB020', ink: '#4A2C1A' },
      bg: 'Asset/hd/b2.webp',
      mechanic: 'Leo thang nhặt chuối 6–10',
      phase: 2,
      style: 'carved-wood',
      layout: 'rail',
      variant: 'b',
      cover: 'Asset/covers/b2.webp',
      sprite: 'Asset/sprites/b2.webp',
      introText: 'Sóc nhỏ leo thang hái chuối ngon.',
      inputHint: 'Chạm từng nấc để leo cao hơn.',
      motionMs: 180
    },
    {
      gameId: 'pokemon',
      tribute: 'Pokémon',
      title: 'Bắt nhóm đúng',
      palette: { sky: '#DFF3A5', accent: '#F05A5A', ink: '#2E4A1F' },
      bg: 'Asset/hd/b3.webp',
      mechanic: 'Bắt nhóm nhiều hơn / ít hơn / bằng',
      phase: 2,
      style: 'paper-cut',
      layout: 'arena',
      variant: 'b',
      cover: 'Asset/covers/b3.webp',
      sprite: 'Asset/sprites/b3.webp',
      introText: 'Bé quây lưới bắt nhóm đúng nhé!',
      inputHint: 'Chạm vào nhóm hoặc nút bằng nhau.',
      motionMs: 200
    },
    {
      gameId: 'zelda',
      tribute: 'The Legend of Zelda',
      title: 'Mở rương so sánh',
      palette: { sky: '#9FD6A8', accent: '#F2C94C', ink: '#23423A' },
      bg: 'Asset/hd/b4.webp',
      mechanic: 'Mở rương bằng dấu > < =',
      phase: 2,
      style: 'wax-crayon',
      layout: 'book',
      variant: 'a',
      cover: 'Asset/covers/b4.webp',
      sprite: 'Asset/sprites/b4.webp',
      introText: 'Mở rương tìm dấu so sánh đúng.',
      inputHint: 'Chạm nắp rương để lật mở.',
      motionMs: 160
    },
    {
      gameId: 'animal-crossing',
      tribute: 'Animal Crossing',
      title: 'Trồng hoa tách – gộp',
      palette: { sky: '#BFE9FF', accent: '#FF9BB3', ink: '#3E5B46' },
      bg: 'Asset/hd/b5.webp',
      mechanic: 'Trồng hoa vào 2 luống (tách – gộp)',
      phase: 1,
      style: 'felt-fabric',
      layout: 'split',
      variant: 'a',
      cover: 'Asset/covers/b5.webp',
      sprite: 'Asset/sprites/b5.webp',
      introText: 'Vườn hoa trước sân đang chờ bé.',
      inputHint: 'Chạm từng bông để gieo vào luống.',
      motionMs: 180
    },
    {
      gameId: 'mario-party',
      tribute: 'Mario Party',
      title: 'Tung xí ngầu',
      palette: { sky: '#FFD6F0', accent: '#8E6CFF', ink: '#3B2A57' },
      bg: 'Asset/hd/b6.webp',
      mechanic: 'Tung xí ngầu đi ô, 5 dạng trộn',
      phase: 2,
      style: 'plastic-bricks',
      layout: 'board',
      variant: 'a',
      cover: 'Asset/covers/b6.webp',
      sprite: 'Asset/sprites/b6.webp',
      introText: 'Xí ngầu đang chờ bé tung lên!',
      inputHint: 'Chạm xí ngầu, rồi chạm ô đáp án.',
      motionMs: 140
    },
    {
      gameId: 'dr-mario',
      tribute: 'Dr. Mario',
      title: 'Xếp viên thuốc',
      palette: { sky: '#EAF3FF', accent: '#FF5B6E', ink: '#2B3A66' },
      bg: 'Asset/hd/b7.webp',
      mechanic: 'Xếp viên thuốc đúng hình',
      phase: 2,
      style: 'origami',
      layout: 'bench',
      variant: 'a',
      cover: 'Asset/covers/b7.webp',
      sprite: 'Asset/sprites/b7.webp',
      introText: 'Viên thuốc màu đã sẵn sàng rồi.',
      inputHint: 'Chạm viên thuốc để thả vào chai.',
      motionMs: 200
    },
    {
      gameId: 'mario-maker',
      tribute: 'Super Mario Maker',
      title: 'Xếp khối thành tranh',
      palette: { sky: '#FCE3B4', accent: '#FF7B54', ink: '#4A3423' },
      bg: 'Asset/hd/b8.webp',
      mechanic: 'Xếp khối thành tranh rồi đếm',
      phase: 2,
      style: 'clay',
      layout: 'tray',
      variant: 'a',
      cover: 'Asset/covers/b8.webp',
      sprite: 'Asset/sprites/b8.webp',
      introText: 'Xếp những khối đất thành tranh đẹp.',
      inputHint: 'Chạm ô để đặt hoặc bỏ một khối.',
      motionMs: 160
    },
    {
      gameId: 'mario-paint',
      tribute: 'Mario Paint',
      title: 'Tô màu theo mã',
      palette: { sky: '#FFF0F6', accent: '#7ED957', ink: '#3C3557' },
      bg: 'Asset/hd/b9.webp',
      mechanic: 'Tô màu theo mã hình / số',
      phase: 2,
      style: 'oil-paint',
      layout: 'bench',
      variant: 'b',
      cover: 'Asset/covers/b9.webp',
      sprite: 'Asset/sprites/b9.webp',
      introText: 'Cây cọ đang chờ bé tô màu nè.',
      inputHint: 'Vuốt qua vùng màu bạn chọn.',
      motionMs: 200
    },
    {
      gameId: 'yoshi-island',
      tribute: "Yoshi's Island",
      title: 'Yoshi nuốt trái',
      palette: { sky: '#C9F0A0', accent: '#FF8F3F', ink: '#35532E' },
      bg: 'Asset/hd/b10.webp',
      mechanic: 'Yoshi nuốt trái vào giỏ',
      phase: 3,
      style: 'mosaic',
      layout: 'rail',
      variant: 'c',
      cover: 'Asset/covers/b10.webp',
      sprite: 'Asset/sprites/b10.webp',
      introText: 'Bé mở miệng nuốt trái vào giỏ nào!',
      inputHint: 'Chạm từng trái cho vào giỏ.',
      motionMs: 160
    },
    {
      gameId: 'luigis-mansion',
      tribute: "Luigi's Mansion",
      title: 'Hút bóng bị trừ',
      palette: { sky: '#C8D2F2', accent: '#7CE0C0', ink: '#2E3352' },
      bg: 'Asset/hd/b11.webp',
      mechanic: 'Hút bóng bị trừ đi',
      phase: 3,
      style: 'ink-wash',
      layout: 'book',
      variant: 'b',
      cover: 'Asset/covers/b11.webp',
      sprite: 'Asset/sprites/b11.webp',
      introText: 'Bóng ma đang lẩn trong đêm tối.',
      inputHint: 'Chạm giữ để hút bóng vào đèn.',
      motionMs: 220
    },
    {
      gameId: 'brain-age',
      tribute: 'Brain Age',
      title: 'Tính nhẩm bảng',
      palette: { sky: '#FFE9A8', accent: '#FF7F50', ink: '#4A3B2C' },
      bg: 'Asset/hd/b12.webp',
      mechanic: 'Tính nhẩm trên bảng',
      phase: 3,
      style: 'chalkboard',
      layout: 'board',
      variant: 'b',
      cover: 'Asset/covers/b12.webp',
      sprite: 'Asset/sprites/b12.webp',
      introText: 'Bảng phấn chờ bé điền số đúng.',
      inputHint: 'Chạm ô số để điền vào chỗ trống.',
      motionMs: 180
    },
    {
      gameId: 'mario-and-luigi',
      tribute: 'Mario & Luigi',
      title: 'Tìm số thiếu',
      palette: { sky: '#BFE4FF', accent: '#FF6B5B', ink: '#2E4160' },
      bg: 'Asset/hd/b13.webp',
      mechanic: 'Đội bạn tìm số thiếu',
      phase: 3,
      style: 'grid-paper',
      layout: 'split',
      variant: 'b',
      cover: 'Asset/covers/b13.webp',
      sprite: 'Asset/sprites/b13.webp',
      introText: 'Hai bạn đang chơi bóng cùng bé.',
      inputHint: 'Chạm để đẩy bóng, rồi chọn thẻ số.',
      motionMs: 200
    },
    {
      gameId: 'pikmin',
      tribute: 'Pikmin',
      title: 'Dẫn Pikmin kéo khối',
      palette: { sky: '#D8F3A3', accent: '#FF6F61', ink: '#3B5230' },
      bg: 'Asset/hd/b14.webp',
      mechanic: 'Dẫn Pikmin kéo đúng khối',
      phase: 3,
      style: 'yarn',
      layout: 'tray',
      variant: 'b',
      cover: 'Asset/covers/b14.webp',
      sprite: 'Asset/sprites/b14.webp',
      introText: 'Đàn bọ len đang khiêng khối to.',
      inputHint: 'Chạm bạn len rồi chạm khối cần kéo.',
      motionMs: 180
    },
    {
      gameId: 'kirby',
      tribute: 'Kirby',
      title: 'Thổi mây theo hướng',
      palette: { sky: '#FFD8EA', accent: '#FF6FA5', ink: '#5B3A57' },
      bg: 'Asset/hd/b15.webp',
      mechanic: 'Thổi mây theo ↑ ↓ ← →',
      phase: 3,
      style: 'cotton',
      layout: 'arena',
      variant: 'c',
      cover: 'Asset/covers/b15.webp',
      sprite: 'Asset/sprites/b15.webp',
      introText: 'Mây bông đang trôi theo gió nhẹ.',
      inputHint: 'Chạm đám mây theo hướng bạn chọn.',
      motionMs: 200
    },
    {
      gameId: 'warioware',
      tribute: 'WarioWare',
      title: 'Microgame nhanh',
      palette: { sky: '#FFE066', accent: '#E34F3F', ink: '#3B2B22' },
      bg: 'Asset/hd/b16.webp',
      mechanic: 'Microgame nhanh 3 dạng',
      phase: 3,
      style: 'pop-art',
      layout: 'board',
      variant: 'c',
      cover: 'Asset/covers/b16.webp',
      sprite: 'Asset/sprites/b16.webp',
      introText: 'Thẻ lệnh hiện lên thật nhanh!',
      inputHint: 'Chạm ngay thẻ đáp án đúng.',
      motionMs: 140
    },
    {
      gameId: 'super-smash-bros',
      tribute: 'Super Smash Bros.',
      title: 'Đấm đáp án đúng',
      palette: { sky: '#FFC94D', accent: '#E8453C', ink: '#3A2438' },
      bg: 'Asset/hd/b17.webp',
      mechanic: 'Đấm vào đáp án đúng',
      phase: 3,
      style: 'neon-vector',
      layout: 'arena',
      variant: 'd',
      cover: 'Asset/covers/b17.webp',
      sprite: 'Asset/sprites/b17.webp',
      introText: 'Ba bệ cao chờ bé nhảy đấm cờ.',
      inputHint: 'Chạm lá cờ trên bệ bạn chọn.',
      motionMs: 180
    },
    {
      gameId: 'fire-emblem',
      tribute: 'Fire Emblem',
      title: 'Đi quân tới ô đáp án',
      palette: { sky: '#B7C7E8', accent: '#E2B541', ink: '#26324F' },
      bg: 'Asset/hd/b18.webp',
      mechanic: 'Đi quân cờ tới ô đáp án',
      phase: 3,
      style: 'woodcut',
      layout: 'board',
      variant: 'd',
      cover: 'Asset/covers/b18.webp',
      sprite: 'Asset/sprites/b18.webp',
      introText: 'Hiệp sĩ nhỏ đang đi tìm ô đúng.',
      inputHint: 'Chạm ô đích để quân đi tới.',
      motionMs: 200
    },
    {
      gameId: 'splatoon',
      tribute: 'Splatoon',
      title: 'Bắn màu đúng hình',
      palette: { sky: '#FFD1E8', accent: '#FF4D8D', ink: '#3A2B4A' },
      bg: 'Asset/hd/b19.webp',
      mechanic: 'Bắn màu đúng hình',
      phase: 3,
      style: 'spray-paint',
      layout: 'bench',
      variant: 'c',
      cover: 'Asset/covers/b19.webp',
      sprite: 'Asset/sprites/b19.webp',
      introText: 'Súng màu đã sẵn, bé bắn thử nhé!',
      inputHint: 'Chạm mục tiêu để bắn màu tới.',
      motionMs: 160
    },
    {
      gameId: 'mario-kart',
      tribute: 'Mario Kart 8',
      title: 'Đường về trường',
      palette: { sky: '#8DD9FF', accent: '#FFD84D', ink: '#243B5A' },
      bg: 'Asset/hd/b20.webp',
      mechanic: 'Xếp các ô đường tới trường',
      phase: 1,
      style: 'patchwork',
      layout: 'track',
      variant: 'a',
      cover: 'Asset/covers/b20.webp',
      sprite: 'Asset/sprites/b20.webp',
      introText: 'Xếp đường tới trường đang chờ bé!',
      inputHint: 'Chạm đáp án để xếp ô đường.',
      motionMs: 140
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
   * Trả về CHÍNH object đã freeze (không clone) để giữ identity cho test cũ.
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
