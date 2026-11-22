# Giao diện module game (ADR-0002)

Tài liệu này là hợp đồng kỹ thuật giữa màn học (`js/ui/screens/lesson.js`) và 21
minigame. Mọi module game phải tuân thủ đúng hình dạng dưới đây; `lesson.js` là
điểm tích hợp duy nhất.

## Nguyên tắc

1. Game **không sở hữu state** học tập. `LessonSession` vẫn là nguồn chân lý;
   game chỉ gọi `onAnswer(value)` khi bé chọn đáp án.
2. Game **không đọc/ghi** `ctx.progress`, storage, sao, race hay điều hướng.
   Mọi thay đổi đi qua `ctx` do `lesson.js` cung cấp.
3. Không hardcode số gameplay (số câu, thời gian, ngưỡng, số mảnh…). Đọc từ
   `ctx.tuning` (`js/data/tuning.js`). Màu riêng của game nằm trong
   `js/data/game-map.js`.
4. Chỉ mượn cơ chế + ghi tên cảm hứng. **Không copy sprite/logo/nhạc Nintendo**;
   art HD do dự án sinh, đặt tại `Asset/hd/<lessonId>.webp`.
5. `destroy()` phải dọn hết timer/listener do game tạo để không rò rỉ khi chuyển màn.

## Hợp đồng `createGame`

```js
createGame({
  ctx,            // object: app context (tuning, audio, speech, gameMap, games, ...)
  question,       // object: câu hỏi hiện tại, theo hợp đồng KM.Questions
  mount,          // HTMLElement: div.game-stage do lesson.js chèn trước .choices
  onAnswer,       // function(value): gọi đúng 1 lần khi bé chọn; value = choice.value
  reducedMotion   // boolean: window.matchMedia('(prefers-reduced-motion: reduce)')
}) -> {
  render(question),     // bắt buộc: dựng lại nội dung cho mỗi câu mới
  onCorrect(result),    // bắt buộc: phản hắng sau khi session.answer() trả đúng
  onWrong(choice),      // bắt buộc: phản hồi ngay khi trả sai (bé được thử lại)
  celebrate(),          // bắt buộc: hiệu ứng chúc mừng; bỏ qua nếu reducedMotion
  destroy()             // bắt buộc: dọn timer/listener DOM
}
```

`KM.GameContract.assert()` kiểm tra 5 phương thức trên instance. Khi đăng ký,
registry gọi `assert(factory)` — factory là hàm thì chỉ kiểm tra nó gọi được;
`lesson.js` gọi `assert(instance)` ngay sau `createGame`.

### Gọi `onAnswer`

```js
onAnswer(choice.value); // KHÔNG sửa session/progress, KHÔNG tự chuyển câu
```

`lesson.js` đối chiếu `value` với `question.choices`, rồi chạy đúng nhánh xử lý
cũ (`session.answer`, race, sao, âm thanh, giọng đọc). Vì vậy 69 unit test cũ
vẫn có giá trị.

### `mount` và palette

`mount` là `<div class="game-stage" data-game-id="...">` với nền HD từ
`game-map.js` (`background-image/size/position/repeat`). Trước `mount` là nhãn
`<p class="game-tribute">🎮 Cảm hứng: ...</p>` (nhỏ, không đẩy nút đáp án).
Bảng màu của entry được truyền qua CSS custom property trên `mount`, game có thể
đọc trực tiếp mà không cần đối số mới:

```css
var(--game-sky)    /* nền chính */
var(--game-accent) /* màu nhấn */
var(--game-ink)    /* màu chữ/viền */
```

Game không được xoá các class `game-stage`/`game-tribute`; có thể thoải mái thêm
con vào `mount`. Khi `reducedMotion === true`, bỏ qua intro/celebration/chuyển
động, chỉ giữ phản hồi màu + text.

## Đăng ký

Mỗi file `js/ui/games/<gameId>.js` tự đăng ký factory của mình:

```js
window.KM = window.KM || {};
KM.GameRegistry.register({ 'mario-bros': createGame });
// hoặc: KM.GameRegistry.register('mario-bros', createGame);
```

`KM.GameRegistry.get(gameId)` trả factory hoặc `null` (không ném lỗi) cho id
chưa làm. `KM.GameRegistry.has(gameId)` trả boolean. `KM.GameMap.forLesson(id)`
trả entry (có `gameId`) hoặc `null`; `KM.GameMap.phaseOf(id)` trả `1|2|3|null`.

### Thứ tự tải script (bắt buộc)

`index.html` (do agent khác sở hữu) cần tải theo thứ tự:

1. `js/data/tuning.js`, `js/data/curriculum.js`
2. `js/data/game-map.js`
3. `js/ui/games/contract.js`, `js/ui/games/registry.js`
4. các file `js/ui/games/<gameId>.js` (tự register)
5. `js/app.js`

`lesson.js` tra cứu registry lúc chạy (không lúc tải), nên thứ tự giữa
`lesson.js` và các file game không quan trọng, miễn là app khởi động sau khi
chúng đã đăng ký. `tests/test-runner.html` cần các script 1–4 nếu thêm test cho
`game-map.js`/registry.

## Vòng đời trong `lesson.js`

| Thời điểm | Hành động |
|-----------|-----------|
| Vào màn | `GameMap.forLesson(lesson.id)` → `GameRegistry.get(gameId)`; nếu có factory thì chèn nhãn + `mount`, gọi `createGame(...)` |
| Mỗi câu mới (sau `renderChoices`) | `game.render(question)` |
| Trả sai | `game.onWrong(choice)` ngay tại nhánh sai, rồi giữ nguyên race/audio/speech cũ |
| Trả đúng | `game.onCorrect(result)` ngay tại nhánh đúng, `game.celebrate()` sau confetti; race/sao/âm thanh giữ nguyên |
| Rời màn | `game.destroy()` trong `destroy()` của screen |
| Không có factory | Không chèn DOM, không gọi game — màn chơi cũ chạy y hệt (ADR-0002 quyết định fallback) |

Lỗi khởi tạo hoặc lỗi phương thức của game được `lesson.js` bắt và log
`console.error('[KM] ...')`; màn học vẫn tiếp tục ở chế độ fallback an toàn.

## Bản đồ gameId

| # | lessonId | gameId | Tribute | Đợt |
|---|----------|--------|---------|-----|
| 1 | `intro` | `mario-bros` | Super Mario Bros. | 1 |
| 2 | `b1` | `mario-odyssey` | Super Mario Odyssey | 2 |
| 3 | `b2` | `donkey-kong-country` | Donkey Kong Country | 2 |
| 4 | `b3` | `pokemon` | Pokémon | 2 |
| 5 | `b4` | `zelda` | The Legend of Zelda | 2 |
| 6 | `b5` | `animal-crossing` | Animal Crossing | 1 |
| 7 | `b6` | `mario-party` | Mario Party | 2 |
| 8 | `b7` | `dr-mario` | Dr. Mario | 2 |
| 9 | `b8` | `mario-maker` | Super Mario Maker | 2 |
| 10 | `b9` | `mario-paint` | Mario Paint | 2 |
| 11 | `b10` | `yoshi-island` | Yoshi's Island | 3 |
| 12 | `b11` | `luigis-mansion` | Luigi's Mansion | 3 |
| 13 | `b12` | `brain-age` | Brain Age | 3 |
| 14 | `b13` | `mario-and-luigi` | Mario & Luigi | 3 |
| 15 | `b14` | `pikmin` | Pikmin | 3 |
| 16 | `b15` | `kirby` | Kirby | 3 |
| 17 | `b16` | `warioware` | WarioWare | 3 |
| 18 | `b17` | `super-smash-bros` | Super Smash Bros. | 3 |
| 19 | `b18` | `fire-emblem` | Fire Emblem | 3 |
| 20 | `b19` | `splatoon` | Splatoon | 3 |
| 21 | `b20` | `mario-kart` | Mario Kart 8 | 1 |

## Quyết định ghi chú

- Quick spec ghi "Đợt 2: 9 game chương 1–2" và "Đợt 3: 9 game chương 3–5",
  nhưng 3 game mẫu đã nằm rải ở chương 1 (`intro`, `b5`) và chương 5 (`b20`).
  `phase` trong `game-map.js` được gán theo chương: chương 1–2 còn lại = 2,
  chương 3–5 còn lại = 3 → 3/8/10 entry. Không có entry nào thiếu phase.
- `ctx.puzzle` được expose dưới dạng `KM.Puzzle || null` để project chạy được
  trước khi module puzzle được tải; consumer phải guard.
- `KMApp.screens` và `KMApp.current().debugState()` không đổi — smoke test dùng.
