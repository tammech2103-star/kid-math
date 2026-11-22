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
