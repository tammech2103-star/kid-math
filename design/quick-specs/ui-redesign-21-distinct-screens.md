# Quick Spec thay thế — 21 giao diện riêng, không đua xe, không hàng đáp án chung

- **Trạng thái**: Spec chốt để triển khai (2026-11-22). Chỉ thiết kế; không sửa JS/CSS/asset trong tài liệu này.
- **File bị thay thế**: `design/quick-specs/all-21-distinct-games.md` — **SUPERSEDED** bởi file này. File cũ được giữ lại để truy vết lịch sử nhưng **không được dùng làm nguồn triển khai**. Mọi nội dung của file cũ về đua xe/bục, 8 archetype `stage--*`, hàng đáp án `.choices`/`.choice` và callback `onAnswer` đều bị bãi bỏ.
- **Phạm vi**: 21 `lessonId`, giữ nguyên 21 `gameId` và thứ tự theo `js/data/game-map.js`. Mỗi bài là một module UI độc lập, tự chứa toàn bộ điều khiển trả lời.
- **Ranh giới nền tảng**: web tĩnh `file://`, ES5-ish `KM.*`, trẻ 6 tuổi, tiếng Việt, nút chạm ≥64 px, phím 1–9/R/Esc, `prefers-reduced-motion`, `localStorage kidmath.v1`, TTS giọng Việt.
- **Nguồn chân lý toán học (không đổi)**: `js/data/curriculum.js`, `js/data/questions.js`, `js/domain/lesson-session.js`, `js/data/tuning.js`, `js/core/speech.js`, `js/domain/progress.js`.
- **Asset**: sinh lúc authoring bằng 5 skill `pxl`, `vex`, `kiln`, `loom`, `chirp`; thành phẩm được nung vào web tĩnh. Không có runtime tool trên máy người chơi.

---

## Overview

Spec này thay thế toàn bộ cách tổ chức 21 màn chơi của `all-21-distinct-games.md`. Lý do thay thế có bốn điểm, tất cả đều là quyết định đã chốt:

1. **Bỏ hoàn toàn đua xe và bục trao thưởng.** `KM.Race`, `KM.RaceUI`, `ctx.race`, `ctx.racers`, mọi class CSS `.race-*`, `.kart-*`, `.game-stage--kart`, `.is-kart-themed`, mọi bục/podium ở màn result bị xoá. Bài 21 (`b20`, `gameId: 'mario-kart'` — giữ nguyên slug) không còn xe, đối thủ, cờ đích kiểu đua hay HUD chặng; `kartBoostMs` bị loại khỏi tuning.
2. **Bỏ hàng đáp án dùng chung.** `lesson.js` không còn render `.choices`/`.choice` và không còn `onGameAnswer` gọi trực tiếp `session.answer(value)`. Mỗi game tự render đúng `question.choices` của mình, trong chính `options.mount`.
3. **Bỏ kiến trúc dùng chung cũ.** Không dùng `KM.GameMap` trong module, không dùng `KM.GameRegistry`, không dùng `onAnswer` callback, không dùng archetype `stage--rail|arena|book|split|board|bench|tray|track`, không dùng `data-variant`.壳 (`lesson.js`) chỉ đọc `game-map.js` như dữ liệu tĩnh để lấy `gameId`, tiêu đề, palette, nền; module không gọi API của `GameMap`.
4. **Đổi kênh trả lời.** Module chỉ phát `CustomEvent('km:answer', { bubbles:true, detail:{ value } })` trên `options.mount`. Shell nghe event này và gọi `session.answer(value)`. Module không bao giờ gọi `session.answer`, không sửa `question`, sao, `progress`, `localStorage` hay điều hướng.

Mục tiêu toán của 21 bài vẫn lấy nguyên từ `js/data/curriculum.js` và được sinh bởi `js/data/questions.js` với đúng 11 dạng hoạt động: `count`, `compareGroups`, `compareSign`, `compose`, `add`, `subtract`, `factFamily`, `sequence`, `shape2d`, `solid3d`, `position`. Không bịa đề, không tự sinh số trong module. Số câu: `intro` = 5, `b20` = 10, các bài còn lại = `tuning.questionsPerLesson` = 8 (trừ khi `lesson.count` ghi đè).

Bài 21 được thay bằng giao diện **"Xếp đường tới trường"**: bé xếp từng ô đường/bridge đúng đáp án để nối con đường từ nhà tới trường. Ôn đủ 11 dạng. Không có xe, không đối thủ, không bục, không HUD chặng đua.

---

## Player Fantasy

Aesthetics mục tiêu theo MDA: **Challenge + Sensation + Discovery**, với **Expression** ở mức nhẹ (bé tự xếp/con đường/cành hoa của mình). Dynamics mong đợi: bé quan sát đồ vật toán học, thực hiện một động tác cơ thể rõ ràng (nhặt, ném, leo, quây, mở, trồng, tung, thả, xếp, vuốt, nuốt, hút, viết, đẩy, kéo, thổi, chớp, đấm, đi, bắn, xếp đường), rồi chọn đáp án ngay trong cảnh đó. Shell không còn "hàng nút" tách rời khỏi thế giới của bài.

Self-Determination Theory:

- **Competence**: mỗi động tác có micro-feedback ≤0.5 s (đồ vật đổi trạng thái + `audio.tap()`); đúng/sai có màu + icon + chữ, không chỉ màu. Bé luôn biết mình vừa làm gì.
- **Autonomy**: 21 bố cục và động tác khác nhau thật sự; bé có thể thử lại vô hạn sau một câu sai, không bị trừ sao do lỗi thao tác. Câu sai chỉ do `session.answer` xử lý; module reset cảnh về trạng thái đầu câu.
- **Relatedness**: 21 nhân vật gốc và ngữ cảnh thân thiện (vườn hoa, bàn cờ, đường tới trường…) tạo gắn kết; tribute chỉ là dòng chữ `Cảm hứng: <tên>` do DOM tạo, không đưa tên franchise vào prompt/ảnh.

Flow: độ khó tăng theo sawtooth qua chương; mỗi màn 8–10 câu là một meso-loop có điểm dừng tự nhiên; `introMs` là scaffold trước câu đầu; timeout mềm ở bài 17 (`windowMs`) không được phạt trẻ chậm.

---

## Detailed Rules

### Hợp đồng module mới (bắt buộc, áp dụng cho cả 21 bài)

```js
window.KM = window.KM || {};
KM.Games = KM.Games || {};
KM.Games[gameId] = function createGame(options) { /* ... */ return instance; };
// options = { mount, question, reducedMotion, audio }
// instance = { render?, onCorrect?, onWrong?, celebrate?, destroy?, handleKey? }
```

| Luật | Nội dung không được vi phạm |
|---|---|
| M1 | Factory được truy cập trực tiếp tại `KM.Games.<gameId>` (đúng 21 slug từ `game-map.js`). Không đăng ký qua `KM.GameRegistry`; module không gọi `KM.GameMap`, `KM.GameRegistry`, `KM.Questions`, `KM.LessonSession`, `KM.Curriculum` hay `KM.Screens`. |
| M2 | Đầu ra logic **duy nhất** là một `CustomEvent` tên `km:answer`, `bubbles: true`, `detail: { value }`, dispatch trên chính `options.mount`. Không dispatch custom event khác, không gọi callback, không gọi `session.answer`. `audio` chỉ được dùng như hiệu ứng đi qua (`tap/correct/wrong/celebrate`), không phải kênh trả lời. |
| M3 | Mọi control trả lời nằm trong `mount`. Shell không tạo `.choices`/`.choice`. Mỗi module render đúng `q.choices.length` (3 hoặc 4) answer hotspot, nhãn lấy từ `choice.label/shape/glyph/icon/aria`, không tự bịa số. |
| M4 | `submit(q, v)` gọi `find(q, v)` trước. Nếu `find === null` → **0 event**, hiện gợi ý `aria-live="polite"` trong ≤0.5 s, không phạt, cho thử lại. Nếu có → dispatch đúng **1 lần** với `detail.value = found.value`, rồi khoá thao tác trong câu hiện tại. |
| M5 | `render(q)` được shell gọi mỗi câu. Module reset state cục bộ, xoá marker/hero tạm, cập nhật nhãn từ `q.text`/`q.say`; không giữ đáp án câu trước. `onWrong(choice)` reset cảnh về trạng thái đầu câu; `onCorrect(result)` + `celebrate()` chỉ đổi class/nội dung của chính module. |
| M6 | `handleKey(key)` là tuỳ chọn. Shell tự xử lý `R` (đọc lại `q.say`) và `Esc` (về nhà); với phím `1`–`9` shell gọi `game.handleKey(key)`, nếu trả `true` thì coi là đã tiêu thụ. Digit `n`映射到 answer hotspot thứ `n` theo thứ tự `q.choices`. Không có hotspot thứ `n` → trả `false`, không dispatch. |
| M7 | `destroy()` xoá mọi node/timer/listener do module tạo, bỏ class do module thêm, không đụng node của shell. Sau `destroy()`, dispatch từ module cũ không gây event mới. |
| M8 | `reducedMotion === true`: bỏ quỹ đạo/xoáy/carousel xoay/confetti, giữ trạng thái tĩnh + đổi màu + ✓/~ + chữ "Đúng"/"Thử lại". Không dùng chuyển động làm tín hiệu duy nhất. |
| M9 | Root DOM của mỗi module là `.kmg-<gameId>` duy nhất bên trong `mount`. **Không** sinh class `stage--*`, `data-variant`, `.race-*`, `.kart-*`, `.podium*`. Palette/nền do shell đặt trên `mount`; module chỉ đọc thuộc tính CSS custom property nếu cần. |
| M10 | Mọi số gameplay đọc từ `KM.Tuning.game.*` (xem mục Tuning Knobs). Không literal số gameplay trong logic module; 64 px/gap 8 px là ngưỡng accessibility của art bible, không phải knob. |

### Bảng 21 giao diện (mỗi dòng là một module độc lập)

`skill asset` là skill authoring tạo tài nguyên cho riêng giao diện đó; thành phẩm được nung thành PNG/WebP/SVG/OGG đóng gói cùng web tĩnh.

| # | lessonId | gameId | mục tiêu toán | tên giao diện riêng | động tác chính | skill asset | 2 edge case (kết quả cụ thể) | 1 AC Given–When–Then |
|---|---|---|---|---|---|---|---|---|
| 1 | `intro` | `mario-bros` | `count` 1–5 quả FRUIT; 5 câu | `Hàng xu một chiều`: dải ngang, xu rời rạc, 3 ô số nằm ngay cuối dải | **nhặt** từng xu rồi bấm ô số | `pxl` (xu 8-bit), `vex` (ô số), `chirp` (tiếng xu) | E1 `answer=0` → vùng xu trống; bấm ô "0" → đúng 1 event value `0`. E2 chạm xu #2 ba lần → `collected=1`; bấm "3" → **0 event** + hint "Bé đếm lại nhé" | Given 3 xu khác nhau và choices `[3,1,5]`; when chạm đủ 3 xu rồi ô "3"; then đúng 1 event `km:answer` value `3` trên `mount` |
| 2 | `b1` | `mario-odyssey` | `count` 0–5 FRUIT+TOYS | `Vòng cung ném khăn`: bầu trời mở, 3 đích số dọc cung, người ném ở góc dưới-trái | **ném** khăn vào đích số | `vex` (cung+đích), `loom` (giấy nước), `chirp` (whoosh) | E1 `answer=0` → không vật để đếm; đích "0" vẫn hiện; bấm → 1 event value `0`. E2 chạm vùng trời ngoài 3 đích → **0 event** + hint "Bé nhắm vào ô số nhé" | Given `answer=2`, choices `[0,2,4]`; when chạm đích "4"; then 1 event value `4` và shell gọi `onWrong` (không dispatch lần 2) |
| 3 | `b2` | `donkey-kong-country` | `count` 5–10 TOYS+FRUIT | `Thang gỗ đứng`: trục dọc, mỗi nấc là một thanh gỗ có chuối, 3 ô số trên đỉnh | **leo** từng nấc | `kiln` (nấc gỗ voxel), `loom` (vân gỗ), `chirp` (rung nấc) | E1 `answer=10` → render đúng 10 nấc, không nấc 11; bấm "10" → 1 event `10`. E2 chạm nấc #5 khi mới ở #3 → vẫn #3, **0 event** + hint "Leo từng nấc nhé" | Given `answer=8`, choices `[8,7,9]`; when chạm 8 nấc liên tiếp rồi ô "8"; then 1 event value `8`, không bao giờ có event `9` |
| 4 | `b3` | `pokemon` | `compareGroups` ≤10 nhiều/ít/bằng | `Hai đảo giấy và lưới vây`: 2 cụm rời rạc, lưới ở giữa, 3 nút trái/phải/bằng nằm trong lưới | **quây** lưới vào cụm | `vex` (lưới+huy hiệu), `loom` (giấy cắt), `chirp` (lưới) | E1 hai cụm bằng nhau → `answer='equal'`; bấm "Bằng nhau" → 1 event `'equal'`. E2 chạm khoảng trống giữa 2 đảo → lưới bay về, **0 event**, thử lại vô hạn | Given `answer='right'`; when chạm cụm phải; then 1 event value `'right'` và 2 cụm giữ nguyên vị trí |
| 5 | `b4` | `zelda` | `compareSign` ≤10, modes `sign`/`number` | `Vòng rương quanh ổ khoá`: 3 rương trên cung ~120°, ổ khoá tâm | **mở** nắp rương | `kiln` (rương low-poly), `vex` (dấu), `chirp` (lật nắp) | E1 mode `number`, `answer=7` → nắp mang "7", không glyph `>` `<` `=`; bấm → 1 event `7`. E2 `a=b` → `answer='='`; bấm rương "=" → 1 event `'='`, không hiện chữ "bằng nhau" riêng | Given `choiceRender='number'`, `answer=7`; when chạm rương nhãn "7"; then 1 event `7` và stage không có glyph so sánh ngoài equation |
| 6 | `b5` | `animal-crossing` | `compose` ≤10 tách–gộp | `Hai luống nỉ chồng dọc`: 2 luống × 5 ô nỉ, luống masked chỉ đọc | **trồng** hoa vào luống | `loom` (nỉ), `pxl` (bông hoa), `chirp` (gieo) | E1 `groups=[{4},{3,masked:true}]` → luống 1 `aria-disabled=true`; gieo 3 ở luống 2, bấm "3" → 1 event `3`. E2 gieo 6 khi cần 3 → `collect` dừng ở 3, **0 event thừa** | Given `groups=[{4},{3,masked:true}]`; when gieo 3 rồi bấm "3"; then 1 event `3` và luống 1 không nhận chạm |
| 7 | `b6` | `mario-party` | mixed 5 dạng: `count`, `compareGroups`, `compareSign`, `compose`, `sequence` | `Bàn ô xí ngầu 12 ô`: vòng ô quanh viên xí ngầu trung tâm | **tung** xí ngầu rồi chọn ô | `kiln` (xí ngầu), `vex` (biểu tượng 5 dạng), `chirp` (lắc) | E1 `q.kind='sequence'` → ô trung tâm vẽ `q.visual.values`, `null` thành "?"; 3 ô số; bấm số → event. E2 tung 5 lần → mặt xí ngầu đổi theo chu kỳ, **3 đáp án không đổi**, 0 event khi tung | Given `answer=6`; when tung 3 lần rồi bấm ô "6"; then 1 event `6` và `question` không đổi |
| 8 | `b7` | `dr-mario` | `shape2d` identify/count, ≤6 | `Chai đứng + khay nang giấy`: chai ở phải, 3 nang xếp dọc ở trái | **thả** nang vào chai | `vex` (nang giấy), `kiln` (chai), `chirp` (rơi) | E1 identify `answer='triangle'` → nang tam giác; thả → 1 event `'triangle'`. E2 chạm ngoài miệng chai → nang về khay, **0 event** + hint "Thả vào chai nhé" | Given `mode='count'`, `answer=4`, choices `[4,2,6]`; when thả nang "4"; then 1 event `4` và nang không vẽ SVG hình |
| 9 | `b8` | `mario-maker` | `shape2d` count, ≤8 | `Khay đất sét 3×3 có tranh mờ`: lưới 9 ô, tranh mẫu opacity 0.2 làm nền | **xếp** khối vào ô | `kiln` (khối đất sét), `vex` (khung lưới), `chirp` (snap) | E1 `answer=8` → capacity 9 ≥ 8; xếp 8 rồi bấm "8" → 1 event `8`. E2 xếp 9 với choices `[8,5,2]` → `find(9)=null` → **0 event** + hint "Bè bớt 1 viên nhé" | Given `answer=8`, lưới 9 ô; when xếp 9 khối; then 0 event và hint xuất hiện trong ≤0.5 s |
| 10 | `b9` | `mario-paint` | mixed `shape2d`/`sequence`/`count` | `Canvas ba vùng vuốt dọc`: khung canvas, 3 vùng màu xếp dọc, cọ ở mép | **vuốt** sáp qua vùng | `vex` (vùng SVG), `loom` (canvas grain), `chirp` (cọ) | E1 identify `answer='circle'` → vùng chỉ có SVG + `aria-label='hình tròn'`; vuốt → 1 event `'circle'`. E2 nét đi từ A sang B → **vùng A thắng**, chỉ 1 event `A.value` | Given zones A,B,C và nét vuốt A→B; when nhấc; then đúng 1 event value `A.value`, không có event `B.value` |
| 11 | `b10` | `yoshi-island` | `add` ≤10, `missing:['result']` | `Ray nuốt có miệng cuối`: dải ngang, 2 đống đồ bên trái, miệng/giỏ mosaic bên phải | **nuốt** đồ vào giỏ | `pxl` (mosaic), `chirp` (nuốt), `vex` (ô số cạnh giỏ) | E1 `groups=[{count:0},{count:6}]` → đĩa 1 hiện "0 quả"; nuốt 6, bấm "6" → 1 event `6`. E2 nuốt lần 11 khi tổng 10 → không object để chạm, `collected=10`, **0 event thừa** | Given `groups=[{0},{6}]`; when chạm 6 đồ rồi ô "6"; then 1 event `6` và nhãn "0 quả" hiện |
| 12 | `b11` | `luigis-mansion` | `subtract` ≤10, gạch bớt | `Vòng xoáy hút bóng có đèn tâm`: bóng trên quỹ đạo, đèn lồng ở tâm | **hút** giữ bóng vào đèn | `vex` (xoáy+đèn), `chirp` (hút), `loom` (mực loang) | E1 `first=7, crossedOut=7` → hút 7, bấm "0" → 1 event `0`. E2 hút vượt 7 → chặn ở 7 + hint "Bé hút đủ 7 cái thôi nhé", **0 event** do lỗi thao tác | Given `first=7, crossedOut=7`; when hút đủ 7 rồi bấm "0"; then 1 event `0`, reduced-motion bỏ xoáy |
| 13 | `b12` | `brain-age` | `factFamily` ≤10 | `Bảng phấn một ô trống`: dãy token ngang, 1 slot, 3 phím số dưới slot | **viết** số vào slot | `vex` (ô phấn), `chirp` (phấn rơi) | E1 tokens `[7,+,2,=,slot]`, `answer=9` → chạm "9" → 1 event `9`, slot hiện "9". E2 chạm ô có số → không đổi, **0 event** + hint "Chạm ô trống nhé" | Given tokens `[7,+,2,=,slot]`, `answer=9`; when chạm phím "9"; then 1 event `9` và text slot là "9" |
| 14 | `b13` | `mario-and-luigi` | mixed `add`/`subtract`/`factFamily` ≤10 | `Hai đường chuyền có bóng`: 2 làn song song, bóng qua lại, 3 thẻ số cuối | **đẩy** bóng giữa 2 bạn | `pxl` (hai bạn), `vex` (thẻ token), `chirp` (bóng) | E1 `q.kind='subtract'` → token thứ 2 là `"-"` từ `q.equation`; đẩy 1 lần rồi bấm "4" → 1 event `4`. E2 bóng ở bạn phải, chạm lại → idempotent, **0 event** + hint "Bấm thẻ số nhé" | Given `kind='subtract'`, `answer=4`; when đẩy 1 lần rồi bấm thẻ "4"; then 1 event `4` và glyph render là `−` |
| 15 | `b14` | `pikmin` | `solid3d` identify/realWorld | `Cột khối len + bọn trợ lý kéo`: cột khối bên phải, nhóm trợ lý nhỏ dưới trái | **kéo** khối bằng nhóm trợ lý | `kiln` (khối voxel), `loom` (sợi len), `chirp` (kéo) | E1 realWorld `answer='book'` → khối glyph 📕; kéo → 1 event `'book'`, không render tên "khối hộp chữ nhật" lên khối. E2 chọn trợ lý rồi chạm cỏ → trợ lý về, **0 event**; phải chạm khối | Given `mode='realWorld'`, `answer='book'`; when kéo khối 📕; then đúng 1 event `'book'` |
| 16 | `b15` | `kirby` | `position` onUnder/leftRight | `Hộp tâm + bốn mây hướng`: hộp ở giữa, 4 mây ↑ ↓ ← → quanh tâm | **thổi** mây theo hướng | `vex` (mũi tên+mây), `chirp` (gió), `loom` (bông) | E1 `q.visual.rel='under'` dù CSS đè vật lên hộp → chạm mây ↓ → 1 event `'under'`. E2 chạm mây ↑ khi đáp án `'under'` → 1 event `'on'` (sai do bé chọn), shell gọi `onWrong`; không đo pixel | Given `rel='under'` dù vật bị CSS chồng; when chạm mây ↓; then 1 event `'under'`, không dùng đoạn vị trí pixel |
| 17 | `b16` | `warioware` | mixed `solid3d`/`position`/`shape2d` | `Carousel ba thẻ lệnh`: 3 thẻ quay quanh tâm, lệnh `q.text` phía trên | **chớp** chọn thẻ | `vex` (thẻ pop-art), `pxl` (host), `chirp` (bấm) | E1 `reducedMotion=true` → bỏ đồng hồ/thẻ quay, thẻ tĩnh, bấm vẫn 1 event. E2 chạm 2 thẻ cùng khung → chỉ thẻ đầu dispatch, `locked` chặn thẻ thứ 2 | Given thẻ đầu mang `value='cube'`; when chạm cả 2 thẻ trong cùng khung hình; then đúng 1 event `'cube'` |
| 18 | `b17` | `super-smash-bros` | mixed `count`/`compareSign`/`sequence`/`compose` | `Ba bệ cờ chồng tầng`: 3 bệ dọc, mỗi bệ một cờ = 1 choice | **đấm** cờ trên bệ | `kiln` (bệ low-poly), `vex` (cờ), `chirp` (đấm) | E1 `answer='='` → cờ "="; đấm → 1 event `'='`, không đổi thành số. E2 chạm bệ trống → nhân vật nhảy tại chỗ, **0 event** + hint "Chạm vào cờ nhé" | Given `answer='='`; when chạm cờ "=" trên bệ 3; then 1 event `'='` và nhãn cờ không đổi |
| 19 | `b18` | `fire-emblem` | mixed `add`/`subtract`/`factFamily` ≤10 | `Bàn cờ 4×3 đi từ ô (0,1)`: quân ở (0,1), 3 ô đích mang nhãn choice | **đi** quân tới ô đích | `vex` (bản khắc), `pxl` (quân), `chirp` (bước) | E1 `kind='subtract'` → nhãn đầu bàn từ `q.equation.tokens`; chạm đích "5" → 1 event `5`. E2 chạm lại ô đang đứng → quân không đi, **0 event** | Given `answer=5`, quân ở (0,1); when chạm đích "5"; then 1 event `5` trong ≤`stepMs*4` ms |
| 20 | `b19` | `splatoon` | mixed `shape2d`/`solid3d`/`position` | `Hàng rào 3 stencil + vòi súng góc`: 3 khung stencil xếp dọc, súng góc dưới-trái | **bắn** màu vào stencil | `vex` (stencil SVG), `chirp` (xịt), `loom` (giấy) | E1 `choiceRender='shape'` → target chỉ SVG + `aria-label='hình tròn'`; bắn → 1 event `'circle'`. E2 chạm vùng trống → vệt mực trang trí, **0 event**, tối đa 3 vệt rồi mờ dần | Given `answer='circle'`, `choiceRender='shape'`; when chạm target tròn; then 1 event `'circle'` và `aria-label` đúng |
| 21 | `b20` | `mario-kart` | mixed **11 dạng**, 10 câu (`lesson.count=10`) | `Đường vải tới trường`: đường zigzag 10 ô từ nhà tới trường; mỗi ô nhúng widget riêng theo `q.kind` | **xếp** ô đường/bridge đúng đáp án | `kiln` (ô đường voxel), `loom` (vải ghép), `vex` (widget 11 dạng), `chirp` (gõ ô) | E1 `q.kind='position'` có 4 choice → ô hiện 4 mũi tên; chạm "left" → 1 event `'left'`, không ép 3 ô, không HUD chặng. E2 câu 10 đúng → `lockedCount=10`, hiện "Đến trường rồi!"; **0 bục, 0 race summary**; reduced-motion hiện ✓ tĩnh | Given 10 câu mixed đủ 11 dạng; when trả lời đúng câu 10; then 10 ô khoá, mỗi câu phát đúng 1 event value thuộc `choices`, không có node `.race-*` hay bục |

**Kiểm chứng khác biệt thật**: 21 cặp `(hình học, động tác)` ở bảng trên không trùng. Cùng là cung bay thì bài 2 là `*ném vào đích trên cung trời*`, bài 20 là `*bắn vào stencil dọc hàng rào*` — khác geometry, khác dụng cụ, khác widget. Không bài nào dùng lại `stage--{archetype}` hay `data-variant`.

### Bài 21 — `b20` / `Đường vải tới trường` (quy tắc chi tiết)

- `roadTiles = KM.Curriculum.questionCount(lesson)` = **10**; không hardcode. Mỗi ô tương ứng đúng 1 câu của `question` list do `Questions.forLesson` sinh (11 dạng trộn đều bởi `forLesson`).
- Bố cục: zigzag 2 hàng (5 ô trên, 5 ô dưới), nhà bé ở đầu, trường ở cuối; ô chưa đúng viền đứt nét, ô đúng khớp vải và khoá. Mỗi ô ≥64×64 px, gap ≥8 px.
- `widgetFor(kind)` (bảng dưới) chỉ quyết định **bộ điều khiển trong ô**, không đổi đề bài, không đổi `q.choices`.
- Sai → ô rung nhẹ (`wrongShakeMs`), `onWrong(choice)` bỏ khoá ô đó, `lockedCount` giữ nguyên; bé thử lại cùng câu. Đúng → `tileLockMs`, `lockedCount += 1`, `onCorrect(result)`; `celebrate()` chỉ sáng ô cuối cùng.
- Khi `lockedCount === roadTiles` → hiện text "Đến trường rồi!" + ✓. **Không** có xe, đối thủ, cờ ca-rô đích kiểu đua, bục, HUD chặng, `raceSummary` hay màn result kiểu đua.
- Widget theo 11 dạng: `count` = đếm đồ rồi bấm số; `compareGroups` = 3 nút trái/phải/bằng; `compareSign` = 3 nút dấu hoặc số theo `choiceRender`; `compose` = 2 luống nhỏ; `add` = 2 nhóm cộng; `subtract` = nhóm gạch bớt; `factFamily` = ô trống + phím số; `sequence` = dãy 4 ô; `shape2d` = 3 SVG hình; `solid3d` = 3 khối/glyph; `position` = **4 mũi tên**. Widget không được ép về 3 choice.

---

## Formulas

Mọi hàm dưới là **quy ước đặc tả**; mỗi module tự cài đặt bản sao thuần của riêng mình (không chia sẻ DOM/state/registry). Không có module nào tự sinh số ngẫu nhiên: `"dieFace"` dùng chu kỳ đếm, không RNG.

### Biến dùng chung

| Ký hiệu | Kiểu | Miền giá trị | Ý nghĩa |
|---|---|---|---|
| `q` | object | Question hợp lệ từ `Questions` | `kind`, `text`, `say`, `visual`, `equation`, `choices`, `choiceRender`, `answer`, `cheer` |
| `c` | object | Phần tử của `q.choices` | `{value,label,shape?,glyph?,icon?,aria?}` |
| `v` | number\|string | `0..10` hoặc enum | Giá trị bé chọn hoặc giá trị module tính được |
| `S` | Set | kích thước `0..12` | Tập hotspot đã chạm/idempotent |
| `g` | Array | 1–2 group | `q.visual.groups`; mỗi group `{count, masked?, crossedOut?}` |
| `m` | number | `0..10` | Số nấc/đồ đã leo/nuốt/hút/gieo |
| `r` | number | `0..∞` | Số lần tung xí ngầu trong câu |
| `L` | number | `0..10` | Số ô đường đã khoá (`b20`) |
| `T` | number | `10` | Tổng ô đường = `questionCount(lesson)` |

### Công thức

| Hàm | Định nghĩa | Miền / điều kiện | Ví dụ tính |
|---|---|---|---|
| `find(q,v)` | Choice đầu tiên có `String(c.value) === String(v)`; trả `null` nếu `v == null` hoặc không khớp. Trả **chính object choice** (giữ kiểu value gốc) | `c` hoặc `null` | `q.choices=[{value:3},{value:1},{value:5}]` → `find(q,'3') = {value:3}` |
| `submit(q,v)` | `c = find(q,v)`; nếu `c === null` → return `false` (hiện hint, 0 event); else dispatch `CustomEvent('km:answer',{bubbles:true,detail:{value:c.value}})` trên `mount`, return `true` | `true`/`false`; đúng 1 event khi `true` | `submit(q,3)` → event `detail.value = 3` (number, không phải `"3"`) |
| `collect(v,S)` | Nếu `v ∉ S` thì `S.add(v)`; trả `|S|`; nếu đã có thì trả `|S|` không đổi | `0..12` | chạm xu #2 ba lần → `collect(2,S)=1` ở lần 3 |
| `countFor(q)` | `clamp(g[0].count, 0, tuning.game.maxCoins)` | `0..10` | `count=7` → `7`; `count=0` → `0` |
| `sumGroups(q)` | `g[0].count + g[1].count` (nếu chỉ 1 group thì `g[0].count`) | `0..10` | `g=[4,3]` → `7` |
| `masked(q)` | `g.length === 2 && g[1].masked === true` | boolean | `compose` "7 gồm 4 và mấy" → `true` |
| `actionValue(q)` | `masked(q) ? g[1].count : sumGroups(q)` | `0..10` | `g=[4,3(masked)]` → `3`; `g=[4,3]` → `7` |
| `remain(q)` | `g[0].count - vacuumed`, với `vacuumed` bị kẹp trong `[0, g[0].crossedOut]` | `0..10` | `first=7, crossedOut=7, vacuumed=7` → `0` |
| `dieFace(r)` | `1 + (r % 6)`; chỉ đổi mặt xí ngầu, **không đổi** `q.choices` | `1..6` | `r=5` → mặt `6`; `r=6` → mặt `1` |
| `tileIndex(i)` | `i + 1`, `i` là index câu trong `Questions.forLesson` | `1..10` | câu thứ 10 → ô `10` |
| `pathComplete(L,T)` | `L === T`; khi `true` hiện "Đến trường rồi!" | boolean | `L=10, T=10` → `true`; `L=9` → `false` |
| `motionAllowed(reduced)` | `reduced !== true`; nếu `false` → bỏ mọi quỹ đạo/carousel/parallax | boolean | `reducedMotion=true` → `false`, sprite dừng frame 0 |

**Ví dụ tính tổng hợp 1**: `q = {kind:'compose', answer:3, groups:[{count:4},{count:3,masked:true}]}` → `masked=true` → `actionValue=3` → `find(q,3)` tồn tại → `submit(q,3)` phát 1 event value `3`.

**Ví dụ tính tổng hợp 2**: `q = {kind:'count', answer:0, choices:[{value:0},{value:2},{value:5}]}` → `countFor=0` → vùng xu trống → bấm "0" → `find(q,'0') = {value:0}` → 1 event value `0`.

**Ví dụ tính tổng hợp 3 (b20)**: câu 10 có `choices` 4 mũi tên, `answer='left'` → module sinh 4 hotspot → bấm mũi tên trái → `find` khớp → 1 event `'left'` → `L: 9 → 10` → `pathComplete=true`; không có `race`, không có podium.

---

## Edge Cases

Mỗi dòng nêu **kết quả cụ thể**, không dùng "xử lý hợp lý". Ngoài 42 edge case trong bảng 21 dòng, áp dụng thêm các luật sau cho mọi module.

| Tình huống | Kết quả bắt buộc |
|---|---|
| `find(q,v) === null` (module tính ra số không có trong choices) | **0 event**; hint "Bé chọn lại nhé!" với `aria-live="polite"` hiện trong ≤0.5 s; không gọi `onWrong`, không trừ sao, không đổi `progress`; state cảnh giữ nguyên để thử lại |
| Bé bấm đúng 2 hotspot trong cùng khung hình | Hotspot đầu tiên gọi `submit`; `locked=true` chặn hotspot thứ hai; tổng **1 event** |
| `onWrong(choice)` được shell gọi sau một câu sai | Module reset `m=0`, `S.clear()`, bỏ class `is-*`, đưa cảnh về frame đầu câu; **không** dispatch thêm event, **không** đổi `question` |
| `onCorrect(result)` rồi `celebrate()` | Module chỉ thêm class `is-correct` và text/icon ✓; shell mới là nơi đổi sao, đọc `result.cheer`, chuyển câu sau `tuning.timing.correctHoldMs` |
| Event `km:answer` tới khi shell đang `locked` hoặc `finished` | Shell bỏ qua; module vẫn có thể nhận `onCorrect` nhưng không sinh event thứ 2; 0 lỗi console |
| `q.kind` lạ trong bài mixed | Module render `q.text` + `visual`/`equation` tĩnh và **3/4 hotspot từ `q.choices`**; không tự map sang dạng khác, không chặn câu, không tự nộp |
| `q.choices.length === 4` (duy nhất ở `position`, và có thể xuất hiện ở bài mixed) | Module render 4 hotspot, digit `1..4` hoạt động; không cắt về 3; với `b20` ô đường vẫn là 1 ô chứa 4 nút |
| `q.answer === 0` hoặc group `count === 0` | Vùng đồ trống kèm nhãn "0 quả" (hoặc tương đương); hotspot "0" vẫn hiện và dispatch value `0` |
| Thiếu asset `bg`/sprite/cover khi chạy `file://` | Fallback CSS + emoji, bố cục và kích thước nút không đổi, **0 console error**, **0 404** (không tạo request tới asset thiếu) |
| Thiếu key `KM.Tuning.game.*` | Dùng giá trị mặc định đã quy định trong mục Tuning Knobs của spec này thông qua data layer; test `tuning-contract` phải fail ở CI, không fail ở tay trẻ |
| `reducedMotion === true` | Sprite dừng `idle[0]`; không `transform`/`animation` thay đổi theo thời gian; vẫn có đổi màu nền + ✓/~ + chữ "Đúng"/"Thử lại"; `windowMs` của bài 17 bị bỏ qua |
| `handleKey('9')` khi chỉ có 3 hotspot | Trả `false`; shell không dispatch; không có lỗi chỉ số |
| `audio` không có phương thức `tap()` | Module bỏ qua gọi audio, vẫn dispatch event đúng; không throw |
| `destroy()` trong lúc animation chưa kết thúc | Mọi timer bị clear, node do module tạo bị remove, class do module thêm bị bỏ; listener event của shell vẫn nguyên nhưng không còn instance nào dispatch |
| `b20`: ô đường đã khoá nhưng bé chạm lại | `tileIndex` đó bị `locked`; **0 event**, không tăng `lockedCount`, hint "Ô này xong rồi nhé" |
| `b20`: câu 10 sai 3 lần liên tiếp | `lockedCount=9` giữ nguyên; ô 10 rung 3 lần; sau lần đúng thứ 4 → `lockedCount=10` và text "Đến trường rồi!" |
| Bài 17 hết `windowMs` trước khi bé chọn | Thẻ đứng yên, hiện "Chọn từ từ cũng được", **0 event**, **0 hình phạt**, bấm sau đó vẫn dispatch bình thường |
| Cạnh nút bị sprite/texture che (mosaic, halftone, ca-rô) | Texture bị mask trong 22% dưới; sprite `cheer` chiếm ≤30% chiều cao vùng đó; hotspot vẫn ≥64×64 px, gap ≥8 px |

---

## Dependencies

### Chiều spec → hệ thống (spec tác động gì)

| Đối tượng | Thay đổi bắt buộc |
|---|---|
| `js/ui/screens/lesson.js` | Bỏ `ctx.race/racers`, `KM.Race`, `KM.RaceUI`, `raceStatus`, `raceSlot`, `.race-hud`; bỏ tạo `.choices`/`.choice` và `onGameAnswer`; thêm 1 listener `km:answer` trên `mount`; khi nhận event → đối chiếu `find(q, detail.value)` rồi gọi `session.answer(choice.value)`; gọi `render(q)`/`onWrong`/`onCorrect`/`celebrate`/`destroy`/`handleKey`; `R` → `speech.speak(q.say)`, `Esc` → home, digit → `handleKey`. Không sinh class `stage--*`/`data-variant` |
| `js/ui/games/<gameId>.js` (21 file) | Viết lại từ đầu theo factory mới; mỗi file là một root `.kmg-<gameId>`; không import `GameMap`/`GameRegistry`; không callback `onAnswer`; không dùng archetype; mọi số đọc `KM.Tuning.game` |
| `js/ui/games/contract.js` | Hợp đồng mới: 5 method tuỳ chọn + `handleKey`; event `km:answer` là kênh duy nhất; bỏ kiểm tra callback |
| `js/ui/games/registry.js` | Ngừng dùng/loại bỏ đăng ký; shell resolve trực tiếp `KM.Games[gameId]` từ dữ liệu tĩnh `game-map.js` |
| `js/ui/games/mario-kart.js` | Xoá toàn bộ nội dung đua/HUD/bục; thay bằng factory `KM.Games['mario-kart']` của `Đường vải tới trường` |
| `js/ui/race.js`, `js/domain/race.js`, `js/data/racers.js` | Xoá; không import ở bất cứ đâu |
| `js/ui/screens/result.js` | Bỏ `raceSummary`, bỏ podium/bục; chỉ dùng `session.summary()` và `progress.recordResult()` |
| `js/data/tuning.js` | Giữ `questionsPerLesson`, `stars`, `timing`, `generation`, `confetti`, `speech`, `audio`, `hd`, `game.*` ở mục Tuning Knobs; xoá `race.*` và `kartBoostMs`; bổ sung key mới |
| `js/data/game-map.js` | Giữ nguyên 21 entry, thứ tự, `gameId`, `tribute`, `title`, `palette`, `bg`. Ngừng tiêu thụ `layout`/`variant`; `style`/`cover`/`sprite`/`introText`/`inputHint`/`motionMs` vẫn là dữ liệu tĩnh |
| CSS (`css/*.css`) | Xoá mọi selector `.race-*`, `.kart-*`, `.game-stage--kart`, `.is-kart-themed`, `.podium*`; xoá `stage--*`; thêm style riêng theo `.kmg-<gameId>`; nút ≥64 px, gap ≥8 px |
| `design/art/art-bible-hd.md`, `design/art/sprite-style-guide.md` | Cập nhật entry 21: bỏ "cat driver/buggy/wheels/checkered finish line", thay bằng "bé mèo tai tròn khăn carô xếp ô vải tới trường"; prompt vẫn giữ cụm bản quyền bắt buộc; ca-rô <10% và không nằm sau số |
| `public/` mirror | Sinh lại bằng build sau khi sửa source; không sửa tay |
| Tests | Xoá test đua/race; thêm test event contract, 21 smoke màn, negative test invalid value, reduced-motion, destroy, asset budget |

### Chiều hệ thống → spec (spec phụ thuộc gì)

| Nguồn | Cái lấy | Trạng thái |
|---|---|---|
| `js/data/curriculum.js` | 21 `lessonId`, tiêu đề, `parts.activity`, config (`min/max`, `objects`, `modes`, `maxCount`, `missing`), `questionCount` | Có sẵn; không đổi |
| `js/data/questions.js` | Cấu trúc `Question`, 11 dạng, `choiceRender`, `q.choices` 2–4 item, `answer` luôn nằm trong choices | Có sẵn; không đổi |
| `js/data/game-map.js` | 21 `gameId` + thứ tự để đặt tên factory/path; palette/nền/display name | Có sẵn; không đổi thứ tự |
| `js/data/tuning.js` | Mọi số gameplay, timing, ngân sách ảnh, giọng TTS | Có sẵn; cần bổ sung key mới, xoá key đua |
| `js/domain/lesson-session.js` | `answer(value)` → `{correct, firstTry, cheer, ignored}`, `next()`, `summary()` | Có sẵn; không đổi |
| `js/core/speech.js` | TTS vi-VN đọc `q.say`/`result.cheer` | Có sẵn; không đổi |
| `js/domain/progress.js` | `kidmath.v1`, unlock, sao, settings | Có sẵn; không đổi |
| `design/art/art-bible-hd.md` mục 9–11 | 21 style id, silhouette gốc, quota 16:9, vùng an toàn 12%/22%, WCAG AA, guardrail bản quyền | Có sẵn; cần cập nhật b20 |
| `design/art/sprite-style-guide.md` | Sprite 384×384 4×4, cover 640×360, bg 1280×720, ngân sách 400 KB/180 KB | Có sẵn; cần cập nhật b20 |
| Authoring skill `pxl` | PNG pixel-art sprite/道具 → đóng gói WebP alpha | Skill authoring; output baked |
| Authoring skill `vex` | SVG icon/khung/widget UI → rasterize thành sprite hoặc dùng inline SVG | Skill authoring; output baked |
| Authoring skill `kiln` | Low-poly/voxel → render PNG ở góc nhìn cố định → WebP sprite | Skill authoring; output baked |
| Authoring skill `loom` | Texture seamless (nỉ/giấy/mực/vải/đất sét) → nền/lớp mask 16:9 | Skill authoring; output baked |
| Authoring skill `chirp` | SFX + nhạc nền WAV/OGG (tap/correct/wrong/road-lock/cherry…) | Skill authoring; output baked; **không thay TTS** |

### Vòng lặp phụ thuộc tất yếu

`curriculum.js` → `Questions.forLesson` → `q.choices/answer` → module render hotspot → `km:answer` → `lesson.js` → `LessonSession.answer` → `result` + `progress` → unlock bài tiếp → lại đọc `curriculum.js`. Chiều ngược lại: module **không** được ghi ngược vào `curriculum.js`/`Questions`/`session`; mọi thay đổi nội dung toán phải sửa data, không sửa UI.

---

## Tuning Knobs

Mọi số dưới đây là giá trị đặc tả; khi triển khai phải nằm trong `js/data/tuning.js` (`KM.Tuning.game.*`), module chỉ đọc qua một accessor duy nhất. Không được viết literal gameplay trong 21 file module. `kartBoostMs` và toàn bộ `tuning.race` bị xoá. `roadTiles` **không phải knob** mà là giá trị dẫn xuất từ `Curriculum.questionCount(lesson)` (=10).

| Knob | Phạm vi an toàn | Mặc định | Category | Ảnh hưởng / rationale |
|---|---|---|---|---|
| `maxCoins` | 1–10 | 10 | curve | Trần số xu bài 1; khớp `count.max=5` nhưng để dư cho ôn tập |
| `coinPopMs` | 120–500 | 320 | feel | Nhịp nảy xu; dưới 120 ms quá giật với trẻ 6 tuổi |
| `jumpMs` | 180–600 | 520 | feel | Nhảy/nhặt; giữ giá trị hiện có của tuning |
| `throwMs` | 250–700 | 450 | feel | Thời gian khăn bay; dispatch ngay khi chạm, không đợi bay xong |
| `targetRadiusPx` | 64–140 | 96 | feel | Bán kính đích bài 2 và bài 20; không xuống dưới 64 px |
| `arcHeightPx` | 60–220 | 140 | feel | Cong cung bài 2; chỉ thẩm mỹ, không đổi `choices` |
| `rungHeightPx` | 28–56 | 42 | feel | Cao nấc thang bài 3; màn ngang ≤600px lấy 28 px nhưng nút vẫn ≥64 px |
| `climbMs` | 180–450 | 300 | feel | Mỗi nấc leo; chạm nấc chưa tới thứ tự kế tiếp bị bỏ qua |
| `netMs` | 300–700 | 500 | feel | Lưới vây bài 4; chạm trống → lưới về, 0 event |
| `clusterGapPx` | 80–240 | 160 | feel | Khoảng 2 cụm bài 4; đủ xa để gom bằng mắt |
| `maxFlowers` | 1–10 | 10 | curve | Sức chứa luống bài 6; khớp `compose.max=10` |
| `flowerGrowMs` | 250–700 | 480 | feel | Hoa mọc; masked bed không nhận chạm |
| `soilCellPx` | 64–96 | 72 | feel | Ô đất; ≥64 px theo art bible |
| `rollMs` | 400–900 | 600 | feel | Lắc xí ngầu bài 7; `dieFace(r)` tuân chu kỳ, không RNG |
| `boardTiles` | 8–16 | 12 | curve | Số ô bàn bài 7; phải ≥5 ô biểu tượng dạng |
| `tileSizePx` | 64–96 | 80 | feel | Ô bàn bài 7 / bài 19; không <64 px |
| `dropMs` | 350–800 | 550 | feel | Nang rơi vào chai bài 8 |
| `vialSlots` | 3–6 | 3 | curve | Số rãnh chai; phải ≥ `choices.length` |
| `gridCells` | 6–12 | 9 | gate | Khay bài 9; phải ≥ `maxCount` (8); capacity 9 ≥ 8 |
| `snapMs` | 120–300 | 200 | feel | Khối đất sét vào ô |
| `strokeMinPx` | 40–120 | 80 | feel | Dưới ngưỡng → coi là chạm; atop ngưỡng mới là vuốt bài 10 |
| `zoneSizePx` | 96–180 | 120 | feel | Vùng vuốt; first-zone-wins |
| `swallowMs` | 180–400 | 280 | feel | Nuốt bài 11 |
| `mouthCapacity` | 5–10 | 10 | curve | Sức chứa giỏ; chạm thứ 11 không có object |
| `suckMs` | 250–600 | 420 | feel | Hút bóng bài 12; giữ để hút, chặn ở `crossedOut` |
| `spiralTurns` | 1–3 | 2 | curve | Số vòng xoáy; reduced motion = 0 vòng |
| `writeMs` | 200–500 | 320 | feel | Phấn rơi vào slot bài 13 |
| `cellSizePx` | 72–120 | 88 | feel | Ô bảng bài 13 |
| `passMs` | 300–700 | 500 | feel | Bóng qua lại bài 14 |
| `passesPerQuestion` | 1–3 | 2 | gate | Số lần đẩy tối đa trước khi lộ thẻ đáp án |
| `pullMs` | 400–900 | 600 | feel | Kéo khối bài 15 |
| `helperCount` | 3–6 | 4 | curve | Số trợ lý len; vân len không tạo vòng trước số |
| `puffMs` | 250–600 | 420 | feel | Thổi mây bài 16; phình ≤4% |
| `cloudOffsetPx` | 90–220 | 150 | feel | Khoảng mây từ hộp; 4 hướng ↑↓←→ |
| `windowMs` | 3000–8000 | 5000 | gate | Carousel bài 17; **cấm <3000** với trẻ 6 tuổi; reduced motion bỏ qua hoàn toàn |
| `cardSpinMs` | 200–500 | 320 | feel | Tốc độ quay thẻ; reduced motion = tĩnh |
| `cardSizePx` | 96–160 | 120 | feel | Kích thước thẻ; ≥64 px |
| `punchMs` | 350–800 | 520 | feel | Nhảy+đấm cờ bài 18 |
| `platformCount` | 2–4 | 3 | curve | Số bệ; phải ≥ `choices.length`, thường 3 |
| `stepMs` | 180–400 | 280 | feel | Mỗi bước quân bài 19; event phát sau ≤`stepMs*4` |
| `boardCols` | 3–6 | 4 | curve | Số cột bàn cờ; đích luôn đi tới được |
| `shotMs` | 300–700 | 480 | feel | Tia mực bài 20 |
| `targetRadiusPx` (dùng lại) | 64–140 | 96 | feel | Stencil bài 20; không đè hình mẫu |
| `maxDecorSplats` | 1–3 | 3 | curve | Vệt mực trang trí khi chạm trống; quá 3 thì mờ dần |
| `wrongShakeMs` | 200–800 | 360 | feel | Rung khi sai, dùng lại mọi bài; reduced motion = 0 |
| `celebrateMs` | 600–1600 | 900 | feel | Thời gian hiệu ứng đúng; không có bục/podium |
| `introMs` | 800–1600 | 1200 | gate | Intro/cover trước câu đầu; reduced motion bỏ intro |
| `tileLockMs` | 300–900 | 520 | feel | Ô đường khớp vào đường bài 21 |
| `roadAdvanceMs` | 250–800 | 450 | feel | Nhịp hiện ô kế tiếp; không phải chặng đua |

Giá trị accessibility (không phải knob, lấy từ art bible): nút ≥64×64 CSS px, gap ≥8 px, font số 32–56 px, contrast ≥4.5:1 (≥3:1 nếu ≥24 px bold), accent ≤15% khung, L* vùng đáp án 78–95.

---

## Acceptance Criteria

### AC chung (chạy được bằng test/smoke)

- **AC-01 — Supersession**: Given file cũ `all-21-distinct-games.md` vẫn tồn tại; when mở file spec này; then có dòng khai báo `SUPERSEDED` và bất kỳ script triển khai nào cũng không đọc file cũ làm nguồn cấu hình.
- **AC-02 — Factory & danh sách**: Given `KM.Games` sau khi tải 21 script; when liệt kê `KM.Games[gameId]` theo thứ tự `game-map.js`; then đúng 21 factory tồn tại, tên khớp chính tả, không có `KM.GameRegistry` được gọi.
- **AC-03 — Event contract**: Given một bài bất kỳ và `q.choices=[a,b,c]`; when chạm hotspot mang `b`; then đúng **1** `km:answer` được bắt trên `mount`, `event.bubbles === true`, `event.detail.value === b.value`, và `session.answer` được shell gọi đúng 1 lần với `b.value`.
- **AC-04 — Invalid value**: Given module tính được `v` không có trong `q.choices`; when bấm nút nộp; then **0 event**, hint `aria-live="polite"` hiện trong ≤0.5 s, `session.answer` không được gọi, sao/progress không đổi.
- **AC-05 — Không hàng đáp án chung**: Given màn lesson đang có game; when query DOM; then `document.querySelectorAll('.choices, .choice').length === 0` và mọi answer hotspot nằm bên trong `[data-game-id]` hoặc `.kmg-<gameId>`.
- **AC-06 — Không đua xe**: Given toàn bộ source/CSS/asset sau build; when grep `KM.Race|KM.RaceUI|ctx.race|ctx.racers|raceSummary|\.race-|\.kart-|is-kart-themed|podium|buggy|checkered finish line`; then 0 kết quả (riêng dòng tribute bằng chữ trong DOM là hợp lệ).
- **AC-07 — Không archetype**: Given `mount` của 21 bài; when đọc classList và attributes; then không có class `stage--rail|arena|book|split|board|bench|tray|track`, không có `data-variant`, và mỗi bài có đúng 1 class `.kmg-<gameId>`.
- **AC-08 — Khác biệt thật**: Given 21 root DOM; when so sánh cặp `(geometry signature, action signature)` theo bảng Detailed Rules; then 21/21 cặp unique; khác nhau không chỉ ở màu/tribute.
- **AC-09 — Keyboard**: Given bài có 3 hotspot; when gõ `2`; then hotspot thứ 2 được kích hoạt và phát đúng 1 event; gõ `9` → 0 event; `R` → `speech.speak(q.say)` đúng 1 lần; `Esc` → navigate('home').
- **AC-10 — Reduced motion**: Given `prefers-reduced-motion: reduce`; when chơi đúng 1 câu ở bài 2, 12, 17, 21; then không có `transform`/`animation` thay đổi theo thời gian, sprite dừng `idle[0]`, vẫn có đổi màu + ✓ + chữ "Đúng".
- **AC-11 — Lifecycle**: Given một instance game đang hoạt động; when gọi `destroy()` rồi dispatch event cũ; then 0 timer còn chạy, 0 node do module tạo còn trong DOM, 0 listener do module thêm còn lại, 0 event mới phát, 0 console error.
- **AC-12 — Toán đúng nguồn**: Given 21 `lessonId`; when sinh tất cả câu bằng `Questions.forLesson`; then mọi `detail.value` được dispatch đều nằm trong `q.choices` và với câu đúng thì bằng `q.answer`; 0 câu tự sinh số trong module.
- **AC-13 — Bài 21 thay thế**: Given bài `b20` với 10 câu mixed 11 dạng; when trả lời đúng câu cuối; then `pathComplete=true`, text "Đến trường rồi!" hiện, `lockedCount=10`, không có `.race-*`, không có bục, không có `raceSummary` ở màn result; câu `position` vẫn có 4 mũi tên.
- **AC-14 — Asset 5 skill**: Given 5 skill authoring `pxl`, `vex`, `kiln`, `loom`, `chirp`; when kiểm tra manifest asset; then mỗi skill có ít nhất 1 deliverable được dùng trong 21 bài, mọi file nằm trong budget (`sprite ≤180.000 B`, `cover/bg ≤400.000 B`, 16:9 đúng), và `file://` không gọi tool/script sinh asset lúc chạy.
- **AC-15 — Offline fallback**: Given thiếu một file WebP/OGG bất kỳ; when mở bài tương ứng trên `file://`; then fallback CSS/emoji hiện, bố cục và nút ≥64 px không đổi, 0 console error, 0 request 404.
- **AC-16 — Tuning contract**: Given `KM.Tuning.game`; when chạy test biên; then mọi knob trong bảng Tuning Knobs tồn tại và nằm trong phạm vi an toàn; không có `race.*` hay `kartBoostMs`; không có số gameplay literal trong 21 file module.

### AC riêng theo bài

21 AC dạng Given–When–Then nằm ở cột cuối của bảng Detailed Rules; QA phải chạy cả 21 AC này cộng với AC-01…AC-16. Một bài chỉ được nghiệm thu khi **cả** AC riêng của nó **và** AC chung áp dụng đều pass.

---

### Ghi chú triển khai (không phải phần của hợp đồng)

- Tài liệu này là source of truth thiết kế. Khi triển khai, mọi giá trị số chuyển vào `js/data/tuning.js` trước khi viết module; mọi thay đổi toán học chuyển vào `curriculum.js`/`questions.js`, không sửa UI.
- Art/audio phải đi qua quy trình duyệt bản quyền hiện có của art bible; bài 21 đặc biệt kiểm tra không sinh lại xe/nhân vật nhận diện được.
- Không commit, không deploy từ bước thiết kế này.
