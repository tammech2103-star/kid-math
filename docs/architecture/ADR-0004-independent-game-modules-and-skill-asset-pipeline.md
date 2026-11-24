# ADR-0004: 21 module game độc lập, event `km:answer` và pipeline asset bằng skill authoring-time

- **Status**: Accepted
- **Date**: 2026-11-22
- **Deciders**: Người dùng (quyết định chốt 2026-11-22), Technical Director
- **Related**: ADR-0001 (web tĩnh offline `file://`), ADR-0002 (registry + puzzle + giữ lõi học tập), ADR-0003 (identity/GameMap v2/sprite/8 archetype), `docs/architecture/game-module-interface.md`, quick spec `design/quick-specs/all-21-distinct-games.md`

## Context

ADR-0002 đưa dự án từ một màn chơi sang 21 factory game có registry, fallback và cổng `onAnswer(value)`. ADR-0003 tiếp tục thêm `GameMap` v2 (`style`, `layout`, `variant`, `cover`, `sprite`, `introText`, `motionMs`), màn intro, sprite runtime dùng chung và 8 archetype shell (`rail|board|split|track|arena|bench|book|tray`). Dù có 21 `style` và 21 `gameId`, người chơi vẫn thấy một khung chung: cùng `.game-stage`, cùng nhãn cảm hứng, cùng hàng đáp án `.choices` sticky bên dưới, cùng bục/race status. Nguyên nhân không nằm ở màu sắc mà nằm ở việc **mọi game đều đi qua một khung và một hợp đồng callback duy nhất**.

Người dùng đã chốt phương hướng mới:

- Mỗi bài là **một trò chơi hoàn toàn riêng biệt**, giao diện riêng, cơ chế riêng — không còn "identity dùng chung".
- Bỏ đua xe, bục trao thưởng kiểu race và hàng đáp án dưới game.
- Bỏ `KM.GameMap`, `KM.GameRegistry`, callback `onAnswer`, 8 archetype của ADR-0003.
- Giữ nguyên lõi học tập đã chạy ổn định: `Questions`, `LessonSession`, `Curriculum`, `tuning`, progress/`localStorage` và 117 unit test của core.
- Tích hợp 5 skill authoring-time (`pxl`, `vex`, `kiln`, `loom`, `chirp`) để sinh asset có khả năng lặp lại; artifact được commit vào repo, người chơi **không cần Node**.

Ràng buộc từ ADR-0001 vẫn còn nguyên: classic script, namespace `KM`, mở bằng `file://`, không `fetch()`/JSON rời, không thư viện ngoài, không backend. Node v22.18.0 chỉ tồn tại dưới dạng portable toolchain để sinh asset lúc phát triển.

## Decision

### 1. Hợp đồng module game mới: nhận service tối thiểu, trả event DOM

Mỗi module game là một factory/đối tượng độc lập, **không import/gọi phụ thuộc vào shell, registry, GameMap hay LessonSession**.

```js
createGame({
  mount,           // HTMLElement do shell tạo, module sở hữu toàn bộ nội dung bên trong
  question,        // Question hiện tại của LessonSession
  reducedMotion,   // boolean từ prefers-reduced-motion
  audio            // service âm thanh của shell (tap/interaction), KHÔNG phải ctx
}) -> {
  render?: function (question) {},
  onCorrect?: function (result) {},
  onWrong?: function (choice) {},
  celebrate?: function () {},
  destroy?: function () {},
  handleKey?: function (event) { return true; } // true = module đã xử lý, shell dừng
}
```

- Shell gọi `render(question)` khi vào bài và mỗi khi `session.next()` trả câu mới.
- Shell gọi `onWrong(choice)` / `onCorrect(result)` / `celebrate()` **sau khi** `session.answer(value)` trả kết quả; module không tự quyết đúng/sai, không tự sang câu.
- `destroy()` là bắt buộc về mặt vận hành (dọn timer, rAF, listener, audio node do module tạo) dù được khai báo optional trong object trả về.
- Module có thể phát nhẹ âm tương tác qua `audio` (tap, click, select). Âm đúng/sai/⭐ do shell gọi như cũ để tránh phát âm trùng.

**Output duy nhất và bắt buộc** của module là DOM event:

```js
mount.dispatchEvent(new CustomEvent('km:answer', {
  bubbles: true,
  detail: { value: choiceValue }
}));
```

Shell đăng ký `mount.addEventListener('km:answer', handler)` trước/sau khi tạo module đều được, nhưng phải đăng ký trước khi `render()` phát event nếu module phát ngay. `handler` kiểm tra `locked/finished`, so khớp `String(detail.value)` với `question.choices[i].value`, rồi đi vào cùng đường `handlePick()` cũ gọi `session.answer(value)`. Giá trị lạ bị bỏ qua im lặng.

### 2. Tại sao bỏ Registry/GameMap và 8 archetype

`KM.GameRegistry` tồn tại để trả `null` → fallback màn cũ khi 18/21 game chưa xong. `KM.GameMap` tồn tại để cấp `gameId`, `style`, `layout`, `variant`, `cover`, `sprite`, `tribute`, `palette` cho một khung chung. Khi user chốt **viết lại 21 module và không có fallback**, cả hai lớp trung gian đó trở thành chi phí thuần túy:

- `gameId` không còn là khóa đăng ký, không render, không dùng làm khóa asset → registry không còn vai trò.
- `style/layout/variant` là token của 8 archetype; nếu giữ lại thì module mới vẫn bị ép vào `.stage--<layout> .style--<style>` và lặp lại cảm giác "một khung" mà ADR-0003 đang cố sửa.
- `cover/sprite/motionMs/tribute` trước đây do shell tra cứu và inject; giờ mỗi module tự dựng nội dung và tự load asset tĩnh của mình → không cần entry dùng chung.
- `KM.GameContract.assert` kiểm tra 5 phương thức bắt buộc; hợp đồng mới cho phép thiếu từng phương thức → contract cũ phải ngừng được dùng (giữ file như artifact lịch sử hoặc xóa trong dọn dẹp có kiểm soát, không nạp runtime).

Shell chỉ tạo một `mount` tối giản cho mỗi bài, ví dụ `<div class="km-game km-game--<lessonId>" data-lesson="<lessonId>">`, không class `stage--*`, không `style--*`, không `data-game-id`, không `.game-tribute`, không `.km-hero-sprite`, không inject sprite handle. Mọi CSS nằm trong `css/games.css`, scope dưới `.km-game--<lessonId>`; không còn selector archetype dùng chung.

### 3. Tại sao `CustomEvent` thay callback `onAnswer`

| Tiêu chí | `onAnswer(value)` cũ | `CustomEvent('km:answer')` mới |
|---------|----------------------|--------------------------------|
| Ghép nối | Module phải biết shell truyền hàm nào; muốn test phải fake `ctx` + callback. | Module chỉ biết `mount`; không import shell, không biết `LessonSession` tồn tại. |
| Test | Test đi qua HTTP DOM giả + callback. | Test được bằng DOM thuần: tạo `<div>`, đăng ký listener, đọc `event.detail.value`. |
| Số cổng | Một callback duy nhất, dễ bị dùng sai để gọi thẳng `session.answer`. | Một kênh sự kiện có tên, shell là nơi duy nhất gọi `session.answer`. |
| Mở rộng | Muốn thêm payload phải đổi chữ ký mọi module. | `detail` có thể mở rộng mà không đổi chữ ký factory. |

`bubbles: true` được giữ để shell có thể nghe ở `mount` hoặc một wrapper cha nếu cần instrumentation; module không cần biết ai nghe. Không dùng polyfill: `CustomEvent` là DOM API, không phải ES module, chạy được trên môi trường trình duyệt mục tiêu.

### 4. Shell vẫn giữ `LessonSession` làm nguồn chân lý

Không có module game nào được phép gọi `session.answer`, `progress.recordResult`, `ctx.navigate` hay ghi `localStorage`. Shell (`js/ui/screens/lesson.js`) vẫn là nơi duy nhất:

1. Tạo `questions = ctx.questions.forLesson(...)` và `session = ctx.lessonSession.create(...)`.
2. Nhận `km:answer` → map value vào `question.choices` → `session.answer(value)`.
3. Giữ nguyên `locked/finished`, first-try, sao, timer speech, toast, `ctx.progress.recordResult`, `ctx.navigate('result', ...)`.
4. Gọi lifecycle của module (`onWrong`/`onCorrect`/`celebrate`/`render`) như phần trình bày phụ.

Hệ quả domain `Questions`, `LessonSession`, `Curriculum`, `tuning`, `Progress`/storage key `kidmath.v1` **không đổi một dòng**. 117 unit test của core không bị viết lại; chỉ thêm test cho event contract và smoke 21 bài. `result` screen vẫn nhận summary/record; tham số race/bục được bỏ hoặc truyền `null` có guard — không sửa domain.

### 5. Bỏ đua xe, bục và hàng `.choices`

- Xóa khỏi runtime flow: `KM.Race`, `KM.RaceUI`, `raceSlot`, `raceStatus` dạng "Đua với…", HUD/chặng, bục trajectory, `Components.carCelebration` dùng cho đáp án, CSS class `.race-*`/`.game-stage--kart`/`minigame-*`.
- Xóa `choicesNode` và `renderChoices()` khỏi `lesson.js`: **không còn hàng đáp án dưới game**. Các nút/chạm đáp án nằm hoàn toàn bên trong module.
- Progress row chỉ còn "Câu x/y" + số sao. Kết quả vẫn ghi `recordResult`; state puzzle `kidmath.v1` từ ADR-0002 giữ nguyên schema để không đụng `normalize()/reset()`.
- Không tạo bản v2, không giữ chế độ cũ: ghi đè trực tiếp 21 module hiện tại, `js/ui/screens/lesson.js`, `css/games.css`. Không có file `game-v2.js`, không flag `useNewGame`, không fallback registry.

**Bàn phím**: `document.keydown` vẫn do shell sở hữu nhưng ưu tiên module:

```text
1. game.handleKey(event) nếu có; nếu trả true hoặc event.defaultPrevented → dừng.
2. Shell delegate: R = speakCurrent(), Esc = home, 1–9 = map index vào question.choices
   và phát cùng đường xử lý answer (không click .choices vì hàng này đã bỏ).
```

Module tự quyết có nhận 1–9 như phím chọn trong game hay để shell delegate; `handleKey` trả `true` là cách duy nhất để tránh double-answer. `prefers-reduced-motion` được shell đọc một lần và truyền vào `options.reducedMotion`; module không tự tạo rAF/animation khi cờ này bật.

### 6. Pipeline asset authoring-time bằng 5 skill

Năm skill OCGS đã cài tại `C:\Users\2103\.config\opencode\ocgs\.agents\skills\` (`pxl`, `vex`, `kiln`, `loom`, `chirp`). Runtime Node dùng bản portable `C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe` (Node v22.18.0). Gọi CLI theo dạng:

```powershell
$NODE = "C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe"
$SKILLS = "C:\Users\2103\.config\opencode\ocgs\.agents\skills"

& $NODE "$SKILLS\pxl\bin\pxl.js"   build tools/asset-pipeline/<game>.px.js  --only <name>
& $NODE "$SKILLS\vex\bin\vex.js"   build tools/asset-pipeline/<game>.vx.js  --only <name>
& $NODE "$SKILLS\kiln\bin\kiln.js" build tools/asset-pipeline/<game>.kx.js  --only <name>
& $NODE "$SKILLS\loom\bin\loom.js" build tools/asset-pipeline/<game>.tx.js  --only <name>
& $NODE "$SKILLS\chirp\bin\chirp.js" build tools/asset-pipeline/<game>.cx.js --only <name>
```

Quy ước:

- File DSL nguồn đặt ở `tools/asset-pipeline/<lessonId>/`; output commit tại `Asset/v2/<lessonId>/`. Không sinh vào thư mục tạm rồi copy thủ công không kiểm soát.
- Tên file deterministic, suy từ `<lessonId> + <assetKey> + kích thước/biến thể`, ví dụ `Asset/v2/b6/ac-garden-coin-64.png`, `Asset/v2/b6/ac-garden-ui-frame.svg`, `Asset/v2/b6/ac-garden-select.wav|.ogg`. Không dùng timestamp/hash ngẫu nhiên trong tên artifact.
- `pxl` → PNG sprite/icon; `vex` → SVG/PNG vector; `chirp` → WAV/OGG; `kiln` → PNG render từ low-poly (GLB là nguồn authoring, **không nạp runtime**); `loom` → PNG albedo/texture (map phụ là nguồn authoring nếu module không dùng).
- Artifact sinh ra (PNG/SVG/WAV/OGG) được **commit vào repo**. Người chơi chỉ mở `index.html`; không cần Node, không cần `npm install`, không có `package.json` runtime.
- `file://` chặn `fetch()` file local và JSON rời → module reference asset bằng `<img src="Asset/v2/...">` / `<audio src="Asset/v2/...">` tương đối. Không fetch/XHR/ES module/worker để tải asset.
- `kiln`, `vex`, `loom`, `chirp` có thể cần `npm install` **một lần trong thư mục skill global**; đây là chi phí authoring, không phải dependency của người chơi.
- Chạy `python tools/build_public.py` sau khi sửa source/asset để rebuild mirror `public/`; repo gốc là nguồn chân lý, `public/` là bản deploy.

### 7. Kế hoạch phase và kiểm soát rủi ro rút gọn

Không có fallback runtime nên rủi ro lớn nhất là "mất bản chạy được giữa chừng" và "khó rollback". Biện pháp: **snapshot project trước mỗi phase**, chạy unit + smoke sau mỗi phase; nếu đỏ thì `project_undo`/restore snapshot thay vì vá chắp tại chỗ.

| Phase | Phạm vi | Gate |
|-------|---------|------|
| **A — Docs** | ADR này + cập nhật `game-module-interface.md`/art asset convention nếu cần. Chưa đổi runtime. | ADR Accepted; review hợp đồng event với lead-programmer. |
| **B — 3 game mẫu** | Rewrite 3 module, mỗi game dùng **một skill khác nhau** (đề xuất: `pxl`, `vex`, `chirp`). Sửa `lesson.js` theo hợp đồng mới, xóa `.choices`/race path, viết lại `css/games.css` cho 3 game. | 117 unit test PASS; smoke 3 bài + reduced-motion + 1–9/R/Esc + build `public/` PASS. |
| **C — 18 game còn lại** | Rewrite 18 module, dùng thêm `kiln`/`loom` cho game phù hợp; hoàn tất asset `Asset/v2/`; dọn file/CLI race khỏi runtime; rebuild `public/`. | Smoke 21/21; 0 console error; 0 fetch local; diff asset deterministic; rollback snapshot sẵn. |

Snapshot không phải fallback: nó chỉ tồn tại trong quy trình phát triển/undo, không được nạp khi chạy game.

## Performance implications

| Hạng mục | Ngân sách / quy tắc |
|----------|---------------------|
| Số module nạp | 21 classic script, mỗi file chỉ định nghĩa factory; không registry lookup lúc runtime. |
| DOM tại lesson | 1 `mount` + nội dung của **đúng 1** module; không `.choices`, không race HUD, không sprite host dùng chung. |
| rAF | Tối đa 1 vòng của module đang active; `destroy()` phải hủy. Reduced-motion = 0 rAF. |
| Asset | Ảnh/commit theo bài, tải theo `<img>`/`<audio>` khi module render; không preload 21 bài; giữ nguyên ngân sách ≤400 KB cho ảnh HD cũ nếu còn reference. |
| `public/` | Mirror đúng source sau mỗi phase; sai mirror là lỗi phát hành, không phải lỗi code game. |

## Alternatives Considered

| Phương án | Lý do reject |
|-----------|--------------|
| Giữ `GameMap`/`GameRegistry` nhưng bỏ 8 archetype | Registry vẫn ép `gameId` làm khóa và fallback; GameMap vẫn cấp style/sprite/tribute dùng chung. Không giải quyết "21 giao diện độc lập". |
| Giữ callback `onAnswer` nhưng bỏ `.choices` | Module vẫn phải biết shell truyền callback gì; khó test đơn lập và dễ gọi nhầm `session.answer` từ module. |
| Cho module tự gọi `session.answer` rồi shell chỉ nghe | Phá nguồn chân lý, phải viết lại 117 test của core và mất kiểm soát `locked/finished/firstTry`. |
| Dùng 8 archetype ADR-0003, chỉ đổi `variant` cho 21 bài | Chính là nguyên nhân "trùng khung" mà user chốt bỏ; 21 tổ hợp vẫn ra cùng một `.game-stage`. |
| `<iframe>`/Shadow DOM cho từng game | `file://`, focus bàn phím, CSS kế thừa và event bubbles khó đoán; không đáng cho web tĩnh offline. |
| Giữ fallback màn cũ khi module chưa xong | User chốt ghi đè trực tiếp, không bản v2/fallback; fallback khiến 18 bài vẫn hiện hàng đáp án cũ. Thay bằng snapshot + unit/smoke giữa các phase. |
| Sinh asset lúc runtime bằng Node/WASM hoặc fetch DSL | Vi phạm ADR-0001: người chơi không có Node, `file://` chặn fetch local. Phải commit artifact tĩnh. |
| Dùng GLB/maps đầy đủ của `kiln`/`loom` làm runtime asset | Web tĩnh 2D không có loader 3D/PBR; tăng dung lượng và dependency. Chỉ giữ PNG render/albedo làm artifact runtime. |
| Dùng AI image generator thay 5 skill DSL | Không deterministic, khó sửa từng pixel/âm, không có CLI rebuild; mâu thuẫn yêu cầu pipeline lặp lại bằng skill. |

## Consequences

**Tích cực**

- Mỗi bài là một tác phẩm độc lập: markup, CSS, asset, tương tác riêng; không còn nhận diện dùng chung.
- `LessonSession` là nguồn chân lý duy nhất; 117 unit test của core giữ nguyên giá trị.
- Event contract test được bằng DOM thuần; module không cần `ctx` giả lập hay import shell.
- Asset có nguồn DSL + artifact commit: rebuild được, review diff được, người chơi vẫn chỉ cần mở `index.html`.

**Tiêu cực / chi phí**

- Viết lại 21 module là công việc lớn; không có fallback runtime nên phase phải nhỏ và có snapshot.
- Mất cơ chế an toàn "registry trả null → màn cũ chạy" của ADR-0002; regression chỉ phát hiện qua unit/smoke sau mỗi phase.
- CSS chuyển từ 8 archetype dùng chung sang 21 scope riêng: dễ phình `css/games.css` nếu không đặt quy ước `.km-game--<lessonId>` chặt.
- Xóa race/bục có thể làm result screen/unit test race cũ lỗi reference nếu dọn quá sớm; phải guard hoặc dọn có kiểm soát ở Phase C.
- Skill `kiln`/`loom` sinh ra artifact không phải thứ web t cần: cần kỷ luật chỉ commit PNG được dùng, không commit cả GLB/maps thừa vào `Asset/v2/`.

**Rủi ro còn lại & mitigation**

| Rủi ro | Mitigation |
|--------|------------|
| Module quên `destroy()` → rò rỉ timer/rAF | Smoke chuyển bài 50 lần; đếm listener/rAF về 0; code review check `destroy()` ở mọi module. |
| Event `km:answer` phát khi `locked` | Shell guard `locked/finished` trước `session.answer`; test gửi 2 event liên tiếp. |
| Giá trị event không khớp `question.choices` | So sánh `String(value)` như đường cũ; unknown value bị ignore, log ở chế độ dev nếu cần. |
| `prefers-reduced-motion` bị module bỏ qua | Shell truyền cờ; smoke bật chế độ reduce, assert 0 rAF; CSS `.is-reduced` vẫn có hiệu lực. |
| Phím 1–9 bị xử lý hai lần | `handleKey()` trả `true` = module handled; shell delegate chỉ chạy khi chưa handled. |
| `public/` stale | Bắt buộc `python tools/build_public.py` ở cuối mỗi phase; smoke chạy trên bản mirror. |
| Rollback khó vì ghi đè trực tiếp | Snapshot project trước phase; unit/smoke sau phase; `project_undo` cho thao tác vừa làm. |

## Compliance / Verification

- `grep` runtime (`index.html`, `js/`) không còn: `KM.GameRegistry`, `KM.GameMap`, `onAnswer`, `stage--`, `style--`, `data-game-id`, `.choices` render trong `lesson.js`, `KM.Race`, `KM.RaceUI`, `raceSlot`, `raceStatus`.
- Mọi module game nhận đúng 4 tham số `{mount, question, reducedMotion, audio}`; không nhận `ctx`, không nhận `onAnswer`, không nhận `sprite`.
- Mọi câu trả lời đi qua `mount.dispatchEvent(new CustomEvent('km:answer', { bubbles: true, detail: { value } }))`; shell có đúng một listener gọi `session.answer(value)`.
- `Questions`, `LessonSession`, `Curriculum`, `tuning`, `progress.js`, storage key `kidmath.v1`: **0 diff** so với baseline 2026-11-22.
- Chạy `tests/test-runner.html`: 117/117 unit test PASS (không test nào bị viết lại/sửa expectation core).
- Chạy `python tools/smoke_test.py`: 21/21 bài render được; 0 console error; 0 request `fetch/XHR` tới file local; reduced-motion OK; 1–9/R/Esc OK.
- `tools/asset-pipeline/` chứa DSL nguồn; `Asset/v2/` chứa artifact deterministic đã commit; không file asset nào trỏ về `Asset/covers/`, `Asset/sprites/` của ADR-0003 cho module mới.
- Sau mỗi phase: snapshot tồn tại, unit + smoke xanh, `python tools/build_public.py` đã chạy và `public/` khớp source.

## Supersession

| ADR trước | Phần bị thay bởi ADR-0004 | Phần giữ nguyên |
|-----------|---------------------------|-----------------|
| **ADR-0003** | Bị thay **một phần**: GameMap v2 (21 `style`, 8 `layout`, `variant`, `cover`, `sprite`, `tribute`, `motionMs`, `introText`), màn intro theo entry, `KM.Sprite` dùng chung và 8 archetype `stage--*` không còn nằm trên đường runtime của 21 game mới. | Các nguyên tắc offline `file://`, không fetch, reduced-motion, nút chạm ≥64px, art tự sinh/không copy tài sản Nintendo vẫn áp dụng. ADR-0003 không bị xóa toàn bộ; nó là baseline lịch sử. |
| **ADR-0002** | Bị thay ở phần **registry/fallback** (`KM.GameRegistry`, `game-map.js`, factory trả `null` → màn cũ), phần **callback `onAnswer(value)`**, và phần **kart exception** (đua là Bài 20, `KM.Race`/`KM.RaceUI`/bục/HUD). Hàng `.choices` dưới game cũng bị bỏ. | `Questions`, `LessonSession`, `Questions.forLesson`, `Progress`/storage `kidmath.v1`, 21 mảnh puzzle, ngân sách ảnh HD, ghi tên cảm hứng không copy asset — giữ nguyên. |
| **ADR-0001** | Không bị thay. | Classic script, namespace `KM`, không ES module/fetch/backend, test chạy trong `tests/test-runner.html`. |

`docs/architecture/game-module-interface.md` và `css/games.css` phải được cập nhật theo ADR này khi triển khai Phase B; nếu còn mâu thuẫn, ADR-0004 là nguồn chân lý mới.

## Validation criteria — "we'll know this was right if"

- Bé mở 21 bài liên tiếp thấy 21 giao diện khác nhau, **không** thấy cùng một hộp bo tròn + cùng một hàng đáp án + bục đua.
- Mỗi bài trả lời đúng/sai đều tác động đúng sao, first-try, record và result như baseline — dù event phát từ game chứ không phải nút `.choice`.
- 117 unit test core vẫn PASS mà không sửa nội dung; smoke 21/21 PASS trên `public/` vừa rebuild.
- Gõ 1–9 chọn được đáp án tương ứng `question.choices`; module có `handleKey` riêng thì phím đó không bị shell chọn nhầm.
- Bật `prefers-reduced-motion`: không rAF, không animation chuyển màn; game vẫn chơi được.
- Xóa Node/portable toolchain khỏi máy thì `index.html` vẫn chạy đầy đủ (asset đã commit).
- Sinh lại cùng DSL bằng Node v22.18.0 cho cùng tên file/nội dung artifact (deterministic), diff repo sạch.

## References

- `docs/architecture/ADR-0001-static-offline-web-game.md`
- `docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md`
- `docs/architecture/ADR-0003-per-game-identity-and-sprite-runtime.md`
- `docs/architecture/game-module-interface.md`
- `js/ui/screens/lesson.js`, `js/ui/games/contract.js`, `js/ui/games/registry.js`
- `tools/build_public.py`, `tools/smoke_test.py`, `tests/test-runner.html`
- `C:\Users\2103\.config\opencode\ocgs\.agents\skills\{pxl,vex,kiln,loom,chirp}\SKILL.md`
- `C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe`
