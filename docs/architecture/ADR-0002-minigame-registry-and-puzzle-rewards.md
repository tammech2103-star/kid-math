# ADR-0002: Game registry cho 21 minigame + thưởng mảnh ghép McQueen

- **Status**: Accepted
- **Date**: 2026-11-22
- **Deciders**: Game Studio Director (theo quyết định người dùng 2026-11-22)
- **Related**: ADR-0001 (static offline web game), quick spec `minigame-nintendo-2026-11-22.md`

## Context

Bản hiện tại có 21 bài nhưng chỉ một màn chơi + đua xe. Người dùng yêu cầu mỗi bài là
một trò chơi riêng (21 cơ chế), cảm hứng Nintendo, art HD, và thưởng mảnh ghép McQueen.
Đây là thay đổi lớn trên một dự án đã ổn định (69 unit test PASS, đã Live). Rủi ro chính:
làm hỏng phần học tập/sao/giọng đọc đã chạy tốt, và xung đột file khi nhiều game cùng
được implement.

## Decision

1. **Giữ nguyên lõi**: `Questions`, `LessonSession`, `Progress`, `Race`, `RaceUI`, Speech,
   Audio, parent gate. Mỗi minigame **chỉ là lớp trình bày/tương tác** gọi `onAnswer(value)`.
2. **Registry + một file mỗi game**: `js/data/game-map.js` (cấu hình) và
   `js/ui/games/registry.js` (ánh xạ id → factory). Mỗi game ở `js/ui/games/<gameId>.js`
   triển khai hợp đồng: `createGame({ ctx, question, mount, onAnswer, reducedMotion })`
   trả `{ render, onCorrect, onWrong, celebrate, destroy }`.
3. **Game chưa làm thì fallback**: nếu registry không có factory cho `gameId`, `lesson.js`
   dùng màn chơi hiện tại. Nhờ đó dự án luôn chạy được giữa các đợt.
4. **Puzzle là state của progress**: mở rộng state với `puzzle: { v, pieces: [] }` trong
   cùng storage key `kidmath.v1`. 21 mảnh, lưới 7×3, cắt ảnh bằng CSS `background-position`,
   không sinh file ảnh mới cho mỗi mảnh.
5. **Kết quả chung**: bục trao thưởng giữ nguyên; thêm dải trao mảnh. Cuộc đua hiện tại
   trở thành game của Bài 20.
6. **Ranh giới bản quyền**: ghi tên game cảm hứng trong UI, art HD do mình sinh. Không copy
   sprite/logo/nhạc Nintendo.

## Alternatives considered

| Phương án | Lý do không chọn |
|-----------|------------------|
| 11 game theo dạng bài | Người dùng chọn 21 game riêng, không gom. |
| Viết lại toàn bộ `lesson.js` cho từng game | Phá vỡ 69 test và hợp đồng `Question`; rủi ro cao. |
| Lưu puzzle vào storage key riêng | Dễ lệch đồng bộ với reset/resetAll của progress. |
| Sinh 21 file ảnh mảnh | Tăng dung lượng; CSS cắt ảnh đủ và sắc mọi DPI. |

## Consequences

**Tích cực**
- Lõi học tập không đổi → test cũ vẫn có giá trị; mỗi game có thể làm/test độc lập.
- Nhiều game có thể triển khai song song vì mỗi game nằm ở file riêng.
- Giữa các đợt luôn có bản chạy được nhờ fallback.

**Tiêu cực / chi phí**
- Tăng số file và bề mặt test; cần smoke chạy lại sau mỗi đợt.
- 21 ảnh HD làm tăng dung lượng tải (giới hạn mỗi ảnh ≤ 400 KB).
- Tribute bằng tên vẫn cần cân nhắc pháp lý khi phân phối thương mại; chỉ ghi tên cảm hứng,
  không dùng tài sản thương hiệu.

## Implementation notes

- Không hardcode thông số puzzle/game/HD trong module — đưa vào `js/data/tuning.js`.
- `normalize()` trong `progress.js` phải chấp nhận state cũ (`v:1`, thiếu `puzzle`).
- `resetProgress()` xoá mảnh; `resetAll()` xoá cả cài đặt (đúng hành vi hiện tại).
- Game module không được đọc/ghi `progress` trực tiếp; mọi thay đổi đi qua `ctx`.
- Mỗi game phải có `destroy()` dọn timer/listener để không rò rỉ khi chuyển màn.
- Test: `tests/unit/puzzle.test.js`, `tests/unit/game-map.test.js`; smoke mở rộng 21 game.
