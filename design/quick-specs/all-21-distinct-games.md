# Quick Spec: 21 minigame khác biệt — Bé Vui Học Toán 1

- **Trạng thái**: Draft v1 — Giai đoạn A (CHỈ thiết kế; không viết code, không sinh ảnh)
- **Ngày**: 2026-11-22
- **Phạm vi**: 21 bài, 21 cơ chế/động tác, 21 phong cách art, ảnh cover thẻ bài + màn intro trước bài.
- **Nguồn chân lý toán học**: `js/data/curriculum.js` (mục tiêu + config từng bài). Không bịa mục tiêu.
- **Nguồn chân lý cấu trúc**: `js/data/game-map.js` (giữ nguyên 21 `gameId` và thứ tự), ADR-0002, ADR-0003 (`layout`/`variant`/8 archetype), `contract.js`, 3 module mẫu.
- **Ranh giới**: lõi `Questions`/`LessonSession`/sao/RNG/speech/localStorage KHÔNG đổi; web tĩnh `file://`, ES5-ish `KM.*`, trẻ 6 tuổi, tiếng Việt, nút ≥64px, phím 1–9/R/Esc, `prefers-reduced-motion`.

---

## 0. Quy ước chung, công thức và tiêu chuẩn tối thiểu

Mọi game trong spec này tuân 7 luật bắt buộc. Đây là phần để trả lời "tại sao không trùng khung": khung kỹ thuật dùng chung, **cảm giác chơi và cấu trúc tương tác thì không**.

| ID | Luật chung (không được vi phạm) |
|---|---|
| G1 | Game KHÔNG tự sinh số. Mọi giá trị nộp đi đều lấy từ `question.choices` qua `findChoice(q, v)`. Nếu không tìm thấy choice → KHÔNG gọi `onAnswer`, hiện gợi ý "Bé chọn lại nhé". |
| G2 | Bài mixed (`b6`, `b9`, `b13`, `b16`, `b17`, `b18`, `b19`, `b20`) có bảng dispatch theo `question.kind`. `kind` không được hỗ trợ → render tĩnh `question.text` + `question.visual`, giữ nguyên hàng đáp án; không chặn, không tự nộp. |
| G3 | Sai chỉ do `lesson.js` gọi `game.onWrong(choice)` (sau `session.answer`). Game reset hoạt cảnh về trạng thái đầu câu; **không trừ sao, không đổi `progress`, không tự chuyển câu**. |
| G4 | Đúng → `lesson.js` gọi `game.onCorrect(result)` rồi `game.celebrate()`. Game chỉ đổi class/text của chính nó. |
| G5 | Game không chiếm phím 1–9/R/Esc, không tạo nút < 64px, không xoá class `game-stage`/`game-tribute`. |
| G6 | `reducedMotion === true`: bỏ quỹ đạo/xoáy/confetti, thay bằng trạng thái tĩnh + text + icon; `motionMs` bị bỏ qua. Phản hồi đúng/sai vẫn hiện. |
| G7 | Cover/intro: hiển thị trước câu đầu; bé bấm hoặc tự tắt sau `tuning.game.introMs` (1200 ms). Reduced motion → bỏ intro. Esc → bỏ intro, vào thẳng bài. Không lưu trạng thái intro vào storage. |

### Công thức dùng chung

| Ký hiệu | Định nghĩa | Miền giá trị | Ví dụ |
|---|---|---|---|
| `q` | Question hiện tại (`KM.Questions`) | object hợp lệ | `kind:'count', answer:3` |
| `find(q, v)` | Choice đầu tiên có `choice.value === v`, ngược lại `null` | choice hoặc `null` | `find(q,3) = {value:3,label:'3'}` |
| `submit(q, v)` | Nếu `find(q,v) !== null` → gọi `onAnswer(find(q,v).value)` đúng 1 lần; ngược lại không gọi | — | `v=3` → `onAnswer(3)` |
| `collect(v, set)` | Nếu `v ∉ set` thì `set.add(v)`, `n=|set|`; nếu đã có thì `n` giữ nguyên | `0..12` | chạm xu #2 hai lần → `n=1` |
| `countFor(q)` | `clamp(q.visual.groups[0].count, 0, maxObjects)`; `maxObjects ∈ [5,12]` | `0..12` | group count 7 → `countFor=7` |
| `masked(q)` | `q.visual.groups.length===2 && q.visual.groups[1].masked===true` | boolean | compose "7 gồm 4 và mấy" → `true` |
| `actionValue(q)` | `masked(q) ? g[1].count : g[0].count+g[1].count` (compose/add/yoshi) | `0..10` | `g=[4,3(masked)]` → `3` |
| `capacity(cols,rows)` | `cols*rows`; phải `≥ max(q.answer, config.maxCount)`; nếu thiếu → không tự nộp, hiện hàng đáp án | `6..16` | grid 3×3 = 9 ≥ 8 ✓ |

**Ví dụ tính**: `q = {kind:'compose', answer:7, groups:[{count:4},{count:3,masked:true}]}` → `masked(q)=true` → `actionValue=3` → `find(q,3)` tồn tại → `onAnswer(3)`. `q = {kind:'count', answer:0, groups:[{count:0}]}` → `countFor=0` → nút "0" được tạo, `find(q,0)` tồn tại → `onAnswer(0)`.

**AC chung (QA verify được)**: Given 1 trong 21 lessonId · When mở bài, chạm đáp án đúng · Then `onAnswer` được gọi đúng 1 lần với `value` thuộc `question.choices`, `KM.GameContract.assert(instance)` trả `true`, `destroy()` dọn sạch timer/listener, 0 console error, 0 404.

---

## 1. Bảng tổng hợp 21 bài

Mục tiêu toán được chép/config từ `curriculum.js`. `layout`/`variant` là cặp nhận diện cấu trúc theo ADR-0003 (`stage--{layout}` + `data-variant`, định nghĩa ở mục 4); `style` là id phong cách art canonical lấy từ art bible (đã chốt, 21 id unique). `cover` = `Asset/covers/{lessonId}.webp`, `sprite` = `Asset/sprites/{lessonId}.webp` (ảnh trang trí, `alt=""`); intro đọc `introText`.

| # | lessonId · tiêu đề | gameId (giữ nguyên) | Mục tiêu toán thật | `kind` Question | Động tác chính | `style` (id art bible) | `layout` / `variant` |
|---|---|---|---|---|---|---|---|
| 1 | `intro` · Tiết học đầu tiên | `mario-bros` | Đếm 1–5 quả (`count`, FRUIT) | `count` | **nhặt** (chạm từng đồng xu) | `pixel-art` — pixel 8-bit bình minh | `rail/a` |
| 2 | `b1` · Các số 0,1,2,3,4,5 | `mario-odyssey` | Đếm 0–5 trái cây/đồ chơi | `count` | **ném** (chạm để ném vào mục tiêu số) | `watercolor` — màu nước loang mềm | `arena/a` |
| 3 | `b2` · Các số 6,7,8,9,10 | `donkey-kong-country` | Đếm 5–10 đồ chơi/trái cây | `count` | **leo** (chạm rung để leo từng nấc) | `carved-wood` — gỗ khắc vân tay | `rail/b` |
| 4 | `b3` · Nhiều hơn, ít hơn, bằng nhau | `pokemon` | So sánh 2 nhóm ≤10: nhiều/ít/bằng | `compareGroups` | **quây** (thả lưới vây một nhóm) | `paper-cut` — giấy cắt dán có nếp gấp | `arena/b` |
| 5 | `b4` · So sánh số | `zelda` | So sánh `> < =` hoặc điền số ≤10 | `compareSign` | **mở** (lật nắp rương) | `wax-crayon` — sáp màu nét tay | `book/a` |
| 6 | `b5` · Mấy và mấy | `animal-crossing` | Tách–gộp ≤10 (`compose`) | `compose` | **trồng** (gieo từng bông vào luống) | `felt-fabric` — vải nỉ mềm, đường kim | `split/a` |
| 7 | `b6` · Luyện tập chung | `mario-party` | Đếm + so sánh nhóm/dấu + tách gộp + dãy số | mixed (5 dạng) | **tung** (tung xí ngầu rồi chọn ô) | `plastic-bricks` — ô nhựa bóng, boardgame kẹo | `board/a` |
| 8 | `b7` · Hình vuông, tròn, tam giác, chữ nhật | `dr-mario` | Nhận dạng & đếm 4 hình phẳng (≤6) | `shape2d` | **thả** (thả viên thuốc vào chai) | `origami` — giấy gấp hình, nét gấp rõ | `bench/a` |
| 9 | `b8` · Thực hành lắp ghép, xếp hình | `mario-maker` | Xếp hình & đếm hình phẳng ≤8 | `shape2d` | **xếp** (đặt khối vào ô) | `clay` — khối đất sét, vân tay mềm | `tray/a` |
| 10 | `b9` · Luyện tập chung (hình phẳng) | `mario-paint` | Nhận/đếm hình + dãy số + đếm đồ chơi | mixed (3 dạng) | **vuốt** (vuốt sáp qua vùng đáp án) | `oil-paint` — sơn dầu trên canvas, nét cọ dày | `bench/b` |
| 11 | `b10` · Phép cộng trong phạm vi 10 | `yoshi-island` | Cộng ≤10: tìm tổng & số hạng thiếu | `add` | **nuốt** (chạm trái cho nuốt vào giỏ) | `mosaic` — mảnh ghép màu | `rail/c` |
| 12 | `b11` · Phép trừ trong phạm vi 10 | `luigis-mansion` | Trừ ≤10, gạch bớt (có trừ bằng chính nó) | `subtract` | **hút** (chạm giữ để hút bóng) | `ink-wash` — mực loang trên giấy | `book/b` |
| 13 | `b12` · Bảng cộng, bảng trừ trong phạm vi 10 | `brain-age` | Gia đình số: `a+b=c`, `c−a=b` | `factFamily` | **viết** (chạm ô để điền số) | `chalkboard` — bảng đen phấn trắng | `board/b` |
| 14 | `b13` · Luyện tập chung (cộng trừ) | `mario-and-luigi` | Cộng/trừ + tìm số thiếu | mixed (3 dạng) | **đẩy** (đẩy bóng qua lại 2 bạn) | `grid-paper` — vở ô li, bút chì xanh | `split/b` |
| 15 | `b14` · Khối lập phương, khối hộp chữ nhật | `pikmin` | Nhận khối & vật thật dạng khối | `solid3d` | **kéo** (kéo khối bằng nhóm trợ lý) | `yarn` — sợi len quấn, lông mềm | `tray/b` |
| 16 | `b15` · Vị trí, định hướng trong không gian | `kirby` | Trên/dưới/trái/phải của vật | `position` | **thổi** (chạm mây để thổi theo hướng) | `cotton` — mây bông gòn hồng phấn | `arena/c` |
| 17 | `b16` · Luyện tập chung (khối & vị trí) | `warioware` | Khối + vị trí + hình phẳng | mixed (3 dạng) | **chớp** (chạm nhanh đúng thẻ lệnh) | `pop-art` — thẻ nổ màu, viền dày | `board/c` |
| 18 | `b17` · Ôn tập các số trong phạm vi 10 | `super-smash-bros` | Đếm, so sánh, dãy số, tách gộp ≤10 | mixed (4 dạng) | **đấm** (đấm vào cờ đáp án trên bệ) | `neon-vector` — ruy băng neon, confetti | `arena/d` |
| 19 | `b18` · Ôn tập phép cộng, phép trừ | `fire-emblem` | Cộng/trừ + gia đình số ≤10 | mixed (3 dạng) | **đi** (đi quân tới ô đáp án) | `woodcut` — bản khắc gỗ, nét cắt rõ | `board/d` |
| 20 | `b19` · Ôn tập hình học | `splatoon` | Hình phẳng + khối + vị trí | mixed (3 dạng) | **bắn** (bắn màu vào mục tiêu) | `spray-paint` — mực xịt trên giấy trắng | `bench/c` |
| 21 | `b20` · Ôn tập chung | `mario-kart` | Ôn 11 dạng, 10 câu + đua/bục | mixed (11 dạng) | **đua** (chạm tăng tốc; đáp án qua thanh đáp án) | `patchwork` — đường đua vá miếng, cờ ca-rô | `track/a` |

**Kiểm chứng động tác khác biệt**: 21 động tác từ điển không trùng — nhặt, ném, leo, quây, mở, trồng, tung, thả, xếp, vuốt, nuốt, hút, viết, đẩy, kéo, thổi, chớp, đấm, đi, bắn, đua.

---

## 2. Chi tiết 21 game

Mỗi phần: luật / thể hiện câu / đúng-sai / giá trị nộp / 2 edge case có kết quả cụ thể / knob có phạm vi / 1 acceptance criterion Given–When–Then.

### 01 · `intro` — `mario-bros` · `rail/a` · `pixel-art`
- **Luật**: `countFor(q)` đồng xu nằm trên một đường nền. Bé chạm từng xu, `collect()` chặn chạm trùng. Khi `|set| === countFor` thì nút "Đã đếm xong" sáng; bấm để nộp.
- **Câu hỏi**: `kind=count`, text/say lấy từ `q.text`/`q.say`; hàng đáp án của lesson.js vẫn ở dưới stage.
- **Đúng/Sai**: đúng khi tập đã chạm khớp `q.answer`; sai → `onWrong` reset `collected=0`, bỏ hết class `is-collected`, giữ sao nguyên.
- **`onAnswer`**: `submit(q, collected)`; sai lệch → không gọi, hiện "Bé đếm lại nhé".
- **Edge 1**: `q.answer=0` → vùng xu trống, nút "🪙 0 — Đã đếm xong" hiện ngay; bấm → `onAnswer(0)`; không có xu để chạm.
- **Edge 2**: bé chạm cùng xu #2 ba lần → `collected=1`, không tăng; chỉ nộp được khi chạm đủ N xu khác nhau.
- **Knob**: `maxCoins` 1–10 (mặc định 5); `coinPopMs` 120–500; `wrongShakeMs` 200–800.
- **AC**: Given `q.answer=3` và 3 xu hiển thị · When bé chạm 3 xu khác nhau · Then `onAnswer(3)` được gọi đúng 1 lần và không có lần gọi thứ 2.

### 02 · `b1` — `mario-odyssey` · `arena/a` · `watercolor`
- **Luật**: `countFor(q)` đồ vật ở cuối đường bay; 3 mục tiêu số nằm dọc vòng cung, nhãn lấy từ `q.choices[i].label`. Bé chạm một mục tiêu → vật bay theo cung → nộp.
- **Câu hỏi**: `kind=count`, min 0–5; không tự thêm số, mục tiêu luôn là 3 choice có sẵn.
- **Đúng/Sai**: đúng khi mục tiêu có `value === q.answer`; sai → `onWrong` làm cung rung nhẹ, mục tiêu nhấp nháy đèn → bé chọn lại, sao không đổi.
- **`onAnswer`**: `submit(q, target.value)` ngay khi chạm (không đợi hết `throwMs` để tránh mất lượt).
- **Edge 1**: `q.answer=0` → vùng đồ vật trống, mục tiêu "0" vẫn hiện; chạm "0" → `onAnswer(0)`.
- **Edge 2**: chạm vùng trời ngoài 3 mục tiêu → không gọi `onAnswer`, hiện "Bé nhắm vào ô số nhé", không phạt.
- **Knob**: `throwMs` 250–700; `targetRadiusPx` 64–140; `arcHeightPx` 60–220.
- **AC**: Given `q.answer=2`, choices `[0,2,4]` · When chạm mục tiêu "4" · Then `onAnswer(4)` và `onWrong` được gọi; khi chạm "2" thì `onAnswer(2)` đúng 1 lần.

### 03 · `b2` — `donkey-kong-country` · `rail/b` · `carved-wood`
- **Luật**: thang dọc có `countFor(q)` nấc, mỗi nấc 1 chuối; bé chạm nấc kế tiếp để leo lên 1 nấc (`collect()` chặn nấc đã leo). Leo tới đỉnh → nút "Đã hái xong" sáng.
- **Câu hỏi**: `kind=count`, 5–10 đồ vật; số nấc = số vật, không thêm nấc trang trí có chuối.
- **Đúng/Sai**: đúng khi số nấc đã leo = `q.answer`; sai → `onWrong` đưa nhân vật về nấc 0, giữ nguyên tổng số nấc.
- **`onAnswer`**: `submit(q, climbed)`; chạm nấc #k khi chưa leo nấc #k−1 → bỏ qua.
- **Edge 1**: `q.answer=10` → render đúng 10 nấc; không tạo nấc thứ 11; nút xong hiện ở nấc 10.
- **Edge 2**: màn hình ngang ≤ 600px chiều cao → thu nhỏ `rungHeightPx` xuống 28px nhưng nút vẫn ≥64px; nếu vẫn kẹt, bật cuộn dọc trong stage.
- **Knob**: `climbMs` 180–450; `rungHeightPx` 28–56; `maxRungs` 10–12 (cứng ≥10).
- **AC**: Given `q.answer=8` · When chạm 8 nấc liên tiếp rồi bấm "Đã hái xong" · Then `onAnswer(8)` đúng 1 lần, `onAnswer` không bao giờ nhận 9.

### 04 · `b3` — `pokemon` · `arena/b` · `paper-cut`
- **Luật**: 2 cụm sinh vật nổi rời rạc, không lưới/không trục. Bé chạm một cụm → lưới vây cụm đó; chạm nút giữa "Bằng nhau" nếu 2 cụm cùng số.
- **Câu hỏi**: `kind=compareGroups`; nhãn 3 đích lấy từ `q.choices` (`left`, `right`, `equal`) — không hardcode "Nhóm 1/2" nếu choice.label khác.
- **Đúng/Sai**: đúng khi đích vây có `value === q.answer`; sai → `onWrong` thu lưới về, 2 cụm giữ nguyên vị trí.
- **`onAnswer`**: `submit(q, caged.value)` ngay khi lưới chạm cụm.
- **Edge 1**: hai cụm bằng nhau (`q.answer='equal'`) → cả 2 cụm có cùng số, đích "Bằng nhau" vẫn hiện và là đáp án đúng.
- **Edge 2**: chạm vùng trống giữa 2 cụm → lưới bay ra rồi về, không `onAnswer`, không phạt, có thể thử lại vô hạn.
- **Knob**: `netMs` 300–700; `clusterGapPx` 80–240; `clusterRadiusPx` 90–170.
- **AC**: Given `q.answer='right'` · When chạm cụm phải · Then `onAnswer('right')` đúng 1 lần; chạm cụm trái → `onWrong`.

### 05 · `b4` — `zelda` · `book/a` · `wax-crayon`
- **Luật**: 3 rương xếp quanh ổ khoá tâm theo cung ~120°. Bé chạm nắp rương → nắp lật, nội dung đáp án hiện, nộp.
- **Câu hỏi**: `kind=compareSign`. Nếu `q.choiceRender==='sign'` → 3 nắp mang `> < =`; nếu `'number'` → 3 nắp mang số từ `q.choices`.
- **Đúng/Sai**: đúng khi rương mở có `value === q.answer`; sai → `onWrong` đóng nắp, ổ khoá rung, không đổi dấu/phép.
- **`onAnswer`**: `submit(q, chest.value)`.
- **Edge 1**: `mode='number'` (`q.choices` là số, không có dấu) → game KHÔNG vẽ dấu lên nắp; dùng `choice.label`. Chế độ này thường có `equation.tokens[0].type === 'slot'`.
- **Edge 2**: `a === b` → `q.answer='='`; rương "=" mở; 2 số trên bệ bằng nhau; không hiện thông báo "bằng nhau" riêng (tránh lặp với `q.cheer`).
- **Knob**: `lidMs` 300–800; `chestSizePx` 96–180; `ringRadiusPx` 140–280.
- **AC**: Given `q.choiceRender='number'`, `q.answer=7` · When chạm rương có nhãn "7" · Then `onAnswer(7)` và không có glyph `>`,`<`,`=` nào được render trong stage.

### 06 · `b5` — `animal-crossing` · `split/a` · `felt-fabric`
- **Luật**: 2 luống = 2 hàng ô đất. Trường hợp thường: bé gieo từng bông vào 2 luống, tổng = `g[0].count+g[1].count`. Trường hợp `masked`: luống 1 đã gieo sẵn `g[0].count` (chỉ đọc), bé chỉ gieo luống 2.
- **Câu hỏi**: `kind=compose`; đọc `question.visual.groups`; `text` ("X và Y được mấy?" / "T gồm X và mấy?") quyết định nhánh.
- **Đúng/Sai**: đúng khi `actionValue(q) === q.answer`; sai → `onWrong` xoá các bông bé vừa gieo, luống masked vẫn giữ số cũ, không trừ sao.
- **`onAnswer`**: `submit(q, actionValue(q))`.
- **Edge 1**: `q.visual.groups[1].masked === true` → luống 1 có `g[0].count` bông chín, `pointer-events:none`; bé gieo đúng `g[1].count` bông ở luống 2 → `onAnswer(g[1].count)`. *(Đây là điểm chỉnh nhẹ so với module mẫu hiện tại: mẫu cho chạm cả 2 luống)*.
- **Edge 2**: bé gieo vượt quá số bông cần (kể cả chạm ô đã gieo) → `collect()` chặn, số bông không tăng, không tự nộp.
- **Knob**: `growMs` 250–700; `bedCapacity` 5–10; `soilCellPx` 64–96.
- **AC**: Given `groups=[{count:4},{count:3,masked:true}]` · When bé gieo 3 bông ở luống 2 · Then `onAnswer(3)` đúng 1 lần và luống 1 không nhận chạm (`aria-disabled=true`).

### 07 · `b6` — `mario-party` · `board/a` · `plastic-bricks`
- **Luật**: bàn đường đi 12 ô + xí ngầu ở tâm. Bé chạm xí ngầu → quân tiến đến ô đại diện cho `question.kind` hiện tại; 3 ô đáp án sáng; bé chạm ô đáp án.
- **Câu hỏi**: `kind` thuộc `{count, compareGroups, compareSign, compose, sequence}`; mỗi kind có một ô biểu tượng riêng trên bàn; nội dung vẫn lấy từ `q`.
- **Đúng/Sai**: đúng khi ô chạm có `value === q.answer`; sai → `onWrong` quân lùi về ô khởi đầu, xí ngầu reset, không đổi câu.
- **`onAnswer`**: `submit(q, tile.value)`; xí ngầu tự thay mặt không gọi `onAnswer`.
- **Edge 1**: `q.kind='sequence'` → ô trung tâm vẽ dãy `q.visual.values` (ô trống là `null` → ký hiệu "?"); 3 ô đáp án là số.
- **Edge 2**: bé tung xí ngầu 5 lần liên tiếp → quân đi theo mặt ngẫu nhiên nhưng **bộ 3 đáp án không đổi**, không có lợi thế (`q` là nguồn chân lý); không giới hạn số lần tung.
- **Knob**: `rollMs` 400–900; `tileCount` 8–16; `tileSizePx` 64–96.
- **AC**: Given `q.answer=6` · When chạm xí ngầu 3 lần rồi chạm ô "6" · Then `onAnswer(6)` đúng 1 lần và `question` không đổi.

### 08 · `b7` — `dr-mario` · `bench/a` · `origami`
- **Luật**: chai đứng, viên thuốc nằm trong khay. Bé chạm viên → viên rơi vào rãnh chai; khi đã thả đúng viên chứa đáp án → nộp.
- **Câu hỏi**: `kind=shape2d`. `identify` → 3 viên mang hình từ `q.choices[i].shape`; `count` → 3 viên mang số từ `q.choices`.
- **Đúng/Sai**: đúng khi viên thả có `value === q.answer`; sai → `onWrong` viên bay về khay, chai rung nhẹ.
- **`onAnswer`**: `submit(q, pill.value)`.
- **Edge 1**: chế độ `count` → `q.choiceRender='number'`, KHÔNG vẽ viên hình; `q.visual.items` là các hình cần đếm, nằm ngoài chai.
- **Edge 2**: thả viên ra ngoài miệng chai (chạm sai vùng) → viên không rơi, hiện "Thả vào chai nhé", không `onAnswer`, không phạt.
- **Knob**: `dropMs` 350–800; `vialSlots` 3–6; `pillSizePx` 64–100.
- **AC**: Given `q.kind='shape2d'`, `mode='identify'`, `q.answer='triangle'` · When chạm viên tam giác · Then `onAnswer('triangle')` đúng 1 lần.

### 09 · `b8` — `mario-maker` · `tray/a` · `clay`
- **Luật**: lưới 3×3 ô; tranh mẫu mờ ở nền cho bé đếm số hình cần xếp. Bé chạm ô để đặt khối, chạm lại để bỏ. Khi số khối = 1 choice → tự nộp.
- **Câu hỏi**: `kind=shape2d`, `mode='count'`, `maxCount=8`; số khối cần xếp chính là `q.answer`.
- **Đúng/Sai**: đúng khi `placed === q.answer`; sai → `onWrong` dọn sạch khối, tranh mẫu giữ nguyên, sao không đổi.
- **`onAnswer`**: `submit(q, placed)` chỉ khi `find(q, placed)` tồn tại.
- **Edge 1**: `q.answer=8` → capacity 9 ≥ 8 ✓; bé xếp đúng 8 khối → nộp 8.
- **Edge 2**: bé xếp 9 khối (đầy lưới) → `find(q,9)` không có → KHÔNG nộp, hiện "Bè bớt 1 viên nhé", bé chạm ô bất kỳ để bỏ 1 khối.
- **Knob**: `gridCells` 6–12 (phải ≥ `maxCount`); `snapMs` 120–300; `ghostOpacity` 0.15–0.35.
- **AC**: Given `q.answer=8`, lưới 9 ô · When bé xếp 9 khối · Then `onAnswer` không được gọi và text "Bè bớt 1 viên" xuất hiện trong ≤0.5s.

### 10 · `b9` — `mario-paint` · `bench/b` · `oil-paint`
- **Luật**: canvas có khung + 3 vùng đáp án (mỗi vùng = 1 choice). Bé vuốt ngón/chuột qua một vùng; khi nhấc → nộp vùng đầu tiên đã chạm.
- **Câu hỏi**: mixed `{shape2d, sequence, count}`; nhãn vùng lấy từ `choice.label`/`choice.shape`/`choice.glyph`.
- **Đúng/Sai**: đúng khi vùng vuốt có `value === q.answer`; sai → `onWrong` xoá nét sáp, canvas trắng lại, không đổi câu.
- **`onAnswer`**: `submit(q, firstZone.value)` tại thời điểm `pointerup`.
- **Edge 1**: `q.kind='shape2d'` identify → 3 vùng vẽ hình SVG bằng `choice.shape`, không dùng text.
- **Edge 2**: nét vuốt đi qua 2 vùng → **vùng đầu tiên đi vào thắng**; vùng thứ hai bị bỏ qua; `locked` chặn `onAnswer` lần 2.
- **Knob**: `strokeMinPx` 40–120 (dưới ngưỡng → coi là chạm, không nộp); `zoneSizePx` 96–180; `crayonOpacity` 0.5–0.9.
- **AC**: Given 3 vùng A,B,C và nét vuốt từ A sang B · When nhấc · Then `onAnswer` chỉ nhận `A.value`, đúng 1 lần.

### 11 · `b10` — `yoshi-island` · `rail/c` · `mosaic`
- **Luật**: một đường nền, miệng/giỏ ở cuối. 2 nhóm đồ từ `q.visual.groups`; bé chạm từng đồ để nuốt vào giỏ; hết đồ → nộp.
- **Câu hỏi**: `kind=add`; `missing=['result']`; `askAddend` đọc từ `groups[1].masked`.
- **Đúng/Sai**: đúng khi `actionValue(q) === q.answer`; sai → `onWrong` nhả hết đồ ra vị trí cũ, giỏ rỗng.
- **`onAnswer`**: `submit(q, actionValue(q))`.
- **Edge 1**: `groups[0].count=0` (cộng với 0) → đĩa nhóm 1 trống, hiện nhãn "0 quả"; bé vẫn nuốt nhóm 2.
- **Edge 2**: `first+second=10` → đúng 10 lần chạm; giỏ capacity 10; chạm lần 11 không có objects để chạm.
- **Knob**: `swallowMs` 180–400; `mouthCapacity` 5–10; `objectSizePx` 64–96.
- **AC**: Given `groups=[{count:0},{count:6}]` · When bé chạm 6 đồ ở nhóm 2 · Then `onAnswer(6)` đúng 1 lần và nhóm 1 hiển thị "0 quả".

### 12 · `b11` — `luigis-mansion` · `book/b` · `ink-wash`
- **Luật**: bóng nằm trên vòng xoáy quanh tâm. Bé chạm giữ để hút; mỗi bóng hút được 1, dừng khi số bóng hút đúng `q.visual.groups[0].crossedOut`; phần còn lại = đáp án → nộp.
- **Câu hỏi**: `kind=subtract`; `first = groups[0].count`, `second = groups[0].crossedOut`.
- **Đúng/Sai**: đúng khi `first - vacuumed === q.answer`; sai → `onWrong` thả bóng về vòng, xoáy dừng, sao không đổi.
- **`onAnswer`**: `submit(q, first - vacuumed)`.
- **Edge 1**: `second === first` → hút hết bóng, `first-vacuumed=0`; nút "👻 0 — Hết bóng rồi" hiện; bấm → `onAnswer(0)`.
- **Edge 2**: bé hút vượt quá `second` → game chặn ở `second`, hiện "Bé hút đủ X cái thôi nhé"; KHÔNG nộp sai do lỗi thao tác; reduced motion → bóng mờ dần tại chỗ, không xoáy.
- **Knob**: `suckMs` 250–600; `spiralTurns` 1–3; `ghostSizePx` 64–100.
- **AC**: Given `first=7, crossedOut=7` · When bé hút đủ 7 bóng · Then nút "0" hiện và `onAnswer(0)` đúng 1 lần.

### 13 · `b12` — `brain-age` · `board/b` · `chalkboard`
- **Luật**: vở ô li; `q.equation.tokens` rendered thành các ô; ô `type='slot'` là ô trống. Bé chạm một ô số trong bàn phím 3 choice để điền vào slot; nộp ngay.
- **Câu hỏi**: `kind=factFamily`; `q.equation.alt` dùng làm `aria-label` cho dãy ô.
- **Đúng/Sai**: đúng khi số điền có `value === q.answer`; sai → `onWrong` xoá số trong slot, bàn phím sáng lại.
- **`onAnswer`**: `submit(q, key.value)`.
- **Edge 1**: token đầu là `slot`? Không xảy ra với `factFamily` (slot luôn ở cuối); nếu slot ở giữa (compareSign number) → game vẫn render đúng vị trí nhờ `tokens`.
- **Edge 2**: bé chạm ô đã có số → KHÔNG thay đổi, KHÔNG nộp; chỉ slot nhận giá trị.
- **Knob**: `writeMs` 200–500; `cellSizePx` 72–120; `slotPulseHz` 0.5–2 (reduced motion → 0).
- **AC**: Given `tokens=[7,+,2,=,slot]`, `q.answer=9` · When chạm ô "9" · Then `onAnswer(9)` đúng 1 lần và slot hiển thị "9".

### 14 · `b13` — `mario-and-luigi` · `split/b` · `grid-paper`
- **Luật**: 2 đường nền song song, mỗi đường 1 bạn; bóng bắt đầu ở bạn trái. Bé chạm để đẩy bóng sang bạn phải (mỗi lần đẩy lộ thêm 1 token của phép tính); 3 thẻ đáp án hiện ở cuối, chạm để nộp.
- **Câu hỏi**: mixed `{add, subtract, factFamily}`; ký hiệu `+`/`−` lấy từ `q.equation.tokens`, không tự gán.
- **Đúng/Sai**: đúng khi thẻ chạm có `value === q.answer`; sai → `onWrong` bóng về bạn trái, token ẩn lại.
- **`onAnswer`**: `submit(q, card.value)`.
- **Edge 1**: `q.kind='subtract'` → token thứ 2 là `"-"`; động tác đẩy giữ nguyên, không đổi luật.
- **Edge 2**: bóng đang ở bạn phải, bé chạm lại → bóng không đi tiếp, KHÔNG `onAnswer` (idempotent), hiện "Bấm thẻ số bên phải nhé".
- **Knob**: `passMs` 300–700; `passesPerQuestion` 1–3; `cardSizePx` 72–120.
- **AC**: Given `q.kind='subtract'`, `q.answer=4` · When đẩy 1 lần rồi chạm thẻ "4" · Then `onAnswer(4)` đúng 1 lần và ký hiệu render là `−`.

### 15 · `b14` — `pikmin` · `tray/b` · `yarn`
- **Luật**: cột khối xếp chồng; nhóm trợ lý tí hon ở dưới. Bé chạm nhóm trợ lý rồi chạm khối → khối trượt ra, nộp.
- **Câu hỏi**: `kind=solid3d`. `identify` → khối mang `choice.shape`; `realWorld` → khối có glyph `choice.glyph` (📦/📕/🎲/⚽/🥫).
- **Đúng/Sai**: đúng khi khối kéo có `value === q.answer`; sai → `onWrong` khối trượt lại chỗ cũ, nhóm trợ lý về dưới.
- **`onAnswer`**: `submit(q, block.value)`.
- **Edge 1**: `mode='realWorld'` → chạm khối "quyển sách" (`value='book'`) → `onAnswer('book')`; KHÔNG render tên "khối hộp chữ nhật" lên khối (chỉ hiện ở `q.text`).
- **Edge 2**: chạm nhóm trợ lý rồi chạm cỏ/trống → trợ lý quay về, không `onAnswer`, không phạt; phải chọn khối mới kích hoạt nộp.
- **Knob**: `pullMs` 400–900; `helperCount` 3–6; `blockSizePx` 72–120.
- **AC**: Given `q.mode='realWorld'`, `q.answer='book'` · When kéo khối có glyph 📕 · Then `onAnswer('book')` đúng 1 lần.

### 16 · `b15` — `kirby` · `arena/c` · `cotton`
- **Luật**: 4 mây nổi tự do theo 4 hướng ↑↓←→ quanh cái hộp; bé chạm mây → một cơn gió thổi vật tới hướng đó, nộp.
- **Câu hỏi**: `kind=position`; `answer ∈ {on,under,left,right}`; nhãm mây lấy từ `q.choices[i].icon` + `label`.
- **Đúng/Sai**: đúng khi hướng thổi `value === q.answer`; sai → `onWrong` vật về vị trí ban đầu, mây rung, sao không đổi.
- **`onAnswer`**: `submit(q, cloud.value)`.
- **Edge 1**: `q.answer='left'` → chạm mây trái → `onAnswer('left')`; chạm mây phải → `onWrong`.
- **Edge 2**: CSS làm vật và hộp chồng lên nhau → game dùng `q.visual.rel` làm nguồn chân lý, KHÔNG đoạn vị trí pixel; luôn có đúng 1 mây đáp án.
- **Knob**: `puffMs` 250–600; `cloudOffsetPx` 90–220; `iconSizePx` 64–100.
- **AC**: Given `q.visual.rel='under'` dù vật bị CSS đè lên hộp · When chạm mây ↓ · Then `onAnswer('under')` đúng 1 lần.

### 17 · `b16` — `warioware` · `board/c` · `pop-art`
- **Luật**: 3 thẻ quay quanh tâm, mỗi thẻ = 1 choice; giữa hiện `q.text` làm lệnh. Bé chạm đúng thẻ trong `windowMs`. Hết giờ → thẻ vẫn đứng yên, hiện "Chọn từ từ cũng được", KHÔNG trừ sao, KHÔNG tự nộp.
- **Câu hỏi**: mixed `{solid3d, position, shape2d}`; nhãn thẻ lấy từ `choice.label`/`choice.shape`/`choice.icon`.
- **Đúng/Sai**: đúng khi thẻ có `value === q.answer`; sai → `onWrong` thẻ lắc, carousel dừng 400ms rồi quay lại.
- **`onAnswer`**: `submit(q, card.value)`; `locked` chặn thẻ thứ 2.
- **Edge 1**: `reducedMotion=true` → `windowMs` bị bỏ qua, không đồng hồ đếm ngược; thẻ tĩnh, vẫn nộp bình thường.
- **Edge 2**: bé chạm 2 thẻ trong cùng 1 khung hình → chỉ thẻ đầu tiên gọi `onAnswer`; thẻ thứ hai bị `locked` chặn, không sinh lần 2.
- **Knob**: `windowMs` 3000–8000 (mặc định 5000; dưới 3000 bị cấm vì trẻ 6 tuổi); `cardSpinMs` 200–500; `cardSizePx` 96–160.
- **AC**: Given `windowMs=5000`, `q.answer='cube'` · When chờ 6000ms rồi chạm thẻ "cube" · Then `onAnswer('cube')` vẫn xảy ra đúng 1 lần và không có hình phạt timeout.

### 18 · `b17` — `super-smash-bros` · `arena/d` · `neon-vector`
- **Luật**: 3 bệ chồng tầng, mỗi bệ cắm 1 cờ = 1 choice. Bé chạm cờ → nhân vật nhảy lên bệ và đấm cờ, nộp.
- **Câu hỏi**: mixed `{count, compareSign, sequence, compose}`; cờ mang `choice.label` (số hoặc dấu).
- **Đúng/Sai**: đúng khi cờ đấm có `value === q.answer`; sai → `onWrong` nhân vật rơi về bệ 1, cờ rung.
- **`onAnswer`**: `submit(q, flag.value)`.
- **Edge 1**: `q.kind='compareSign'` → cờ mang `> < =`; KHÔNG tự đổi thành số; `q.choices` là nguồn nhãn.
- **Edge 2**: chạm bệ trống (không có cờ) → nhân vật nhảy tại chỗ, KHÔNG `onAnswer`, KHÔNG phạt.
- **Knob**: `punchMs` 350–800; `platformCount` 2–4 (phải ≥3 cho 3 choice); `flagSizePx` 72–120.
- **AC**: Given `q.answer='='` · When chạm cờ "=" trên bệ 3 · Then `onAnswer('=')` đúng 1 lần và nhân vật đứng ở bệ 3 trong `punchMs`.

### 19 · `b18` — `fire-emblem` · `board/d` · `woodcut`
- **Luật**: bàn cờ 4×3; quân đứng ở ô (0,1); 3 ô đích mang nhãn choice. Bé chạm đích → quân đi từng ô tới đích, nộp.
- **Câu hỏi**: mixed `{add, subtract, factFamily}`; mỗi kind có một nhãn phép tính trên đầu bàn, lấy từ `q.equation`.
- **Đúng/Sai**: đúng khi ô đích có `value === q.answer`; sai → `onWrong` quân đi về (0,1), ô đích mờ đi 400ms.
- **`onAnswer`**: `submit(q, tile.value)` sau khi quân tới ô (không trễ quá `stepMs*cols`).
- **Edge 1**: `q.kind='subtract'` → nhãn đầu bàn là `a − b = ?`; động tác đi không đổi.
- **Edge 2**: chạm lại ô đang đứng → quân KHÔNG di chuyển, KHÔNG `onAnswer`; không có ô bị chặn nên mọi đích đều đi tới được.
- **Knob**: `stepMs` 180–400; `boardCols` 3–6; `tileSizePx` 64–96.
- **AC**: Given `q.answer=5`, quân ở (0,1) · When chạm ô đích "5" · Then `onAnswer(5)` đúng 1 lần sau ≤`stepMs*4` ms.

### 20 · `b19` — `splatoon` · `bench/c` · `spray-paint`
- **Luật**: súng ở góc dưới trái; 3 mục tiêu trên cung, mỗi mục tiêu = 1 choice. Bé chạm mục tiêu → tia mực cong tới đó, nộp.
- **Câu hỏi**: mixed `{shape2d, solid3d, position}`; `choiceRender='shape'` → mục tiêu vẽ SVG hình, dùng `choice.aria` làm nhãm.
- **Đúng/Sai**: đúng khi mục tiêu có `value === q.answer`; sai → `onWrong` mực bị hút ngược, mục tiêu rung.
- **`onAnswer`**: `submit(q, target.value)` ngay khi chạm.
- **Edge 1**: `q.choiceRender='shape'` → KHÔNG render chữ lên mục tiêu, chỉ SVG + `aria-label`; tránh lộ đáp án bằng text.
- **Edge 2**: chạm vùng trống → một vệt mực trang trí xuất hiện, KHÔNG `onAnswer`, KHÔNG phạt; tối đa 3 vệt trang trí rồi tự mờ dần (tránh rác thị giác).
- **Knob**: `shotMs` 300–700; `targetRadiusPx` 64–140; `maxDecorSplats` 1–3.
- **AC**: Given `q.answer='circle'`, `choiceRender='shape'` · When chạm mục tiêu hình tròn · Then `onAnswer('circle')` đúng 1 lần và mục tiêu có `aria-label='hình tròn'`.

### 21 · `b20` — `mario-kart` · `track/a` · `patchwork`
- **Luật**: giữ nguyên cuộc đua 1 đối 1 + bục trao thưởng của `Race`/`RaceUI`. Bé trả lời qua hàng đáp án của lesson.js; đúng → xe tăng tốc, sai → trượt bánh. Module kart chỉ thêm lớp trang trí + nhãn chặng.
- **Câu hỏi**: mixed 11 dạng, 10 câu; `q.choices` có thể có 3 **hoặc 4** nút (position). Game không render đáp án, chỉ đọc số chặng.
- **Đúng/Sai**: do `lesson.js` + `Race` xử lý như cũ; `onCorrect`/`onWrong` của kart chỉ đổi class CSS.
- **`onAnswer`**: **ngoại lệ đã chốt ADR-0002**: module kart KHÔNG gọi `onAnswer` (tránh sửa `Race`/69 test); đáp án vẫn đi qua `handlePick` của lesson.js. Giữ nguyên.
- **Edge 1**: `q.kind='position'` → 4 nút đáp án; nhãn chặng đua vẫn hiện "Chặng n"; KHÔNG cố gắng ép về 3 ô.
- **Edge 2**: registry thiếu factory `mario-kart` → fallback chạy màn cũ, không crash; `destroy()` phải trả class `is-kart-themed` lại cho `.race-hud`.
- **Knob**: `kartBoostMs` 300–1000; `wrongShakeMs` 200–800; `celebrateMs` 600–1600 (đều đọc `tuning.game`).
- **AC**: Given bài `b20`, 10 câu mixed · When trả lời đúng 1 câu · Then `Race.correct()` được gọi, module kart chỉ thêm class `is-boost`, và `onAnswer` của kart KHÔNG được gọi.

---

## 3. Field MỚI đề xuất cho `GameMap`

Tất cả đều **tuỳ chọn**, thêm vào `GameEntry` hiện tại. Không đổi `gameId`, `tribute`, `title`, `palette`, `bg`, `mechanic`, `phase`; không đổi thứ tự 21 entry; không đổi `Object.freeze`.

| Field | Kiểu | Giá trị mặc định khi thiếu | Người đọc | Ý nghĩa |
|---|---|---|---|---|
| `style` | `string \| null` | `null` → fallback theo `gameId` | card renderer, art pipeline | Id phong cách art canonical từ art bible (21 id unique ở mục 1); sinh class `style--{style}`. |
| `layout` | `string \| null` | `null` → `'scene'` (khung cũ) | `lesson.js` | Archetype cấu trúc của ADR-0003: `rail`, `arena`, `book`, `split`, `board`, `bench`, `tray`, `track`; sinh class `stage--{layout}`. |
| `variant` | `string \| null` | `null` → `'a'` | `lesson.js` | Biến thể trong archetype (`a`/`b`/`c`/`d`): đổi trục/hướng/số cột/kiểu điều khiển; ghi vào `data-variant`. Ghép thành `rail/a` … `track/a`. |
| `cover` | `string \| null` | `null` → `bg` (`Asset/hd/{lessonId}.webp`) | thẻ bài (home/collection), màn intro | `Asset/covers/{lessonId}.webp`, 16:9, ≤400 KB. Ảnh **trang trí**: `alt=""` + `aria-hidden`, không có field alt riêng. |
| `sprite` | `string \| null` | `null` → emoji/CSS fallback như 3 module mẫu | game module / `KM.Sprite` | `Asset/sprites/{lessonId}.webp`; `null` = không tạo canvas. |
| `introText` | `string \| null` | `null` → `title + '. ' + mechanic + '.'` | màn intro trước bài | 1–2 câu tiếng Việt ≤60 ký tự, khác `mechanic`. |
| `inputHint` | `string \| null` | `null` → hint nội bộ của module | game module, màn intro | Dòng hướng dẫn động tác, ví dụ "Chạm từng đồng xu để đếm nhé!". |
| `motionMs` | `number \| null` | `null` → `240` (ADR-0003) | game module / `KM.Sprite` | Chu kỳ đổi frame idle (ms); **bỏ qua khi reduced motion**. |

**Quy tắc tương thích ngược (bắt buộc)**

1. Đọc luôn dạng `entry && entry.field != null ? entry.field : DEFAULT`. Không dùng `entry.field || DEFAULT` cho `motionMs` (0 là giá trị hợp lệ khi reduced motion).
2. Entry cũ thiếu field → thẻ bài dùng gradient chương, intro dùng `title`, sprite dùng emoji, motion dùng 240 ms; **0 console error**.
3. `forLesson(lessonId)` vẫn đối chiếu theo thứ tự positional; không chèn/xoá entry.
4. `GameRegistry` vẫn khoá theo `gameId`; thêm field không ảnh hưởng đăng ký/fallback.
5. `lesson.js` hiện chỉ đọc `bg`, `palette`, `tribute` — giữ nguyên; field mới chỉ được tiêu thụ bởi card renderer / intro component / game module tự đọc `ctx.gameMapEntry` hoặc `KM.GameMap.forLesson(id)`.
6. Không field nào được lưu vào `kidmath.v1`; intro/cover là state phiên, không phải progress.
7. `public/` là bản mirror do build sinh — sau khi sửa `js/data/game-map.js` phải chạy lại build; không sửa tay `public/js/data/game-map.js`.
8. `motionMs` nằm ngoài `tuning.game`; nếu sau này đưa vào tuning thì `motionMs` trên entry chỉ là override, không được hardcode trong module.

---

## 4. Chống trùng khung — khác nhau ở CẤU TRÚC, không chỉ màu

8 archetype của ADR-0003 (`rail`, `arena`, `book`, `split`, `board`, `bench`, `tray`, `track`) được định nghĩa bằng **hình học + luật di chuyển**. Cùng archetype thì bắt buộc khác `variant` cấu trúc (trục/hướng/số cột/kiểu điều khiển) như cột cuối. Không được phép chỉ đổi `palette` rồi gọi là game khác.

| Archetype (`layout`) | Định nghĩa cấu trúc (geometry) | Game dùng (`layout/variant`) | Variant cấu trúc bắt buộc (khác nhau thật) |
|---|---|---|---|
| `rail` | Đường ngang (trục dọc khi `variant=b`); sprite đi trên rail, vật nằm dọc đường. Rail full width, item ≥64px. | 01 (`rail/a`), 03 (`rail/b`), 11 (`rail/c`) | 01: mặt đất phẳng, xu rời rạc, **không có đích cuối** · 03: **trục dọc**, leo từng nấc thang hở · 11: **có miệng/giỏ ở cuối rail**, đồ đi vào giỏ. |
| `arena` | Trường mở, target nằm rời rạc trong `inset:0`, dụng cụ ở đáy; không lưới/trục cố định. Target ≥64px. | 02 (`arena/a`), 04 (`arena/b`), 16 (`arena/c`), 18 (`arena/d`) | 02: **3 mục tiêu số trên cung bay**, vật ném từ dưới lên · 04: **2 cụm dày + lưới vây**, đích ở giữa · 16: **4 mây quanh 1 tâm** + hướng gió đẩy vật · 18: **3 bệ chồng tầng có trọng lực**, nhân vật nhảy đấm cờ. |
| `book` | Trang sách mở: một trang ảnh/đối tượng, một trang text/so sánh; gáy ở giữa. Mobile xếp dọc ≤148px. | 05 (`book/a`), 12 (`book/b`) | 05: **3 rương tĩnh quanh ổ khoá**, đích ở ngoài · 12: **bóng hút theo xoáy động vào tâm**, đích ở tâm. |
| `split` | Hai vùng song song (trái/phải) + nhãn từng vùng; `<720px` xếp chồng dọc. | 06 (`split/a`), 14 (`split/b`) | 06: **2 luống đất**, mỗi ô là chỗ gieo · 14: **2 đường chuyền bóng qua lại**, mỗi lần đẩy lộ 1 token phép tính. |
| `board` | Lưới ô có viền/khung riêng, điều khiển bằng chạm/digits; khác `tray` ở chỗ có "đường đi" hoặc bàn phím số. | 07 (`board/a`), 13 (`board/b`), 17 (`board/c`), 19 (`board/d`) | 07: **xí ngầu + quân đi vòng**, ô trung tâm theo `kind` · 13: **bảng tính tĩnh**, chỉ 1 slot nhận chạm, không quân · 17: **carousel 3 thẻ quay**, có timeout mềm · 19: **quân đi từ ô (0,1) tới đích**, có đường z. |
| `bench` | Bàn thao tác giữa + thanh công cụ ngang (khay thuốc/bảng màu/súng); thanh công cụ cuộn ngang, không đẩy dọc. | 08 (`bench/a`), 10 (`bench/b`), 20 (`bench/c`) | 08: **chai đứng + viên rơi vào rãnh**, công cụ là khay thuốc · 10: **khung canvas + bảng màu**, đầu vào là vuốt qua vùng · 20: **súng ở góc bàn**, 3 mục tiêu trên cung, tia để lại vệt mực. |
| `tray` | Khay xếp mảnh/khối, ô trống viền đứt nét, nháy theo số; full width, không drag-only. | 09 (`tray/a`), 15 (`tray/b`) | 09: **khay lưới vuông có tranh mẫu mờ**, chạm để đặt/bỏ khối · 15: **cột khối cứng + nhóm trợ lý kéo ngang ra**. |
| `track` | Đường đua ngang + HUD chặng, bục nhỏ góc; chiều cao nén như `.game-stage--kart`. | 21 (`track/a`) | Duy nhất: đường đua 1 đối 1 + bục 2 bậc, giữ nguyên `Race`/`RaceUI`. |

> Chú ý: số thứ tự/cặp trong cột "Game dùng" lấy từ mục 1/2 (không phải lessonId). `rail/b` (bài 03) là **trục dọc** dù `rail` thường là ngang — ADR-0003 cho phép đổi trục theo `variant`. Bài 18 (`super-smash-bros`) là `arena/d`; bài 19 (`fire-emblem`) là `board/d`; bài 20 (`b19`) là `bench/c`. Không có 2 bài liên tiếp dùng cùng `(layout, variant)`; mỗi archetype nhận ≤4 bài.

**Bổ sung để mỗi bài nhận diện riêng ngay cả khi cùng archetype**

- Mỗi bài có 1 **động tác từ điển riêng** (mục 1) — đây là lớp phân biệt mạnh nhất, không phụ thuộc art.
- Mỗi bài có 1 **`style` riêng** + 1 `cover` riêng + 1 `introText` riêng. Cover không được dùng lại bố cục: nhân vật/đối tượng chủ đề chiếm 60–70% khung, nền theo style chương.
- Vùng chữ (12% trên) và vùng đáp án (22% dưới) giữ nguyên theo art bible để UI không lệch; **phần giữa** mới là nơi khác cấu trúc.
- Shell dùng chung class `stage--{layout}` + `data-variant` theo ADR-0003 (chỉ định cấu trúc), còn nội dung bên trong mỗi game dùng class riêng theo `gameId` như 3 module mẫu hiện tại; `variant` + động tác riêng là thứ tạo khác biệt, không phải màu.

---

## 5. Phụ thuộc 2 chiều (art bible / sprite guide / sprite runtime)

### 5.1 Spec này PHỤ THUỘC vào

| Nguồn | Cái cần lấy | Trạng thái |
|---|---|---|
| `design/art/art-bible-hd.md` | 21 style id canonical (nguồn chốt), palette 5 chương, quota 16:9/WebP ≤400 KB, vùng an toàn 12%/22%, tương phản WCAG AA, ranh giới bản quyền | Đã có Draft v1 + 21 style id canonical |
| `design/art/sprite-guide.md` | kích thước sprite, anchor, naming, variant `idle/correct/wrong/celebrate` | **Chưa có** — cần art director tạo/duyệt |
| Sprite runtime `KM.Sprites` | đề xuất API `KM.Sprites.get(gameId, variant) → {img|null, w, h}`; `null` → emoji fallback | **Chưa có** — đề xuất, cần lead-programmer chốt (designer không chọn kiến trúc) |
| `js/data/curriculum.js` | mục tiêu + config 21 bài (nguồn chân lý toán) | Có sẵn |
| `js/data/game-map.js` | 21 `gameId`, thứ tự, `tribute`, `palette`, `bg`, `phase` | Có sẵn |
| `js/data/tuning.js` | `game.*`, `hd.*`, `timing.*` — mọi số gameplay đọc ở đây | Có sẵn |
| `contract.js` + `game-module-interface.md` | 5 phương thức, vòng đời, `onAnswer(choice.value)` | Có sẵn |
| ADR-0002 | registry + fallback + puzzle 7×3 + ngoại lệ b20 | Có sẵn, Accepted |

### 5.2 Art bible / sprite guide PHẢI ghi nhận lại 21 `gameId` này

Art director cần thêm một bảng đối chiếu (trong `art-bible-hd.md` hoặc `sprite-guide.md`) với **đủ 21 dòng**, mỗi dòng: `gameId | lessonId | style id | layout/variant | cover path | sprite path | intro key`. Cover là ảnh trang trí (`alt=""`, `aria-hidden`); **không có field alt riêng**. Danh sách `gameId` bắt buộc phải xuất hiện đúng chính tả:

`mario-bros`, `mario-odyssey`, `donkey-kong-country`, `pokemon`, `zelda`, `animal-crossing`, `mario-party`, `dr-mario`, `mario-maker`, `mario-paint`, `yoshi-island`, `luigis-mansion`, `brain-age`, `mario-and-luigi`, `pikmin`, `kirby`, `warioware`, `super-smash-bros`, `fire-emblem`, `splatoon`, `mario-kart`.

Quy tắc ghi nhận: (1) 21 `style` id ở mục 1 phải khớp 1-1 với 21 `style` trong bảng art; (2) `cover` là file mới, **không tái dùng** `Asset/hd/<lessonId>.webp` làm cover (nền bị cắt khác tỉ lệ); (3) sprite key phải có variant `idle|correct|wrong|celebrate`, nếu thiếu variant thì runtime trả `null` và module dùng emoji — không crash; (4) art bible phải nhắc lại: tribute bằng tên trong DOM, không đưa tên nhân vật/logo vào prompt/ảnh; (5) sprite guide phải ghi rõ nút chạm ≥64px không bị sprite che.

### 5.3 Chiều ngược lại — ai bị spec này tác động

- `js/data/game-map.js`: thêm 8 field mục 3 (giá trị cụ thể do art director + user chốt ở Giai đoạn B).
- `js/ui/screens/lesson.js`: **không bắt buộc đổi**; nếu thêm intro component thì phải guard `introText != null` và tôn trọng G7.
- Card renderer (home/collection): đọc `cover` (trang trí, `alt=""`, `aria-hidden`); thiếu → fallback gradient chương.
- 21 module `js/ui/games/<gameId>.js`: mỗi module đọc `style/layout/variant/inputHint/sprite/motionMs` dưới dạng tuỳ chọn, vẫn giữ emoji fallback như 3 module mẫu.
- `build_public.py`: mirror `public/` phải được sinh lại sau khi sửa source.
- QA: `tests/unit/game-map.test.js` thêm 21 assert field mới; smoke 21 màn; `design-review` chạy lại sau Giai đoạn B.

### 5.4 Giai đoạn A — ranh giới

File này **chỉ là thiết kế**. Không file JS/CSS/ảnh nào được sửa trong Giai đoạn A. Mọi số ở mục 2 là đề xuất có phạm vi an toàn; giá trị cuối cùng phải nằm trong `js/data/tuning.js` hoặc entry `game-map.js` khi triển khai Giai đoạn B/C. Art director và lead-programmer có quyền phủ quyết `style`/`sprite runtime` — designer chỉ đề xuất.
