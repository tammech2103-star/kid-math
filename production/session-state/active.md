# Session State — Bé Vui Học Toán 1

**Cập nhật**: 2026-11-22 12:50
**Trạng thái**: **Đợt 1 của redesign "21 minigame + mảnh ghép McQueen" đã xong,
đang chờ deploy**. Live hiện vẫn là bản cũ commit `245b283` (cuộc đua 1 đối 1);
bản Đợt 1 chưa push lên GitHub, chưa Manual Deploy Render.

## Việc đang làm

Chuyển 21 bài từ một màn chơi chung sang **21 trò chơi riêng** lấy cảm hứng Nintendo
(ghi rõ tên cảm hứng trong UI, art HD tự sinh, không copy tài sản Nintendo).
Mỗi bài xong nhận **1/21 mảnh ghép McQueen** (lưới 7×3); đủ 21 mảnh hiện ảnh full.
Cuộc đua 1 đối 1 + bục trao thưởng được giữ làm game Bài 20 và màn tổng kết chung.

**Đợt 1 đã bàn giao**: nền tảng registry + puzzle + 3 game mẫu
(`mario-bros` cho `intro`, `animal-crossing` cho `b5`, `mario-kart` cho `b20`)
+ 3 ảnh nền HD + bộ sưu tập. 18 bài còn lại tạm fallback về giao diện cũ.

## Tiến độ

- [x] Chốt 5 quyết định sáng tạo với người dùng (21 game, tribute tên, ảnh HD,
      21 mảnh 7×3, giữ đua/bục)
- [x] Quick spec `minigame-nintendo-2026-11-22.md` + ADR-0002 + art bible HD
- [x] `game-map.js` (21 entry), `registry.js`, `contract.js`, tài liệu interface
- [x] Puzzle domain/UI + collection +-home entry; state lưu trong `kidmath.v1`, tương thích cũ
- [x] 3 module game mẫu + `css/games.css`; nối script/CSS/tuning trong index/app
- [x] 3 ảnh HD 1280×720 WebP: `intro` 23.4 KB, `b5` 26.6 KB, `b20` 27.0 KB
- [x] Sửa 2 bug tích hợp: `addChild()` đệ quy trong 3 game; `ctx.puzzle` gán nhầm namespace
- [x] Sửa **OBS-01**: bỏ visual cũ khi có minigame + nén `.has-minigame` + ẩn
      `.equation-slot` + mobile xếp luống hoa 1 cột + `.choices` sticky làm lưới an toàn.
      Gate nay phủ **3 game × 4 viewport** với seed đề xấu nhất (7 hoa/luống): 12/12
      nút đáp án nằm trọn viewport ngay khi vào màn (xem `qa-plan-minigames-dot1.md`)
- [x] 92/92 unit test PASS; `python tools/smoke_test.py` PASS; 0 console error, 0 404
- [ ] Build lại `public/` + `deploy/kid-math-render.zip`
- [ ] Upload file đổi lên GitHub repo `tammech2103-star/kid-math`
- [ ] Render → Manual Deploy → Deploy latest commit → verify live
- [ ] Đợt 2 (9 game chương 1–2 + ảnh HD), Đợt 3 (9 game chương 3–5 + ảnh HD)

## Quyết định quan trọng

1. **Giữ lõi học tập**: `Question`, `LessonSession`, tính sao, RNG, speech, audio,
   parent gate, localStorage không đổi. Minigame chỉ là lớp tương tác gọi `onAnswer`.
2. **Hợp đồng game**: `createGame({ctx, question, mount, onAnswer, reducedMotion})`
   → `{render, onCorrect, onWrong, celebrate, destroy}`. Registry trả `null` cho
   game chưa làm → bài đó dùng giao diện cũ, dự án luôn chạy được giữa các đợt.
3. **Bản quyền**: ghi tên game cảm hứng + art tự sinh; không copy sprite/logo/nhạc.
4. **Mảnh ghép**: 1 mảnh/bài, nhận tự động, **thua vẫn nhận**, chơi lại không tăng;
   cắt ảnh bằng CSS `background-position`, không sinh 21 file.
5. **OBS-01**: khi có minigame thì `.visual-slot` cũ không render; class `has-minigame`
   chỉ nén lớp trang trí. `.choices` được `position: sticky; bottom: 8px` giữ ở đáy
   màn cho đề nhiều hoa — **không đổi cấu trúc `.choices`/`.choice` hay logic lesson.js**.
6. Tiếp tục giữ: web tĩnh offline `file://`, không backend, không Node runtime,
   nút chạm ≥64px, bàn phím 1–9/R/Esc, `prefers-reduced-motion`.

## File chính (mới/có đổi trong Đợt 1)

- `design/quick-specs/minigame-nintendo-2026-11-22.md`
- `docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md`
- `docs/architecture/game-module-interface.md`
- `design/art/art-bible-hd.md`, `design/art/hd-prompts-dot1.md`
- `js/data/game-map.js`, `js/data/tuning.js` (mục `puzzle/game/hd`)
- `js/ui/games/{contract,registry,mario-bros,animal-crossing,mario-kart}.js`
- `js/domain/{puzzle,progress}.js`, `js/ui/puzzle.js`
- `js/ui/screens/{lesson,result,home,collection}.js`
- `css/{games,puzzle}.css`, `index.html`, `js/app.js`
- `Asset/hd/{intro,b5,b20}.webp`, `tools/generate_hd_backgrounds.py`
- `tests/unit/{puzzle,game-map}.test.js`, `tests/test-runner.html`, `tools/smoke_test.py`
- `production/qa/{qa-plan-minigames-dot1.md,smoke-report.md}`

## Kết quả kiểm thử hiện tại

| Hạng mục | Kết quả | Bằng chứng |
|----------|---------|------------|
| Unit test | **92/92 PASS** (69 cũ + 23 mới) | `tests/test-runner.html`, QuickJS |
| Smoke E2E | **PASS** | `python tools/smoke_test.py` |
| 21 registry entry / 3 factory / 18 fallback | PASS | `game-map.test.js`, smoke |
| Vòng đời mảnh (award → reload → collection → replay) | PASS | smoke, `27-collection-1-21.png` |
| B20 race HUD + bục 2 bậc + dải mảnh | PASS | smoke |
| 3 game × 4 viewport (không cần cuộn để thấy đáp án) | PASS | `intro` 763/760/716/744 · `b5` 886/943/754/830 · `b20` 704/717/638/686 |
| Ảnh HD | PASS | 1280×720, 23–27 KB (< 400 KB) |
| Offline `file://` | PASS | tự động trong smoke, 0 lỗi console |
| Live Render | **bản cũ** `245b283` | Đợt 1 chưa deploy |

## Câu hỏi mở

- Máy phụ huynh đã cài giọng tiếng Việt chưa? (game không đọc giọng sai ngôn ngữ)
- Có muốn thu âm lời khen giọng người thật thay TTS không?
- Đợt 2/3 có đổi thứ tự 18 game còn lại không, hay giữ nguyên bản đồ đã duyệt?

## Bước tiếp theo

1. [ ] Build + pack deploy, upload GitHub, Manual Deploy Render, verify live.
2. [ ] Trình ảnh chụp 3 minigame/collection cho người dùng duyệt trực quan.
3. [ ] Triển khai Đợt 2: 9 game chương 1–2 + 9 ảnh HD, chạy lại full gate + deploy.
4. [ ] Triển khai Đợt 3: 9 game chương 3–5 + 9 ảnh HD, playtest đủ 21/21 mảnh, freeze 1.0.
