# Session State — Bé Vui Học Toán 1

**Cập nhật**: 2026-11-22 — **Redesign 21 bài HOÀN TẤT + ĐÃ DEPLOY LIVE.**
**Trạng thái deploy**: Render deploy từ commit `4ffccef` trên `main`
(3 commit: `7822bd6` asset → `0d8ce76` code/CSS/JS → `4ffccef` QA/Render config).
Sau đó có thêm commit tài liệu cập nhật trạng thái live — không đổi code build.
Render Manual Deploy `dep-dc1csbvf3r2c73cc1rng` từ `4ffccef` —
**Deploy succeeded | Live**, 9.8s, 2026-11-22 18:12 GMT+7.
URL: `https://be-vui-hoc-toan-1.onrender.com`.

## Live verification sau deploy (2026-11-22)

- Trang chủ load OK: title `Bé Vui Học Toán 1`, 50 script, 4 stylesheet.
- Console **0 error**; **0 response HTTP ≥400** (các request `ERR_ABORTED` là 63 lượt
  `fetch HEAD` preload tự bắn, status đều 200 — không phải lỗi server).
- **63/63 ảnh** `Asset/{hd,covers,sprites}/…` HEAD OK.
- `KM.GameMap.all()` → **21 entry**, `gameId`/`style`/`tribute`/asset path đúng.
- Luồng `home → gameIntro → lesson` chạy: intro bài mở đầu hiện cảm hứng
  "Super Mario Bros." + sprite `intro.webp` 640×360; bài 1 minigame
  `minigame-mario-bros`, đồng xu + trả lời đúng/sai (sai nhắc nhẹ, không trừ sao),
  **stage 165px ≤170px** (OBS-01 giữ live), sprite xe 570×244/1000×477 load OK.
- Bài 20 (unlockAll để test): intro "Đua xe về đích" — cảm hứng "Mario Kart 8";
  race `minigame-mario-kart` với đối thủ Mater, 10 câu, **stage 104px**, console sạch.

## Việc đã làm (redesign + deploy hoàn tất)

Chuyển 21 bài từ một màn chơi chung sang **21 trò chơi riêng** lấy cảm hứng Nintendo
(ghi rõ tên cảm hứng trong UI, art HD tự sinh, không copy tài sản Nintendo).
Mỗi bài xong nhận **1/21 mảnh ghép McQueen** (lưới 7×3); đủ 21 mảnh hiện ảnh full.
Cuộc đua 1 đối 1 + bục trao thưởng được giữ làm game Bài 20 và màn tổng kết chung.

## Redesign 21 bài — tiến độ đầy đủ

- [x] **Giai đoạn A — thiết kế** (5 file):
      `design/quick-specs/all-21-distinct-games.md` (21 cơ chế, 21 động tác, 42 edge
      case, 21 AC), `design/art/art-bible-hd.md` + `design/art/sprite-style-guide.md`
      (21 style id canonical, 21 prompt), `docs/architecture/ADR-0003-...md` +
      `docs/architecture/game-module-interface.md` (GameMap v2 8 field, route
      `gameIntro`, `KM.Sprite`, 8 archetype layout/variant, cover `alt=""`).
- [x] **Chuẩn chốt**: style theo art bible, layout/variant theo ADR-0003, asset path
      `Asset/{hd,covers,sprites}/{lessonId}.webp` (không dùng `{gameId}`).
- [x] **Giai đoạn B — 63/63 ảnh procedural** (AI bị chặn bởi `Invalid credential` của
      `opencode/grok-imagine-image-2.0`; user chọn Pillow): 21 sprite 384×384 RGBA
      4×4, 21 cover 640×360, 21 nền HD 1280×720. Tổng **984.600 B (0,94 MB)** /
      63 file. 0 cặp sprite/cover trùng, 21/21 sheet idle≠cheer, mọi file ≤ ngân sách.
      User đã duyệt contact sheet trực quan.
- [x] **Giai đoạn C — core**: GameMap v2 (8 field, freeze + identity), `KM.Sprite.create`
      (rAF dùng chung, reduced-motion, destroy do shell sở hữu), `KM.Screens.gameIntro`
      (flag `km_game_intro_v1_<lessonId>` trong sessionStorage + fallback `KM._introFlags`),
      route `home → gameIntro(lessonId) → lesson`, cover trên thẻ bài + intro,
      shell `lesson.js` nối sprite, script order trong `index.html`.
- [x] **Giai đoạn C — gameplay**: `js/ui/games/kit.js` + 18 module mới; 18/18 contract
      hợp lệ, smoke fake-DOM trả lời 18/18. 3 module cũ giữ nguyên; `b20/mario-kart`
      vẫn KHÔNG gọi `onAnswer` (giữ race 1v1 + bục).
- [x] **Sửa regression splatoon**: câu `position` có 4 đáp án (`js/domain/questions.js:704`)
      nhưng module chỉ có 3 vị trí → đáp án 4 đè lên đáp án 1. Thêm `TARGET_SPOTS_4`
      (dải ngang 2%/26%/50%/74%, target 76px khi >3 đáp án), phủ bởi
      `tests/unit/splatoon.test.js`.
- [x] **Giai đoạn C — CSS archetype**: `css/games.css` append-only đến 1784 dòng;
      21 style id unique, 8 archetype × b/c/d, cover/sprite/intro responsive,
      OBS-01 compression (root `min-height:0 !important`, `.mario-scene`,
      `.ac-scene`/`.ac-garden`/`.ac-bed`). 0 rule `.choices`/`.choice` mới, 0
      `position:fixed|sticky` mới, 0 rule nén nhắm trực tiếp `.game-stage`.
- [x] **Giai đoạn C — QA package**: 4 test file mới (game-map-v2 10, game-intro 7,
      sprite 7, splatoon 1); `tests/test-runner.html` với `<base href="../">`, rAF stub,
      script order đúng; `tools/smoke_test.py` phủ 63 ảnh, luồng intro, 21 stage,
      21×4 OBS-01 measurement, 88 screenshot. `EXPECTED_UNIT_TESTS=117`.
- [x] **FINAL GATE PASS** (QA tự rerun, không chỉ tin self-audit):
      unit **117/117 PASS**, ảnh **63/63** load OK, console **0** / HTTP **0** ≥400,
      **OBS-01: 0 failures / 84 measurements**, stage cao nhất **166.0px ≤170px**,
      dòng cuối `PASS — smoke test hoàn tất`.
      Log: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-final-gate.log`.
      BUG-001 **Resolved/Closed** (39/84 → 0/84).
      Báo cáo: `production/qa/phase-c-qa-report.md`.

## Quyết định quan trọng (giữ nguyên từ Đợt 1)

1. **Giữ lõi học tập**: `Question`, `LessonSession`, tính sao, RNG, speech, audio,
   parent gate, localStorage `kidmath.v1` không đổi. Minigame chỉ gọi `onAnswer(value)`;
   `b20` không gọi (race là luật riêng).
2. **Hợp đồng game**: `createGame({ctx, question, mount, onAnswer, reducedMotion})`
   → `{render, onCorrect, onWrong, celebrate, destroy}`.
3. **Bản quyền**: ghi tên game cảm hứng + art tự sinh/procedural; không copy
   sprite/logo/nhạc/nhân vật Nintendo.
4. **Mảnh ghép**: 1 mảnh/bài, nhận tự động, **thua vẫn nhận**, chơi lại không tăng;
   cắt ảnh bằng CSS `background-position`, không sinh 21 file.
5. **OBS-01**: `.choices`/`.choice` giữ nguyên cấu trúc, không `position:fixed|sticky`
   mới; chỉ nén lớp trang trí CON của `.screen.lesson.has-minigame .game-stage`;
   nút đáp án thấy được không cần cuộn ở 4 viewport.
6. Web tĩnh offline `file://`, không backend, không Node runtime, chạm ≥64px,
   bàn phím 1–9/R/Esc, `prefers-reduced-motion`.

## Kết quả kiểm thử hiện tại (local, đợt redesign)

| Hạng mục | Kết quả | Bằng chứng |
|----------|---------|------------|
| Unit test | **117/117 PASS** (92 cũ + 25 mới) | `tests/test-runner.html`, smoke log |
| Smoke E2E | **PASS** | `phase-c-final-gate.log` |
| 63 ảnh HD/cover/sprite | 63/63 load OK, ≤ ngân sách | smoke log |
| Luồng `home → gameIntro → lesson` + flag | PASS | smoke, `game-intro.test.js` |
| 21 bài × 1 `.game-stage` + sprite | PASS 21/21 | smoke |
| Console / HTTP ≥400 | 0 / 0 | smoke log |
| OBS-01 21 bài × 4 viewport | **0 fail / 84**, max 166.0px | smoke log, 88 screenshot |
| Race b20 + bục + vòng đời mảnh 21/21 | PASS | smoke |
| Offline `file://` + reduced-motion + keyboard | PASS | smoke |
| BUG-001 OBS-01 stage height | **Resolved/Closed** | `production/qa/bugs/BUG-001-...md` |

## Rủi ro còn lại

- **Chưa có manual playtest với trẻ em 6 tuổi** cho redesign 21 bài. Automation +
  evidence (117 unit, 84 layout, 88 screenshot, live verify) KHÔNG thay thế
  sign-off Visual/Feel.
- Live verify đã sample bài mở đầu + bài 20; 19 bài còn lại tin tưởng unit + smoke
  local (đã chạy 21/21 stage). Nếu muốn, có thể click từng bài trên live để soi riêng.
- Máy phụ huynh đã cài giọng tiếng Việt chưa? (không đọc giọng sai ngôn ngữ)
- Có muốn thu âm lời khen giọng người thật thay TTS không?

## Bước tiếp theo

1. [x] Giai đoạn A thiết kế + B 63 ảnh + C code + QA package.
2. [x] FINAL GATE PASS + BUG-001 Closed + QA report chốt.
3. [x] Rebuild `public/` + `deploy/kid-math-render.zip` từ source local mới nhất.
4. [x] Upload GitHub 3 commit (`7822bd6`/`0d8ce76`/`4ffccef`) qua web UI (không có
      `git`/`gh`/token; dùng custom file input + DataTransfer giữ path thư mục).
5. [x] Render Manual Deploy `dep-dc1csbvf3r2c73cc1rng` — Deploy succeeded | Live.
6. [x] Verify live: console 0, HTTP ≥400 = 0, 63 ảnh, 21 GameMap, luồng intro → lesson.
7. [ ] Manual playtest với trẻ em 6 tuổi — xếp lịch riêng (không chặn deploy).
8. [ ] Hỏi phụ huynh: giọng Việt TTS đã cài chưa; có thu lời khen giọng người thật.
