# Kế hoạch QA — Đợt 1: 21 minigame + mảnh ghép McQueen

- **Ngày**: 2026-11-22
- **Người lập**: QA Lead
- **Căn cứ**: `design/quick-specs/minigame-nintendo-2026-11-22.md` (AC-1…AC-8),
  `docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md`
- **Phạm vi Đợt 1**: registry + puzzle + 3 game mẫu (`mario-bros`, `animal-crossing`,
  `mario-kart`) + 3 ảnh HD; 18 bài còn lại dùng màn chơi cũ (fallback).
- **Kết quả chạy** (lần cuối sau khi sửa OBS-01): unit **92 PASSED / 0 FAILED**
  (69 cũ + 23 mới), smoke **PASS**, 0 console error thật, 0 tài nguyên 404
  (đã sửa favicon của trang test).

## 1. Phân loại story & mức gate

| Story | Loại | Evidence bắt buộc | Gate | Trạng thái |
|---|---|---|---|---|
| Puzzle normalize/award/styleFor | Logic | `tests/unit/puzzle.test.js` | BLOCKING | PASS (13 test) |
| GameMap/registry/contract | Logic | `tests/unit/game-map.test.js` | BLOCKING | PASS (10 test) |
| Trao mảnh → result → storage → reload → collection | Integration | Smoke `tools/smoke_test.py` | BLOCKING | PASS |
| Mount `.game-stage` + nhãn cảm hứng + fallback 18 bài | Integration | Smoke | BLOCKING | PASS |
| b20 giữ race HUD + bục trao thưởng | Integration | Smoke | BLOCKING | PASS |
| 3 ảnh HD + nền load thật | Visual | Screenshot + smoke `naturalWidth` | ADVISORY | PASS |
| Nút đáp án/nút kết quả trên 4 viewport | UI | Smoke geometry (thấy ngay, không cần cuộn) | BLOCKING | PASS (OBS-01 đã sửa) |
| 21 entry/gameId/tribute/phase | Config/Data | Smoke + unit | ADVISORY | PASS |

## 2. Test case

| ID | Kiểm tra | AC | Cách chạy | Kết quả |
|---|---|---|---|---|
| TC-01 | State cũ thiếu `puzzle` vẫn giữ sao/cài đặt | AC-6 | unit `puzzle.test.js` | PASS |
| TC-02 | `award()` idempotent; 21 bài → 21 mảnh; index theo curriculum | AC-3 | unit | PASS |
| TC-03 | `styleFor()` = `700% 300%`, đúng 4 góc lưới | AC-4 | unit | PASS |
| TC-04 | Trao mảnh khi thua (1 sao) vẫn tăng số mảnh | AC-3/5 | unit + smoke result loss | PASS |
| TC-05 | `resetProgress` xoá mảnh, giữ cài đặt; `resetAll` xoá cả | ADR-0002 | unit | PASS |
| TC-06 | 21 entry, gameId/tribute unique, phase đúng (intro/b5/b20 = 1) | AC-1 | unit `game-map.test.js` | PASS |
| TC-07 | `forLesson()` khớp curriculum; `registry.get(id lạ)` = null | AC-1/2 | unit | PASS |
| TC-08 | `GameContract.assert` chặn instance thiếu 5 method | ADR-0002 | unit | PASS |
| TC-09 | intro: `.game-stage[data-game-id="mario-bros"]` + nhãn "Cảm hứng: Super Mario Bros." + nền `intro.webp` load | AC-2/7 | smoke | PASS |
| TC-10 | b5 (animal-crossing), b20 (mario-kart) tương tự; b20 có `.race-hud` | AC-2/7 | smoke | PASS |
| TC-11 | Kết thúc intro: `.result-puzzle-strip`, storage `puzzle.pieces=[0]` | AC-3/5 | smoke | PASS |
| TC-12 | Reload vẫn giữ; collection 1 ô sáng + 20 khoá + "1/21" | AC-3/4 | smoke + `27-collection-1-21.png` | PASS |
| TC-13 | Chơi lại intro: số mảnh vẫn `[0]` | AC-3 | smoke (context riêng) | PASS |
| TC-14 | 3 màn fallback (b1, b3, b7…) chơi bằng giao diện cũ, không game-stage, không lỗi console | ADR-0002 §3 | smoke (b1 chơi trọn bài) | PASS |
| TC-15 | b20 result vẫn có bục 2 bậc + dải mảnh | AC-5 | smoke | PASS |
| TC-16 | Desktop 1280×900, tablet 768×1024/1024×768, mobile 390×844: nút đáp án cuối **nằm trọn viewport ngay khi vào màn** (không cần cuộn), nút kết quả nằm trọn viewport, không tràn ngang | AC-7 | smoke geometry | PASS |
| TC-17 | 3 file `Asset/hd/*.webp` ≤ 400000 bytes | AC-8 | smoke (stat) | PASS (23–28 KB) |
| TC-18 | 69 unit test cũ + smoke cũ (race, podium, loss, retry toggle, keyboard, file://) không bị hồi quy | AC-6 | smoke | PASS |

## 3. Smoke scope

- Giữ nguyên toàn bộ check cũ (splash, 21 bài, race 1-đối-1, thắng/thua, bục,
  retry toggle, phụ huynh, giảm chuyển động, `file://`).
- Thêm: asset size; 3 màn phase-1 (stage/tribute/background/console); fallback;
  vòng đời mảnh (result → storage → reload → collection → replay); b20 result;
  4 viewport; chạy `tests/test-runner.html` và assert 92 test PASS.
- Lệnh: `python -m http.server 8765 --bind 127.0.0.1` → `python tools/smoke_test.py`.
- Unit nhanh (QuickJS, pattern `C:\Users\2103\AppData\Local\Temp\opencode\run_js_tests.py`):
  nạp thêm `puzzle.js`, `game-map.js`, `contract.js`, `registry.js`, 3 file game.

## 4. Rủi ro / quan sát / bug

**OBS-01 (S3, UI — ĐÃ SỬA, đã chạy lại gate)** — Nút đáp án cuối của bài có minigame
từng nằm **dưới fold** khi vào màn (phải cuộn 67–151 px):

Số liệu dưới đây là **đề xấu nhất** (`b5`: 3 và 7 → 7 hoa/luống, seed `probe-b5-2`),
không phải đề 3 hoa như lần đo đầu:

| Viewport | `intro` | `b5` (đề xấu nhất) | `b20` | Trước sửa |
|---|---|---|---|---|
| 1280×900 | 763 / 900 | **886 / 900** | 704 / 900 | 1025 / 900 |
| 768×1024 | 760 / 1024 | **943 / 1024** | 717 / 1024 | 1175 / 1024 |
| 1024×768 | 716 / 768 | **754 / 768** | 638 / 768 | 873 / 768 |
| 390×844 | 744 / 844 | **830 / 844** | 686 / 844 | 911–953 / 844 |

- Nguyên nhân thật: `lesson.js` vẫn render hình minh hoạ cũ vào `.visual-slot`
  (~180px) **cạnh** `.game-stage` mới → hai bản hình chồng chức năng. Cộng thêm
  stage `min-height: clamp(168px,25vh,260px)` và khoảng cách của `.screen`/`.question-card`.
  Sau khi sửa, còn một lớp nữa: đề compose sinh **tối đa 9 hoa/luống** → trên mobile
  (2 cột, ~148px/luống) mỗi hàng chỉ chứa 1 hoa 64px → luống cao tới 670px.
- Fix (không đụng `.choices`/`.choice`, không đổi logic `LessonSession`):
  1. `lesson.js`: khi đã có factory game thì **không render visual cũ**; dời nhãn
     cảm hứng vào trong `mount` (absolute) và thêm class `has-minigame` lên `.screen`.
  2. `css/games.css`: chỉ với `.has-minigame` — nén stage/scene, ẩn `.equation-slot`,
     siết khoảng cách `.screen`/`.question-card`, giảm HUD đua trên mobile, **xếp luống
     hoa thành 1 cột trên mobile** và nới luống ở tablet-ngang (vẫn giữ hoa 64px).
     Cuối cùng, `.choices` được `position: sticky; bottom: 8px` làm lưới an toàn:
     bé luôn thấy nút bấm dù đề sinh nhiều hoa nhất.
  3. `tools/smoke_test.py`: nâng OBS-01 thành **check chặn** — `initial.bottom`
     phải ≤ viewport ngay khi vào màn; `.visual` không được render khi có minigame.
     Gate nay lặp **3 game × 4 viewport** với seed đề xấu nhất cho `b5`.
- Kết quả: 12/12 tổ hợp nằm trọn viewport; 92/92 unit test vẫn PASS,
  race/podium/loss/retry/file:// không hồi quy. `scrollHeight` có thể lớn hơn viewport
  ở `b5` do luống hoa cao — nhưng hàng đáp án dính đáy nên vẫn thấy và bấm được.

**OBS-02 (S4 — đã xử lý trong phạm vi QA)** — `tests/test-runner.html` thiếu favicon
nên phát 404 console. Đã thêm data-URI favicon trong chính file test (không đụng production).

**R-01** — AC-2 mới chỉ đạt 3/21 factory (Đợt 1); 18 bài fallback đúng thiết kế.
Cần chạy lại full gate ở Đợt 2/3.
**R-02** — AC-4 ở mức user-flow đủ 21 mảnh chưa thể đi bằng gameplay thật trong Đợt 1;
đã phủ bằng unit (award 21 bài) + smoke 1 mảnh. Cần playtest 21/21 ở Đợt 3.
**R-03** — AC-8 mới có 3/21 ảnh HD; kiểm tra ngân sách 400 KB sẽ chạy lại mỗi đợt.
**R-04** — Tribute ghi tên Nintendo đã đúng quick-spec; vẫn cần rà soát pháp lý khi
phân phối thương mại (ADR-0002 §Consequences).

## 5. Gate verdict

**PASS cho Đợt 1** (BLOCKING gates đều xanh, kể cả OBS-01 sau khi sửa). Sẵn sàng
build `public/` và deploy; AC-2/4/8 chỉ đạt một phần do thiết kế chia đợt (xem R-01…R-03).
