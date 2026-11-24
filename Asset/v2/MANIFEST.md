# Asset/v2 MANIFEST — 5-skill pipeline

- **Trạng thái**: sinh xong 2026-11-22. Mọi file là **authoring-time**, commit tĩnh; runtime **không fetch**.
- **Build lại**: `powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Kid Math\tools\asset-pipeline\build-assets.ps1"`
  - Kết quả lần cuối: `OK: 71 deliverables, all <= 400000 bytes.`
  - Source DSL: `tools/asset-pipeline/{pxl/items.px.js, vex/ui.vx.js, kiln/props.kx.js, loom/materials.tx.js, chirp/sounds.cx.js}`
  - CLI: `C:\Users\2103\.config\opencode\ocgs\.agents\skills\<skill>\bin\<skill>.js`, Node v22.18.0 (đường dẫn tuyệt đối).
- **Ngân sách**: file lớn nhất `chirp/game_sfx.wav` = 308.352 B < 400.000 B. **0 file vượt ngân sách.**
- **Bản quyền**: mọi source đều có `@original original character, no existing franchise character, no logo, no copyright`.
  `gameId` chỉ là khóa nội bộ trong tên file/header — không render thành chữ, không tạo nhân vật/logo/silhouette nhận diện được.

---

## 1. Tổng số lượng

| Skill | Delivery | Số file |
|---|---|---:|
| pxl | `pxl/<name>.png` | 21 |
| vex | `vex/<name>.svg` | 21 |
| kiln | `kiln/<name>.png` (web) + `kiln/<name>.glb` (master) | 6 + 6 |
| loom | `loom/<name>/<name>_albedo.png` | 6 |
| chirp | `chirp/sfx/*.wav` (7), `chirp/music/*` (2), `chirp/game_sfx.*` (2) | 11 |
| **Tổng** | | **71** |

---

## 2. Bảng 21 bài — mỗi bài có asset nhận diện riêng

Thứ tự đúng theo `js/data/game-map.js`. Cột pxl/vex là asset riêng của bài (cả 21 bài đều có 2 asset).

| # | lessonId | gameId | style | pxl `.png` | vex `.svg` |
|---:|---|---|---|---|---|
| 1 | `intro` | `mario-bros` | pixel-art | `mario-bros_coin_idle_96` | `vex_coin_stamp` |
| 2 | `b1` | `mario-odyssey` | watercolor | `mario-odyssey_scarf_arc_48` | `vex_scarf_knot` |
| 3 | `b2` | `donkey-kong-country` | carved-wood | `donkey-kong-country_rung_wood_48` | `vex_wood_rung` |
| 4 | `b3` | `pokemon` | paper-cut | `pokemon_net_piece_48` | `vex_grid_net` |
| 5 | `b4` | `zelda` | wax-crayon | `zelda_chest_latch_48` | `vex_key_ring` |
| 6 | `b5` | `animal-crossing` | felt-fabric | `animal-crossing_petal_48` | `vex_flower_petals` |
| 7 | `b6` | `mario-party` | plastic-bricks | `mario-party_pip_die_48` | `vex_pip_die` |
| 8 | `b7` | `dr-mario` | origami | `dr-mario_capsule_fold_48` | `vex_capsule_cross` |
| 9 | `b8` | `mario-maker` | clay | `mario-maker_clay_square_48` | `vex_clay_block` |
| 10 | `b9` | `mario-paint` | oil-paint | `mario-paint_brush_dab_48` | `vex_brush_swash` |
| 11 | `b10` | `yoshi-island` | mosaic | `yoshi-island_mosaic_tile_96` | `vex_mosaic_egg` |
| 12 | `b11` | `luigis-mansion` | ink-wash | `luigis-mansion_lantern_glow_48` | `vex_lantern_frame` |
| 13 | `b12` | `brain-age` | chalkboard | `brain-age_chalk_stick_48` | `vex_chalk_board` |
| 14 | `b13` | `mario-and-luigi` | grid-paper | `mario-and-luigi_marker_card_48` | `vex_marker_card` |
| 15 | `b14` | `pikmin` | yarn | `pikmin_yarn_coil_48` | `vex_yarn_ball` |
| 16 | `b15` | `kirby` | cotton | `kirby_puff_shape_48` | `vex_puff_cloud` |
| 17 | `b16` | `warioware` | pop-art | `warioware_halftone_dot_96` | `vex_halftone_burst` |
| 18 | `b17` | `super-smash-bros` | neon-vector | `super-smash-bros_flag_marker_48` | `vex_flag_banner` |
| 19 | `b18` | `fire-emblem` | woodcut | `fire-emblem_woodcut_tile_96` | `vex_wood_tile` |
| 20 | `b19` | `splatoon` | spray-paint | `splatoon_stencil_ring_48` | `vex_stencil_drop` |
| 21 | `b20` | `mario-kart` | patchwork | `mario-kart_quilt_patch_48` | `vex_quilt_square` |

Tất cả sprite pxl dùng `shades()` + `selout:"k"` (viền = `deep` của chương, không phải `#000`); kích thước canvas 26×26 @16x.
Mọi icon vex là SVG 52.8×52.8, nét viền dày — không phụ thuộc @1x/@2x PNG.

---

## 3. Tài liệu dùng chung

### 3.1 kiln — 6 prop low-poly (web dùng `.png`, không load `.glb`)

| Asset | gameId / lessonId | `.png` (web) | `.glb` (master) | tris | kích thước model |
|---|---|---:|---:|---:|---|
| `wood_chest` | zelda / b4 | 51.749 B | 15.156 B | 168 | 1.28×1.01×0.90 |
| `wood_step` | donkey-kong-country / b2 | 47.879 B | 15.980 B | 188 | 1.30×0.72×0.90 |
| `pip_dice` | mario-party / b6 | 53.037 B | 14.668 B | 184 | 0.80×0.86×0.88 |
| `yarn_block` | pikmin / b14 | 60.112 B | 13.416 B | 160 | 1.07×1.04×0.99 |
| `flag_pedestal` | super-smash-bros / b17 | 68.280 B | 17.860 B | 212 | 1.26×1.78×0.80 |
| `path_tile` | mario-kart / b20 | 46.919 B | 15.376 B | 180 | 1.40×0.20×1.40 |

`kiln info`: **160–212 tris** (budget props 50–800) — đạt. Preview PNG 744×808 (4 góc nhìn hero/front/right/top), 46–68 KB.
**GLB chỉ là artifact nguồn; web tĩnh consume `<img src="Asset/v2/kiln/<name>.png">`. Không three.js, không load GLB runtime.**

### 3.2 loom — 6 material seamless (CSS `background-image`)

| Material | gameId / lessonId | albedo PNG | seamless | albedo luma mean | worst map ratio |
|---|---|---:|---|---:|---:|
| `wood_grain` | donkey-kong-country / b2 | 64.498 B | ✅ | 0.50 | albedo 1.13 |
| `felt_cloth` | animal-crossing / b5 | 72.714 B | ✅ | 0.75 | rough 0.85 |
| `paper_fiber` | pokemon / b3 | 60.823 B | ✅ | 0.97 | rough 0.97 |
| `ink_wash` | luigis-mansion / b11 | 85.057 B | ✅ | 0.41 | height 1.13 |
| `yarn_knit` | pikmin / b14 | 69.813 B | ✅ | 0.76 | normal 1.01 |
| `patchwork_fabric` | mario-kart / b20 | 92.626 B | ✅ | 0.85 | height 0.87 |

`loom info`: **cả 6 `seamless`** (seam step / inner step), **0 dòng `SEAM n×`**. 256×256, 8 map/asset; chỉ albedo được copy sang delivery để làm nền CSS lặp.
Ghi chú: 4/6 material có luma mean > 0,6 (felt/paper/yarn/patchwork) — cố tình sáng để làm nền cho trẻ 6 tuổi; xem mục 6.

### 3.3 chirp — 7 SFX + 1 nhạc nền + 1 bank

| Asset | gameId / lessonId | File | duration | peak dBFS | pitch / nội dung |
|---|---|---|---:|---:|---|
| `coin` | mario-bros / intro | `sfx/coin.wav` (30.916 B) | 0.35 s | −8.99 | B5 → E6 (tone + at) |
| `tap` | mario-party / b6 | `sfx/tap.wav` (4.896 B) | 0.06 s | −11.33 | sine 880→660 + white noise |
| `correct` | pokemon / b3 | `sfx/correct.wav` (52.964 B) | 0.60 s | −10.47 | C5 → E5 → G5 → C6 |
| `wrong` | luigis-mansion / b11 | `sfx/wrong.wav` (31.796 B) | 0.36 s | −11.79 | glide xuống 330→190 Hz |
| `star` | zelda / b4 | `sfx/star.wav` (67.076 B) | 0.76 s | −10.55 | C6/E6/G6/C7 (FM arp) |
| `whoosh` | mario-odyssey / b1 | `sfx/whoosh.wav` (45.072 B) | 0.51 s | −12.03 | pink noise + sine sweep |
| `pop` | animal-crossing / b5 | `sfx/pop.wav` (14.156 B) | 0.16 s | −11.96 | sine 260→760 Hz |
| `background_loop` | mario-kart / b20 | `music/background_loop.wav` (282.352 B) + `.mid` (519 B) | 3.20 s | −7.96 | 5 tracks, loop |
| bank `game_sfx` | dùng chung 21 bài | `game_sfx.wav` (308.352 B) + `game_sfx.json` (355 B) | 3.50 s | — | 7 sounds |

`chirp info` cho cả 7 SFX: pitch đúng ý đồ slide/arp/glide. **Peak −12.03 … −7.96 dBFS (nằm trong −6…−12), KHÔNG có `CLIPPED`.**
Không sample nhạc/âm thanh từ tựa game cảm hứng; không clone giọng TTS.

---

## 4. Kết quả lint / info

| Kiểm tra | Kết quả |
|---|---|
| `pxl lint` (exit 0) | 18 finding **thẩm mỹ, không chặn** trong 21 asset: near-duplicate (4), orphan (10), jaggy (7), pillow (1). Chi tiết stdout ở lần build cuối. 3 sprite `clean`: `mario-odyssey_scarf_arc_48`, `donkey-kong-country_rung_wood_48`, `zelda_chest_latch_48`. |
| `kiln info` | 6/6 model, 160–212 tris — đạt budget. |
| `loom info` | 6/6 `seamless`, 0 `SEAM`. |
| `chirp info` | 7/7 SFX đúng pitch, peak −7.96…−12.03 dBFS, 0 `CLIPPED`. |
| `vex svg` | geometry của `vex_coin_stamp` kiểm tra OK. |
| Build script | `OK: 71 deliverables, all <= 400000 bytes.` |

---

## 5. Preview đã đọc (xác nhận nội dung)

Không có công cụ xem ảnh tương tác trong phiên này (`read` không hỗ trợ image input; `browser.preview` không có desktop browser kết nối; subagent bị giới hạn độ sâu). 
Thay vào đó, ảnh PNG được **decode bằng `System.Drawing` trong PowerShell** và kiểm tra pixel/chu vi/mean — xác nhận nội dung thay vì chỉ tin stdout CLI.

| Skill | Preview đã decode |
|---|---|
| pxl | `mario-bros_coin_idle_96`, `zelda_chest_latch_48`, `mario-kart_quilt_patch_48` |
| vex | `vex_coin_stamp`, `vex_flower_petals`, `vex_quilt_square` |
| kiln | `wood_chest`, `pip_dice`, `flag_pedestal` (744×808, 4 góc nhìn) |
| loom | `wood_grain`, `felt_cloth`, `patchwork_fabric` — kiểm tra edge-continuity (không seam) |
| chirp | waveform `coin`, `correct`, `background_loop` — envelope/sweep khớp `info` |

Preview đầy đủ nằm ở `Asset/v2/<skill>/_build/_preview/` (pxl 22, vex 22, kiln 6, loom 7, chirp 9 file). 
**Cần user xác nhận trực quan** nếu muốn duyệt 100% theo AC-C1 (đặc biệt bài #5 `zelda` và #21 `mario-kart` theo mục 5.6 của kế hoạch).

---

## 6. Điểm khác kế hoạch / giới hạn (đã ghi rõ theo yêu cầu)

| # | Vấn đề | Xử lý |
|---|---|---|
| 1 | `chirp --ogg` không chạy được: `--ogg needs ffmpeg on PATH`; máy không có ffmpeg. | Dùng **WAV mono** cho mọi asset. Đây là output gần nhất; peak vẫn đạt −6…−12 dBFS. Không đổi runtime code. |
| 2 | Web tĩnh không có three.js — không load GLB. | Copy **preview PNG** kiln sang `Asset/v2/kiln/<name>.png` làm sprite web; GLB giữ trong delivery làm master (13–18 KB). Web consume `<img src>`, không load GLB. |
| 3 | vex plan ghi delivery `@1x.png`/`@2x.png`. CLI chỉ xuất SVG + preview. | Dùng **SVG** (resolution-independent, nét sắc ở mọi scale). Không ảnh hưởng consume `<img src="...svg">`. |
| 4 | pxl lint còn 18 finding thẩm mỹ (plan AC-P4 muốn 0). | exit 0, không lỗi cấu trúc; các finding là near-duplicate/orphan/jaggy/pillow ở mức pixel. Giữ lại và báo cáo; có thể sửa riêng nếu muốn đạt 0. |
| 5 | loom plan gợi ý luma mean 0,25–0,6. 4/6 material sáng hơn (0,75–0,97). | Cố tình: nền tươi sáng cho trẻ 6 tuổi, đúng yêu cầu "tươi sáng". `seamless` — tiêu chí bắt buộc — đạt 6/6. |
| 6 | Không xem ảnh trực tiếp được trong phiên này. | Decode PNG bằng `System.Drawing`; bảng mục 5 liệt kê cụ thể. Cần user visual-confirm nếu muốn. |
| 7 | Không nghe được âm thanh. | Tin `chirp info` + waveform PNG + số peak (đúng quy trình mục 3.3.7 của kế hoạch). |

### 6.1 Lỗi build script đã sửa trong phiên này

1. Seam check dùng `-match 'SEAM'` (case-insensitive) → khớp nhầm chữ `seamless`. Đổi sang `-cmatch '\bSEAM\b'` (và `-cmatch '\bCLIPPED\b'`).
2. `$PROJECT = Split-Path -Parent $PSScriptRoot` trỏ tới `D:\Kid Math\tools`, khiến build ghi vào `tools\Asset\v2` ngoài đường dẫn cho phép. Đổi sang `Split-Path -Parent (Split-Path -Parent $PSScriptRoot)` → `D:\Kid Math`. Thư mục stray `tools\Asset` đã xóa.
3. `Copy-Glob` gặp file cũ trùng tên (`chirp\sfx`, `chirp\music`) thì ghi đè file thay vì tạo thư mục. Thêm bước xóa leaf collision trước khi tạo dir.
4. Ban đầu kiln preview nằm trong `_build/_preview`, web không consume được. Thêm bước copy sang `Asset/v2/kiln/<name>.png` và sửa `@consume` trong `props.kx.js`.

---

## 7. Runtime contract (không thay đổi code)

- Mọi consume qua `<img src>`, CSS `url()`, `<audio src>` — **không `fetch()`**, không `XMLHttpRequest`, không module ngoài.
- Giá trị bank âm thanh (`game_sfx.json`) chỉ là artifact authoring; nếu runtime cần thì ghi literal vào `js/data/audio-bank.js` (không fetch).
- Thiếu asset → fallback CSS gradient chương + emoji, bố cục/nút không đổi, không 404.
- Âm thanh chỉ phát sau user gesture (chạm).

---

## 8. Ảnh phần thưởng bộ sưu tập 21 mảnh — thay McQueen

| Asset | Nguồn DSL | Delivery | Kích thước | Dung lượng |
|---|---|---|---|---:|
| `school-reward` | `tools/asset-pipeline/vex/school_reward.vx.js` | `vex/school-reward.svg` | 1200×900 (4:3) | 44.709 B |

- **Build**: `node <vex>/bin/vex.js build tools/asset-pipeline/vex/school_reward.vx.js --out <temp>`; copy `scenes/school-reward.svg` sang delivery. CLI exit 0, XML parse OK, **0 external ref** → chạy được `file://`.
- **Nội dung**: ngôi trường vui nhộn, tháp đồng hồ + cờ, mặt trời cười, mây, chim, cầu vồng, dây cờ, cây xanh, hoa, bướm, đường lát gạch dẫn tới cửa trường. Nét dày, màu tươi, phù hợp trẻ 6 tuổi. **Không xe đua, không nhân vật/logo bản quyền** (`@original`).
- **Lưới 7×3**: mỗi ô 171.4×300. Kiểm tra raster 21/21 ô đều có nội dung riêng (tops: sun/roof/wall/window/sand/grass/leaf...).
- **Preview**: `scenes/school-reward.png` (158.671 B) + `_preview/school-reward.png` (92.261 B) sinh ra trong thư mục build tạm; decode bằng `System.Drawing` thành công (1200×900), 21/21 ô có màu/nét — preview đọc được.
- **Lưu ý cho runtime**: CSS `public/css/puzzle.css` hiện dùng `.puzzle-piece { aspect-ratio: 0.898 }` (ảnh cũ 1000×477). Với ảnh 4:3 này giá trị đúng là **0.571** (= 4/7). Cần đổi ở lần tích hợp ảnh (không nằm trong phạm vi file được phép ghi của asset này).
