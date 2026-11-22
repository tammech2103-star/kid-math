# Sprite & Cover Style Guide — 21 bài (Bé Vui Học Toán 1)

- **Trạng thái**: v1.0 — đã duyệt để sinh ảnh (2026-11-22)
- **Phạm vi**: 21 sprite sheet + 21 cover + 21 nền HD = **63 ảnh WebP**.
- **Quy chiếu bắt buộc**: `design/art/art-bible-hd.md` mục 1–11 (đặc biệt mục 9
  "21 nhận diện art riêng", mục 10 guardrail bản quyền, mục 11 khả năng đọc).
- **Danh sách gameId/palette gốc**: `js/data/game-map.js`.
- **Ngân sách**: 400.000 bytes/ảnh (`js/data/tuning.js` → `hd.maxBytes`).
- **Môi trường**: web tĩnh `file://`, không backend, không Node runtime. Mọi ảnh
  phải tự load được bằng `<img src="Asset/...webp">`; không phụ thuộc font/web service.

> Nguyên tắc cốt lõi: **21 phong cách art khác nhau thật sự**, không phải một style
> chung đổi màu. Mỗi prompt phải mang "chất liệu" riêng (pixel, nỉ, giấy gấp, sáp,
> len, mực, phấn…), không chỉ đổi hex.

---

## 1. Ba loại ảnh và chuẩn kích thước

| Loại | Delivery path | Kích thước | Định dạng / alpha | Ngân sách/file | Số lượng |
|---|---|---|---|---|---|
| Sprite sheet | `Asset/sprites/{lessonId}.webp` | **384×384** (lưới 4×4, ô 96×96) | WebP, **bắt buộc có alpha**, nền trong suốt | ≤ 180.000 B (target 90–150 KB) | 21 |
| Cover thẻ bài / intro | `Asset/covers/{lessonId}.webp` | **640×360** (16:9 exact) | WebP, không alpha (đen/nền đặc) | ≤ 400.000 B (target 250–340 KB) | 21 |
| Nền HD | `Asset/hd/{lessonId}.webp` | **1280×720** (16:9 exact) | WebP, không alpha, sRGB | ≤ 400.000 B (target 320–360 KB) | 21 |

`Asset/hd/intro.webp`, `Asset/hd/b5.webp`, `Asset/hd/b20.webp` **đã tồn tại**.
Nếu giữ 3 ảnh này, cần sinh mới 60 ảnh; nếu sinh lại full bộ thì đúng 63 ảnh.
Quyết định thuộc người dùng, guide này chuẩn hóa cả 63.

**Tổng ngân sách tối đa**: 21 × (180 + 400 + 400) kB ≈ **20,6 MB**. Target thực
tế ≈ 17 MB — chấp nhận được với web tĩnh offline.

---

## 2. Chuẩn sprite sheet 4×4

### 2.1 Cấu trúc lưới (cố định, không đổi giữa các game)

| Hàng | Trạng thái | Frame index | Ô (col 0→3) | Mô tả động tác |
|---|---|---|---|---|
| 0 | `idle` | 0–3 | (0,0)…(3,0) | Đứng yên, thở nhẹ / chớp mắt — **frame 0 là frame reduced-motion** |
| 1 | `move` | 4–7 | (0,1)…(3,1) | Đi/chạy/leo/đẩy theo chiều game cần |
| 2 | `action` | 8–11 | (0,2)…(3,2) | Động tác tương tác: nhặt, ném, mở, hút, bắn, đấm, tô… |
| 3 | `cheer` | 12–15 | (0,3)…(3,3) | Mừng đúng đáp án: vẫy tay / nhảy nhẹ / cười |

- `frameIndex = row * 4 + col`, đọc theo thứ tự **trái → phải, trên → dưới**.
- Mỗi ô **96×96 px**. Nhân vật căn giữa theo trục x (`x = 48`), chân đặt tại
  `y = 88` (chừa 8 px dưới). Bounding box nét vẽ tối đa **80×80**, lề ≥ 8 px
  mỗi phía. Không được cắt sát mép ô.
- Nền **alpha = 0 tuyệt đối**. Không có đường kẻ lưới, không số frame, không
  nhãn, không bóng đổ chung (shadow chỉ nằm trong nét nhân vật).
- 4 frame trong cùng một hàng phải **cùng scale, cùng góc nhìn, cùng palette**;
  khác nhau ở tư thế. Sai → đọc nhảy khi chạy.
- Sprite là nhân vật, **không chứa đáp án/số/chữ**. Mọi chữ do DOM render.

### 2.2 Xuất WebP có alpha

```powershell
# Master PNG (giữ ngoài delivery, ví dụ Asset/master/)
cwebp -q 82 -alpha_q 100 -m 6 -metadata none spr_master.png -o Asset/sprites/intro.webp
```

- Nếu > 180.000 B: hạ `q` 82 → 76 → 70. **Không** hạ `alpha_q` dưới 100 ở cạnh
  nỉ/bông/mực (làm ragged edge).
- Nếu vẫn vượt: giảm số hạt texture trong master, không giảm số frame.
- Kiểm tra alpha: góc `(0,0)` phải `alpha == 0`; 16 ô đều có ≥ 200 pixel opaque.

### 2.3 Thời gian frame (ms)

Công thức dùng cho mọi game:

| Trạng thái | Công thức | Kẹp (clamp) |
|---|---|---|
| `idle` | `base × 1.25` | 100–240 ms |
| `move` | `base × 1.0` | 80–220 ms |
| `action` | `base × 0.8` | 80–200 ms |
| `cheer` | `base × 1.0` | 100–220 ms |

`base` lấy từ bảng dưới (khớp "motion signature" ở art bible mục 9). Ví dụ
bài 17 `base = 140` → idle 175 ms, move 140 ms, action 112 ms, cheer 140 ms.

| # | gameId | `base` (ms) | # | gameId | `base` (ms) | # | gameId | `base` (ms) |
|---|---|---|---|---|---|---|---|---|
| 1 | `mario-bros` | 120 | 8 | `dr-mario` | 200 | 15 | `pikmin` | 180 |
| 2 | `mario-odyssey` | 200 | 9 | `mario-maker` | 160 | 16 | `kirby` | 200 |
| 3 | `donkey-kong-country` | 180 | 10 | `mario-paint` | 200 | 17 | `warioware` | 140 |
| 4 | `pokemon` | 200 | 11 | `yoshi-island` | 160 | 18 | `super-smash-bros` | 180 |
| 5 | `zelda` | 160 | 12 | `luigis-mansion` | 220 | 19 | `fire-emblem` | 200 |
| 6 | `animal-crossing` | 180 | 13 | `brain-age` | 180 | 20 | `splatoon` | 160 |
| 7 | `mario-party` | 140 | 14 | `mario-and-luigi` | 200 | 21 | `mario-kart` | 140 |

Giới hạn: không frame nào < 80 ms; tổng 4 frame `idle` ≤ 900 ms; không đổi độ
sáng > 20% trong 100 ms; không nháy > 3 Hz.

### 2.4 Hành vi `prefers-reduced-motion`

- Khi media query trả về `reduce`: **chỉ render `idle` frame 0**, dừng mọi timer
  sprite. Không rung, không lắc, không phóng to, không parallax, không confetti.
- Trạng thái game vẫn phải đọc được: `move`/`action`/`cheer` được biểu thị bằng
  **icon tĩnh + đổi màu nền + chữ** (ví dụ "Đúng ✓", "Thử lại ~"). Không được
  dùng chuyển động làm tín hiệu duy nhất.
- Không dùng WebP động. Không CSS `animation` trên sprite khi reduce.
- Frame 0 của mỗi sheet phải là tư thế đứng, mắt mở, không nghiêng đầu — để
  khi dừng vẫn trông "xong", không trông như đang giật dở.

---

## 3. Chuẩn cover 16:9 (thẻ bài + intro)

- Kích thước **640×360** exact (`w*9 == h*16`).
- **Điểm nhấn**: nhân vật gốc chiếm 25–40% chiều cao khung, đặt quanh
  `x = 62–78%, y = 40–75%` (phần ba bên phải). Nhìn ở 160×90 vẫn nhận ra
  silhouette.
- **Khoảng trống chèn tên game**: hình chữ nhật `x = 0–45%, y = 0–30%`
  (288×108 px) giữ yên tĩnh, L* 78–95, biến thiên L* ≤ 10, không họa tiết lặp,
  không nét dày > 3 px. DOM sẽ chèn tên Vietnamese title vào đây.
- Không chứa chữ, số, logo, watermark. Dòng "Cảm hứng: …" **không** nằm trong ảnh.
- Vùng dưới 22% của cover cũng giữ nhạt để dùng làm thẻ select.
- Nén: `cwebp -q 78 -m 6 -metadata none -resize 640 360 cov_master.png -o Asset/covers/{lessonId}.webp`.
  Nếu > 400 KB: q 72 → 66 → giảm texture, **không** làm mờ điểm nhấn.

---

## 4. Chuẩn nền HD 1280×720

- Cả ba loại ảnh dùng chung quy ước `Asset/{type}/{lessonId}.webp`
  (`intro.webp`, `b5.webp`, `b20.webp`, …) theo `lessonId` của bài; mapping lấy từ
  field `bg` trong `js/data/game-map.js`. Sprite và cover **không** dùng `gameId`.
- 16:9 exact, WebP không alpha, sRGB, ≤ 400.000 B, target 320–360 KB.
- Vùng an toàn: 12% trên (badge/tiêu đề), 22% dưới (đáp án). Không có nhân vật
  trong 2 vùng này; nếu lọt, mờ lớp nền xuống ≤ 20% opacity.
- Nén: `cwebp -q 78 -m 6 -metadata none -resize 1280 720 bg_master.png -o Asset/hd/b1.webp`.
- Không sinh lại xe/nhân vật nhận diện được trong `b20` (xem art bible mục 7).

---

## 5. Quy ước đặt tên file

**Delivery (bắt buộc, khớp code):**

```
Asset/sprites/{lessonId}.webp      → 21 file, ví dụ Asset/sprites/b3.webp
Asset/covers/{lessonId}.webp       → 21 file, ví dụ Asset/covers/b3.webp
Asset/hd/{lessonId}.webp         → 21 file, ví dụ Asset/hd/b3.webp
```

**Master (không ship, dùng để re-export):**

`[category]_[name]_[variant]_[size].[ext]`

```
spr_[char]_[lessonId]_4x4_384.png     → spr_yarnbug_b14_4x4_384.png
cov_[lessonId]_card_16x9_640.png      → cov_b3_card_16x9_640.png
bg_[scene]_[lessonId]_16x9_1280.png → bg_forest_b3_16x9_1280.png
```

- Chữ thường, không dấu, không khoảng trắng. `lessonId` giữ nguyên dạng `intro`,
  `b1`…`b20`. `style id` canonical chỉ dùng ở GameMap `style`, class `style--{id}`
  và tên prompt — xem mục 6.
- **Không** ghi tên tribute vào filename master (slug nội bộ là đủ).
- Manifest nên có 5 cột: `lessonId`, `style`, `sprite`, `cover`, `bg` — lưu ở
  `design/art/` khi sinh ảnh; guide này không tạo manifest.

---

## 6. Bảng màu & bố cục 21 game (dùng khi viết prompt)

`focus` = vị trí điểm nhấn trên cover (% khung). `title` = vùng chừa tên game.
Mọi game đều dùng `ink` trên panel sáng; `accent` ≤ 15% khung.

| # | style id | Phong cách | Palette (hex) | focus (x%, y%) | title / safe |
|---|---|---|---|---|---|
| 1 | `pixel-art` | pixel-art | `#5C94FC #FFD84D #3A2317 #FFF6DC` | 68 / 55 | trái 45% × trên 30% |
| 2 | `watercolor` | nước | `#8AD7FF #FF7A59 #243B5A #F2FBFF` | 66 / 50 | trái 45% × trên 30% |
| 3 | `carved-wood` | gỗ khắc | `#A8E06A #FFB020 #4A2C1A #B07A45` | 70 / 58 | trái 45% × trên 30% |
| 4 | `paper-cut` | cắt giấy | `#DFF3A5 #F05A5A #2E4A1F #FFFDF2` | 66 / 52 | trái 45% × trên 30% |
| 5 | `wax-crayon` | sáp màu | `#9FD6A8 #F2C94C #23423A #F6EBCB` | 70 / 55 | trái 45% × trên 30% |
| 6 | `felt-fabric` | vải nỉ | `#BFE9FF #FF9BB3 #3E5B46 #FFF3E2` | 64 / 60 | trái 45% × trên 30% |
| 7 | `plastic-bricks` | khối nhựa | `#FFD6F0 #8E6CFF #3B2A57 #FFFFFF` | 68 / 52 | trái 45% × trên 30% |
| 8 | `origami` | origami | `#EAF3FF #FF5B6E #2B3A66 #C9D8F5` | 66 / 50 | trái 45% × trên 30% |
| 9 | `clay` | đất sét | `#FCE3B4 #FF7B54 #4A3423 #FFF1D6` | 68 / 58 | trái 45% × trên 30% |
| 10 | `oil-paint` | sơn dầu | `#FFF0F6 #7ED957 #3C3557 #FFFFFF` | 70 / 54 | trái 45% × trên 30% |
| 11 | `mosaic` | mosaic | `#C9F0A0 #FF8F3F #35532E #FFF8E7` | 66 / 55 | trái 45% × trên 30%; ô ≥ 12 px |
| 12 | `ink-wash` | mực nước | `#C8D2F2 #7CE0C0 #2E3352 #FFE6A8` | 70 / 52 | trái 45% × trên 30%; panel sáng |
| 13 | `chalkboard` | bảng phấn | `#FFE9A8 #FF7F50 #4A3B2C #2F4A3C` | 66 / 50 | trái 45% × trên 30%; chữ không trắng |
| 14 | `grid-paper` | giấy kẻ ô | `#BFE4FF #FF6B5B #2E4160 #FFFDF0` | 68 / 55 | trái 45% × trên 30%; 2 nhân vật |
| 15 | `yarn` | len quấn | `#D8F3A3 #FF6F61 #3B5230 #FFF2C9` | 66 / 58 | trái 45% × trên 30%; 3–5 bạn |
| 16 | `cotton` | bông gòn | `#FFD8EA #FF6FA5 #5B3A57 #FFF9F2` | 68 / 52 | trái 45% × trên 30%; mắt chấm |
| 17 | `pop-art` | pop-art | `#FFE066 #E34F3F #3B2B22 #FFF8E1` | 70 / 50 | trái 45% × trên 30%; chấm ≥ 4 px |
| 18 | `neon-vector` | neon vector | `#FFC94D #E8453C #3A2438 #FFF3C4` | 68 / 54 | trái 45% × trên 30%; glow sau panel |
| 19 | `woodcut` | in khắc gỗ | `#B7C7E8 #E2B541 #26324F #F4EFE0` | 66 / 55 | trái 45% × trên 30%; khiên trơn |
| 20 | `spray-paint` | sơn xịt | `#FFD1E8 #FF4D8D #3A2B4A #FFFFFF` | 70 / 56 | trái 45% × trên 30%; vệt không đè hình |
| 21 | `patchwork` | vải ghép | `#8DD9FF #FFD84D #243B5A #FFF7E0` | 68 / 55 | trái 45% × trên 30%; ca-rô < 10% |

---

## 7. Prompt mẫu chuẩn

Mỗi bài ở mục 8 gồm một `[BASE]` + 3 đuôi `[SHEET]` / `[COVER]` / `[BG]`.
Chạy `[BASE]` + đúng **một** đuôi cho mỗi ảnh. Không ghép 3 đuôi vào cùng 1 lần sinh.

### 7.1 Template BASE (bắt buộc đủ 6 trường)

```
Style: <STYLE_NAME + material description>. Original character: <SILHOUETTE,
costume, prop, personality — thiết kế gốc, mô tả cụ thể>. Layout: <COMPOSITION>.
Colors: <HEX from section 6 + role of each>. Lighting: <KEY + FILL + shadow>.
Friendly oversized shapes for a 6-year-old, no tiny details, high contrast.
original character, no existing franchise character, no logo, no copyright,
no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
```

### 7.2 Đuôi SHEET (bắt buộc cho mỗi bài)

```
[SHEET] Output ONE sprite sheet, exactly 384×384 pixels, transparent background,
a strict 4×4 grid of sixteen equal 96×96 cells. Same single character in every
cell, centered at x=48 with feet at y=88, artwork bounded within 80×80 and at
least 8px from cell edges. Top row = idle (4 poses), second row = move (4 poses),
third row = action (4 poses), bottom row = cheer (4 poses). Identical scale,
camera angle and palette across all sixteen frames. No grid lines, no frame
numbers, no labels, no background, no text.
```

### 7.3 Đuôi COVER

```
[COVER] Output ONE 640×360 16:9 cover. Character at 66–70% width, 50–58% height,
25–40% of frame height. Keep the top-left 45% × 30% area calm and low-detail
for a title to be added later. Keep the bottom 22% pale. No text, no logo.
```

### 7.4 Đuôi BG

```
[BG] Output ONE 1280×720 16:9 background with NO characters, NO text. Top 12%
and bottom 22% low-detail and pale for UI overlay. 5–7 large shapes maximum,
soft depth, accent color under 15% of frame.
```

### 7.5 Negative prompt dùng chung (dán thêm nếu tool có ô riêng)

```
no text, no letters, no numbers, no logo, no brand marks, no existing franchise
character, no copyrighted character, no recognizable mascot, no red cap, no
mustache, no question block, no star icon, no anime trademark pose, no watermark,
no signature, no photorealism, no gore, no violence, no horror, no UI buttons
```

> Cấm đưa `tribute`, `gameId` hoặc tên nhượng quyền vào prompt. Các heading số
> ở mục 8 là để người đọc đối chiếu, **không** phải một phần của prompt.

---

## 8. 21 prompt cụ thể (đầu vào sinh 63 ảnh)

### 01 · `pixel-art` — pixel-art 8-bit

> **BASE:** Style: chunky 8-bit pixel art, 4×4 px hard square pixels, no
> anti-alias, exactly eight colors, no gradient. Original character: a small
> fox-eared courier with triangular ears, a plain cone cap, a big bushy tail and
> a square boxy jacket, cheerful and always hopping. Layout: single character
> centre-right, three plain round gold coins at different depths behind. Colors:
> sky `#5C94FC`, accent gold `#FFD84D`, ink brown `#3A2317`, soft cream
> `#FFF6DC`; gold under 15%. Lighting: flat top-left key, one-pixel darker
> underside, no soft shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no
> watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (pick up coin), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, character right third, calm top-left title zone, pale bottom 22%.
> **[BG]** 1280×720, no character, chunky grass platforms and plain unmarked
> gold coins, top 12% and bottom 22% low-detail.

### 02 · `watercolor` — tranh nước

> **BASE:** Style: soft watercolor wet-on-wet on fine-grain paper, bleeding
> edges, no hard outline. Original character: a round-headed young owl traveller
> with wide rounded wings, a broad soft felt hat and a small fabric satchel,
> curious and gentle; it throws a plain blue ribbon scarf, never a hat with a
> face. Layout: owl at right, ribbon arc sweeping left toward a large plain round target. Colors: sky
> `#8AD7FF`, coral `#FF7A59`, ink navy `#243B5A`, soft `#F2FBFF`. Lighting:
> diffuse daylight from upper left, pale paper white showing through washes.
> original character, no existing franchise character, no logo, no copyright,
> no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move` (glide), `action` (throw scarf), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, owl right third, calm unpainted top-left title zone.
> **[BG]** 1280×720, no character, floating pastel islands with soft washes,
> lower 22% nearly white paper.

### 03 · `carved-wood` — gỗ khắc nổi

> **BASE:** Style: chunky carved wood relief, visible grain grooves 2px deep,
> rounded edges, warm varnish sheen. Original character: a young squirrel with a
> fan-shaped crest, a big curled tail and a woven vest, energetic climber; NOT an
> ape silhouette. Layout: squirrel at right climbing a broad rope ladder, plain
> yellow fruit clusters. Colors: leaf green `#A8E06A`, fruit `#FFB020`, ink brown
> `#4A2C1A`, wood `#B07A45`. Lighting: warm upper-left key, soft cavity shadow
> inside carved grooves. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no watermark, no
> signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move` (climb), `action` (pick fruit), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, squirrel right, smooth wood-grain-free top-left title zone.
> **[BG]** 1280×720, no character, wooden ropes and large leaves, bottom 22% calm varnish.

### 04 · `paper-cut` — cắt giấy nhiều lớp

> **BASE:** Style: layered paper-cut craft, crisp scissor edges, three stacked
> paper layers each with a 4px soft drop shadow, matte. Original character: a
> small deer-like creature with leaf-shaped ears, a round body and a hoop net in
> hand, gentle and careful. Layout: creature right of centre, two paper groups
> of oversized round tokens left, clearly different in count. Colors: pale green
> `#DFF3A5`, coral `#F05A5A`, ink green `#2E4A1F`, paper white `#FFFDF2`.
> Lighting: soft overhead, shadow only under paper layers. original character, no existing franchise character, no logo, no copyright, no text, no letters,
> no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (swing net), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, creature right third, flat clean top-left title zone.
> **[BG]** 1280×720, no character, paper meadow with two clear groups, bottom 22% plain paper.

### 05 · `wax-crayon` — sáp màu

> **BASE:** Style: thick wax crayon strokes on parchment `#F6EBCB`, visible wax
> grain, slightly wobbly hand-drawn edges, no digital gradient. Original
> character: a calm girl with two thick braids, round half-moon glasses, a
> triangular cloak and a small wooden key token; NO pointed ears, NO green tunic.
> Layout: girl right, two plain wooden chests of clearly different sizes centre-left. Colors: leaf
> `#9FD6A8`, gold `#F2C94C`, ink `#23423A`, parchment `#F6EBCB`. Lighting: flat
> warm daylight, light wax highlighting upper-left. original character, no existing franchise character, no logo, no copyright, no text, no letters, no
> numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (open chest), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, girl right, parchment top-left title zone free of scribble.
> **[BG]** 1280×720, no character, crayon forest and two plain chests of
> clearly different sizes, bottom 22% lightly waxed only.

### 06 · `felt-fabric` — vải nỉ

> **BASE:** Style: soft felt plush, fuzzy cut edges, visible stitching seams,
> matte fabric, no shine. Original character: a floppy-eared rabbit in a floral
> apron carrying a small woven basket, patient and friendly. Layout: rabbit
> right, two large flower beds left and right with an obvious gap. Colors: sky
> `#BFE9FF`, blossom pink `#FF9BB3`, ink green `#3E5B46`, cream felt `#FFF3E2`.
> Lighting: soft window daylight upper left, gentle fabric shadow. original character, no existing franchise character, no logo, no copyright, no text,
> no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (plant flower), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, rabbit right third, smooth cream felt top-left title zone.
> **[BG]** 1280×720, no character, two flower beds with different flower counts, bottom 22% plain felt.

### 07 · `plastic-bricks` — khối nhựa lắp ráp

> **BASE:** Style: glossy interlocking plastic toy bricks, round studs on top,
> rounded moulded edges, crisp white specular dots. Original character: a dog
> with one upright ear and one drooping ear, a blocky brick-built body and a
> plaid jacket, lucky and bouncy; holding a plain six-sided die with no pips
> shape copied from any existing game. Layout: dog right, one large die centre.
> Colors: pink `#FFD6F0`, violet `#8E6CFF`, ink `#3B2A57`, white `#FFFFFF`.
> Lighting: bright upper-left key, tight white highlights under 5% of area.
> original character, no existing franchise character, no logo, no copyright,
> no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (roll die), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, dog right, unstudded flat top-left title zone.
> **[BG]** 1280×720, no character, broad brick board tiles, bottom 22% plain surface.

### 08 · `origami` — origami

> **BASE:** Style: crisp origami folded paper, sharp crease lines, flat planes
> with two tones per face, no rounded corners. Original character: a small bear
> doctor with folded round ears, a paper cone cap, a clean white coat and a
> plain medicine bottle, a capsule-shaped token and flat shape cards, careful and precise. Layout: bear right, flat
> shape cards and capsule shapes arranged in a tidy column left. Colors: pale blue `#EAF3FF`,
> coral `#FF5B6E`, ink navy `#2B3A66`, fold shadow `#C9D8F5`. Lighting: flat
> overhead, one crisp shadow under each fold. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers,
> no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (place capsule), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, bear right, blank paper top-left title zone.
> **[BG]** 1280×720, no character, folded paper grid with large cells, bottom 22% blank sheet.

### 09 · `clay` — đất sét

> **BASE:** Style: soft claymation plasticine, faint fingerprints, rounded lumpy
> shapes, matte with slight sheen. Original character: a little bear builder
> with small round ears, a square apron and chunky mitts, happily stacking
> blocks. Layout: bear right, three oversized clay blocks mid-left. Colors: warm
> sand `#FCE3B4`, orange `#FF7B54`, ink brown `#4A3423`, light clay `#FFF1D6`.
> Lighting: soft upper-left key, gentle contact shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no
> numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (stack block), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, bear right, smooth clay top-left title zone.
> **[BG]** 1280×720, no character, soft clay blocks in a loose arrangement, bottom 22% plain clay.

### 10 · `oil-paint` — sơn dầu impasto

> **BASE:** Style: thick oil-paint impasto, visible palette-knife ridges, white
> canvas grain, saturated but friendly. Original character: an expressive cat
> with triangular ears, a long curved tail and a paint-smeared apron, holding a
> broad brush. Layout: cat right, three large paint swatches left. Colors: pale
> pink `#FFF0F6`, leaf green `#7ED957`, ink violet `#3C3557`, canvas `#FFFFFF`.
> Lighting: studio daylight from upper left, thick ridges catch light. original character, no existing franchise character, no logo, no copyright, no text,
> no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (paint stroke), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, cat right, clean white canvas top-left title zone.
> **[BG]** 1280×720, no character, large colour swatches only, bottom 22% thin paint.

### 11 · `mosaic` — mosaic

> **BASE:** Style: large square tile mosaic, tiles at least 12px, pale 2px grout
> lines, matte; no tiny tiles. Original character: a young parrot with a
> three-feather crest, a big rounded beak and a small woven basket, hungry and
> quick; NOT a long-nosed dinosaur. Layout: parrot right, oversized fruit tiles
> left. Colors: green `#C9F0A0`, orange `#FF8F3F`, ink `#35532E`, grout
> `#FFF8E7`. Lighting: even daylight, subtle grout shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters,
> no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (swallow fruit), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, parrot right, plain grout-coloured top-left title zone.
> **[BG]** 1280×720, no character, tiled hillside with big tiles, bottom 22% flat grout tone.

### 12 · `ink-wash` — mực nước + đèn lồng

> **BASE:** Style: blue-grey ink wash with soft bleeding edges, one warm lantern
> glow, dim but never black. Original character: a timid but brave bat with very
> wide ears, a small round body and an oval glowing lantern held in front.
> Layout: bat right, a few simple pale floating balls left. Colors: slate
> `#C8D2F2`, mint glow `#7CE0C0`, ink `#2E3352`, lantern `#FFE6A8`. Lighting:
> single lantern key from lower right, soft ink wash elsewhere, no flashing.
> original character, no existing franchise character, no logo, no copyright,
> no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (vacuum ball), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, bat right, pale washed top-left title zone for dark text.
> **[BG]** 1280×720, no character, soft ink rooms with lantern pools, bottom 22% washed pale.

### 13 · `chalkboard` — bảng đen + phấn

> **BASE:** Style: dark green chalkboard `#2F4A3C` with faint grid, white dusty
> chalk strokes, slight erase smudge. Original character: a focused turtle with
> a hexagon-patterned shell, thin round glasses and a piece of chalk in one
> flipper. Layout: turtle right, a large empty grid of number cells and a blank addition-subtraction board left.
> Colors: board `#2F4A3C`, chalk `#FFFFFF`, warm sky `#FFE9A8`, coral `#FF7F50`,
> ink `#4A3B2C`. Lighting: flat classroom light, no glow, no lens flare. original character, no existing franchise character, no logo, no copyright, no text,
> no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (write chalk), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, turtle right, a blank pale panel top-left title zone —
> never white chalk on dark board behind UI text.
> **[BG]** 1280×720, no character, faint chalk grid only, bottom 22% dark but clean.

### 14 · `grid-paper` — giấy kẻ ô + bút dạ

> **BASE:** Style: light graph-paper notebook, 3px rounded marker strokes,
> slightly visible redraw lines, matte paper. Original characters: two friends —
> a small hedgehog with rounded quills and a tiny cone cap, and a round-eared
> squirrel with a fabric pouch — both holding one magnifying glass beside a large plain ball, cooperative.
> Layout: pair at right, a large dotted grid panel left. Colors: blue `#BFE4FF`,
> coral `#FF6B5B`, ink navy `#2E4160`, paper `#FFFDF0`. Lighting: flat daylight,
> faint paper shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no watermark, no
> signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> BOTH characters kept in the same scale in all sixteen cells; `idle`, `move`,
> `action` (look through glass), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, pair right, faint-grid top-left title zone, grid opacity ≤ 10%.
> **[BG]** 1280×720, no character, clean graph paper with one big blank panel, bottom 22% plain.

### 15 · `yarn` — len quấn

> **BASE:** Style: yarn-wound figures, visible 2px spiral winding lines, one
> loose thread end, soft matte fibre. Original characters: a team of three to
> five round yarn beetles with three whisker threads and short legs, cooperatively
> carrying a large cube. Layout: group right-of-centre, one big plain cube left.
> Colors: pale green `#D8F3A3`, coral `#FF6F61`, ink `#3B5230`, light yarn
> `#FFF2C9`. Lighting: soft daylight, tiny fibre shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no
> numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> one lead yarn beetle consistent in all cells; `idle`, `move`, `action` (pull
> cube), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, group right, smooth yarn-free top-left title zone.
> **[BG]** 1280×720, no character, large woven ground shapes, bottom 22% plain fibre.

### 16 · `cotton` — bông gòn

> **BASE:** Style: soft cotton-puff plush, scalloped cloud edge, one single
> swirl tuft on top, tiny dot eyes, tiny leaf-like arms, matte and very soft;
> NOT a round blob with big anime eyes. Original character: a gentle little
> cloud puff who blows other small puffs along an arrow direction. Layout: puff
> right, one pale arrow shape left. Colors: pink `#FFD8EA`, accent `#FF6FA5`,
> ink plum `#5B3A57`, cream `#FFF9F2`. Lighting: diffuse daylight, extremely
> soft contact shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no watermark, no
> signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (puff blow), `cheer`; feet at y=88; inflate ≤ 4%;
> no grid lines.
> **[COVER]** 640×360, puff right, plain cream top-left title zone.
> **[BG]** 1280×720, no character, soft clouds and one big pale arrow, bottom 22% empty cream.

### 17 · `pop-art` — pop-art halftone

> **BASE:** Style: bold pop-art with Ben-Day dots at least 4px, thick 4px
> outlines, comic burst shapes in corners, high contrast. Original character:
> a fast rabbit host with one folded ear, plain dark sunglasses, a short jacket
> and a single large button prop; twitchy and surprised. Layout: rabbit right,
> fan of plain command cards with simple arrow symbols left, holding no text. Colors: yellow `#FFE066`, red `#E34F3F`,
> ink `#3B2B22`, cream `#FFF8E1`. Lighting: flat graphic light, no gradient
> shine. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no watermark, no signature, no
> trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (press button), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, rabbit right, dot-free flat top-left title zone.
> **[BG]** 1280×720, no character, large dots and bursts, bottom 22% flat cream.

### 18 · `neon-vector` — neon vector

> **BASE:** Style: thick smooth vector shapes with a 6px outer neon glow, dark
> plum background, clean arcade look, no lens flare. Original character: a
> confident young tiger with round ears, a plain cloth headband with no symbol,
> soft padded mitts and a striped tail. Layout: tiger right, one big glowing
> punch pad and a small plain flag left. Colors: gold `#FFC94D`, red `#E8453C`, ink `#3A2438`,
> glow cream `#FFF3C4`. Lighting: self-lit glow on edges only, matte centre.
> original character, no existing franchise character, no logo, no copyright,
> no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (punch pad), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, tiger right, matte dark top-left title zone for a pale panel.
> **[BG]** 1280×720, no character, dark arena with one punch pad and one plain flag, bottom 22% matte.

### 19 · `woodcut` — in khắc gỗ (woodblock print)

> **BASE:** Style: flat two-dimensional woodblock print, 2px carved lines,
> vertical grain texture on warm print paper `#F4EFE0`, no 3D relief — flat ink,
> unlike carved wood sculpture. Original character: a careful square-cap squire
> with a plain kite shield bearing NO emblem, a short cape and calm posture.
> Layout: squire right, one large empty grid of square tiles and one small plain pawn piece left. Colors: slate
> blue `#B7C7E8`, gold `#E2B541`, ink `#26324F`, paper `#F4EFE0`. Lighting:
> flat printed light, no cast shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no
> watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (step to tile), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, squire right, clean paper top-left title zone.
> **[BG]** 1280×720, no character, large printed grid tiles, bottom 22% plain paper.

### 20 · `spray-paint` — sơn xịt stencil

> **BASE:** Style: spray-paint stencil with speckled edges, 2px thick paint
> layer, rounded stencil shapes on pale paper. Original character: a playful
> young squid with six short tentacles, two simple dot eyes and a flower-shaped
> water blaster, painting shapes. Layout: squid right, one large sprayed colour splat and one unpainted
> outline shape left. Colors: pink `#FFD1E8`, magenta `#FF4D8D`, ink `#3A2B4A`,
> stencil white `#FFFFFF`. Lighting: soft daylight, matte paint, no gloss.
> original character, no existing franchise character, no logo, no copyright,
> no text, no letters, no numbers, no watermark, no signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move`, `action` (spray), `cheer`; feet at y=88; no grid lines.
> **[COVER]** 640×360, squid right, clean stencil-free top-left title zone.
> **[BG]** 1280×720, no character, large sprayed shapes, bottom 22% mostly white.

### 21 · `patchwork` — vải ghép miếng

> **BASE:** Style: patchwork quilt, fabric diamonds and squares at least 20px,
> 2px stitch lines, rounded fabric edges, matte. Original character: a cheerful
> cat driver with ROUND ears, a checkered scarf and a rounded four-wheeled
> buggy with exposed wheels — no recognizable vehicle shape, no cap, no
> mustache. Layout: cat in buggy right, a simple black-and-white checkered
> finish line mid-left. Colors: sky `#8DD9FF`, gold `#FFD84D`, ink `#243B5A`,
> cloth cream `#FFF7E0`; checkered area under 10%. Lighting: soft sunny daylight,
> gentle fabric shadow. original character, no existing franchise character, no logo, no copyright, no text, no letters, no numbers, no watermark, no
> signature, no trademarked symbol.
>
> **[SHEET]** 384×384 transparent, strict 4×4 grid of sixteen 96×96 cells;
> `idle`, `move` (roll), `action` (wave flag), `cheer`; buggy and cat same scale
> in every cell; feet/wheels at y=88; no grid lines.
> **[COVER]** 640×360, buggy right, plain fabric top-left title zone.
> **[BG]** 1280×720, no character, broad track strips and one checkered line,
> bottom 22% plain track.

---

## 9. Ngân sách & nghiệm thu kiểm được

### 9.1 Ngân sách

| Loại | Mỗi file | 21 file | Target thực tế |
|---|---|---|---|
| Sprite sheet | ≤ 180.000 B | ≤ 3,78 MB | 90–150 KB/ảnh |
| Cover | ≤ 400.000 B | ≤ 8,40 MB | 250–340 KB/ảnh |
| Nền HD | ≤ 400.000 B | ≤ 8,40 MB | 320–360 KB/ảnh |
| **Tổng** | — | **≤ 20,58 MB** | ≈ 17 MB |

### 9.2 Lệnh kiểm nhanh

```powershell
Get-ChildItem Asset\sprites,Asset\covers,Asset\hd -Filter *.webp |
  Select-Object DirectoryName, Name, Length |
  Sort-Object DirectoryName, Name
```

```python
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path('.')
errors = []

# --- Sprite sheets ---
for p in sorted((ROOT / 'Asset/sprites').glob('*.webp')):
    im = Image.open(p).convert('RGBA')
    if im.size != (384, 384):
        errors.append(f'{p}: size {im.size} != (384,384)')
    if im.getpixel((0, 0))[3] != 0:
        errors.append(f'{p}: corner not transparent')
    for r in range(4):
        for c in range(4):
            cell = im.crop((c*96, r*96, (c+1)*96, (r+1)*96))
            a = cell.getchannel('A')
            opaque = sum(1 for v in a.getdata() if v > 32)
            if opaque < 200:
                errors.append(f'{p}: cell ({r},{c}) only {opaque} opaque px')
            bbox = a.point(lambda v: 255 if v > 32 else 0).getbbox()
            if not bbox or bbox[0] < 4 or bbox[1] < 4 or bbox[2] > 92 or bbox[3] > 92:
                errors.append(f'{p}: cell ({r},{c}) bbox {bbox} out of safe margin')

# --- Covers & backgrounds ---
for folder, expect in [('covers', (640, 360)), ('hd', (1280, 720))]:
    for p in sorted((ROOT / 'Asset' / folder).glob('*.webp')):
        im = Image.open(p).convert('RGB')
        if im.size != expect:
            errors.append(f'{p}: size {im.size} != {expect}')
        zone = im.crop((0, 0, int(im.width*0.45), int(im.height*0.30)))
        std = ImageStat.Stat(zone.convert('L')).stddev[0]
        if std > 10:
            errors.append(f'{p}: title zone stddev {std:.1f} > 10')
        if p.stat().st_size > 400000:
            errors.append(f'{p}: {p.stat().st_size} B > 400000 B')

for p in (ROOT / 'Asset/sprites').glob('*.webp'):
    if p.stat().st_size > 180000:
        errors.append(f'{p}: {p.stat().st_size} B > 180000 B')

print('PASS' if not errors else '\n'.join(errors))
```

### 9.3 Tiêu chí Given–When–Then

- **AC-S1** — Given 21 file `Asset/sprites/{lessonId}.webp`, when chạy script mục
  9.2, then `PASS` và không có dòng lỗi nào (384×384, alpha góc = 0, 16 ô
  ≥ 200 px opaque, bbox lề ≥ 4 px).
- **AC-S2** — Given 1 sheet bất kỳ, when đánh số frame 0→15 theo `row*4+col`,
  then frame 0–3 là idle, 4–7 move, 8–11 action, 12–15 cheer; 16 frame đều là
  cùng một nhân vật, cùng scale.
- **AC-S3** — Given `prefers-reduced-motion: reduce`, when chơi đáp án đúng,
  then sheet dừng ở frame 0, không `transform`/`animation` thay đổi, và vẫn có
  đổi màu + ✓ + chữ "Đúng".
- **AC-C1** — Given 21 cover, when mở ở 640×360, then mỗi ảnh có điểm nhấn ở
  `x 66–70%, y 50–58%`, chiếm 25–40% chiều cao, và vùng `x 0–45%, y 0–30%`
  có `stddev(L*) ≤ 10`.
- **AC-C2** — Given 21 cover + 21 bg + 21 sheet, when kiểm tra `Length`,
  then 63/63 ≤ 400000 B và 21/21 sheet ≤ 180000 B.
- **AC-B1** — Given 21 bg, when kiểm tra `w*9 == h*16` và tên file, then
  khớp đúng field `bg` của `js/data/game-map.js` (kể cả `intro.webp`).
- **AC-IP1** — Given 63 prompt đã dùng, when grep cụm
  `original character, no existing franchise character, no logo, no copyright`,
  then 63/63 prompt có cụm này; 0 prompt chứa `tribute` hoặc tên nhân vật cấm.
- **AC-IP2** — Given 63 ảnh, when soi ở 100% và 64×64 px, then 0 ảnh có chữ,
  logo, watermark hoặc silhouette nhận diện được; 21/21 silhouette có ≥ 2 đặc
  điểm không trùng (art bible mục 9).
- **AC-R1** — Given 21 bài, when đo vùng đáp án 22% dưới, then L* 78–95,
  biến thiên ≤ 10, nút ≥ 64 px, gap ≥ 8 px, chữ ≥ 32 px, contrast ≥ 4.5:1.

---

## 10. Edge case & rủi ro đã xử lý

| Tình huống | Kết quả xử lý cụ thể |
|---|---|
| AI sinh sai lưới 4×4 (gộp ô, thiếu frame) | **Loại ảnh**, không crop ghép. Sinh lại với `[SHEET]` đầy đủ; nếu vẫn sai, sinh 16 frame riêng rồi ghép bằng tool ảnh (không viết code game). |
| AI thêm chữ/số vào sheet | Loại ảnh. Không xóa chữ rồi dùng lại — art bible mục 10.6. |
| Alpha bị mất khi convert (nền trắng đặc) | Re-export với `-alpha_q 100`; kiểm tra `(0,0).alpha == 0`. Không dùng ảnh nền trắng làm sprite. |
| File > 400 KB | Hạ `q` theo thứ tự 78→72→66 (cover/bg) hoặc 82→76→70 (sheet); nếu vẫn vượt, giảm texture. Không giảm kích thước frame hay bỏ frame. |
| Bài 13 nền bảng đen | Chữ UI **không** dùng trắng; dùng `ink #4A3B2C` trên panel `#FFFDF0` ≥ 92%. |
| Bài 18 glow neon lọt sau chữ | Thêm panel mờ trước khi vẽ chữ; glow chỉ nằm trong sprite. |
| Bài 11/17/21 họa tiết lặp đè số | Mask họa tiết trong vùng đáp án 22% dưới, opacity ≤ 20%. |
| `bg` của `game-map.js` trỏ `intro.webp`/`b5.webp`/`b20.webp` | Giữ nguyên `lessonId`; sprite/cover cũng dùng cùng `lessonId` này, không dùng `gameId`. |
| 3 ảnh HD đã có từ Đợt 1 | Giữ lại nếu đạt AC-B1; chỉ sinh lại khi người dùng yêu cầu full 63. |
| Ảnh `Asset/` root có nhân vật có bản quyền | Không đưa vào prompt, không crop, không làm tham chiếu tạo hình; chỉ dùng số liệu màu nội bộ như art bible mục 1. |
| Thiếu ảnh lúc chạy `file://` | Fallback CSS + emoji hiện tại; giữ nguyên bố cục, 0 console error. |

### Liên kết

- `design/art/art-bible-hd.md` — mục 9 (21 style), 10 (guardrail), 11 (đọc đáp án).
- `design/art/hd-prompts-dot1.md` — prompt nền Đợt 1 (giữ nguyên).
- `js/data/game-map.js` — nguồn `gameId`, `tribute`, `palette`, `bg`, `phase`.
