# Session State — Bé Vui Học Toán 1

**Cập nhật**: 2026-11-23 — Thêm bản chỉnh **thị giác local** cho bài `intro`
(đồng bộ nền gameplay với màn intro). UI redesign v2 bên dưới vẫn **ĐÃ DEPLOY LIVE**;
bản chỉnh mới **chưa deploy / chưa commit / chưa push**.
**Trạng thái deploy**: `https://be-vui-hoc-toan-1.onrender.com` chạy commit
`a2a680c` trên `main` (Render deploy `dep-dc1fkoqjnfac738l5hd0`,
**Deploy succeeded | Live**, 8.7s, Manual Deploy). Bản cũ `4ffccef` đã bị thay.
Lần này đẩy 35 file runtime cần thiết qua GitHub web (máy không có `git`/`gh`);
không đẩy ZIP 477 file, không push thêm sau khi live.

## Đợt 2026-11-23b — Prototype Platformer "Bé Khám Phá" + Question-Gate (LOCAL-ONLY)

- [x] **Spec**: `design/quick-specs/intro-platformer-question-gate.md` (đã duyệt, không chỉnh).
- [x] **Prototype Phase 2**: `js/ui/games/mario-bros.js` viết lại hoàn toàn:
  - Physics đơn giản: gravity 1200, speed 180, jump -420, coyote 80ms, jump buffer 100ms.
  - Collision AABB (X rồi Y), one-way platform.
  - Tilemap 40×10, ground + platform + gate (x5) + exit + collectibles.
  - Camera follow với dead zone, lerp 0.15.
  - Question-gate: modal overlay khóa input, hiện câu hỏi + đáp án 2 cột, đúng → đóng + gate mở, sai → hint.
  - Điều khiển: ← → ↑/Space (desktop) + nút ảo (touch, ≥64px).
  - `handleKey` 1-9 cho đáp án trong modal.
  - `render/onWrong/onCorrect/celebrate/destroy` tích hợp `km:answer`.
- [x] **Sprite sheet**: `Asset/v2/explorer_sprites.png` (288×240, 9×5 frames, 32×48px mỗi frame). Trích từ sprite người dùng cung cấp, xóa nền xám, chuẩn hóa kích thước.
- [x] **Animation**: 4 trạng thái (idle/run/jump/fall), 9 frame mỗi trạng thái, cycle 0.1s/frame, reset khi đổi state.
- [x] **CSS**: Block `01 · intro` viết lại: viewport, tiles, player (sprite sheet), coin, gate, exit, vpad, vbtn, modal, celebration, reduced-motion, mobile.
- [x] **game-map.js**: entry đầu đổi title/introText/inputHint/mechanic cho "Bé Khám Phá".
- [x] **Kiểm chứng**: auto-play 5 gate → 5 câu → kết quả. Di chuyển, nhảy, gate, modal, đáp án đúng/sai, phím 1-9, sprite animation, console (chỉ AudioContext headless).
- [x] **Map redesign**: Map mới 50×10 với platforms, 15 collectibles (coin/heart/star/gem), 2 gates, hazards. Dựa trên layout từ ảnh tham khảo.
- [x] **Audio**: Thêm `coin()`, `heart()`, `jump()`, `land()`, `gateOpen()` vào audio.js. Collectible phát sound theo type. Floating text (+1, +❤, +2, +3) khi nhặt.
- [x] **CSS**: Collectible styles (coin spin, heart pulse, star twinkle), floating text animation.

## Đợt 2026-11-23 — Đồng bộ nền gameplay bài `intro` (LOCAL-ONLY)

Vấn đề: màn intro dùng "Công viên ống nước" còn màn chơi lại vẽ nền/CSS riêng →
hai thế giới không ăn khớp. Chọn phương án **dùng chung ảnh SVG** + chỉnh copy
cho khớp thao tác của bé; người dùng đã duyệt ("đồng ý").

- [x] **Asset mới**: `Asset/v2/vex/pipe-park-gameplay-bg.svg` (1200×600, tự sinh,
      XML hợp lệ). Cùng palette/thế giới với `intro-tribute-scene.svg`; có Bé Thợ
      (x≈120–262), ống xanh, bàn gỗ **trống** (x410–800), vùng biển số bên phải
      trống (x820–1160); **không** trái cây/biển số/chữ số có sẵn, không asset Nintendo.
- [x] `js/ui/games/mario-bros.js`: comment trỏ nền SVG dùng chung; bỏ hẳn
      `buildHero()` / `hero` / `world.appendChild(hero)` (SVG đã vẽ Bé Thợ).
      Giữ nguyên hợp đồng, `km:answer`, gating, phím 1–9, hint, cleanup, ES5.
- [x] `css/games.css`: **chỉ** block `01 · intro`; `.mp-world` dùng
      `url('../Asset/v2/vex/pipe-park-gameplay-bg.svg')` + `center/cover/no-repeat`;
      bỏ gradient/pipe giả/`.mp-hero*`; grid `17/45/38` (gutter trống / bàn / biển số);
      rule `.game-mount > .kmg-mario-bros { background: transparent }` để panel chung
      không phủ nền; mobile `background-position: left center`, deck 3 cột ≥64px.
- [x] `js/data/game-map.js`: **chỉ** entry đầu — `bg` → SVG mới; `cover` giữ nguyên;
      `introText`/`inputHint` theo wording đã duyệt. 21 entry, 20 bài khác không đổi.
- [x] Rebuild `public/` (`python tools/build_public.py`, 464 mục); mirror có đủ 4 file.

### Kiểm chứng local (2026-11-23, browser + `http://127.0.0.1:8766`)

| Hạng mục | Kết quả |
|----------|---------|
| Asset/phục vụ | SVG well-formed; index/css/js/svg đều HTTP 200 |
| Intro → gameplay | Copy mới hiện đúng ("Bé Khám Phá phiêu lưu..."); vào bài hiện platformer |
| Platformer | Nhân vật 🧭 di chuyển ← →, nhảy ↑, camera follow; gravity + collision hoạt động |
| Question-gate | Chạm cửa 🚪 → modal overlay khóa màn hình; hiện câu hỏi + đáp án; đúng → đóng modal + gate mở; sai → hint + modal giữ mở |
| Hợp đồng | `km:answer` bubbles, `detail.value` đúng; phím 1-9 trong modal chọn đáp án; phím ← → ↑ điều khiển game |
| Wrong answer | Hint "Thử lại nhé!" hiện đúng; sau 3 lần sai hint đổi "Bé đếm lại từ đầu nhé!" |
| Celebration | `is-celebrate` class + animation khi trả lời đúng |
| Mobile (iframe 390px) | Viewport 240px, CSS media query hoạt động |
| Reduced motion | `.is-reduced` class applied; animation/transition tắt |
| Console | Chỉ lỗi `AudioContext` (headless, không có thiết bị âm) — không liên quan game |
| Phạm vi | Chỉ `mario-bros.js` + `games.css` block 01 + `game-map.js` entry đầu + spec mới |

**Chưa làm**: deploy/push/commit, test files, đổi bài khác. Chờ người dùng review thị
giác trên local rồi mới có chỉ thị publish. Tab browser đang mở sẵn để review.

## Đợt này — Thiết kế lại 21 bài, bỏ đua xe

Mục tiêu: mỗi bài 1 giao diện riêng (cấu trúc / bố cục / động tác khác nhau,
không chỉ đổi màu); bỏ hoàn toàn đua xe, đối thủ, bục trao thưởng, xe thưởng,
podium, `race-*`, `kart-*` trong runtime; bỏ cụm đáp án `.choices`/`.choice`
dưới game — mỗi module tự chứa điều khiển trả lời. Vẫn giữ ý nghĩa toán học.

- [x] **Docs chốt**: `design/quick-specs/ui-redesign-21-distinct-screens.md`
      (bảng 21 giao diện), `docs/architecture/ADR-0004-independent-game-modules-
      and-skill-asset-pipeline.md`, `design/art/skill-asset-pipeline.md`.
      Spec cũ `all-21-distinct-games.md` bị SUPERSEDED.
- [x] **Shell mới**: `js/ui/screens/lesson.js` nghe `CustomEvent('km:answer',
      {bubbles:true, detail:{value}})` từ module, gọi `session.answer(value)`;
      không render `.choices`. `home.js`, `result.js`, `collection.js`,
      `js/app.js`, `index.html` dọn sạch ngôn ngữ đua xe / McQueen.
- [x] **21 module độc lập** trong `js/ui/games/` — mỗi file 1 root `.kmg-<gameId>`,
      không dùng `GameMap`/`GameRegistry`/`onAnswer` chung, không archetype dùng lại.
      Bài 20 `mario-kart` thành "Đường vải tới trường" — không xe, không đối thủ.
- [x] **CSS** `css/games.css` viết lại thành 21 theme `.kmg-*` riêng;
      `css/app.css`/`css/puzzle.css` xóa race/car/choices. Ảnh ghép 4:3 →
      `.puzzle-piece aspect-ratio: 0.571` (đã sửa từ 0.898 của ảnh cũ 1000×477).
- [x] **Asset thưởng**: `Asset/v2/vex/school-reward.svg` (1200×900, 44.709 B,
      21/21 ô lưới 7×3 có nội dung) thay `Asset/Mc_Queen.webp`;
      `components.js`/`js/domain/puzzle.js`/`js/ui/puzzle.js` dùng `PUZZLE_SRC`.
      `collection.js` title/alt "Bộ sưu tập Trường vui".
- [x] **Build**: `tools/build_public.py` REQUIRED đổi `Asset/Mc_Queen.webp` →
      `Asset/v2/vex/school-reward.svg`; đã rebuild `public/` (462 mục, 13.9 MB).
- [x] **QA**: `tests/test-runner.html`, `tests/unit/game-map.test.js`,
      `tests/unit/puzzle.test.js`, `tests/unit/km-answer-contract.test.js` mới;
      `tools/smoke_test.py` viết lại; bỏ race/sprite khỏi runner.
      `EXPECTED_UNIT_TESTS = 105`.

## Pipeline asset 5 skill (authoring-time)

Cài global tại `C:\Users\2103\.config\opencode\ocgs\.agents\skills\{pxl,vex,kiln,loom,chirp}`.
Node portable `v22.18.0` (dùng `npm.cmd`, `npm.ps1` bị execution policy chặn).
DSL build trong `tools/asset-pipeline/`, deliverable commit trong `Asset/v2/`.

- **71 asset deliverable** (+ `school-reward.svg`): `pxl` lint OK; `kiln` 160–212 tris;
  `loom` 6/6 seamless; `chirp` 7/7 pitch OK, peak −12.03…−7.96 dBFS, không CLIPPED.
- Runtime **không fetch** asset ngoài; phần lớn asset v2 chỉ là sản phẩm authoring.
  `pikmin.js` có đường dẫn `Asset/v2/kiln/yarn_block.png` (đã sửa từ path sai)
  nhưng vẫn bị gate bởi `KM.Assets`/`KM.AssetManifest` (không tồn tại) → không load,
  không 404. Bật dùng asset là quyết định riêng, chưa làm.

## Kiểm chứng (local, 2026-11-22)

| Hạng mục | Kết quả |
|----------|---------|
| Unit test | **105/105 PASS** |
| Smoke desktop | home / 21 module / answer / result / collection / reload **OK** |
| Smoke mobile | home / lesson tap **OK** |
| Reduced motion | module `.is-reduced` **OK** |
| Offline `file://` | splash **OK** |
| Build mirror | `python tools/build_public.py` exit 0, 462 mục |

### Kiểm chứng trên production (2026-11-22, sau deploy `a2a680c`)

| Hạng mục | Kết quả |
|----------|---------|
| Render | Deploy 14 · `dep-dc1fkoqjnfac738l5hd0` · Live · 8.7s |
| Màn chính | *Học toán cùng 21 trò vui!* · 21/21 thẻ bài · không `.choices` · không từ ngữ đua xe |
| Trong bài | Chạm đáp án → câu 1/5 sang 2/5, sao cập nhật; `KM.Games` 21 module |
| Script/asset | 22 request `/js/ui/games/*` HTTP 200; `school-reward.svg` HTTP 200 (44.709 B) |
| Bộ sưu tập | *Bộ sưu tập Trường vui* · 21 ô lưới; puzzle src đúng đường dẫn SVG |
| Console/network | 0 lỗi/cảnh báo; 0 request ≥400 hoặc failed |

Log: `C:\Users\2103\AppData\Local\Temp\km-smoke-final.log`.
Screenshot: `production/qa/screenshots/`.

## Quyết định giữ nguyên

1. **Lõi học tập**: `Questions`, `LessonSession`, `Curriculum`, `tuning`, speech/TTS
   tiếng Việt, progress/localStorage `kidmath.v1` là nguồn chân lý — không đổi.
2. **Kênh trả lời duy nhất**: `km:answer` CustomEvent trên `options.mount`;
   module không export `onAnswer`, shell gọi `session.answer`.
3. **Web tĩnh offline** `file://`, không backend, không Node runtime phía người chơi;
   ES5-ish `KM.*`; trẻ 6 tuổi, tiếng Việt, chạm ≥64px, phím 1–9/R/Esc,
   `prefers-reduced-motion`.
4. **Bản quyền**: art tự sinh/procedural qua 5 skill; không copy tài sản Nintendo
   hay nhân vật đua xe có bản quyền.
5. **Deploy UI v2** đã thực hiện theo chỉ thị "deploy bản mới" của người dùng;
   không publish thêm khi chưa có chỉ thị mới.

## Việc còn lại / rủi ro

- [x] **Deploy UI v2** — live `a2a680c` / Render `dep-dc1fkoqjnfac738l5hd0`.
- [ ] Cập nhật 2 file doc (`DEPLOY-RENDER.md`, file này) lên GitHub **nếu** người
      dùng yêu cầu; hiện chỉ ghi local, không push thêm.
- [ ] **Playtest với trẻ 6 tuổi** vẫn defer — automation không thay thế sign-off
      Visual/Feel.
- [ ] Cân nhắc có bật consume asset v2 trong runtime không (pxl/vex/kiln/loom/chirp
      mới dùng ở mức authoring, trừ `school-reward.svg`).
- File cũ không còn nạp vẫn nằm trên đĩa: `js/ui/race.js`, `js/domain/race.js`,
  `js/data/racers.js`, `js/ui/games/{kit,contract,registry}.js`, `js/ui/sprite.js`,
  `Asset/Mc_Queen.webp`, `Asset/Flo.webp`. Không ảnh hưởng runtime; có thể dọn vật lý
  trong đợt vệ sinh repo riêng (cần xác nhận vì là xóa file).
- Máy phụ huynh đã cài giọng tiếng Việt chưa? Có muốn thu lời khen giọng thật
  thay TTS không?
