# Skill Asset Pipeline — pxl / vex / kiln / loom / chirp

- **Trạng thái**: v1.0 — chốt quy trình sinh asset bằng 5 skill (2026-11-22)
- **Phạm vi**: tài liệu quy trình, **không sinh asset trong lần viết này**. Mọi file sinh ra ở
  **authoring-time**, được commit vào repo; runtime **không fetch** bất kỳ file nào.
- **Quyết định người dùng**: dùng **cả 5 skill**, ghi đè trực tiếp code/assets cũ khi triển khai.
- **Nguồn chân lý**:
  - `design/art/art-bible-hd.md` (mục 1–11, đặc biệt mục 9 = 21 style riêng, mục 10 = bản quyền).
  - `design/art/sprite-style-guide.md` (lưới 4×4, 384×384, frame 0 = reduced-motion).
  - `js/data/game-map.js` — **giữ nguyên 21 `gameId`, thứ tự, mục tiêu toán**. Không sửa slug.
  - `design/quick-specs/all-21-distinct-games.md` — 21 động tác/mục tiêu toán.
- **Runtime contract**: web tĩnh `file://`, không backend, không Node, không `fetch()`, không
  `XMLHttpRequest`, không module outside. Chỉ consume qua `<img src>`, CSS `url()`,
  `<audio src>`. ES5-ish `KM.*`.
- **Node authoring**: `C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe` (v22.18.0).

---

## 0. Nguyên tắc cốt lõi (đọc trước khi sinh bất cứ thứ gì)

1. **Authoring-time ≠ runtime.** Skill chạy bằng Node ở máy dev, ghi file vào `out/`, sau đó copy
   sang `Asset/v2/<skill>/`. Trình duyệt chỉ thấy file tĩnh đã commit.
2. **Không fetch.** Dù là JSON (bank âm thanh) hay atlas JSON, nếu runtime cần giá trị thì giá trị đó
   phải được ghi thành **literal trong file `.js` được commit** ở authoring-time. Không dùng
   `fetch('...json')` — `file://` chặn.
3. **Một bài = một asset riêng.** Bảng mục 1.1 phân công đúng 21 asset nhận diện riêng (chưa kể
   tài liệu dùng chung). Không dùng "một style đổi màu" cho 21 bài.
4. **Không tài sản bản quyền.** `gameId` (`mario-bros`, `pokemon`, `kirby`, `mario-kart`, …) là khóa
   nội bộ, không render thành chữ, không đưa vào prompt sinh ảnh. Xem mục 5.
5. **Ngân sách**: mỗi file delivery **≤ 400.000 bytes** (`hd.maxBytes`); sprite nền trong suốt target
   90–150 KB; âm thanh ưu tiên OGG cho loop. Xem mục 6.

---

## 1. Bảng phân công 5 skill

### 1.1 Tổng quan skill → asset → consume

| Skill | Input (source, commit) | Output sinh ra | Delivery trong repo | Cách consume trong web tĩnh | Vai trò chính |
|---|---|---|---|---|---|
| **pxl** | `tools/asset-pipeline/pxl/<name>.px.js` | PNG + `out/_preview/<name>.png` (+ sprite sheet/anim strip) | `Asset/v2/pxl/<name>.png` | `<img src="Asset/v2/pxl/....png">` hoặc CSS `background-image` + `background-position` cho sheet | Pixel/ô/mảnh/họa tiết lặp: #1, #11, #17, #19 |
| **vex** | `tools/asset-pipeline/vex/<name>.vx.js` | SVG + PNG `@1x/@2x` + atlas JSON + `out/_preview/<name>.png` | `Asset/v2/vex/<name>.svg` + `<name>@1x.png` / `<name>@2x.png` | `<img src="...svg">` (ưu tiên nét sắc) hoặc `url(...png)` cho 9-slice qua `border-image` | Vector mềm/giấy/vải/neon: #2, #4, #7, #8, #12, #16, #18, #20 + UI panel dùng chung |
| **kiln** | `tools/asset-pipeline/kiln/<name>.kx.js` | GLB + `out/_preview/<name>.png` (hero/front/right/top) | `Asset/v2/kiln/<name>.png` (**preview PNG làm sprite**); GLB giữ ở `tools/asset-pipeline/kiln/_glb/` làm master | `<img src="Asset/v2/kiln/....png">`. **Không load GLB** (không có three.js) | Khối 3D/đất sét/gỗ/len: #3, #9, #15 |
| **loom** | `tools/asset-pipeline/loom/<name>.tx.js` | albedo / normal / roughness / seamless (`SEAM` check) + `out/_preview/<name>.png` | `Asset/v2/loom/<name>_albedo.png` (runtime); `_normal`, `_rough` giữ trong `tools/asset-pipeline/loom/_maps/` | CSS `background-image: url(...); background-repeat: repeat; background-size: <tile>px <tile>px` | Nền/chất liệu lặp: #5, #6, #10, #13, #14, #21 |
| **chirp** | `tools/asset-pipeline/chirp/<name>.cx.js` | WAV / OGG + bank JSON + `out/_preview/<name>.png` (waveform + spectrogram) | `Asset/v2/chirp/<name>.ogg` (mọi asset), `<name>.wav` (SFX ngắn ≤0,5 s); bank JSON mang sang `js/data/audio-bank.js` | `<audio src="Asset/v2/chirp/....ogg">` + fallback `.wav`; development phải **user gesture** (chạm) | SFX đúng/sai/tap/sao + nhạc nền, dùng chung 21 bài |

> **Lưu ý kiln**: GLB là artifact nguồn, **không được load runtime** (web tĩnh không có three.js).
> Nếu bắt buộc đặt GLB trong `Asset/v2/kiln/`, giữ ≤ 400 KB bằng low-poly (≤ 800 tris/props).
> Trường hợp mặc định: GLB nằm ngoài delivery, chỉ preview PNG được commit vào `Asset/v2/`.

> **Lưu ý chirp**: WAV stereo 8 s ≈ 1,4 MB → vượt ngân sách. Nhạc nền **chỉ delivery OGG**
> (~80–120 KB ở 96 kbps). WAV giữ làm master trong `tools/asset-pipeline/chirp/_master/`.
> SFX ≤ 0,5 s mono ≈ 44 KB → delivery cả `.wav` lẫn `.ogg`.

### 1.2 Phân công 21 bài — mỗi bài có ít nhất 1 asset riêng

Thứ tự đúng 100% theo `js/data/game-map.js`. Cột "mục tiêu toán" chỉ để đối chiếu, **không đổi**.

| # | lessonId | `gameId` (giữ nguyên) | style | Mục tiêu toán | Skill chính | Asset riêng (`<name>`) | Delivery | Consume |
|---|---|---|---|---|---|---|---|---|
| 1 | `intro` | `mario-bros` | `pixel-art` | Đếm 1–5 quả (`count`) | **pxl** | `mario-bros_coin_idle_96` | `Asset/v2/pxl/mario-bros_coin_idle_96.png` | `<img>` dãy xu trên rail |
| 2 | `b1` | `mario-odyssey` | `watercolor` | Đếm 0–5 (`count`) | **vex** | `mario-odyssey_scarf_arc_1x` | `Asset/v2/vex/mario-odyssey_scarf_arc_1x.svg` | `<img>` mục tiêu số trên cung |
| 3 | `b2` | `donkey-kong-country` | `carved-wood` | Đếm 5–10 (`count`) | **kiln** | `donkey-kong-country_rung_wood_1x` | `Asset/v2/kiln/donkey-kong-country_rung_wood_1x.png` | `<img>` nấc thang (preview PNG) |
| 4 | `b3` | `pokemon` | `paper-cut` | So sánh nhóm ≤10 | **vex** | `pokemon_net_layer_1x` | `Asset/v2/vex/pokemon_net_layer_1x.svg` | `<img>` lưới vây 3–4 lớp |
| 5 | `b4` | `zelda` | `wax-crayon` | `> < =` / điền số ≤10 | **loom** | `zelda_crayon_paper_albedo` | `Asset/v2/loom/zelda_crayon_paper_albedo.png` | CSS nền giấy sáp (panel `soft` chồng) |
| 6 | `b5` | `animal-crossing` | `felt-fabric` | Tách–gộp ≤10 | **loom** | `animal-crossing_felt_albedo` | `Asset/v2/loom/animal-crossing_felt_albedo.png` | CSS nền vải nỉ 2 luống |
| 7 | `b6` | `mario-party` | `plastic-bricks` | mixed 5 dạng | **vex** | `mario-party_dice_face_1x` | `Asset/v2/vex/mario-party_dice_face_1x.svg` | `<img>` xí ngầu bo góc |
| 8 | `b7` | `dr-mario` | `origami` | 4 hình phẳng ≤6 | **vex** | `dr-mario_fold_pill_1x` | `Asset/v2/vex/dr-mario_fold_pill_1x.svg` | `<img>` viên thuốc gấp giấy |
| 9 | `b8` | `mario-maker` | `clay` | Xếp hình & đếm ≤8 | **kiln** | `mario-maker_clay_block_1x` | `Asset/v2/kiln/mario-maker_clay_block_1x.png` | `<img>` khối đất sét (preview) |
| 10 | `b9` | `mario-paint` | `oil-paint` | mixed 3 dạng | **loom** | `mario-paint_canvas_albedo` | `Asset/v2/loom/mario-paint_canvas_albedo.png` | CSS nền canvas gồ nhẹ |
| 11 | `b10` | `yoshi-island` | `mosaic` | Cộng ≤10 | **pxl** | `yoshi-island_mosaic_tile_96` | `Asset/v2/pxl/yoshi-island_mosaic_tile_96.png` | `<img>`/CSS tile ≥12 px |
| 12 | `b11` | `luigis-mansion` | `ink-wash` | Trừ ≤10 | **vex** | `luigis-mansion_lantern_ghost_1x` | `Asset/v2/vex/luigis-mansion_lantern_ghost_1x.svg` | `<img>` bóng + đèn ấm |
| 13 | `b12` | `brain-age` | `chalkboard` | Gia đình số | **loom** | `brain-age_chalkboard_albedo` | `Asset/v2/loom/brain-age_chalkboard_albedo.png` | CSS nền bảng (chữ vẫn `ink` trên `soft`) |
| 14 | `b13` | `mario-and-luigi` | `grid-paper` | mixed cộng/trừ | **loom** | `mario-and-luigi_grid_paper_albedo` | `Asset/v2/loom/mario-and-luigi_grid_paper_albedo.png` | CSS nền ô mờ ≤10% |
| 15 | `b14` | `pikmin` | `yarn` | Nhận khối `solid3d` | **kiln** | `pikmin_yarn_block_1x` | `Asset/v2/kiln/pikmin_yarn_block_1x.png` | `<img>` khối len (preview) |
| 16 | `b15` | `kirby` | `cotton` | Vị trí ↑↓←→ | **vex** | `kirby_puff_cloud_1x` | `Asset/v2/vex/kirby_puff_cloud_1x.svg` | `<img>` 4 mây bông gòn |
| 17 | `b16` | `warioware` | `pop-art` | mixed khối/vị trí/hình | **pxl** | `warioware_halftone_dot_96` | `Asset/v2/pxl/warioware_halftone_dot_96.png` | CSS/`<img>` chấm Ben-Day ≥4 px |
| 18 | `b17` | `super-smash-bros` | `neon-vector` | mixed 4 dạng | **vex** | `super-smash-bros_neon_flag_1x` | `Asset/v2/vex/super-smash-bros_neon_flag_1x.svg` | `<img>` cờ trên bệ |
| 19 | `b18` | `fire-emblem` | `woodcut` | mixed cộng/trừ | **pxl** | `fire-emblem_woodcut_tile_96` | `Asset/v2/pxl/fire-emblem_woodcut_tile_96.png` | `<img>` ô in bản khắc nét 2 px |
| 20 | `b19` | `splatoon` | `spray-paint` | mixed hình/khối/vị trí | **vex** | `splatoon_stencil_target_1x` | `Asset/v2/vex/splatoon_stencil_target_1x.svg` | `<img>` mục tiêu stencil |
| 21 | `b20` | `mario-kart` | `patchwork` | mixed 11 dạng | **loom** | `mario-kart_quilt_albedo` | `Asset/v2/loom/mario-kart_quilt_albedo.png` | CSS nền vải ghép (ca-rô chỉ ở đích) |

**Tài liệu dùng chung** (không tính vào "asset riêng" nhưng bắt buộc có):

| `<name>` | Skill | Delivery | Dùng ở | Ghi chú |
|---|---|---|---|---|
| `sfx_correct` | chirp | `Asset/v2/chirp/sfx_correct.ogg` + `.wav` | 21 bài, đúng | pitch lên; kèm ✓ + chữ "Đúng" |
| `sfx_wrong` | chirp | `Asset/v2/chirp/sfx_wrong.ogg` + `.wav` | 21 bài, sai | pitch xuống; kèm ~ + chữ "Thử lại" |
| `sfx_tap` | chirp | `Asset/v2/chirp/sfx_tap.ogg` + `.wav` | 21 bài, chạm nút | 50–120 ms |
| `sfx_star` | chirp | `Asset/v2/chirp/sfx_star.ogg` + `.wav` | 21 bài, nhận sao | arpeggio 3 nốt |
| `music_loop_8s` | chirp | `Asset/v2/chirp/music_loop_8s.ogg` | màn chơi/chờ | ≤ 120 KB, loop seamless |
| `ui_panel_9` | vex | `Asset/v2/vex/ui_panel_9.png` + `.svg` | panel chữ/đáp án | `slice:[l,t,r,b]` 9-slice; fallback màu đặc |

---

## 2. Quy ước đặt tên deterministic & header comment

### 2.1 Đường dẫn

```
tools/asset-pipeline/<skill>/<name>.<ext>.js   →   Asset/v2/<skill>/<name>.<ext>
```

- `<skill>` ∈ `pxl | vex | kiln | loom | chirp` (viết thường, không dấu).
- `<ext>` = `px` / `vx` / `kx` / `tx` / `cx`.
- `<name>` = `<gameId>_<role>[_<variant>][_<size>]`, chỉ dùng `a–z 0–9 - _`, **không dấu tiếng Việt**,
  không viết hoa, không slug cảm hứng lộ ra ngoài `gameId` đã có.
  - Ví dụ: `mario-bros_coin_idle_96`, `warioware_halftone_dot_96`, `mario-party_dice_face_1x`.
- File dùng chung dùng prefix `sfx_`/`music_`/`ui_`, **không** gắn `gameId` đơn lẻ.
- Delivery extension: `png | svg | wav | ogg`. Mỗi source file chỉ sinh **một** delivery asset chính
  (ngoại lệ: vex sinh thêm `@2x`, chirp sinh thêm `.wav`).

### 2.2 Header comment — BẮT BUỘC ở đầu mọi file source

```js
// @asset mario-bros_coin_idle_96
// @skill pxl
// @gameId mario-bros
// @lessonId intro
// @style pixel-art
// @palette sky=#5C94FC accent=#FFD84D ink=#3A2317
// @consume Asset/v2/pxl/mario-bros_coin_idle_96.png
// @original original character, no existing franchise character, no logo, no copyright
```

- Với file dùng chung, ghi **danh sách đầy đủ 21 `gameId`** trong `@gameIds` (một dòng, phẩy)
  thay vì `@gameId`, kèm `@lessonIds intro,b1,...,b20`. Không được viết `@gameId all` thiếu danh sách.
- `@style` phải khớp 1-1 với mục 9 của art bible. `@palette` lấy từ `game-map.js`, không tự bịa.
- Dòng `@original ...` là bản dịch nghĩa vụ của cụm prompt bắt buộc trong art bible mục 10.2 —
  giữ nguyên cụm tiếng Anh, kể cả khi không dùng AI sinh ảnh.
- Không ghi `tribute` vào header, không ghi tên nhân vật/logo; tribute chỉ do DOM tạo.

---

## 3. Quy trình build (lệnh cụ thể)

### 3.1 Biến môi trường (PowerShell, chạy từ `D:\Kid Math`)

```powershell
$NODE  = 'C:\Users\2103\AppData\Local\Temp\opencode\node\node-v22.18.0-win-x64\node.exe'
$ROOT  = 'C:\Users\2103\.config\opencode\ocgs\.agents\skills'
$PXL   = Join-Path $ROOT 'pxl\bin\pxl.js'
$VEX   = Join-Path $ROOT 'vex\bin\vex.js'
$KILN  = Join-Path $ROOT 'kiln\bin\kiln.js'
$LOOM  = Join-Path $ROOT 'loom\bin\loom.js'
$CHIRP = Join-Path $ROOT 'chirp\bin\chirp.js'
```

> `vex`, `kiln`, `loom`, `chirp` cần `npm install` **một lần** trong thư mục skill tương ứng;
> `pxl` không cần install. Node ≥ 22.18 — bản đã chỉ định ở trên đạt yêu cầu.

### 3.2 Lệnh build / kiểm tra theo skill

| Skill | Build (lúc iterate dùng `--only`) | Kiểm tra thêm | Copy delivery |
|---|---|---|---|
| pxl | `& $NODE $PXL build tools/asset-pipeline/pxl/<name>.px.js --only <name>` | `& $NODE $PXL lint tools/asset-pipeline/pxl/<name>.px.js <name>`; tuỳ ý `& $NODE $PXL ascii ... <name>` để sửa pixel theo tọa độ | copy `out/<name>.png` → `Asset/v2/pxl/<name>.png`; nếu sheet/anim thì copy `out/sheets/*`, `out/anims/*` |
| vex | `& $NODE $VEX build tools/asset-pipeline/vex/<name>.vx.js --only <name> --scales 1,2` | `& $NODE $VEX svg tools/asset-pipeline/vex/<name>.vx.js <name>` để đọc geometry; soi `_preview/<name>.9.png` với 9-slice (góc phải sắc) | copy `.svg`, `@1x.png`, `@2x.png` → `Asset/v2/vex/` |
| kiln | `& $NODE $KILN build tools/asset-pipeline/kiln/<name>.kx.js --only <name>` | `& $NODE $KILN info tools/asset-pipeline/kiln/<name>.kx.js <name>` (bounds/tris/material) | copy `out/_preview/<name>.png` → `Asset/v2/kiln/<name>.png`; GLB → `_glb/` |
| loom | `& $NODE $LOOM build tools/asset-pipeline/loom/<name>.tx.js --only <name>` | `& $NODE $LOOM info tools/asset-pipeline/loom/<name>.tx.js <name>` (range từng map) + đọc dòng `seamless` / `SEAM n×` | copy `out/materials/<name>/*_albedo.png` → `Asset/v2/loom/<name>_albedo.png`; map khác → `_maps/` |
| chirp | `& $NODE $CHIRP build tools/asset-pipeline/chirp/<name>.cx.js --only <name> --ogg` | `& $NODE $CHIRP info tools/asset-pipeline/chirp/<name>.cx.js <name>` (pitch/Hz) + đọc PNG waveform/spectrogram | copy `.ogg` (+ `.wav` nếu ≤0,5 s) → `Asset/v2/chirp/`; giá trị bank → `js/data/audio-bank.js` |

### 3.3 Vòng lặp "đọc trước, tin sau"

1. Viết source file với header đúng mục 2.2.
2. Build `--only <name>` — một asset hỏng không làm dừng các asset khác, nhưng **asset đó chưa xong**.
3. **Đọc preview bằng công cụ ảnh**: `out/_preview/<name>.png`.
   - pxl: checkerboard = transparent, lưới 1 px, ô 8 px tối hơn; dùng `ascii` khi cần tọa độ chính xác.
   - vex: ruler trên/trái; xem cả bản `@1x` (kích thước thật) chứ không chỉ preview phóng to.
   - kiln: 4 góc nhìn hero/front/right/top + grid + material legend; đối chiếu kích thước in ra.
   - loom: 3×3 tile dưới raking light + sphere/cube + từng map.
   - chirp: waveform + spectrogram log (xem envelope, filter sweep, noise, timing).
4. Chạy `lint` (pxl) / `info` (kiln, loom, chirp). Tiêu chí dừng:
   - pxl: **0 orphan pixel, 0 jaggy, 0 pillow shading** (xem `_preview/<name>.lint.png`).
   - kiln: tris trong khoảng props 50–800 / character < 1000; không coplanar face.
   - loom: dòng **`seamless`**, không có **`SEAM n×`**; albedo luma mean 0,25–0,6; rough không flat.
   - chirp: **không có `CLIPPED`**; peak −6…−12 dBFS (SFX lẫn nhạc, chuẩn dự án chặt hơn skill);
     `info` khớp ý đồ slide/arp/giai điệu.
5. Sửa bằng patch nhỏ (một `grid`, một điểm, một `vol`) → build lại → đọc lại preview. **Không** đánh
   dấu xong khi chưa đọc preview sau lần sửa cuối.
6. Build full (bỏ `--only`) khi toàn bộ source ổn; copy delivery; cập nhật manifest với kết quả duyệt
   bản quyền (mục 5) và kích thước file (mục 6).
7. Agent **không nghe được âm thanh**: với chirp chỉ tin vào `CHIRP info` + PNG
   waveform/spectrogram + số peak. Nếu cần nghe thật, dùng `& $NODE $CHIRP serve ...` và nhờ user
   nghe/annotate; đọc `out/_feedback/<sound>.json` (magenta = sửa, cyan = giữ).

---

## 4. Nguyên tắc nghệ thuật cho trẻ 6 tuổi

| Nguyên tắc | Áp dụng cụ thể cho 5 skill | Kiểm chứng |
|---|---|---|
| **Màu tươi, không nhấp nháy** | Dùng đúng 5 bảng chương của art bible (`base/deep/soft/ink/accent`). `accent` ≤ 15% khung. `shades("1234","#c8323c")` tạo ramp từ **một accent của chương** (vd chapter 3 = `#FF6B5B`), không tự pick hex lệch. | Soi preview; đếm diện tích accent; ≤2 Hz, 0 flash >3 Hz |
| **Nét dày, viền mềm, bo góc** | pxl `outline`/`selout:"k"`; vex `outline` + `ow` 1,5–2,5, `ink.w` 4–6; kiln `bevel` 5–15%; loom `bevel` trên bricks/planks. **`k` phải map vào `deep` của chương, không `#000`**. Bo góc ≥24 px @1280×720. | Art bible mục 3; lint không pillow shading |
| **Tương phản WCAG AA** | Chữ ≥4,5:1 (≥3:1 nếu ≥24 px bold). Chỉ đặt `ink` trên `soft`/scrim; **không** trắng trên `base` sáng (#12/#13/#18 có nền tối → panel `soft` opacity ≥0,92, radius ≥16 px). | AC-A2, AC-A5 |
| **Đối tượng lớn ≥64 px** | Nút chạm ≥64×64 CSS px, gap ≥8 px; số/đáp án ≥32 px. Sprite phủ ≤30% chiều cao vùng đáp án, dời ra ngoài 4 nút. Tile mozaic ≥12 px, chấm halftone ≥4 px, ô lưới ≥20 px. | AC-A2, AC-A6; smoke 21 màn |
| **Không dùng màu làm tín hiệu duy nhất** | Đúng = xanh **+** ✓ **+** chữ "Đúng"; sai = cam **+** ~ **+** chữ "Thử lại". SFX `sfx_correct`/`sfx_wrong` là lớp thứ tư, không thay thế chữ/icon. | AC-A3; tắt màu vẫn đọc được |
| **Vùng an toàn** | 12% trên (badge/tiêu đề) và 22% dưới (đáp án): L* 78–95, biến thiên ≤10, họa tiết dừng hoặc mờ ≤20%. Tile/họa tiết lặp của loom/pxl **dừng trước 22% dưới**. | AC-A1, AC-A6 |
| **Ánh sáng nhất quán** | Key từ trên-trái, fill dịu phải, bóng mềm dưới chân. Cùng hướng cho mọi asset trong một style. Kiln `ao`, vex `shade`, pxl `light`/`shade`, loom height→albedo/rough. | Soi 4 góc nhìn + preview |
| **Reduced-motion** | `@media (prefers-reduced-motion: reduce)`: chỉ render **idle frame 0**, dừng timer sprite, bỏ `transform`/`animation`/parallax/confetti, **giữ** đổi màu nền + icon + chữ. Kiln/vex/loom asset là tĩnh; không dùng atlas animated làm tín hiệu. `motionMs` bị bỏ qua. | AC-A3 (`ctx.reducedMotion === true`) |
| **TTS giọng Việt giữ nguyên** | Không sinh/block âm nói, không thu lời người thật, không clone giọng. chirp **chỉ** tạo SFX/nhạc; không dùng `sample()` với file giọng người. Module speech hiện tại giữ nguyên. | Soi source chirp: 0 `sample()` giọng nói |
| **Fallback khi thiếu asset** | Thiếu file → CSS gradient chương + emoji, **bố cục và nút không đổi**, 0 console error, 0 404. Mọi consume đều guard `src != null`. | Mục 6 |

---

## 5. Ranh giới bản quyền — BẮT BUỘC

1. **Tribute = chữ, không phải tài sản.** `tribute` trong `game-map.js` chỉ do DOM render dạng
   `Cảm hứng: <tên>`. Không render thành ảnh, không khắc vào sprite, không ghi vào metadata/alt text.
2. **`gameId` là khóa nội bộ.** Dùng trong tên file/header/code, **không** dịch thành chữ hiển thị,
   **không** đưa vào AI prompt dù có vẻ "vô hại".
3. **Không tạo asset copy nhân vật/logo.** Danh sách đen trong mọi source file/prompt/preview:
   Mario, Luigi, Yoshi, Kirby, Pikmin, Link, Zelda, Pikachu, Cappy, Wario, Bowser, Donkey Kong,
   Samus, Fox; hộp `?`, ngôi star, nắp đỏ có chữ M, râu, mũ xanh/đỏ nhận diện được, xe kart có
   silhouette đặc trưng, bục có logo. Mỗi nhân vật trong art bible mục 9 là **nhân vật gốc** (Bé Cáo
   Tai Nhọn, Chú Cú Mắt Tròn, …) — vẽ theo mô tả đó, không kéo về nhân vật gốc cảm hứng.
4. **Cụm bắt buộc** trong header/prompt (nguyên văn): `original character, no existing franchise character, no logo, no copyright`. Thiếu → file bị loại, không build.
5. **Không dùng ảnh có sẵn trong `Asset/` root làm reference**: `Luigi.webp`, `Mc_Queen.webp`,
   `Feature.webp`, `MaterCars2Artwork.webp`… Chỉ là tham chiếu màu nội bộ. `pxl image()`, `vex image()`,
   `kiln voximg()`/`heightmap`, `loom image()` **không** được trỏ vào các file này.
6. **Rủi ro cao nhất**: #5 `zelda` (dễ lệch tai nhọn/áo xanh) và #21 `mario-kart` (dễ lệch xe/mũ đỏ).
   Soi riêng 2 bài này ở 100% **và** 64×64 px trước khi commit； nếu lệch, viết lại mô tả phủ định
   cụ thể chứ không chỉ thêm chữ "original".
7. **Duyệt 3 bước mỗi asset**: (1) grep source/prompt: có slug/tên nhân vật/logo không → loại;
   (2) đọc preview 100% + 64 px: có chữ/watermark/biểu tượng/silhouette nhận diện được không → vẽ lại;
   (3) tắt CSS/JS: ảnh phải "sạch", tribute chỉ còn trong DOM. Ghi kết quả vào manifest.
8. **Âm thanh**: không sample nhạc/âm thanh gốc của tựa game cảm hứng; không clone giọng TTS tiếng Việt.

---

## 6. Bảng acceptance (nghiệm thu từng asset)

| ID | Tiêu chí | Cách đo cụ thể | Đạt |
|---|---|---|---|
| AC-P1 | File thật tồn tại | `Get-ChildItem -Recurse Asset\v2 | Select-Object FullName,Length`; đối chiếu với manifest 21 dòng + 6 file dùng chung | 21/21 + 6/6 |
| AC-P2 | Preview đã được đọc | Logs/annotate ghi tên `out/_preview/<name>.png` đã mở sau lần build cuối; pxl có `.lint.png`, loom có `seamless`, chirp có waveform+`info` | 100% asset |
| AC-P3 | Kích thước ≤400.000 bytes | `Get-ChildItem -Recurse Asset\v2 -File \| Where-Object Length -gt 400000`; OGG nhạc ≤120 KB, sprite PNG target 90–150 KB | 0 file vượt |
| AC-P4 | Chất lượng theo skill | pxl lint = 0 orphan/jaggy/pillow; kiln `info` tris trong budget; loom `seamless` (không `SEAM`); chirp không `CLIPPED`, peak −6…−12 dBFS | 0 lỗi |
| AC-R1 | 0 console error | Mở `file:///D:/Kid%20Math/index.html`, F12 Console, chạy lần lượt 21 bài, chạm đúng/sai/mỗi nút | 0 error |
| AC-R2 | 0 404 | DevTools Network, lọc status ≥400; kiểm tra mọi `<img src>`, CSS `url()`, `<audio src>` trỏ vào file có thật | 0 request fail |
| AC-R3 | Không fetch runtime | `grep -R "fetch(\|XMLHttpRequest\|http://\|https://" js/ css/ index.html` (loại comment) | 0 kết quả trong runtime path |
| AC-R4 | Reduced-motion | Bật emulate `prefers-reduced-motion: reduce`; sprite đứng frame 0, 0 `animation`/`transform` đổi theo thời gian, ✓/~ + chữ vẫn hiện | 21/21 bài |
| AC-R5 | Nút & tương phản | DevTools đo mọi nút ≥64×64, gap ≥8, số ≥32 px; so màu `ink`/`soft` ≥4,5:1 | 21/21 bài |
| AC-C1 | Bản quyền | 3 bước mục 5 cho từng asset; 0 tên/logo/silhouette nhận diện được; #5 và #21 soi riêng | 0 vi phạm |

> **Gate**: nếu bất kỳ dòng AC-P1…AC-P4 nào fail → sửa source, build lại, đọc lại preview trước khi
> commit. Nếu AC-R1/AC-R2 fail → asset đó **không được consume**, dùng fallback CSS+emoji ngay.

---

## 7. Liên kết

- `design/art/art-bible-hd.md` — palette 5 chương, 21 style, guardrail, R1–R6, AC-A1…A6.
- `design/art/sprite-style-guide.md` — lưới 4×4 / 384×384 / α / frame timing / reduced-motion.
- `js/data/game-map.js` — 21 `gameId`, `tribute`, `palette`, `style`, `cover`, `sprite`, `motionMs`.
- `design/quick-specs/all-21-distinct-games.md` — mục tiêu toán & động tác từ điển 21 bài.
- `js/data/tuning.js` — `hd.maxBytes = 400000`, `game.*` timing.
- `SKILL.md` của từng skill (`pxl`, `vex`, `kiln`, `loom`, `chirp`) — API đầy đủ trong `reference.md`.
