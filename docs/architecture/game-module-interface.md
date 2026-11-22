# Giao diện module game (ADR-0002 + ADR-0003)

Tài liệu này là hợp đồng kỹ thuật giữa màn học (`js/ui/screens/lesson.js`) và 21
minigame. Mọi module game phải tuân thủ đúng hình dạng dưới đây; `lesson.js` là
điểm tích hợp duy nhất.

> ADR-0002 giữ nguyên lõi học tập, registry, fallback và puzzle. ADR-0003 bổ sung
> nhận diện riêng cho từng bài (GameMap v2, màn `gameIntro`, sprite runtime, 8 archetype
> stage shell, cover trên thẻ bài). Phần nào của ADR-0002 bị thay thế được ghi rõ ở mục
> "Tác động tới ADR-0002" cuối tài liệu.

## Nguyên tắc

1. Game **không sở hữu state** học tập. `LessonSession` vẫn là nguồn chân lý;
   game chỉ gọi `onAnswer(value)` khi bé chọn đáp án.
2. Game **không đọc/ghi** `ctx.progress`, storage, sao, race hay điều hướng.
   Mọi thay đổi đi qua `ctx` do `lesson.js` cung cấp. Màn intro cũng không được sửa
   `Progress`; cờ "đã xem intro" là flag phiên do màn intro tự quản (sessionStorage).
3. Không hardcode số gameplay (số câu, thời gian, ngưỡng, số mảnh…). Đọc từ
   `ctx.tuning` (`js/data/tuning.js`). Màu riêng và cấu hình trình bày nằm trong
   `js/data/game-map.js`.
4. Chỉ mượn cơ chế + ghi tên cảm hứng. **Không copy sprite/logo/nhạc Nintendo**;
   art HD, cover và sprite sheet do dự án sinh, đặt tại `Asset/hd/<lessonId>.webp`,
   `Asset/covers/<lessonId>.webp`, `Asset/sprites/<lessonId>.webp`. Cả ba path dùng
   **`lessonId`**; `gameId` chỉ là slug đăng ký, không phải khóa asset. `style` là
   token phong cách canonical (21 giá trị) do art bible/sprite guide dùng làm khóa,
   cũng không phải `gameId`.
5. `destroy()` phải dọn hết timer/listener/rAF/image handler/node do game tạo để không rò
   rỉ khi chuyển màn (chi tiết mục "`destroy()` — trách nhiệm bắt buộc").
6. Game **không sửa** `.choices`/`.choice`, không thêm sticky/fixed mới, không tăng chiều cao
   stage vượt OBS-01. Mọi cấu trúc riêng nằm bên trong mount (xem "Stage shell").

## Hợp đồng `createGame` (chữ ký cập nhật)

```js
createGame({
  ctx,            // object: app context (tuning, audio, speech, gameMap, games, ...)
  question,       // object: câu hỏi hiện tại, theo hợp đồng KM.Questions
  mount,          // HTMLElement: div.game-stage do lesson.js chèn trước .choices
  onAnswer,       // function(value): gọi đúng 1 lần khi bé chọn; value = choice.value
  reducedMotion,  // boolean: window.matchMedia('(prefers-reduced-motion: reduce)')
  sprite          // object|null (MỚI, optional): adapter KM.Sprite đã gắn entry hiện tại
}) -> {
  render(question),     // bắt buộc: dựng lại nội dung cho mỗi câu mới
  onCorrect(result),    // bắt buộc: phản hồi sau khi session.answer() trả đúng
  onWrong(choice),      // bắt buộc: phản hồi ngay khi trả sai (bé được thử lại)
  celebrate(),          // bắt buộc: hiệu ứng chúc mừng; bỏ qua/bất hoạt ảnh nếu reducedMotion
  destroy()             // bắt buộc: dọn timer/listener/rAF/sprite/node
}
```

- **Tương thích**: 3 module mẫu hiện tại nhận 5 tham số đầu và vẫn chạy y hệt. Factory mới
  phải guard `sprite` (`if (opts.sprite && typeof opts.sprite.create === 'function') …`).
- `KM.GameContract.assert()` **vẫn kiểm tra đúng 5 phương thức** như ADR-0002; không thêm
  phương thức để khỏi vỡ `tests/unit/game-map.test.js`. Khi đăng ký, registry gọi
  `assert(factory)` (hàm thì chỉ kiểm tra gọi được); `lesson.js` gọi `assert(instance)` ngay
  sau `createGame`.

### Tham số `sprite`

`lesson.js` truyền:

```js
sprite: (KM.Sprite && typeof KM.Sprite.forEntry === 'function')
  ? KM.Sprite.forEntry(gameEntry, { reducedMotion: prefersReducedMotion() })
  : null
```

Adapter đã biết `entry.sprite` (`Asset/sprites/<lessonId>.webp`, sheet WebP 4×4) và
`entry.motionMs`. Game chỉ cần tạo `<canvas>` bên trong mount rồi gọi:

```js
var handle = sprite.create({
  canvas: myCanvas,
  fallback: { glyph: '🍄', className: 'sprite-fallback' },
  states: ['idle', 'move', 'action', 'cheer']   // optional
});
// handle.play('idle' | 'move' | 'action' | 'cheer'); handle.pause();
// handle.resume(); handle.isReady(); handle.destroy();
```

Nếu `sprite === null` (entry.sprite null), sheet thiếu, ảnh tải lỗi hoặc `reducedMotion === true`:
**không tạo `<canvas>`** trong trường hợp `sprite === null`, giữ nguyên glyph emoji/CSS hiện tại;
game vẫn chơi được, không log lỗi 404 thành exception. Một game chỉ giữ **1 handle sprite**;
`destroy()` phải gọi `handle.destroy()` (huỷ rAF + image handler).

### Gọi `onAnswer`

```js
onAnswer(choice.value); // KHÔNG sửa session/progress, KHÔNG tự chuyển câu
```

`lesson.js` đối chiếu `value` với `question.choices`, rồi chạy đúng nhánh xử lý cũ
(`session.answer`, race, sao, âm thanh, giọng đọc). Vì vậy 92 unit test hiện tại vẫn có giá trị.

### `mount`, palette và stage shell (ADR-0003)

`mount` vẫn là `<div class="game-stage" data-game-id="...">` có nền HD từ `gameEntry.bg`,
vẫn chứa `<p class="game-tribute">` do `lesson.js` tạo, và vẫn được chèn trước `.choices`.
Ngoài ra, khi có entry, `lesson.js` thêm trên chính mount này:

```text
class += " stage--<layout> style--<style>"
data-variant = <variant>     // 'a' | 'b' | 'c' | 'd'
```

| CSS custom property | Nguồn |
|---------------------|-------|
| `var(--game-sky)` | `entry.palette.sky` |
| `var(--game-accent)` | `entry.palette.accent` |
| `var(--game-ink)` | `entry.palette.ink` |

Game được phép thêm con vào mount, thêm class trạng thái (`is-correct`, `is-wrong`,
`is-reduced`, `is-fallback`, `has-bg`), nhưng **không được**:

- xoá/sửa class `game-stage`, `game-tribute` hay `data-game-id`;
- tạo stage thứ hai hoặc đưa nội dung ra ngoài mount;
- sửa `.choices`, `.choice` hay chèn phần tử `position: fixed`/sticky mới;
- tăng `min-height` stage quá mức OBS-01
  (`.screen.lesson.has-minigame .game-stage { min-height: clamp(104px,13vh,148px) }`);
- dùng z-index ≥ 20 (`.choices` đang ở z-index 20).

8 archetype cấu trúc (xem ADR-0003 mục 4 để biết phân bổ 21 bài):

| `layout` | Cấu trúc con điển hình |
|----------|------------------------|
| `rail` | Đường ngang/trục dọc + sprite + vật phẩm xếp dọc đường. |
| `board` | Lưới ô `grid`, điều khiển bằng chạm/số. |
| `split` | Hai vùng song song; `<720px` xếp 1 cột. |
| `track` | Đường đua ngang + HUD chặng (game Bài 20). |
| `arena` | Trường mở, target nằm trong `inset:0`, dụng cụ ở đáy. |
| `bench` | Bàn thao tác giữa + thanh công cụ ngang. |
| `book` | Trang sách trái ảnh / phải text, gáy giữa. |
| `tray` | Khay xếp mảnh/khối, ô trống có viền đứt nét. |

Khi `reducedMotion === true`: bỏ intro/chuyển động/celebration, chỉ giữ phản hồi màu + text;
sprite runtime vẽ 1 frame tĩnh và không chạy rAF.

## GameMap v2 — field cấu hình mới

`KM.GameMap.forLesson(lessonId)` vẫn trả **chính entry đã freeze** (không clone), 21 entry,
`bg` vẫn là `Asset/hd/<lessonId>.webp`. Các field cũ giữ nguyên; bổ sung:

8 field mới: `style`, `layout`, `variant`, `cover`, `sprite`, `introText`, `inputHint`,
`motionMs` (10 dòng dưới đây nếu tính `palette`/`tribute` đã có).

| Field | Kiểu | Mặc định khi thiếu | Consumer |
|-------|------|--------------------|----------|
| `style` | `string` | không suy từ `gameId`; bỏ class + báo lỗi cấu hình | class `style--{style}`; token art canonical (21 giá trị theo thứ tự bài): `pixel-art`, `watercolor`, `carved-wood`, `paper-cut`, `wax-crayon`, `felt-fabric`, `plastic-bricks`, `origami`, `clay`, `oil-paint`, `mosaic`, `ink-wash`, `chalkboard`, `grid-paper`, `yarn`, `cotton`, `pop-art`, `neon-vector`, `woodcut`, `spray-paint`, `patchwork`. Là khóa asset của art bible/sprite guide, **không phải tên `gameId`**. |
| `layout` | `string` | `'scene'` | class `stage--{layout}`; 8 tên canonical: `rail\|board\|split\|track\|arena\|bench\|book\|tray`. |
| `variant` | `string` | `'a'` | attribute `data-variant`; giá trị `'a'\|'b'\|'c'\|'d'`. |
| `cover` | `string` | `bg` = `Asset/hd/<lessonId>.webp` | `Asset/covers/<lessonId>.webp`; `home.js` (thẻ bài) + màn `gameIntro`. Không bao giờ fallback bằng `gameId`. |
| `sprite` | `string\|null` | `null` | `Asset/sprites/<lessonId>.webp` → `KM.Sprite.forEntry()` → canvas; `null` = emoji/CSS, **không tạo canvas**. |
| `introText` | `string` | `title + '. ' + mechanic + '.'` | màn `gameIntro`. |
| `inputHint` | `string` | `''` | gợi ý dưới stage; game tự dùng. |
| `motionMs` | `number` | `240` | chu kỳ frame idle của sprite. |
| `palette` | `object` | — (đã có) | 3 CSS var như trên. |
| `tribute` | `string` | — (đã có) | nhãn "🎮 Cảm hứng: …". |

Registry fallback không đổi: `KM.GameRegistry.get(gameId)` trả `null` cho game chưa làm →
`lesson.js` **không chèn stage**, không tạo canvas, màn cũ chạy y hệt. Sự hiện diện của
`style`/`layout`/`sprite` trong GameMap **không** tự động kích hoạt game.

## Route `gameIntro` (màn giới thiệu trước bài)

```text
home → gameIntro({lessonId, reason:'first'}) → Bắt đầu → lesson({lessonId, skipIntro:1})
         └─ Về nhà / Esc → home
lesson → "Xem lại giới thiệu" → gameIntro({lessonId, reason:'manual'})
```

- Screen factory: `KM.Screens.gameIntro(ctx, params)`; router `KM.Screens[name]` trong
  `app.js` đã xử lý sẵn, không đổi `navigate()`.
- Params: `lessonId` (bắt buộc), `preview` (tuỳ, chuyển tiếp sang lesson),
  `reason: 'first'|'replay'|'manual'` (mặc định `'first'`), `returnTo: 'lesson'` (dự phòng).
- Nội dung: `<img class="game-cover">` từ `entry.cover`, `title`, `introText`, `tribute`,
  `inputHint`; nút **▶ Bắt đầu** và **← Về nhà**. Không auto-advance.
- Flag phiên: `sessionStorage['km_game_intro_v1_' + lessonId] = '1'` (có memory fallback).
  Ghi **khi bấm Bắt đầu/skip**, không ghi khi bấm Về nhà/Esc. `reason:'manual'` bỏ qua flag.
  Không lưu vào `kidmath.v1`/`Progress`.
- Phím: `Enter`/`Space` = Bắt đầu (`preventDefault()`), `Escape` = Về nhà. Không nhận phím
  bất kỳ. Focus nút Bắt đầu khi vào màn.
- Quy tắc chống chậm: bài đã có flag → `home.js` đi thẳng `lesson`; deep link tới
  `lesson` không bị chặn; chơi lại không tự hiện intro, chỉ hiện khi gọi rõ `reason:'manual'`.
- reduced-motion: hiện nội dung tĩnh, không animate cover, không rAF.

## `destroy()` — trách nhiệm bắt buộc

Ngoài timer/listener theo ADR-0002, `destroy()` của mọi game phải:

1. `clearTimeout` **mọi** timer đã track (kể cả celebration timer) rồi xoá mảng.
2. `removeEventListener` mọi listener đã đăng ký, kể cả listener uỷ quyền trên wrapper.
3. Nếu có sprite: `handle.destroy()` → `cancelAnimationFrame(rafId)`, `rafId = null`,
   `img.onload = img.onerror = null`, huỷ listener `resize`, release cache reference.
4. Nếu game tự tạo `<canvas>`/`<img>`: gán handlers về `null`, rồi xoá node khỏi DOM.
5. Xoá **mọi node do game tạo** (`ownNodes`) nhưng giữ nguyên node do `lesson.js` tạo
   (`mount`, `.game-tribute`, `--game-*`).
6. Remove các class game đã thêm (`stage--…`, `style--…`, `data-variant`, `is-correct`,
   `is-wrong`, `is-fallback`, `has-bg`, `is-reduced`, `is-jumping`…) khỏi mount nếu mount
   là của `lesson.js`. Không xoá `game-stage`.
7. Nếu game tạo stage dự phòng (`ownStage === true`): xoá cả stage đó.
8. Null hoá tham chiếu tới `question`, canvas, handle, mount để GC dễ dàng.

`app.js` gọi `currentScreen.destroy()` trước `Components.clear(root)`; vì vậy rAF còn sống
sau `destroy()` là lỗi rò rỉ phải sửa ngay.

## Đăng ký

Mỗi file `js/ui/games/<gameId>.js` tự đăng ký factory của mình:

```js
window.KM = window.KM || {};
KM.GameRegistry.register({ 'mario-bros': createGame });
// hoặc: KM.GameRegistry.register('mario-bros', createGame);
```

`KM.GameRegistry.get(gameId)` trả factory hoặc `null` (không ném lỗi) cho id chưa làm.
`KM.GameRegistry.has(gameId)` trả boolean. `KM.GameMap.forLesson(id)` trả entry (có
`gameId`) hoặc `null`; `KM.GameMap.phaseOf(id)` trả `1|2|3|null`.

### Thứ tự tải script (bắt buộc, cập nhật ADR-0003)

`index.html` (do agent khác sở hữu) cần tải theo thứ tự:

1. `js/data/tuning.js`, `js/data/curriculum.js`
2. `js/data/game-map.js`
3. `js/ui/games/contract.js`, `js/ui/games/registry.js`
4. `js/ui/sprite.js` **(mới)** — trước các file game vì game nhận adapter qua tham số
5. các file `js/ui/games/<gameId>.js` (tự register)
6. `KM.Screens.gameIntro` **(mới)** và các screen khác
7. `js/app.js`

`lesson.js` tra cứu registry lúc chạy (không lúc tải), nên thứ tự giữa `lesson.js` và các
file game không quan trọng, miễn là app khởi động sau khi chúng đã đăng ký.
`tests/test-runner.html` cần các script 1–4 nếu thêm test cho `game-map.js`/registry/sprite.

## Vòng đời trong `lesson.js`

| Thời điểm | Hành động |
|-----------|-----------|
| Vào màn | `GameMap.forLesson(lesson.id)` → `GameRegistry.get(gameId)`; nếu có factory thì thêm `stage--{layout} style--{style}` + `data-variant`, giữ nhãn + mount, gọi `createGame({..., sprite})` |
| Mỗi câu mới (sau `renderChoices`) | `game.render(question)`; sprite `play('idle')` nếu cần |
| Trả sai | `game.onWrong(choice)` ngay tại nhánh sai, rồi giữ nguyên race/audio/speech cũ |
| Trả đúng | `game.onCorrect(result)` ngay tại nhánh đúng, `game.celebrate()` sau confetti; sprite `play('cheer')`; race/sao/âm thanh giữ nguyên |
| Rời màn | `game.destroy()` trong `destroy()` của screen (dọn cả rAF/sprite) |
| Không có factory | Không chèn DOM, không tạo canvas, không gọi game — màn chơi cũ chạy y hệt (ADR-0002) |

Lỗi khởi tạo hoặc lỗi phương thức của game được `lesson.js` bắt và log
`console.error('[KM] ...')`; màn học vẫn tiếp tục ở chế độ fallback an toàn.

## Ví dụ tích hợp tối thiểu (code GIẢ LẬP — không phải file code thật)

```js
// --- home.js (ý tưởng; Giai đoạn B mới sửa thật) -------------------------
function goToLesson(lessonId, preview) {
  if (!introSeen(lessonId)) {
    ctx.navigate('gameIntro', { lessonId: lessonId, preview: preview, reason: 'first' });
  } else {
    ctx.navigate('lesson', { lessonId: lessonId, preview: preview, skipIntro: 1 });
  }
}

// --- KM.Screens.gameIntro (màn mới) --------------------------------------
startButton.addEventListener('click', function () {
  markIntroSeen(params.lessonId);           // sessionStorage, memory fallback
  ctx.navigate('lesson', {
    lessonId: params.lessonId, preview: params.preview, skipIntro: 1
  });
});
// Enter/Space → startButton.click(); Escape → ctx.navigate('home')

// --- lesson.js: chỉ thêm vài dòng vào khối ADR-0002 hiện tại -------------
var entry = KM.GameMap.forLesson(lesson.id);
var factory = entry ? KM.GameRegistry.get(entry.gameId) : null;
if (factory) {
  mount.classList.add('stage--' + (entry.layout || 'scene'));
  if (entry.style) mount.classList.add('style--' + entry.style); // token canonical, KHÔNG phải gameId
  mount.setAttribute('data-variant', entry.variant || 'a');       // 'a'|'b'|'c'|'d'
  game = factory({
    ctx: ctx,
    question: session.current(),
    mount: mount,
    onAnswer: onGameAnswer,
    reducedMotion: prefersReducedMotion(),
    sprite: KM.Sprite && KM.Sprite.forEntry
      ? KM.Sprite.forEntry(entry, { reducedMotion: prefersReducedMotion() })
      : null
  });
}
// renderChoices/handlePick/celebrate/finish: GIỮ NGUYÊN

// --- một module game mới (hình dạng tối thiểu) ---------------------------
function createGame(options) {
  var opts = options || {};
  var spriteHandle = null;
  var canvas = null;

  // opts.sprite === null → entry.sprite null: giữ emoji/CSS, KHÔNG tạo canvas.
  if (opts.sprite && typeof opts.sprite.create === 'function') {
    canvas = document.createElement('canvas');
    canvas.className = 'game-sprite';
    opts.mount.appendChild(canvas);
    spriteHandle = opts.sprite.create({
      canvas: canvas,
      fallback: { glyph: '🍄', className: 'sprite-fallback' }
    });
  }

  return {
    render: function (question) { if (spriteHandle) spriteHandle.play('idle'); },
    onCorrect: function (result) { if (spriteHandle) spriteHandle.play('cheer'); return result; },
    onWrong: function (choice) { return choice; },
    celebrate: function () {},
    destroy: function () {
      if (spriteHandle) { spriteHandle.destroy(); spriteHandle = null; }
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      // + clear timer/listener/ownNodes/class như mục `destroy()`
    }
  };
}
```

## Bản đồ gameId (cập nhật layout / variant / style)

> Game spec trước đây dùng mã `A1-strip`…`A8-stage`; các mã đó đã được thay bởi
> cặp `layout` (8 tên canonical) + `variant` (`a`–`d`) của ADR-0003. Cột `style`
> là token art canonical (không phải `gameId`), khớp art bible mục 9 theo thứ tự bài.

| # | lessonId | gameId | Tribute | layout/variant | `style` | Đợt |
|---|----------|--------|---------|----------------|---------|-----|
| 1 | `intro` | `mario-bros` | Super Mario Bros. | `rail/a` | `pixel-art` | 1 |
| 2 | `b1` | `mario-odyssey` | Super Mario Odyssey | `arena/a` | `watercolor` | 2 |
| 3 | `b2` | `donkey-kong-country` | Donkey Kong Country | `rail/b` | `carved-wood` | 2 |
| 4 | `b3` | `pokemon` | Pokémon | `arena/b` | `paper-cut` | 2 |
| 5 | `b4` | `zelda` | The Legend of Zelda | `book/a` | `wax-crayon` | 2 |
| 6 | `b5` | `animal-crossing` | Animal Crossing | `split/a` | `felt-fabric` | 1 |
| 7 | `b6` | `mario-party` | Mario Party | `board/a` | `plastic-bricks` | 2 |
| 8 | `b7` | `dr-mario` | Dr. Mario | `bench/a` | `origami` | 2 |
| 9 | `b8` | `mario-maker` | Super Mario Maker | `tray/a` | `clay` | 2 |
| 10 | `b9` | `mario-paint` | Mario Paint | `bench/b` | `oil-paint` | 2 |
| 11 | `b10` | `yoshi-island` | Yoshi's Island | `rail/c` | `mosaic` | 3 |
| 12 | `b11` | `luigis-mansion` | Luigi's Mansion | `book/b` | `ink-wash` | 3 |
| 13 | `b12` | `brain-age` | Brain Age | `board/b` | `chalkboard` | 3 |
| 14 | `b13` | `mario-and-luigi` | Mario & Luigi | `split/b` | `grid-paper` | 3 |
| 15 | `b14` | `pikmin` | Pikmin | `tray/b` | `yarn` | 3 |
| 16 | `b15` | `kirby` | Kirby | `arena/c` | `cotton` | 3 |
| 17 | `b16` | `warioware` | WarioWare | `board/c` | `pop-art` | 3 |
| 18 | `b17` | `super-smash-bros` | Super Smash Bros. | `arena/d` | `neon-vector` | 3 |
| 19 | `b18` | `fire-emblem` | Fire Emblem | `board/d` | `woodcut` | 3 |
| 20 | `b19` | `splatoon` | Splatoon | `bench/c` | `spray-paint` | 3 |
| 21 | `b20` | `mario-kart` | Mario Kart 8 | `track/a` | `patchwork` | 1 |

## Quyết định ghi chú

- Quick spec ghi "Đợt 2: 9 game chương 1–2" và "Đợt 3: 9 game chương 3–5",
  nhưng 3 game mẫu đã nằm rải ở chương 1 (`intro`, `b5`) và chương 5 (`b20`).
  `phase` trong `game-map.js` được gán theo chương: chương 1–2 còn lại = 2,
  chương 3–5 còn lại = 3 → 3/8/10 entry. Không có entry nào thiếu phase.
- `ctx.puzzle` được expose dưới dạng `KM.Puzzle || null` để project chạy được
  trước khi module puzzle được tải; consumer phải guard.
- `KMApp.screens` và `KMApp.current().debugState()` không đổi — smoke test dùng;
  `gameIntro` sẽ tự động xuất hiện trong `screens` vì router lấy `Object.keys(KM.Screens)`.
- OBS-01: khung `.choices` sticky, mobile 1 cột và logic `lesson.js` **không đổi**.
  ADR-0003 chỉ thêm class/attribute trên mount và CSS scope bên trong stage.
- Bản mirror `public/` phải được rebuild sau khi code thật thay đổi; Giai đoạn A này
  chỉ ghi 2 file tài liệu, không đụng code/ảnh/public.
