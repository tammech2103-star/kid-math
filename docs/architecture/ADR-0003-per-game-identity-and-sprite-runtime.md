# ADR-0003: Định danh riêng cho 21 game (GameMap v2), màn intro, sprite runtime và 21 stage shell

- **Status**: Accepted (Giai đoạn A — chỉ tài liệu; chưa đổi code, chưa sinh ảnh)
- **Date**: 2026-11-22
- **Deciders**: Người dùng (quyết định 21 game / 21 phong cách art / cover + intro / sprite AI / làm ngay đợt này), Technical Director
- **Related**: ADR-0001 (web tĩnh offline `file://`), ADR-0002 (registry + puzzle + giữ lõi học tập), `docs/architecture/game-module-interface.md`, quick spec `design/quick-specs/minigame-nintendo-2026-11-22.md`

## Context

ADR-0002 đã đưa dự án từ 1 màn chơi sang 21 factory game, nhưng vẫn dùng **một khung DOM duy nhất**:
`lesson.js` chèn `<div class="game-stage">` vào trước `.choices`; 3 module mẫu
(`mario-bros`, `animal-crossing`, `mario-kart`) chỉ thêm các class màu
(`game-stage--mario`, `--animal`, `--kart`) vào chính cái mount đó. Kết quả là dù cơ chế khác
nhau, bé vẫn thấy **cùng một cái hộp bo tròn, cùng một nhãn cảm hứng, cùng một kiểu xếp dọc**:
"trùng khung" là cảm nhận thị giác/kiến trúc, không phải lỗi chồng chéo DOM.

Đã kiểm tra DOM hiện tại và xác nhận:

- mỗi màn lesson chỉ có **1** `.screen.lesson`, **1** `.game-stage`, **1** `.choices`;
- các lớp (`header`, `progressRow`, `raceSlot`, `questionCard`, `foot`) xếp dọc trong flex,
  không phần tử nào `position: fixed`;
- `.game-tribute` nằm `position:absolute` **bên trong** stage, không chiếm dòng riêng;
- `.choices` được `position: sticky; bottom: 8px; z-index: 20` (OBS-01) và các con của stage
  chỉ dùng `z-index: 0…6` → không đè hàng đáp án;
- mobile đã ép `.ac-garden` về 1 cột và nén `.has-minigame` để nút đáp án nằm trọn viewport
  (12/12 tổ hợp 3 game × 4 viewport ở Đợt 1).

Vì vậy **không được sửa `.choices`/`.choice`, không được sửa logic `lesson.js` liên quan tới
`session.answer`, race, sao, speech, OBS-01**. Mọi thay đổi phải nằm ở: cấu hình GameMap,
lớp vỏ (shell) bên trong mount, màn intro mới, sprite runtime dùng chung, và cách `home.js`
đọc ảnh cover. Đồng thời phải giữ: 92 unit test PASS, chạy `file://`, không thư viện ngoài,
`prefers-reduced-motion`, nút chạm ≥ 64px.

Mục tiêu của ADR này là biến mỗi bài thành một "tác phẩm" có nhận diện riêng mà **không làm
thay đổi đường đi của đáp án**.

## Decision

### 1. GameMap v2 — mở rộng cấu hình, giữ nguyên hợp đồng cũ

`js/data/game-map.js` vẫn là nguồn cấu hình tĩnh, 21 entry, `Object.freeze` từng entry và
cả mảng. Giữ **nguyên vẹn** các field hiện có và ý nghĩa của chúng:

| Field cũ | Giữ nguyên |
|----------|------------|
| `gameId` | Khóa đăng ký factory; 21 giá trị duy nhất. |
| `tribute` | Tên cảm hứng (chỉ ghi tên, không dùng tài sản). |
| `title` | Tiêu đề ngắn tiếng Việt. |
| `palette` | `{sky, accent, ink}` — vẫn đẩy qua CSS custom property như hiện tại. |
| `bg` | Bắt buộc vẫn là `Asset/hd/<lessonId>.webp` (test hiện tại so sánh chuỗi này). |
| `mechanic` | Mô tả cơ chế. |
| `phase` | `1|2|3` như cũ. |

Bổ sung **8 field mới**: `style`, `layout`, `variant`, `cover`, `sprite`, `introText`,
`inputHint`, `motionMs` (10 dòng trong bảng nếu tính `palette`/`tribute` đã có).

| Field | Kiểu | Bắt buộc | Ý nghĩa / fallback |
|-------|------|----------|--------------------|
| `style` | `string` | có | Token art canonical (21 giá trị, danh sách dưới đây), dùng cho class `style--{style}` **và làm khóa asset cho art bible/sprite guide**. Không được suy từ `gameId` khi thiếu — entry GameMap v2 phải có `style` hợp lệ. |
| `layout` | `string` | có | Archetype cấu trúc của stage; sinh class `stage--{layout}`. 8 tên canonical: `rail\|board\|split\|track\|arena\|bench\|book\|tray`. Mặc định `'scene'` (khung cũ) nếu thiếu. |
| `variant` | `string` | có | Biến thể trong cùng archetype: `'a'\|'b'\|'c'\|'d'`; ghi ra attribute `data-variant`. Mặc định `'a'`. |
| `cover` | `string` | có | Ảnh thẻ bài + ảnh màn intro (landscape 16:9): `Asset/covers/<lessonId>.webp`. Fallback khi tải lỗi/thiếu = `bg` (`Asset/hd/<lessonId>.webp`). |
| `sprite` | `string\|null` | không | `Asset/sprites/<lessonId>.webp` — sprite sheet WebP 4×4. `null` = game dùng emoji/CSS, **không tạo canvas**, không gọi `KM.Sprite.create()`. |
| `introText` | `string` | có | 1–2 câu tiếng Việt hiển thị ở màn intro. Mặc định: `title + '. ' + mechanic + '.'`. |
| `inputHint` | `string` | có | Gợi ý thao tác ngắn dưới stage ("Chạm vào đồng xu…"). Game tự quyết có dùng hay không. Mặc định rỗng. |
| `motionMs` | `number` | có | Chu kỳ đổi frame idle (ms). Mặc định `240`; chỉ áp dụng khi không reduced-motion. |
| `palette` | `object` | có | Đã có; giữ nguyên. |
| `tribute` | `string` | có | Đã có; giữ nguyên. |

**21 `style` id canonical** (theo thứ tự bài; khớp `design/art/art-bible-hd.md` mục 9
và `design/art/sprite-style-guide.md` mục 6): `pixel-art`, `watercolor`,
`carved-wood`, `paper-cut`, `wax-crayon`, `felt-fabric`, `plastic-bricks`, `origami`,
`clay`, `oil-paint`, `mosaic`, `ink-wash`, `chalkboard`, `grid-paper`, `yarn`,
`cotton`, `pop-art`, `neon-vector`, `woodcut`, `spray-paint`, `patchwork`.

> Đây là **token phong cách nghệ thuật** (khóa asset/prompt, tên class `style--…`),
> **không phải tên `gameId`**. `gameId` (`mario-bros`, `pokemon`, …) vẫn là slug đăng
> ký nội bộ; không render và không dùng làm khóa asset. 21 giá trị trên phải khác
> nhau và giữ nguyên thứ tự curriculum.

> Đối chiếu đường dẫn: `design/art/sprite-style-guide.md` v1.0 hiện ghi `{gameId}`
> cho sprite/cover. Chuẩn chốt của ADR này là `{lessonId}` cho cả ba loại ảnh;
> người sở hữu sprite guide phải tự cập nhật trong tài liệu của mình. ADR này
> không sửa file art.

**Tương thích ngược (bắt buộc):**

1. `forLesson(lessonId)` **vẫn trả cùng một object đã freeze**, không trả bản clone/derive —
   test `T.eq(entry, list[index])` đang so sánh bằng identity.
2. `all()` vẫn trả mảng 21 phần tử theo thứ tự curriculum; `phaseOf()` không đổi.
3. Consumer mới phải guard: `entry && entry.layout || 'scene'`, `entry.variant || 'a'`,
   `entry.sprite || null`; không được giả định field mới tồn tại ở mọi entry trong lúc
   triển khai dần. Riêng `style` không có fallback `gameId`: nếu thiếu thì bỏ class
   `style--…` và báo lỗi cấu hình ở Giai đoạn B.
4. `KM.GameRegistry.get(gameId)` vẫn trả `null` cho game chưa có factory. Khi `null`,
   `lesson.js` **không chèn stage, không tạo canvas, không gọi game** → màn cũ chạy y hệt.
   Field `style`/`layout`/`sprite` có trong GameMap không được tự động kích hoạt game.

Không dùng `fetch()`/JSON: mọi field là literal trong file JS gán vào `window.KM.GameMap`
(ADR-0001).

### 2. Màn intro trước bài — route `gameIntro`

Thêm screen thứ năm: `KM.Screens.gameIntro`. Router `KM.Screens[name]` trong `app.js` đã hỗ trợ
sẵn; không đổi `navigate()`.

```text
home --(bài chưa xem intro)--> gameIntro({lessonId}) --Bắt đầu--> lesson({lessonId, skipIntro: 1})
  |                                  |
  |                                  +-- Về nhà / Esc --> home
  +--(đã xem intro)-----------------> lesson({lessonId})
lesson --"Xem lại giới thiệu"------> gameIntro({lessonId, reason:'manual'})
```

**Params**

| Param | Kiểu | Bắt buộc | Diễn giải |
|-------|------|----------|-----------|
| `lessonId` | `string` | có | Khóa tra cứu `GameMap.forLesson`; sai/id lạ → `navigate('home')`. |
| `preview` | `boolean` | không | Chuyển tiếp sang `lesson` (giữ hành vi preview hiện tại). |
| `reason` | `'first'\|'replay'\|'manual'` | không | Mặc định `'first'`. Chỉ `'manual'` là bỏ qua kiểm tra "đã xem". |
| `returnTo` | `'lesson'` | không | Mặc định `'lesson'`; dự phòng để mở rộng, không dùng cho luồng hiện tại. |

**Nội dung màn**: ảnh `cover` (`<img>` tĩnh hoặc 1 canvas **đã pause**), `title`, `introText`,
tên `tribute`, `inputHint`. Nút: **▶ Bắt đầu** (`btn btn-primary btn-xl`) và **← Về nhà**.
Không có auto-advance: bé tự bấm, tránh chuyển màn ngoài ý muốn.

**Có hiện lại khi chơi lại không?** — **Không tự động.** Quy tắc chống làm chậm:

- Lưu cờ theo bài trong `sessionStorage` với key `km_game_intro_v1_<lessonId>`; giá trị `'1'`.
  Dùng memory fallback nếu `sessionStorage` bị chặn trên `file://` (giống `km_intro_seen` hiện tại).
- Chỉ **ghi cờ khi bé bấm "Bắt đầu"** (hoặc phím skip tương đương). Bấm "Về nhà"/Esc **không ghi**
  → lần sau vẫn được xem lại.
- `home.js` (và nút "Học tiếp") khi navigate sang bài: nếu chưa có cờ → đi `gameIntro`;
  nếu có cờ → đi thẳng `lesson`. Vì cờ nằm theo `lessonId`, chơi lại bài cũ không bị chặn 1–2 giây.
- Deep link/`ctx.navigate('lesson', …)` vẫn vào thẳng lesson như cũ (không tự chèn intro);
  điều này giữ smoke test và hành vi preview nguyên vẹn.
- Muốn xem lại: gọi rõ `ctx.navigate('gameIntro', {lessonId, reason:'manual'})` từ result/lesson.
  `reason:'manual'` luôn hiển thị dù đã có cờ.
- Không lưu cờ này vào `kidmath.v1`/`Progress`: tránh động vào domain đã có 92 test. Nó là
  trạng thái phiên, mất khi đóng tab → mỗi phiên mới được nhắc lại đúng 1 lần/bài.

**Phím**: `Enter` hoặc `Space` = Bắt đầu (có `preventDefault()` để không cuộn trang);
`Escape` = Về nhà; `R` không dùng ở màn này. Không nhận "bất kỳ phím nào" vì bé dễ bấm nhầm.
`focus()` vào nút Bắt đầu khi vào màn. Với reduced-motion: intro vẫn hiện nhưng không animate
cover, không rAF.

### 3. Sprite runtime dùng chung — `js/ui/sprite.js`, global `KM.Sprite`

Module hạ tầng UI, **không phụ thuộc vào game nào** (dependency direction: `games → sprite`,
sprite không import/đọc `KM.Games`, `KM.GameRegistry`, LessonSession hay Progress — nhất quán
với quy tắc `engine-code.md`: hạ tầng không phụ thuộc gameplay). Không thư viện ngoài, ES5,
classic script (`file://`).

Định dạng sheet: WebP **4×4 = 16 frame**. Mỗi hàng là một trạng thái, 4 cột là 4 frame:

| Hàng | Trạng thái | Hành vi |
|------|------------|---------|
| 0 | `idle` | Lặp, tốc độ `motionMs`/frame (mặc định 240 ms → ~4 fps, không 60 fps). |
| 1 | `move` | Lặp khi game gọi `play('move')`. |
| 2 | `action` | Chạy 1 vòng rồi về `idle`. |
| 3 | `cheer` | Chạy 1 vòng rồi giữ frame cuối trong `celebrate()`. |

Frame mặc định `64×64` px → sheet `256×256` px. Kích thước khác vẫn được nếu `naturalWidth/
naturalHeight` chia hết cho 4; nếu không chia hết → coi như tải thất bại, dùng fallback.

API đề xuất (game nhận namespace qua tham số `sprite`, xem `game-module-interface.md`):

```js
KM.Sprite.create({
  canvas,            // HTMLCanvasElement do game tạo, nằm trong mount
  src,               // entry.sprite; null → chỉ trả fallback, không tạo Image
  frameMs,           // entry.motionMs
  reducedMotion,     // từ options.reducedMotion
  fallback,          // { glyph: '🍄', className: 'sprite-fallback' } (tuỳ game)
  states             // mặc định ['idle','move','action','cheer']
}) -> {
  play(state), pause(), resume(), setState(state), isReady(), destroy()
}
```

Ngoài `create()` primitive, module cung cấp
`KM.Sprite.forEntry(entry, {reducedMotion})` → một adapter **đã gắn sẵn** `src = entry.sprite`,
`frameMs = entry.motionMs`, `fallback` mặc định. `lesson.js` truyền adapter này vào tham số
`sprite` của factory; game vì thế không cần tự tra cứu GameMap. Nếu entry không có `sprite`
hoặc `KM.Sprite` chưa tải → truyền `null`, module game tự giữ emoji/CSS như hiện tại.

Quy tắc triển khai:

- **DPR**: `dpr = Math.min(window.devicePixelRatio || 1, 2)`; `canvas.width = round(cssW*dpr)`,
  `canvas.height = round(cssH*dpr)`, `canvas.style.width/height` giữ CSS; gọi
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` một lần khi resize chứ không mỗi frame.
  `imageSmoothingEnabled = true` (WebP HD, không phải pixel-art).
- **Vẽ**: `drawImage(img, col*fw, row*fh, fw, fh, 0, 0, cssW, cssH)`. Không tạo object/gradient
  trong vòng lặp rAF; dùng chỉ số frame `Math.floor(now / frameMs) % 4`.
- **Cache ảnh**: cache theo `src` trong `KM.Sprite` (mỗi `src` một `Image` + danh sách chờ).
  Tránh 21 lần decode cùng một sheet khi intro và lesson cùng mở. Không set `crossOrigin`
  (ảnh local, `file://`); không `fetch()`.
- **Tải lỗi**: `img.onerror` → `canvas.hidden = true`, thêm class `is-sprite-fallback` lên
  wrapper, giữ glyph emoji/CSS do game cung cấp. Không log 404 thành lỗi chương trình,
  không làm gãy game (giống cơ chế `is-fallback` của ảnh nền HD hiện tại).
- **Reduced-motion**: chỉ vẽ frame `idle[0]` một lần, **không gọi `requestAnimationFrame`**;
  `play('action'/'cheer')` chỉ đổi màu/text theo class `is-reduced` do game xử lý.
- **Hủy**: `destroy()` phải `cancelAnimationFrame(rafId)`, `rafId = null`,
  `img.onload = img.onerror = null`, huỷ listener `resize` nếu có, release reference tới
  cache, xoá canvas do module tạo. Không để rAF chạy sau khi `app.js` đã `clear(root)`.
- Một game chỉ được giữ **tối đa 1 handle sprite đang hoạt động** tại một thời điểm.

### 4. 21 stage shell riêng — `layout` → `stage--{layout}`

`lesson.js` vẫn tạo đúng một `<div class="game-stage" data-game-id="...">` như hiện tại. Khi có
entry, thêm 3 class/attribute trên **chính mount đó** (không tạo stage thứ hai):

```text
class += " stage--<layout> style--<style>"
data-variant = <variant>          // 'a' | 'b' | 'c' | ...
```

Module game chỉ dựng nội dung **bên trong** shell tương ứng. Giữ `.game-stage`, `.game-tribute`,
`--game-sky/--game-accent/--game-ink`. **Không** đổi `.choices`, `.choice`, `.question-card`
(theo nghĩa không đổi cấu trúc/flow), không thêm `position: fixed`, không thêm phần tử sticky
mới, không tăng `min-height` của stage vượt mức OBS-01
(`.screen.lesson.has-minigame .game-stage { min-height: clamp(104px,13vh,148px) }`).

**8 archetype cấu trúc** (tối thiểu; mỗi archetype có bố cục con khác nhau, không chỉ đổi màu):

| `layout` | Cấu trúc bên trong stage | Vùng chạm / mobile |
|----------|--------------------------|--------------------|
| `rail` | Đường ngang (hoặc trục dọc khi `data-variant="b"`), sprite đi trên rail, vật phẩm xếp dọc đường. | Rail full width; items ≥64px; mobile vẫn 1 rail. |
| `board` | Lưới ô (`grid`), ô có viền/khung riêng, điều khiển bằng chạm/digits. | `minmax(0,1fr)`; mobile 3–4 cột tuỳ số ô. |
| `split` | Hai vùng song song (trái/phải) + nhãn từng vùng. | `<720px` → `grid-template-columns: 1fr` (như `.ac-garden` hiện tại). |
| `track` | Đường đua ngang + HUD chặng, bục nhỏ góc. | Chiều cao nén như `.game-stage--kart`; mobile rút HUD. |
| `arena` | Trường mở, target `position:absolute` trong `inset:0`, dụng cụ ở đáy. | Target ≥64px; không vượt `overflow:hidden` của stage. |
| `bench` | Bàn thao tác giữa + thanh công cụ ngang (màu/viên thuốc/súng sơn). | Thanh công cụ cuộn ngang, không đẩy dọc. |
| `book` | Trang sách mở: trang trái ảnh, trang phải text/so sánh; gáy ở giữa. | Mobile xếp 2 trang chồng dọc nhưng tổng cao ≤148px. |
| `tray` | Khay xếp mảnh/khối, ô trống có viền đứt nét, nháy theo số. | Khay full width; không dùng drag-only (luôn có chạm). |

**Phối hợp cho 21 bài không trùng khung**: mỗi bài là tổ hợp
`(layout, variant, style, palette, sprite, motionMs)`. `variant` đổi hướng/trục/số cột/kiểu
điều khiển trong cùng archetype; `style` đổi token art (bo góc, viền, themed glyph) và là khóa
đặt tên asset — **không phải tên `gameId`**.

> Game spec `design/quick-specs/all-21-distinct-games.md` trước đây dùng mã archetype
> `A1-strip`, `A2-grid`, …, `A8-stage`. Các mã đó nay đã được thay bởi cặp
> **`layout` (8 tên canonical ở trên) + `variant` (`a`–`d`)** của ADR này. Bảng dưới là
> bảng phân bổ đã chốt; cột `style` được thêm để 3 tài liệu (ADR, interface doc, art
> bible) khớp nhau theo cùng thứ tự bài.

| # | lessonId | gameId | layout / variant | `style` | # | lessonId | gameId | layout / variant | `style` |
|---|----------|--------|------------------|---------|---|----------|--------|------------------|---------|
| 1 | `intro` | `mario-bros` | `rail/a` | `pixel-art` | 12 | `b11` | `luigis-mansion` | `book/b` | `ink-wash` |
| 2 | `b1` | `mario-odyssey` | `arena/a` | `watercolor` | 13 | `b12` | `brain-age` | `board/b` | `chalkboard` |
| 3 | `b2` | `donkey-kong-country` | `rail/b` | `carved-wood` | 14 | `b13` | `mario-and-luigi` | `split/b` | `grid-paper` |
| 4 | `b3` | `pokemon` | `arena/b` | `paper-cut` | 15 | `b14` | `pikmin` | `tray/b` | `yarn` |
| 5 | `b4` | `zelda` | `book/a` | `wax-crayon` | 16 | `b15` | `kirby` | `arena/c` | `cotton` |
| 6 | `b5` | `animal-crossing` | `split/a` | `felt-fabric` | 17 | `b16` | `warioware` | `board/c` | `pop-art` |
| 7 | `b6` | `mario-party` | `board/a` | `plastic-bricks` | 18 | `b17` | `super-smash-bros` | `arena/d` | `neon-vector` |
| 8 | `b7` | `dr-mario` | `bench/a` | `origami` | 19 | `b18` | `fire-emblem` | `board/d` | `woodcut` |
| 9 | `b8` | `mario-maker` | `tray/a` | `clay` | 20 | `b19` | `splatoon` | `bench/c` | `spray-paint` |
| 10 | `b9` | `mario-paint` | `bench/b` | `oil-paint` | 21 | `b20` | `mario-kart` | `track/a` | `patchwork` |
| 11 | `b10` | `yoshi-island` | `rail/c` | `mosaic` | | | | | |

Ràng buộc khi implement: không có hai bài liên tiếp dùng cùng `(layout, variant)`; không quá
4 bài dùng cùng archetype; mọi CSS archetype nằm trong `css/games.css` dưới selector
`.stage--<layout>` và scope trong `.game-stage`, kế thừa OBS-01 thay vì override nó.

### 5. Cover trên thẻ bài `home.js`

`lessonCard(lesson)` lấy `var entry = KM.GameMap && KM.GameMap.forLesson(lesson.id)` và, nếu
`entry && entry.cover`, chèn một wrapper trang trí **trước** `.lesson-icon`:

```html
<button class="lesson-card" type="button">
  <span class="lesson-cover-wrap" aria-hidden="true">
    <img class="lesson-cover" src="Asset/covers/<lessonId>.webp" alt="" loading="lazy" decoding="async"
         width="160" height="90" draggable="false">
  </span>
  <span class="lesson-icon">…</span>   <!-- giữ nguyên emoji / 🔒 -->
  <span class="lesson-body">…</span>   <!-- giữ nguyên label/title/stars/page -->
  …
</button>
```

Quy tắc:

- Không đổi class `lesson-card`/`is-locked`, không đổi handler click, không đổi nội dung
  `.sr-only`. Với bài khoá: CSS ẩn `.lesson-cover-wrap`, emoji 🔒 vẫn là tín hiệu khoá duy nhất.
- Ảnh là trang trí (`alt=""`, `aria-hidden`), không thêm text vào accessible name của nút.
- `loading="lazy" + decoding="async"`, kích thước khung `aspect-ratio:16/9`, `object-fit:cover`,
  `max-height` nhỏ (≈56px trên thẻ) để 21 thẻ không phình trang. Không preload 21 cover, không
  dùng `fetch`.
- `onerror` (gán inline, không remove listener toàn cục): ẩn wrapper → emoji cũ lộ ra. Entry
  thiếu `cover` hoặc chưa có file ảnh → render y hệt hiện tại. Fallback của `cover` là `bg`
  (`Asset/hd/<lessonId>.webp`), **không phải `gameId`**; nếu ảnh fallback cũng lỗi thì ẩn
  wrapper, không log 404 thành exception.
- Đường dẫn cố định: `cover = Asset/covers/<lessonId>.webp`, `bg = Asset/hd/<lessonId>.webp`,
  `sprite = Asset/sprites/<lessonId>.webp` (`null` → không tạo canvas). Ảnh nằm trong `Asset/`
  relative path → chạy `file://`.
- Màn `gameIntro` dùng chung `entry.cover` và `entry.style` (class `style--…`) với thẻ bài;
  không tra cứu asset bằng `gameId`.

### 6. Tác động tới ADR-0002

| ADR-0002 | Tình trạng sau ADR-0003 |
|----------|-------------------------|
| Giữ nguyên `Questions`, `LessonSession`, `Progress`, `Race`, `RaceUI`, Speech, Audio, parent gate | **Giữ nguyên 100%**. |
| Game chỉ gọi `onAnswer(value)` | **Giữ nguyên**. Intro và sprite cũng không được sửa session. |
| Registry trả `null` → fallback màn cũ | **Giữ nguyên**, là cơ chế an toàn giữa các đợt. |
| Mảnh ghép 21 mảnh, lưới 7×3, state trong `kidmath.v1` | **Giữ nguyên**. Intro flag không vào đây. |
| Bục trao thưởng chung, đua là game Bài 20 | **Giữ nguyên**. |
| Ghi tên cảm hứng, art tự sinh, không copy tài sản Nintendo | **Giữ nguyên**; sprite AI cũng phải là art tự sinh. |
| "Một khung `.game-stage` dùng chung" (ngầm định trong Đợt 1) | **Được thay thế** bởi 8 archetype shell (mục 4). Vẫn một mount DOM, nhưng cấu trúc con riêng. |
| `createGame({ctx, question, mount, onAnswer, reducedMotion})` | **Mở rộng thêm `sprite`** (tham số optional, xem interface doc). 5 tham số cũ không đổi. |
| `destroy()` dọn timer/listener | **Mở rộng**: thêm rAF, image handlers, sprite handle, canvas do game tạo. |
| `Asset/hd/<lessonId>.webp` là ảnh nền | **Giữ** cho `bg`; thêm `Asset/covers/<lessonId>.webp` cho `cover` (thẻ/intro, fallback = `bg`) và `Asset/sprites/<lessonId>.webp` cho `sprite` (`null` → không tạo canvas). Ngân sách ≤400 KB/ảnh HD vẫn áp dụng. |
| Script order trong `index.html` | **Thêm** `js/ui/sprite.js` trước các file game, và file màn `gameIntro` trước `app.js`. |

## Alternatives considered (rejected)

| Phương án | Lý do không chọn |
|-----------|------------------|
| Chỉ đổi thêm 21 class màu trên `.game-stage` hiện tại | Không giải quyết "trùng khung": cấu trúc con vẫn một kiểu xếp dọc; bé vẫn thấy cùng một hộp. |
| Mỗi game tự dựng một `.screen` riêng, không dùng `lesson.js` | Phá đường đi `onAnswer` → `session.answer`, mất race/sao/speech, vỡ 92 test và OBS-01. |
| Dùng `<iframe>`/Shadow DOM cho từng game | `file://` + focus bàn phím + CSS kế thừa + sticky `.choices` trở nên không đoán trước; không đáng. |
| Xoá `.choices` sticky, để game tự dựng nút đáp án | Vi phạm OBS-01 và hợp đồng ADR-0002; regression chặn phát hành. |
| Animate sprite bằng `<img>` + CSS `steps()` thay vì canvas | Không kiểm soát DPR, đổi state theo câu, pause/resume và dọn rAF tập trung; user đã chọn canvas. |
| Preload 21 cover + 21 sheet lúc vào home | 42 request/đụng đĩa cùng lúc, decode chồng nhau → jank; dùng lazy + cache theo `src`. |
| Hiện intro mỗi lần chơi (kể cả chơi lại) | Làm chậm đúng hành vi bé lặp bài để đạt 3 sao; vi phạm nguyên tắc "không cản học". |
| Lưu cờ intro vào `kidmath.v1`/Progress | Đụng domain đã test, phải sửa `normalize()`/reset; sessionStorage là đủ cho nhu cầu "mỗi phiên 1 lần". |
| Clone entry trong `forLesson()` để add default | Phá test identity `T.eq(entry, list[index])`; sửa trực tiếp entry frozen thay vì clone. |

## Consequences

**Tích cực**

- Mỗi bài có nhận diện riêng (màu + layout + sprite + intro + cover) mà vẫn dùng chung một
  đường dẫn đáp án → rủi ro với 92 test rất thấp.
- DOM vẫn 1 stage/1 screen; không tạo thêm lớp chồng lên `.choices` → OBS-01 không regress.
- Sprite runtime là hạ tầng dùng chung, có một chỗ duy nhất để sửa DPR/fallback/dọn rAF.
- GameMap v2 là dữ liệu tĩnh, dễ sinh hàng loạt 21 entry bằng script một lần mà không đổi logic.

**Tiêu cực / chi phí**

- Tăng bề mặt CSS: 8 archetype × 3–4 variant cần quy ước đặt tên chặt, nếu không sẽ thành
  "21 file CSS" khó bảo trì.
- Thêm 1 screen (`gameIntro`) và 1 module hạ tầng (`sprite.js`) → phải cập nhật script order,
  smoke test và bản mirror `public/` (Giai đoạn B).
- Sprite do AI sinh cần prompt/kiểm duyệt thống nhất để 21 sheet không lệch phong cách với
  art bible HD hiện tại; REPLACE `bg` bằng cover là không được (test so sánh đường dẫn).
- sessionStorage có thể bị xoá giữa phiên trên một số cấu hình `file://` → fallback memory;
  hành vi vẫn đúng trong phiên hiện tại.

## Performance implications

**Ngân sách đề xuất**

| Hạng mục | Ngân sách |
|----------|-----------|
| Cover thẻ bài | ≤ 24 KB/ảnh, `lazy`, tổng 21 ảnh ≤ ~500 KB trên đĩa, chỉ tải ảnh trong viewport. |
| Sprite sheet 4×4 | 256×256 WebP ≤ 60 KB/sheet; 21 sheet ≤ ~1.3 MB trên đĩa, tải **theo bài**. |
| Canvas hoạt động | **Tối đa 1** canvas có rAF chạy (màn lesson). Màn intro dùng ảnh tĩnh hoặc canvas `pause()`. |
| FPS sprite | idle ~4 fps (`motionMs=240`); action/cheer one-shot; reduced-motion = 0 rAF. |
| DPR | Cap 2 → canvas backing tối đa ~192×192 CSS→384×384 px (~0.6 MB) cho hero 96×96. |
| Ảnh nền HD | Giữ ≤400 KB/ảnh theo ADR-0002. |

**Rủi ro "21 canvas + WebP tải cùng lúc"** (đặc biệt nếu sau này làm màn chọn bài dạng grid
có preview hoạt ảnh): 21 canvas × rAF dù chỉ 4 fps vẫn là ~84 lần `drawImage`/giây + 21 lần
composite; cộng 21 lần decode WebP có thể làm khựng khi mở home trên máy yếu. Các biện pháp
bắt buộc: (1) home chỉ dùng `<img>` tĩnh, **không tạo canvas**; (2) intro chỉ 1 canvas paused
hoặc `<img>`; (3) lesson tạo canvas khi có factory và hủy rAF trong `destroy()`;
(4) cache `Image` theo `src`, không decode lại; (5) prefetch tối đa sheet của bài kế tiếp sau
`requestIdleCallback` (fallback `setTimeout`), huỷ khi chuyển màn; (6) đo lại bằng smoke test
50 lần chuyển bài liên tiếp để phát hiện rò rỉ.

`file://` vẫn OK: `Image.src` tương đối và `drawImage` không bị CORS chặn khi ảnh cùng origin
local; không dùng `fetch`, module hay Web Worker. reduced-motion: không rAF, không intro
animation, CSS `.is-reduced` như hiện tại tiếp tục có hiệu lực.

## Implementation notes (Giai đoạn B — không thực hiện ở Giai đoạn A)

1. Sửa `js/data/game-map.js`: thêm 8 field mới cho 21 entry, giữ identity/freeze/`bg`.
2. Tạo `js/ui/sprite.js`; nạp trước các file game trong `index.html` **và** `tests/test-runner.html`.
3. Tạo `KM.Screens.gameIntro`; đổi 2 điểm navigate trong `home.js` (thẻ bài + "Học tiếp").
4. `lesson.js`: thêm class `stage--{layout} style--{style}`, `data-variant`, truyền `sprite` vào
   factory; **không** đụng khối `renderChoices`/`handlePick`/OBS-01.
5. `css/games.css`: thêm 8 archetype + variant + `.lesson-cover`; mọi rule nằm dưới
   `.game-stage`/`.lesson-card`, mobile 1 cột.
6. Sinh asset: `Asset/hd/<lessonId>.webp` (giữ), `Asset/covers/<lessonId>.webp` (mới,
   fallback = `bg`), `Asset/sprites/<lessonId>.webp` (mới; `null` → không tạo canvas) —
   do AI sinh ở đợt sau, theo đúng 21 `style` token canonical, ADR này không sinh ảnh.
7. Rebuild `public/` sau khi code xong (bản mirror hiện tại sẽ cũ cho đến lúc đó).

## Validation criteria — "we'll know this was right if"

- 92/92 unit test vẫn PASS, đặc biệt `game-map.test.js` (identity, `bg`, 21 entry).
- GameMap v2 có đúng 8 field mới (`style`, `layout`, `variant`, `cover`, `sprite`,
  `introText`, `inputHint`, `motionMs`); 21 `style` id unique, khớp art bible mục 9 và
  không có entry nào dùng `gameId` làm `style` hay làm fallback `cover`.
- Mọi path ảnh dùng `lessonId`: `Asset/hd/<lessonId>.webp`, `Asset/covers/<lessonId>.webp`,
  `Asset/sprites/<lessonId>.webp`; 0 chỗ nào ghi `Asset/cover/`, `{gameId}` cho asset.
- `python tools/smoke_test.py` PASS; OBS-01 vẫn 12/12 viewport; 0 console error, 0 404 (ảnh
  thiếu phải fallback im lặng).
- Với 18 bài chưa có factory: vào lesson vẫn không có `.game-stage`, không có `<canvas>`.
- Với 3 game mẫu: đúng 1 `.game-stage` có `stage--<layout>`; `.choices` vẫn sticky, z-index 20.
- Chơi lại bài bất kỳ trong cùng phiên: không hiện intro lần 2; `reason:'manual'` vẫn hiện.
- Chuyển bài 50 lần: số `requestAnimationFrame` đang chạy về 0, số canvas trong DOM ≤1, heap không
  tăng liên tục.
- Bật `prefers-reduced-motion`: canvas chỉ vẽ 1 frame, không có rAF; intro không animate.

> **Ghi chú triển khai thực tế (Giai đoạn C):** API chốt là `KM.Sprite.create({mount, src, state, reducedMotion, motionMs, frameSize})` → handle `{setState, setMotion, destroy}`; lesson shell tạo handle trong `.km-hero-sprite` rồi inject qua `options.sprite` (không dùng `canvas`/`forEntry`/`play|pause` như bản phác thảo cũ). Runtime dùng **một vòng rAF chung**. `home.js` quyết định skip intro qua cờ `km_game_intro_v1_<lessonId>`; `KM.Screens.gameIntro` không tự redirect sau khi ghi cờ, kể cả `reason:'manual'`, để tránh điều hướng đệ quy.
