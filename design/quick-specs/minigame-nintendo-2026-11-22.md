# Quick Design Spec: 21 Minigame + Bộ sưu tập McQueen

**Type**: Redesign của hệ thống chơi hiện có (`Bé Vui Học Toán 1`)
**Scope**: Web tĩnh, offline, classic HTML/CSS/JS. Giữ nguyên 21 bài, 11 dạng `Question`,
hợp đồng câu hỏi, tính sao, giọng đọc, âm thanh, parent gate, localStorage.
**Date**: 2026-11-22
**Status**: Approved — Đợt 1 đang triển khai

## Overview

Thay vì 21 bài dùng chung một màn chơi + đua xe, mỗi bài giờ là **một trò chơi nhỏ riêng**,
lấy cảm hứng từ các tựa game Nintendo nổi tiếng. Đồ họa HD sinh mới (nền + nhân vật +
hiệu ứng), nén WebP. Hoàn thành một bài → nhận **1 mảnh ghép** của `Asset/Mc_Queen.webp`
(lưới 7×3, 21 mảnh). Đủ 21 mảnh → bức ảnh McQueen hoàn chỉnh + màn chúc mừng.

Cuộc đua 1 đối 1 + bục trao thưởng hiện tại được **giữ lại làm trò chơi của Bài 20**
và làm **màn tổng kết chung** sau mọi trò chơi.

## Quyết định đã chốt với người dùng (2026-11-22)

1. **21 game riêng** — mỗi bài một cơ chế; không gom theo dạng bài.
2. **Tribute rõ tên** — UI ghi tên game cảm hứng (VD "Cảm hứng: Super Mario Bros.").
   **Ranh giới bản quyền**: chỉ mượn cơ chế + ghi tên; art HD do mình sinh, **không copy
   sprite / logo / nhạc gốc Nintendo**.
3. **Ảnh HD sinh mới** bằng AI cho nền + nhân vật mỗi game, lưu `Asset/hd/<lessonId>.webp`.
4. **21 mảnh (7×3)**, 1 mảnh/bài, nhận tự động, không kéo thả.
5. **Giữ đua + bục** làm game Bài 20 và màn kết quả chung.

## Bản đồ 21 minigame

| # | Màn | Game cảm hứng | Cơ chế chơi | Dạng `Question` |
|---|-----|---------------|-------------|-----------------|
| 1 | `intro` | Super Mario Bros. | Nhảy nhặt 1–5 đồng xu | `count` |
| 2 | `b1` | Super Mario Odyssey | Ném Cappy vào mặt số đúng | `count` |
| 3 | `b2` | Donkey Kong Country | Leo thang nhặt chuối 6–10 | `count` |
| 4 | `b3` | Pokémon | Bắt nhóm nhiều hơn / ít hơn / bằng | `compareGroups` |
| 5 | `b4` | The Legend of Zelda | Mở rương bằng dấu `> < =` | `compareSign` |
| 6 | `b5` | Animal Crossing | Trồng hoa vào 2 luống (tách – gộp) | `compose` |
| 7 | `b6` | Mario Party | Tung xí ngầu đi ô, 5 dạng trộn | mixed |
| 8 | `b7` | Dr. Mario | Xếp viên thuốc đúng hình | `shape2d` |
| 9 | `b8` | Super Mario Maker | Xếp khối thành tranh rồi đếm | `shape2d` |
| 10 | `b9` | Mario Paint | Tô màu theo mã hình / số | mixed |
| 11 | `b10` | Yoshi's Island | Yoshi nuốt trái vào giỏ | `add` |
| 12 | `b11` | Luigi's Mansion | Hút bóng bị trừ đi | `subtract` |
| 13 | `b12` | Brain Age | Tính nhẩm trên bảng | `factFamily` |
| 14 | `b13` | Mario & Luigi | Đội bạn tìm số thiếu | mixed add/sub |
| 15 | `b14` | Pikmin | Dẫn Pikmin kéo đúng khối | `solid3d` |
| 16 | `b15` | Kirby | Thổi mây theo `↑ ↓ ← →` | `position` |
| 17 | `b16` | WarioWare | Microgame nhanh 3 dạng | mixed geometry |
| 18 | `b17` | Super Smash Bros. | Đấm vào đáp án đúng | mixed number |
| 19 | `b18` | Fire Emblem | Đi quân cờ tới ô đáp án | mixed add/sub |
| 20 | `b19` | Splatoon | Bắn màu đúng hình | mixed shape |
| 21 | `b20` | Mario Kart 8 | Đua 1 đối 1 + bục trao thưởng | mixed 10 dạng |

## Kiến trúc

- `js/data/game-map.js`: ánh xạ `lessonId → { gameId, tribute, title, palette, bg, mechanic }`.
- `js/ui/games/registry.js`: registry `gameId → factory`. Mỗi game là **một module riêng**
  `js/ui/games/<gameId>.js`, triển khai hợp đồng tối thiểu:

  ```
  createGame({ ctx, question, mount, onAnswer, reducedMotion }) -> {
    render(question), onCorrect(result), onWrong(choice), celebrate(), destroy()
  }
  ```

- Game **không sở hữu state**: nó gọi `onAnswer(value)`; `LessonSession` vẫn là nguồn chân lý.
  Vì vậy 69 unit test hiện có vẫn đúng. `lesson.js` chỉ chọn game theo `lessonId` và
  gắn vào `visualSlot`/`choicesNode` thay vì tự render.
- `js/domain/puzzle.js` + `js/ui/puzzle.js` + `js/ui/screens/collection.js`:
  21 ô, lưu trong `progress.state.puzzle` (`{v, pieces: []}`), là một phần của storage key
  hiện tại để tương thích dữ liệu cũ. Cắt ảnh bằng CSS `background-size: 700% 300%` +
  `background-position` — không sinh 21 file ảnh.
- `result.js`: giữ bục trao thưởng, thêm dải "Nhận mảnh 07/21" với ảnh mảnh bay vào
  bộ sưu tập. Nút "Chơi lại" vẫn tuân `allowRetry`.

## Công thức & thông số

| Knob | Giá trị | Phạm vi | Ý nghĩa |
|------|---------|---------|---------|
| `puzzle.cols` | 7 | 3–7 | Số cột lưới mảnh ghép |
| `puzzle.rows` | 3 | 3–7 | Số dòng (cols × rows = 21) |
| `puzzle.revealMs` | 900 | 400–2000 | Thời gian mảnh bay vào bộ sưu tập |
| `game.introMs` | 1200 | 600–2500 | Thời gian giới thiệu tên game cảm hứng |
| `hd.maxBytes` | 400000 | 100k–800k | Ngân sách mỗi ảnh nền WebP |

Mọi giá trị nằm trong `js/data/tuning.js` (mục `puzzle`, `game`, `hd`).

## Edge cases

- **Storage cũ không có `puzzle`**: normalize về `pieces: []`; không mất sao/cài đặt.
- **Chơi lại bài đã có mảnh**: mảnh đã sáng thì không cộng lại, vẫn hiện hiệu ứng.
- **Bài thua (hạng hai)**: vẫn nhận mảnh — mảnh thưởng theo hoàn thành, không theo hạng.
- ** Thiếu ảnh HD**: fallback sang nền CSS + emoji; game vẫn chơi được, không lỗi console.
- **Reduced motion**: bỏ qua intro/celebration, chỉ giữ phản hồi màu + text.
- **Bàn phím**: 1–9 chọn đáp án, R nghe lại, Esc về nhà — giữ nguyên ở mọi game.

## Acceptance criteria (kiểm được bằng test)

- **AC-1**: 21 entry trong `game-map.js`, mỗi entry có `tribute` và `gameId` duy nhất.
- **AC-2**: Với mọi `lessonId`, `registry.get(gameId)` trả factory hợp lệ; không có game nào
  rơi về fallback trừ Bài 20 (dùng race có sẵn).
- **AC-3**: Chơi xong một bài → `puzzle.pieces` chứa đúng index của bài đó; tải lại trang
  vẫn giữ; chơi lại không tăng số mảnh.
- **AC-4**: Đủ 21 mảnh → collection hiện ảnh full + cờ `is-complete`.
- **AC-5**: Màn kết quả sau mọi game vẫn có bục 2 bậc + dải mảnh mới.
- **AC-6**: 69 unit test cũ PASS + test mới cho `puzzle.js` PASS.
- **AC-7**: Smoke desktop/tablet/mobile: 21 màn vào được, 0 console error, 0 404.
- **AC-8**: Ảnh HD ≤ `hd.maxBytes`, `Asset/hd/` có đúng 21 file sau Đợt 3.

## Phases

- **Đợt 1** (đang làm): nền tảng registry + puzzle + 3 game mẫu
  (`mario-bros`, `animal-crossing`, `mario-kart`) + 3 ảnh HD → test, deploy.
- **Đợt 2**: 9 game còn lại của chương 1–2 + ảnh HD.
- **Đợt 3**: 9 game chương 3–5 + ảnh HD → hoàn thiện, freeze 1.0.

## Dependencies

- Phụ thuộc: `Questions`, `LessonSession`, `Progress`, `Race`, `RaceUI`, `Components`,
  `Speech`, `Audio`, `Curriculum` (đều có sẵn).
- Bị phụ thuộc bởi: `lesson.js`, `result.js`, `home.js`, `parent.js` (reset puzzle),
  `build_public.py`, `smoke_test.py`.
- ADR liên quan: `ADR-0001-static-offline-web-game.md`, `ADR-0002-minigame-registry-and-puzzle-rewards.md`.

## Deviations

- Đây là redesign lớn nên `quick-spec` được dùng thay GDD đầy đủ (dự án nhỏ, 1 sản phẩm).
- "Tribute rõ tên" được hiểu là ghi tên + tạo art riêng, không tái sử dụng tài sản Nintendo.
- 21 game được chia đợt; giữa các đợt game chưa làm tạm dùng màn chơi cũ để dự án luôn chạy được.
