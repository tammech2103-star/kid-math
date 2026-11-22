# Art Bible — 21 minigame HD (Bé Vui Học Toán 1)

- **Trạng thái**: Draft v1 — Đợt 1
- **Ngày**: 2026-11-22
- **Phạm vi**: 21 ảnh nền `Asset/hd/<lessonId>.webp` + nguyên tắc art/UI cho registry
  `js/ui/games/<gameId>.js`.
- **Nguồn quản lý**: `design/quick-specs/minigame-nintendo-2026-11-22.md`,
  `docs/architecture/ADR-0002-minigame-registry-and-puzzle-rewards.md`,
  `design/gdd/curriculum-map.md`, `css/tokens.css`, `css/app.css` (5 lớp `.chapter-*`).
- **Ngân sách ảnh**: `js/data/tuning.js` → `hd.maxBytes = 400000`.

> Ghi chú đối chiếu ảnh tham khảo: môi trường này không đọc được raster trực tiếp.
> Đã lấy mẫu màu bằng quantize 8 màu: `Asset/Feature.webp` (377×283) nghiêng
> kem `#E4F1EF` / xanh ngọc `#9EE8FA`; `Asset/Mc_Queen.webp` (1000×477) nghiêng
> đỏ san hô `#E35D58` / nền tối. Đây là **tham chiếu cảm giác màu**, không phải
> swatch chính thức; không copy bất kỳ pixel nào vào ảnh sinh mới.

## 1. Tầm nhìn thị giác

**HD cartoony 3D, bo góc, màu tươi, đường viền mềm.** Trẻ 6 tuổi đọc bằng mắt
trước, đọc chữ sau: mỗi màn phải trông như một đồ chơi nhựa bóng bẩy, thân thiện,
ánh sáng 3D mềm (soft ambient occlusion, rim light nhẹ), góc bo tròn, không cạnh
sắc, không bóng tối đen đặc. Màu tươi nhưng **không nhấp nháy nhanh** và luôn có
vùng yên tĩnh để chồng chữ/đáp án.

Ưu tiên theo thứ tự:

1. **Đọc được** (tương phản, vùng chữ sạch) — quan trọng nhất.
2. **Nhận được đồ vật toán học** (đồng xu, hoa, khối, vạch đích).
3. **Thấy vui** (bokeh, nắng, bóng mềm, màu tươi).
4. **Trang trí** (chi tiết nhỏ, texture) — chỉ thêm khi 3 mục đầu đã đạt.

Nguyên tắc Gestalt: nền là **hình nền (figure-ground)** — đồ vật học tập nổi bật
bằng khác biệt màu + viền sáng, nền được làm mờ/giảm nhiễu ở phần dưới. Các đối
tượng cùng nhóm dùng cùng hue/saturation để trẻ gom nhóm bằng mắt (ví dụ 2 luống
hoa cùng tone đất, khác hue hoa). Tránh đường kẻ ngang dày cạnh đáp án vì dễ bị
hiểu là viền nút.

## 2. Palette theo 5 chương

Palette kế thừa trực tiếp `css/tokens.css` / `.chapter-*` trong `app.css`, để nền HD
không "lệch" với UI hiện có. Mỗi chương có 5 vai trò: `base` (nền), `deep` (viền/bóng),
`soft` (panel chữ), `ink` (chữ), `accent` (điểm nhấn học tập).

| Chương | Màn (`lessonId`) | `base` | `deep` | `soft` | `ink` | `accent` | Cảm giác |
|---|---|---|---|---|---|---|---|
| 1 — Số 0–10 (sky) | `intro`, `b1`–`b6` | `#7ED3F7` | `#2FA9DC` | `#E6F8FF` | `#0E6D93` | `#FFD84D` | trời trong, đồng xu, cỏ tươi, hừng khởi động |
| 2 — Hình phẳng (grape) | `b7`–`b9` | `#9C7BF5` | `#6B45D6` | `#F0EAFF` | `#5533B8` | `#6FE3B8` | xếp hình, tô màu, bảng puzzle tím dịu |
| 3 — Cộng/trừ (coral) | `b10`–`b13` | `#FF6B5B` | `#D94132` | `#FFE9E6` | `#A3241A` | `#FFD84D` | ấm, trái cây, nhóm cộng/trừ rõ ràng |
| 4 — Hình khối & vị trí (mint) | `b14`–`b16` | `#6FE3B8` | `#149A71` | `#E3FFF5` | `#0F6B50` | `#7ED3F7` | mát, khối nhựa, không gian sạch |
| 5 — Ôn tập & đua (sun) | `b17`–`b20` | `#FFD84D` | `#E79B00` | `#FFF6D6` | `#7A5200` | `#FF6B5B` | nắng, cờ đích, bục trao thưởng |

Quy tắc dùng màu:

- `ink` **chỉ** đặt trên `soft` hoặc trên nền sáng đã có scrim. Không đặt `ink`
  lên `deep` hoặc lên vùng nền nhiều chi tiết.
- `deep` dùng cho viền mềm/bóng đổ; **không dùng đen `#000`** làm viền. Viền =
  `deep` ở 70–85% opacity, dày 2–3 px ở 720p, bo tròn đầu nét.
- `accent` chiếm ≤ 15% diện tích khung hình; dùng cho Objects of Interest (đồng xu,
  dấu so sánh, cờ đích). Quá nhiều accent = trẻ không biết nhìn đâu.
- Ngoại lệ cảnh được phép: `b5` (vườn hoa) vẫn thuộc chương 1 nhưng dùng thêm
  hồng/đỏ/vàng đất; `b20` thuộc chương 5 nhưng có thêm ca-rô trắng/đen của vạch
  đích. **UI chồng lên vẫn dùng `ink`/`soft` của chương** để đồng nhất.
- `Asset/Mc_Queen.webp` giữ nguyên làm ảnh thưởng 7×3; không sinh lại xe nhận diện
  được trong nền chung.

## 3. Ngôn ngữ hình khối & ánh sáng

- **Bo góc**: mọi nền tảng, rương, luống hoa, khối, khán đài có radius ≥ 24 px khi
  xem ở 1280×720. Không góc nhọn, không răng cưa.
- **Đường viền mềm**: viền cùng tone đậm hơn, có shadow mềm 8–16 px; tránh outline
  đen kiểu comic nét cứng. Với đồ vật cần đếm, thêm rim light sáng 1–2 px để tách
  khỏi nền.
- **Ánh sáng**: một nguồn sáng chính từ trên-trái (key), fill dịu từ phải, bóng mềm
  dưới chân vật thể. Không hard shadow, không lens flare chói.
- **Độ sâu**: layer xa mờ hơn, bão hòa thấp hơn 10–15%; layer gần nét hơn. Bokeh
  chỉ dùng ở thượng phần/tiền cảnh mờ, không đè lên vùng chữ.
- **Chuyển động**: inject chậm (≤ 1–2 Hz), amplitude nhỏ, easing mềm. **Không** flash
  > 3 Hz, không đổi độ sáng > 20% trong 100 ms, không cảnh giật cục bộ.
- **Mật độ**: tối đa ~5–7 nhóm đối tượng lớn/khung. Nền là sân khấu, không phải tranh
  tìm điểm khác biệt.

## 4. Quota & quy ước file ảnh nền

| Hạng mục | Chuẩn |
|---|---|
| Tỉ lệ | **16:9** exact (1280×720 khuyến nghị; chấp nhận 1600×900 / 1920×1080 master) |
| Định dạng delivery | **WebP lossy**, sRGB, không alpha cho nền, không EXIF/ICC thừa |
| Kích thước file | **≤ 400 KB = 400.000 bytes/ảnh** (`hd.maxBytes`); target thực tế 320–360 KB để dư headroom |
| Tên delivery | `Asset/hd/<lessonId>.webp` — khớp hợp đồng quick spec (`intro.webp`, `b5.webp`, `b20.webp`, …) |
| Tên nguồn/master | `bg_[scene]_[variant]_16x9.webp` theo convention `[category]_[name]_[variant]_[size].[ext]`; ghi mapped `lessonId` trong manifest |
| Số lượng | 21 file sau Đợt 3; Đợt 1 = 3 file (`intro`, `b5`, `b20`) |
| Fallback | Thiếu ảnh → nền CSS + emoji, game vẫn chơi, **0 console error** (AC-7) |
| Kiểm tra | `Get-Item Asset/hd/*.webp | Select Name,Length` + script Pillow kiểm tra `w*9 == h*16` |

Nén mẫu (chạy từ root dự án):

```powershell
cwebp -q 78 -m 6 -metadata none -resize 1280 720 source.png -o Asset/hd/intro.webp
```

Nếu vượt 400.000 bytes: hạ `q` 78 → 72 → 66; nếu vẫn vượt, giảm chi tiết bokeh/
texture rồi resize 1180×664 (vẫn 16:9). **Không** hạ độ tương phản của vùng chữ
để đổi dung lượng.

## 5. Chữ & UI chồng lên nền

- Ảnh nền **không chứa chữ, số, logo** (xem prompt ở `hd-prompts-dot1.md`). Mọi chữ
  do DOM/CSS render để sắc mọi DPI và đúng tiếng Việt.
- Vùng an toàn: **12% trên** cho badge "Cảm hứng: …" / tiêu đề; **22% dưới** cho
  lựa chọn đáp án; giữ vùng này ít chi tiết, màu nền nhạt hơn 10–15%.
- Khi bắt buộc đặt chữ trực tiếp lên ảnh: dùng panel `soft` với opacity 0.92 +
  blur nhẹ 6px, hoặc scrim gradient `linear-gradient(180deg, rgba(255,255,255,.85), transparent)`.
- Tương phản: chữ thường ≥ **4.5:1**, chữ lớn ≥ 3:1 (WCAG AA). Dùng `ink` của chương,
  không dùng trắng trên `base` sáng. Có thể thêm stroke `ink` 2 px ở nhãn số lớn để
  chống lẫn nền.
- Nút đáp án ≥ 64 px trên mobile (đã có trong smoke report); viền focus `#0E6D93`
  phải nhìn thấy dù nền xanh — thêm ring trắng 2 px bên ngoài.
- Màu không được là tín hiệu duy nhất: đúng = màu xanh **+** dấu ✓ **+** chữ "Đúng";
  sai = cam **+** dấu ~ **+** chữ "Thử lại".

## 6. Reduced motion

- Game nhận `ctx.reducedMotion` / `prefers-reduced-motion: reduce` từ hợp đồng
  `createGame(...)`. Khi bật: bỏ intro 1200 ms, bỏ celebration bay/confetti/parallax,
  giữ **phản hồi màu + text + icon**.
- Ảnh nền luôn tĩnh (WebP tĩnh). Không dùng WebP động, không CSS `animation` trên
  `background-position` khi reduced-motion.
- Không tự phát sáng/nhấp để "gọi ý" đáp án; dùng tăng bão hòa tĩnh + ring.
- Mọi hiệu ứng chuyển màn có thể bỏ qua bằng click/phím mà không mất phản hồi đúng/sai.

## 7. Ranh giới bản quyền — BẮT BUỘC

Quick spec và ADR-0002 đã chốt: **chỉ mượn cơ chế + ghi tên game cảm hứng**.

Được phép:

- Ghi dòng chữ trong UI: `Cảm hứng: Super Mario Bros.` / `Animal Crossing` /
  `Mario Kart 8`… — đây là **tribute bằng tên**, không phải tài sản hình ảnh.
- Mượn **cơ chế** (nhảy nhặt đồng xu, tách gộp hoa, đua 1 đối 1…).
- Sinh art HD hoàn toàn mới bằng AI hoặc vẽ mới cho nền/đối tượng/hệu ứng.

Không được phép:

- Copy sprite, logo, font logo, nhạc/âm thanh gốc, tên nhân vật Nintendo
  (Mario, Luigi, Yoshi, Kirby, Pikmin, Cappy, Link, Pikachu…).
- Đưa vào prompt hoặc ảnh: chữ "Mario", nắp đỏ có chữ M, râu, ngôi sao, hộp dấu
  `?`, hình dáng xe/nhân vật nhận diện được, màu nhận diện + biểu tượng đặc trưng
  đi cùng nhau.
- Dùng lại `Asset/Feature.webp` / `Asset/Mc_Queen.webp` làm nền minigame. Hai ảnh này
  chỉ là tham chiếu màu nội bộ; `Mc_Queen.webp` được dùng riêng cho lưới thưởng 7×3
  theo đúng quyết định người dùng.
- Sinh lại xe McQueen trong ảnh nền `b20` (dù là tài sản người dùng cung cấp) để tránh
  hiểu nhầm là art Nintendo; bục/đường đua là cảnh generic.

Quy trình kiểm duyệt nhanh cho mỗi ảnh: (1) prompt có chứa tên nhân vật/logo không?
→ loại. (2) Ảnh có chữ/logo/watermark không? → loại. (3) Có silhouette nhận diện
được không? → vẽ lại generic. (4) Dòng tribute chỉ nằm trong DOM, không nằm trong file ảnh.

## 8. Checklist nghiệm thu art (mỗi ảnh)

- [ ] 16:9 đúng, WebP, ≤ 400.000 bytes.
- [ ] Không text/logo/nhân vật nhận diện được; phù hợp "Ranh giới bản quyền".
- [ ] Base/deep/soft/ink đúng chương; accent ≤ 15% khung.
- [ ] 12% trên & 22% dưới yên tĩnh, đủ tương phản cho UI.
- [ ] Viền mềm, bo góc, không cạnh sắc, không flash > 3 Hz.
- [ ] Fallback CSS+emoji khi thiếu ảnh; reduced-motion giữ phản hồi màu+chữ.
- [ ] Smoke 21 màn: 0 console error, 0 404.

---

## 9. 21 nhận diện art riêng (bổ sung v1.1 — toàn bộ 21 bài)

> Quyết định người dùng 2026-11-22: **21 bài = 21 trò chơi = 21 phong cách art khác
> nhau**. Không dùng "một style chung đổi màu". Hai bài Đợt 1 (`intro`, `b20`)
> giữ nguyên ảnh nền HD đã có; khi sinh sprite/cover vẫn áp đúng phong cách riêng
> trong bảng dưới. `gameId` lấy nguyên từ `js/data/game-map.js` (không đổi slug).

Ký hiệu quy tắc đọc dùng ở cột cuối (định nghĩa đầy đủ, đo được ở mục 11):

| Code | Quy tắc bắt buộc |
|---|---|
| R1 | Vùng đáp án (22% dưới khung) có độ sáng L* 78–95, biến thiên ≤ 10. |
| R2 | Panel chữ/đáp án: nền sáng ≥ 92% opacity, radius ≥ 16 px. |
| R3 | `accent` ≤ 15% diện tích khung; không viền đậm > 3 px sát ô đáp án. |
| R4 | Nút chạm ≥ 64×64 CSS px, khoảng cách giữa 2 nút ≥ 8 px. |
| R5 | `prefers-reduced-motion`: dừng ở idle frame 0, giữ phản hồi màu + chữ + icon. |
| R6 | Số/đáp án ≥ 32 px, `ink` trên `soft`, contrast ≥ 4.5:1 (≥ 3:1 nếu ≥ 24 px bold). |

| # | gameId | `style id` | Tên phong cách (duy nhất) | Chất liệu / kết cấu | Bảng màu (hex) | Nhân vật gốc — silhouette & tính cách | Motion signature | Quy tắc dễ đọc 6 tuổi |
|---|---|---|---|---|---|---|---|---|
| 1 | `mario-bros` | `pixel-art` | **Pixel-art 8-bit** | Pixel vuông 4×4 px, không anti-alias, palette giới hạn 8 màu, nét dứt khoát | sky `#5C94FC`, accent `#FFD84D`, ink `#3A2317`, soft `#FFF6DC` | Bé Cáo Tai Nhọn: tai tam giác, mũ chóp, đuôi bông to, áo khoác vuông — nhảy liên tục, hăng hái | `hop-snap`: 4 frame, 120 ms/frame, nhảy 2 px rồi dừng gọn (không ease) | R1,R2,R3,R4,R5,R6 + tắt nhiễu pixel trong vùng số |
| 2 | `mario-odyssey` | `watercolor` | **Tranh nước (watercolor)** | Gem nước wet-on-wet, mép loang mềm, giấy texture hạt mịn, không nét cứng | sky `#8AD7FF`, accent `#FF7A59`, ink `#243B5A`, soft `#F2FBFF` | Chú Cú Mắt Tròn: cánh xòe rộng, đầu tròn, mũ len vành rộng, túi vải — tò mò, ném khăn dải xanh (không ném mũ có mắt) | `wash-bloom`: 4 frame, 200 ms, vùng màu loang rộng thêm 3 px | R1,R2,R4,R5,R6 + loang nước chỉ ở thượng phần, không đè số |
| 3 | `donkey-kong-country` | `carved-wood` | **Gỗ khắc nổi (carved wood)** | Khối gỗ 3D có vân khắc rõ, rãnh sâu 2 px, góc bo, bóng gỗ ấm | sky `#A8E06A`, accent `#FFB020`, ink `#4A2C1A`, gỗ `#B07A45` | Sóc Mây Búi Quạt: búi lông hình quạt, đuôi cuộn tròn, áo khoác vải bố — leo trèo nhanh, vui vẻ (không phải hình dáng khỉ) | `carve-settle`: 4 frame, 180 ms, rơi nhẹ 2 px rồi đứng yên | R1,R2,R3,R4,R5,R6 + vân gỗ mờ đi 20% sau lồng số |
| 4 | `pokemon` | `paper-cut` | **Cắt giấy nhiều lớp (paper-cut)** | Giấy cắt biên sắc, 3–4 lớp chồng có drop-shadow mềm 4 px | sky `#DFF3A5`, accent `#F05A5A`, ink `#2E4A1F`, giấy `#FFFDF2` | Bé Hươu Tai Lá: tai hình lá, thân tròn nhỏ, vòng lưới treo tay — dịu dàng, gom nhóm bằng lưới | `layer-peel`: 4 frame, 200 ms, mỗi lần nhấc 1 lớp giấy cao 3 px | R1,R2,R4,R5,R6 + bóng lớp giấy không cắt ngang chữ |
| 5 | `zelda` | `wax-crayon` | **Sáp màu (wax crayon)** | Nét sáp dày, hạt sáp lộ rõ, nền giấy da cừu `#F6EBCB` | sky `#9FD6A8`, accent `#F2C94C`, ink `#23423A`, giấy `#F6EBCB` | Nàng Tóc Bím Vành Kính: hai bím, kính tròn, áo choàng tam giác, chìa khóa gỗ — điềm tĩnh, thích mở rương (không tai nhọn, không áo xanh lá) | `crayon-scribble`: 4 frame, 160 ms, nét sáp hiện dần từng đoạn | R1,R2,R4,R5,R6 + hạt sáp to ≥ 3 px, không nét mảnh < 2 px |
| 6 | `animal-crossing` | `felt-fabric` | **Vải nỉ (felt plush)** | Nỉ xù, đường kim may lộ ra, mép cắt bo tròn, bóng mềm | sky `#BFE9FF`, accent `#FF9BB3`, ink `#3E5B46`, nỉ kem `#FFF3E2` | Thỏ Tai Cụp Yếm Hoa: tai rủ xuống, thân tròn lắp, yếm hoa, giỏ dệt — kiên nhẫn, chăm vườn | `squish-bounce`: 4 frame, 180 ms, ép dọc 3 px rồi bật lại | R1,R2,R3,R4,R5,R6 + lông nỉ không mọc vào ô chữ |
| 7 | `mario-party` | `plastic-bricks` | **Khối nhựa lắp ráp (bricks)** | Nhựa bóng, nút tròn trên đỉnh, cạnh bo, phản xạ trắng sắc | sky `#FFD6F0`, accent `#8E6CFF`, ink `#3B2A57`, highlight `#FFFFFF` | Chó Tai Vểnh Áo Carô: một tai dựng một tai rủ, thân ghép khối, áo carô — may mắn, hay nhảy | `stud-click`: 4 frame, 140 ms, khớp 2 px rồi kêu (chỉ thị giác) | R1,R2,R3,R4,R5,R6 + nút nhựa không lấp vào mặt xí ngầu |
| 8 | `dr-mario` | `origami` | **Origami (giấy gấp)** | Mặt giấy phẳng, nếp gấp sắc, 2 tông sáng/tối mỗi mặt, không bo tròn | sky `#EAF3FF`, accent `#FF5B6E`, ink `#2B3A66`, bóng gấp `#C9D8F5` | Gấu Mắt Kính Bác Sĩ: tai tròn gấp, mũ giấy chóp, áo blouse, cầm viên nang — cẩn thận, chính xác | `fold-unfold`: 4 frame, 200 ms, mặt giấy xoay 90° (reduced motion: frame 0) | R2,R4,R5,R6 + nếp gấp không chạm vào dấu `> < =` |
| 9 | `mario-maker` | `clay` | **Đất sét (claymation)** | Đất sét dẻo, vân tay mịn, khối lumps bo tròn, bóng mềm | sky `#FCE3B4`, accent `#FF7B54`, ink `#4A3423`, đất sáng `#FFF1D6` | Gấu Mộc Tạp Dề: tai tròn nhỏ, tạp dề vuông, găng tay múp míp — thích xếp, vui vẻ | `wobble-jiggle`: 4 frame, 160 ms, lắc ngang 4 px | R1,R2,R3,R4,R5,R6 + không lắc khi đang hiện số đếm |
| 10 | `mario-paint` | `oil-paint` | **Sơn dầu impasto** | Cọ dày, vân sơn nổi, dao màu, canvas trắng hơi gồ | sky `#FFF0F6`, accent `#7ED957`, ink `#3C3557`, canvas `#FFFFFF` | Mèo Tai Tam Giác Cầm Cọ: tai nhọn, đuôi cong, tạp dề dính sơn — biểu cảm, thích tô màu | `brush-drag`: 4 frame, 200 ms, nét cọ dài thêm 6 px | R2,R4,R5,R6 + vân sơn chỉ ngoài ô tô, không làm mờ mã màu |
| 11 | `yoshi-island` | `mosaic` | **Mosaic ghép mảnh (tile mosaic)** | Ô vuông ≥ 12 px, đường grout kem 2 px, bóng mờ; **không dùng ô nhỏ** | sky `#C9F0A0`, accent `#FF8F3F`, ink `#35532E`, grout `#FFF8E7` | Vẹt Mào Ba Lông: ba sợi mào, mỏ to, túi vải sau lưng — đói, nuốt trái nhanh (không phải khủng long Yoshi) | `tile-pop`: 4 frame, 160 ms, 1 ô nhô cao 4 px | R1,R2,R4,R5,R6 + ô mosaic ≥ 12 px, silhouette nhân vật liền khối |
| 12 | `luigis-mansion` | `ink-wash` | **Mực nước + đèn lồng (ink wash)** | Mực loang xám xanh, 1 điểm sáng ấm, viền mờ, nền gần tối nhưng không đen đặc | sky `#C8D2F2`, accent `#7CE0C0`, ink `#2E3352`, đèn `#FFE6A8` | Dơi Tai Rộng Đèn Bầu Dục: tai rất rộng, thân nhỏ tròn, đèn bầu dục — nhát nhưng gan dạ | `lantern-pulse`: 4 frame, 220 ms, bán kính sáng +4 px (không nháy) | R2,R4,R5,R6 + mực tối chỉ ở nền, panel chữ luôn sáng ≥ 92% |
| 13 | `brain-age` | `chalkboard` | **Bảng đen + phấn (chalkboard)** | Bảng xanh đậm `#2F4A3C`, nét phấn trắng hơi bụi, kẻ ô mờ | sky `#FFE9A8`, accent `#FF7F50`, ink `#4A3B2C`, bảng `#2F4A3C`, phấn `#FFFFFF` | Rùa Mai Lục Giác Đeo Kính: mai ô lục giác, kính tròn mảnh, cầm phấn — tập trung, nhẩm nhanh | `chalk-dust`: 4 frame, 180 ms, rơi 2 px bụi phấn | R2,R4,R5,R6 + phấn trắng **chỉ trong sprite**; chữ UI dùng `ink` trên panel sáng, không dùng trắng trên bảng |
| 14 | `mario-and-luigi` | `grid-paper` | **Giấy kẻ ô + bút dạ (marker)** | Giấy kẻ ô xám nhạt, nét bút dạ 3 px, góc nét bo, có nét vẽ lại lộ ra | sky `#BFE4FF`, accent `#FF6B5B`, ink `#2E4160`, giấy `#FFFDF0` | Bé Nhím gai bo tròn + Bé Sóc tai tròn, cùng cầm kính lúp — hợp sức tìm số thiếu (khác bài 1 tai nhọn, bài 3 búi quạt) | `marker-trace`: 4 frame, 200 ms, nét được vẽ dài thêm 5 px | R1,R2,R4,R5,R6 + ô kẻ giấy mờ ≤ 10% để không nhầm với ô đáp án |
| 15 | `pikmin` | `yarn` | **Len quấn (yarn-wrap)** | Sợi len quấn vòng quanh thân, lộ vân xoắn 2 px, đầu sợi nhô ra | sky `#D8F3A3`, accent `#FF6F61`, ink `#3B5230`, len sáng `#FFF2C9` | Bọn Bọ Len tròn trịa: thân len tròn, 3 sợi râu, chân ngắn — đoàn kết, khiêng khối | `yarn-unwind`: 4 frame, 180 ms, đầu sợi giãn 3 px | R1,R2,R4,R5,R6 + vân len không tạo vòng lặp trước số |
| 16 | `kirby` | `cotton` | **Bông gòn (cotton puff)** | Bông xù mép lượn sóng, bóng cực mềm, bề mặt mờ không bóng nhựa | sky `#FFD8EA`, accent `#FF6FA5`, ink `#5B3A57`, kem `#FFF9F2` | Bé Mây Bông Gòn: đáy lượn sóng, một lọn tóc xoắn, mắt chấm li ti, tay lá nhỏ — hiền, thổi mây (không phải khối tròn mắt to) | `puff-inflate`: 4 frame, 200 ms, phình 100→104% rồi về 100% | R1,R2,R4,R5,R6 + phình ≤ 4%, không che mũi tên hướng |
| 17 | `warioware` | `pop-art` | **Pop-art halftone** | Chấm Ben-Day ≥ 4 px, tương phản cao, nét dày 4 px, tia nổ góc | sky `#FFE066`, accent `#E34F3F`, ink `#3B2B22`, kem `#FFF8E1` | Thỏ Tai Gập Kính Mát: một tai gập, kính mát, áo khoác ngắn, cầm nút bấm — hối hả, hay giật mình | `dot-burst`: 4 frame, 140 ms, vòng chấm giãn 6 px | R2,R3,R4,R5,R6 + chấm halftone không nằm dưới số; tia nổ không rung |
| 18 | `super-smash-bros` | `neon-vector` | **Vector neon (arcade glow)** | Đường vector dày, viền phát sáng 6 px, nền tối vừa phải, không gradient lóa | sky `#FFC94D`, accent `#E8453C`, ink `#3A2438`, glow `#FFF3C4` | Bé Hổ Tai Tròn Băng Đầu: tai tròn, băng vải trơn, găng mềm, đuôi sọc — tự tin, đấm nhẹ | `neon-trace`: 4 frame, 180 ms, alpha sáng 60→90% | R2,R4,R5,R6 + glow không đặt sau chữ; panel mờ chặn sáng |
| 19 | `fire-emblem` | `woodcut` | **Khắc gỗ in bản (woodblock print)** | In phẳng 2D, nét khắc 2 px, vân gỗ dọc, giấy `#F4EFE0` — **khác bài 3 là chổi khắc 3D** | sky `#B7C7E8`, accent `#E2B541`, ink `#26324F`, giấy `#F4EFE0` | Hiệp Sĩ Mũ Nồi Vuông: mũ vuông, khiên diều không huy hiệu, áo choàng ngắn — cẩn trọng, đi từng ô | `engrave-in`: 4 frame, 200 ms, hiện 1 vạch khắc 1 px | R1,R2,R4,R5,R6 + không tạo huy hiệu/ký hiệu nhận diện trên khiên |
| 20 | `splatoon` | `spray-paint` | **Sơn xịt stencil (spray)** | Vệt sơn xịt mép hạt, stencil bo tròn, lớp sơn dày 2 px | sky `#FFD1E8`, accent `#FF4D8D`, ink `#3A2B4A`, trắng stencil `#FFFFFF` | Mực Con Mắt Tròn Súng Bình Hoa: 6 xúc tu ngắn, 2 mắt chấm, súng hình bình hoa — vui vẻ, tô hình | `splat-spread`: 4 frame, 160 ms, bán kính vệt +6 px | R2,R3,R4,R5,R6 + vệt sơn không phủ lên hình mẫu cần bắn |
| 21 | `mario-kart` | `patchwork` | **Vải ghép miếng (patchwork quilt)** | Miếng vải hình thoi/vuông ≥ 20 px, đường kim 2 px, ca-rô trắng đen, mép vải bo | sky `#8DD9FF`, accent `#FFD84D`, ink `#243B5A`, vải kem `#FFF7E0` | Bé Mèo Tai Tròn Khăn Carô: tai tròn (khác bài 10 tai nhọn), khăn ca-rô, xe bo tròn 4 bánh lộ ra — háo hức về đích | `wheel-roll`: 4 frame, 140 ms, nhích 4 px rồi dừng | R1,R2,R3,R4,R5,R6 + ca-rô chỉ ở vạch đích/khăn, không trải full khung |

**Kiểm tra "khác biệt thật" (bắt buộc trước khi sinh ảnh):** thu nhỏ silhouette từng
nhân vật về 64×64 px, xếp 21 cái cạnh nhau. Mỗi cái phải nhận diện được bằng
**ít nhất 2 đặc điểm không trùng** (tai / mào / đuôi / mũ / đồ vật cầm). Nếu 2 cái
chỉ khác màu → vẽ lại. Cặp dễ nhầm cần soi kỹ: #1–#14 (cáo vs nhím/sóc), #3–#19
(gỗ 3D vs in phẳng), #6–#16 (nỉ vs bông), #10–#21 (mèo tai nhọn vs tròn),
#8–#13 (gấu kính vs rùa kính).

## 10. Guardrail bản quyền — bổ sung cho sprite, cover, prompt AI

Mục 7 vẫn áp dụng nguyên vẹn. Bổ sung 6 quy tắc mới:

1. **`gameId` là slug nội bộ, không phải nội dung hiển thị.** Các slug
   `mario-bros`, `pokemon`, `kirby`, `mario-kart`… chỉ dùng làm khóa đăng ký và
   tên file. **Không** render slug thành chữ, **không** đưa slug vào prompt sinh
   ảnh, metadata EXIF/XMP, alt text hay tên layer. Dòng UI duy nhất được phép là
   `Cảm hứng: <tribute>` do DOM tạo.
2. **Prompt bắt buộc chứa cụm sau, nguyên văn (tiếng Anh):**
   `original character, no existing franchise character, no logo, no copyright`.
   Thiếu cụm này → prompt bị loại, không sinh ảnh.
3. **Danh sách đen trong prompt và ảnh:** Mario, Luigi, Yoshi, Kirby, Pikmin,
   Link, Zelda, Pikachu, Cappy, Wario, Bowser, Donkey Kong, Samus, Fox, marshmallow
   / "hộp dấu ?" / ngôi sao / nắp đỏ có chữ M / râu / mũ xanh đỏ nhận diện được /
   xe kart có hình dáng đặc trưng / bục trao thưởng có logo. Trừ tribute bằng chữ
   trong DOM, không có ngoại lệ.
4. **Không dùng ảnh có sẵn trong `Asset/` root làm tham chiếu tạo hình.**
   `Luigi.webp`, `Mc_Queen.webp`, `Feature.webp`, `MaterCars2Artwork.webp` và các
   file tương tự là tài sản có bản quyền/mang nhận diện; chỉ được giữ làm tham
   chiếu màu nội bộ như mục 1, **không** đưa vào prompt, không crop, không dùng
   làm sprite/cover/nền. `Mc_Queen.webp` tiếp tục chỉ dùng cho lưới thưởng 7×3.
5. **Bài 5 (`zelda`) và bài 21 (`mario-kart`) rủi ro cao nhất**: dễ bị AI kéo về
   tai nhọn/áo xanh hoặc xe có mũ đỏ. Sau khi sinh, soi riêng 2 bài này trước,
   nếu lệch thì viết lại prompt với mô tả phủ định cụ thể, không chỉ thêm
   "original".
6. **Quy trình duyệt 3 bước cho mỗi ảnh mới:** (1) grep prompt xem có slug/tên
   nhân vật/logo không → có thì loại; (2) xem ảnh ở 100% và ở 64 px: có chữ,
   watermark, biểu tượng, silhouette nhận diện được không → có thì vẽ lại;
   (3) tribute chỉ tồn tại trong DOM, kiểm tra bằng cách tắt CSS/JS: ảnh phải
   "sạch" hoàn toàn. Kết quả duyệt ghi vào manifest, không chỉ vào prompt.

## 11. Style không được làm ảnh hưởng tới khả năng đọc đáp án

Nguyên tắc: **phong cách là lớp trang trí, đáp án là lớp chức năng.** Khi xung
đột, đáp án thắng; sửa style, không sửa đáp án.

### 11.1 Thông số đo được (safe range)

| Thông số | Phạm vi an toàn | Giá trị mặc định | Ảnh hưởng nếu vượt |
|---|---|---|---|
| Độ sáng vùng đáp án (L*) | 78–95 | 88 | < 70 → chữ `ink` chìm; > 95 → chói |
| Biến thiên L* trong vùng đáp án | ≤ 10 | ≤ 6 | > 10 → số bị rối bởi nền |
| Diện tích `accent` trong khung | 8–15% | 12% | > 15% → trẻ nhìn chỗ sai |
| Opacity panel chữ | 0.92–1.00 | 0.94 | < 0.92 → lọt texture vào chữ |
| Contrast chữ thường | ≥ 4.5:1 | ≥ 6:1 | < 4.5 → sai WCAG AA |
| Contrast chữ lớn (≥ 24 px bold) | ≥ 3:1 | ≥ 4.5:1 | < 3 → sai WCAG AA |
| Cỡ chữ số/đáp án | 32–56 px | 40 px | < 32 → đếm nhầm ở 6 tuổi |
| Nút chạm | ≥ 64×64 px | 72×72 px | < 64 → bấm nhầm |
| Khoảng cách 2 nút | ≥ 8 px | 12 px | < 8 → bấm nhầm nút kế |
| Thời gian 1 frame sprite | 80–240 ms | 140–200 ms (xem mục 8) | < 80 → nháy; > 240 → giật |
| Tốc độ nháy sáng | ≤ 2 Hz | 0 (tĩnh) | > 3 Hz → rủi ro quang động kinh |

### 11.2 Edge case — kết quả xử lý cụ thể

| Style / tình huống | Kết quả bắt buộc |
|---|---|
| #12 ink wash, #13 bảng đen, #18 neon có nền tối | Panel `soft` `#FFFDF0` opacity ≥ 0.92, radius ≥ 16 px đặt **giữa nền và mọi chữ/đáp án**; phấn trắng/glow chỉ nằm trong sprite, không nằm sau chữ |
| #11 mosaic, #17 halftone, #21 ca-rô có họa tiết lặp | Họa tiết dừng trước vùng đáp án 22% dưới; nếu lọt, làm mờ lớp họa tiết xuống ≤ 20% opacity trong vùng đó |
| #7 khối nhựa, #10 sơn dầu có highlight trắng | Highlight trắng ≤ 5% diện tích mỗi nút; không đặt highlight trùng mép nút (dễ thành "viền nút đang chọn") |
| #2 nước, #3 gỗ, #6 nỉ có texture lốm đốm | Texture bị cắt bằng mask trong vùng chữ; không dùng blur làm mờ chữ thay thế |
| Sprite `cheer` che vào đáp án | Frame `cheer` phải crop lại: nhân vật chỉ chiếm ≤ 30% chiều cao vùng đáp án, dịch sang trái/phải ngoài 4 nút |
| `prefers-reduced-motion: reduce` | Dừng ở `idle` frame 0 mọi lúc; **không** rung/lắc/phóng to; vẫn giữ đổi màu nền nút + dấu ✓/~ + chữ "Đúng"/"Thử lại" |
| Thiếu sprite/cover/bg (404) | Fallback CSS + emoji hiện tại, bố cục và kích thước nút không đổi, 0 console error |
| AI sinh ra chữ/logo trong ảnh | Loại ảnh, không crop chữ rồi dùng lại; sửa prompt theo mục 10.6 rồi sinh mới |

### 11.3 Tiêu chí nghiệm thu Given–When–Then (QA chạy được)

- **AC-A1** — Given một bài bất kỳ trong 21 bài, when mở màn chơi ở 1280×720,
  then vùng 22% dưới có L* trung bình 78–95 và độ lệch chuẩn L* ≤ 10 (đo bằng
  script lấy mẫu ảnh + DOM rect của 4 nút).
- **AC-A2** — Given màn có đáp án, when đo bằng DevTools, then mỗi nút có
  `width ≥ 64 && height ≥ 64` CSS px và `gap ≥ 8` px; chữ số có
  `font-size ≥ 32px` và contrast ≥ 4.5:1 so với panel phía sau.
- **AC-A3** — Given 21 sprite sheet, when bật `prefers-reduced-motion: reduce`,
  then canvas hiển thị đúng frame `idle[0]` và không có `transform`,
  `animation` hay `box-shadow` thay đổi theo thời gian; đáp án đúng vẫn đổi
  màu + hiện ✓ + chữ "Đúng".
- **AC-A4** — Given 21 ảnh nền/cover, when quét bằng mắt ở 100% và 64×64 px,
  then 0 ảnh có chữ/logo/silhouette nhận diện được; 21/21 có ít nhất 2 đặc
  điểm silhouette không trùng với bài khác.
- **AC-A5** — Given bài 12/13/18, when chụp màn đáp án, then panel sáng phía
  sau chữ có opacity ≥ 0.92 và không thấy vân mực/phấn/glow lọt qua chữ.
- **AC-A6** — Given bài 11/17/21, when chụp màn đáp án, then không có ô mosaic,
  chấm halftone hay ca-rô nào nằm sau mặt số; silhouette nhân vật không che
  quá 30% chiều cao vùng đáp án.

### 11.4 Liên kết

- Chi tiết lưới sprite, frame timing, prompt 21 bài và ngân sách file:
  `design/art/sprite-style-guide.md`.
- Prompt nền Đợt 1 (giữ nguyên): `design/art/hd-prompts-dot1.md`.
- Cấu trúc game/palette gốc: `js/data/game-map.js`;
  palette UI: `css/tokens.css`, `css/app.css`.
