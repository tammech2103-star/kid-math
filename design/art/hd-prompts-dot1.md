# HD Background Prompts — Đợt 1 (3 ảnh)

- **Ngày**: 2026-11-22
- **Đích**: `Asset/hd/intro.webp`, `Asset/hd/b5.webp`, `Asset/hd/b20.webp`
- **Quy chiếu**: `design/art/art-bible-hd.md` mục 1–8 (đặc biệt mục 7 Ranh giới bản quyền)
- **Nguyên tắc chung**: mỗi prompt sinh **nền tĩnh, 16:9, không chữ**. Tribute
  ("Cảm hứng: …") do DOM render. Không nhắc tên thương hiệu/nhân vật trong prompt.
- **Kích thước sinh gợi ý**: master 1920×1080 (hoặc 1536×864), sau đó downscale
  1280×720 khi nén WebP.

---

## 1. `Asset/hd/intro.webp` — Nền platformer vui nhộn (chương 1, sky)

**Prompt (EN):**

> A cheerful high-definition 3D cartoon platformer game background, wide 16:9
> composition. Bright clear sky-blue gradient with fluffy rounded cotton-candy
> clouds and soft warm rim light. A few plain teal cylindrical pipes with smooth
> rounded lips and absolutely no markings, no letters, no symbols. Chunky grassy
> platforms with generously rounded edges, soft clay-like plasticine shading,
> small grass tufts and smooth ambient occlusion. Several simple floating shiny
> gold coins as plain circular discs with a gentle specular highlight, scattered
> at different depths. Gentle sunlight from upper left, soft fill from right,
> subtle depth of field, clean toy-like 3D render, saturated but friendly colors,
> simple readable silhouettes, low visual detail in the lower quarter so game UI
> can be overlaid. Wide cinematic game backdrop, no characters, no objects with
> faces, no text anywhere.

**Negative prompt (EN):**

> no text, no letters, no numbers, no logo, no brand marks, no trademarked
> characters, no recognizable video game characters, no red cap, no mustache,
> no question blocks, no star icons, no photorealism, no realistic photo, no gore,
> no violence, no blood, no horror, no watermark, no signature, no UI buttons,
> no busy patterns in the lower third

**Tone màu:** `sky #7ED3F7` → `sky-soft #E6F8FF` cho trời; `mint #6FE3B8` cho cỏ;
`teal #2FA9DC` viền ống; `sun #FFD84D` cho đồng xu; `ink #0E6D93` chỉ dùng ở UI.
Accent vàng ≤ 15% khung; vùng dưới nhạt dần để chồng 4 lựa chọn đáp án.

**Ghi chú nén WebP:** xuất PNG master → `cwebp -q 78 -m 6 -metadata none -resize 1280 720 intro_master.png -o Asset/hd/intro.webp`. Kiểm tra `Length ≤ 400000`; nếu vượt, thử `q 72` rồi `q 66`. Giữ nền không alpha, sRGB; không nén bằng cách làm mờ đồng xu (đây là đối tượng đếm).

---

## 2. `Asset/hd/b5.webp` — Vườn pastel kiểu làng quê ấm áp (chương 1, biến thể vườn)

**Prompt (EN):**

> A warm peaceful countryside garden game background, wide 16:9 composition,
> high-definition 3D cartoon style with rounded soft-edged shapes. Two neat
> rectangular flower beds of rich brown loam placed left and right with a clear
> gap in the middle, each bed filled with small rounded clumps of soil. Clusters
> of simple red, golden yellow and soft pink blossoms with chunky rounded petals
> and green stems, arranged in tidy groups so the two beds can be compared by
> sight. A low wooden picket fence with rounded posts behind the beds, gentle
> rolling hills in the distance, warm early-morning sunlight from upper left,
> delicate golden bokeh, soft long shadows, pastel palette with a few saturated
> flower accents, soft ambient occlusion, clean toy-like 3D render, calm and
> cozy village feeling, lower quarter kept simple and uncluttered for game UI.
> No people, no animals, no characters, no text anywhere.

**Negative prompt (EN):**

> no text, no letters, no numbers, no logo, no brand marks, no trademarked
> characters, no recognizable video game characters, no anthropomorphic flowers,
> no faces, no photorealism, no realistic photo, no gore, no violence, no blood,
> no horror, no watermark, no signature, no UI buttons, no harsh shadows,
> no clutter in the lower third

**Tone màu:** giữ nền chương 1 (`sky-soft #E6F8FF` cho trời nhạt, `ink #0E6D93`
cho UI), nhưng đất `#8B5E3C`/`#5F4D33` và hoa `#FF6B5B` / `#FFD84D` / `#FFB3C6`
làm accent ấm. Hai luống phải khác nhau rõ về **số cụm hoa**, không chỉ khác màu —
phục vụ dạng `compose` (tách – gộp).

**Ghi chú nén WebP:** `cwebp -q 76 -m 6 -metadata none -resize 1280 720 b5_master.png -o Asset/hd/b5.webp`. Bokeh là thứ tiêu tốn byte nhất: nếu `> 400000`, giảm số hạt bokeh hoặc `q 70` trước khi đổi bố cục. Kiểm tra `Length` và tỉ lệ 16:9.

---

## 3. `Asset/hd/b20.webp` — Đường đua kart cartoon (chương 5, sun)

**Prompt (EN):**

> A vibrant cartoon kart-racing track background, wide 16:9 composition,
> low camera angle looking down a smooth wide racetrack that leads the eye to the
> finish. Bold black-and-white checkered finish line painted across the foreground
> and a tall checkered finish flag on a simple plain pole. Colorful round balloons
> and simple triangular pennant strings above the track. Cheerful grandstands on
> both sides filled with abstract rounded color dots and simple flag shapes, no
> faces and no identifiable figures. Sunny bright sky with soft fluffy clouds,
> warm sunlight, glossy toy-like 3D render with soft ambient occlusion and rounded
> edges, celebratory fairground mood, high energy but low visual noise in the
> bottom quarter for game UI. Empty racetrack, no vehicles, no drivers, no
> characters, no text anywhere.

**Negative prompt (EN):**

> no text, no letters, no numbers, no logo, no brand marks, no trademarked
> characters, no recognizable video game characters, no recognizable cars,
> no vehicles, no drivers, no mascot, no photorealism, no realistic photo,
> no gore, no violence, no blood, no crash, no horror, no watermark, no signature,
> no UI buttons, no crowded foreground

**Tone màu:** nền chương 5 (`sun #FFD84D`, `sun-soft #FFF6D6`, `sun-deep #E79B00`),
nhấn `coral #FF6B5B` ở bóng bay/cờ; ca-rô trắng/đen là neutral, chiếm < 10% khung.
Góc nhìn thấp tạo chiều sâu, nhưng vạch đích phải nằm ở giữa khung để không đè lên
HUD 2 làn. UI chồng dùng `ink #7A5200` trên panel `sun-soft`.

**Ghi chú nén WebP:** `cwebp -q 78 -m 6 -metadata none -resize 1280 720 b20_master.png -o Asset/hd/b20.webp`. Ca-rô sắc nét dễ tạo artifacts: nếu xuất hiện nhiễu quanh vạch, giữ `q ≥ 72` và giảm chi tiết khán đài thay vì hạ quality quá thấp. Xác nhận `Length ≤ 400000`.

---

## Kiểm tra sau khi sinh (3 file)

```powershell
Get-ChildItem Asset/hd/*.webp | Select-Object Name, Length
python -c "from PIL import Image; import glob; [print(p, Image.open(p).size) for p in glob.glob('Asset/hd/*.webp')]"
```

Tiêu chí: đúng 3 tên file, mỗi file `≤ 400000` bytes, mỗi ảnh `w*9 == h*16`,
không chữ/logo/nhân vật nhận diện được. Sau khi duyệt, cập nhật mapping trong
`js/data/game-map.js` (việc của Đợt 1, nằm ngoài phạm vi art docs).
