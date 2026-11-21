# Session State — Bé Vui Học Toán 1

**Cập nhật**: 2026-11-21 07:30
**Trạng thái**: **Cuộc đua 4 tay đua đã hoàn thành** (McQueen + 3 đối thủ/28 nhân vật),
màn xuất phát kiểu Feature.webp, HUD 4 làn, podium kết quả. Đang build lại `public/`
và deploy Render bản mới. Bản live cũ vẫn ở https://be-vui-hoc-toan-1.onrender.com.

## Việc đang làm

Biến mỗi màn thành một cuộc đua, dùng toàn bộ nhân vật trong `Asset/` và bố cục
starting grid tham khảo `Feature.webp`. Giữ nguyên 21 màn, 11 dạng bài, không có
màn thua: bé vẫn nhận sao theo số câu đúng ngay lần đầu, kết quả thêm hạng 1–4.

## Tiến độ

- [x] Đọc mục lục + các trang hoạt động mẫu của PDF (Bài 4, 5, 10, 15)
- [x] Chốt 4 quyết định với người dùng: toàn bộ Tập 1, thưởng xe + sao + confetti,
      giọng đọc tiếng Việt + hiệu ứng, web tĩnh offline
- [x] Quick design spec + ADR-0001 + bản đồ nội dung 21 màn
- [x] Core: RNG có seed, số tiếng Việt, WebAudio, Web Speech, storage có fallback
- [x] Domain: 11 generator, phiên học, tính sao, mở khoá, lưu tiến độ
- [x] UI: home, lesson, result, parent; visual cho đồ vật/hình/scene/phương trình
- [x] Cuộc đua: 28 đối thủ, chọn 3/màn luân phiên; intro starting grid; HUD 4 làn;
      điểm đua, xếp hạng 1–4, podium; không có trạng thái thua
- [x] 65 unit test trong trình duyệt — PASS 65/65 (QuickJS + Chromium)
- [x] Smoke Playwright — PASS: 21 màn desktop + mobile, 56→65 test, race intro/HUD/podium
- [x] Lighthouse trang chủ + bài vị trí — 100/100/100
- [x] Review độc lập (CONCERNS) — đã sửa HIGH/MEDIUM chính; ghi chú trade-off
- [ ] Build lại `public/`, cập nhật GitHub và deploy Render bản cuộc đua
- [ ] Kiểm tra live: 21 màn, ảnh 28 nhân vật, HUD, podium, xe/confetti

## Quyết định quan trọng

1. **Không build, không Node** — classic script + dữ liệu JS, chạy `file://`.
2. **Một hợp đồng `Question`** cho mọi dạng bài, UI chỉ có một màn chơi.
3. **Không phạt** — sai chỉ rung + toast + cho thử lại; sao cuối bài theo tỉ lệ
   đúng ngay lần đầu (90% / 60%).
4. **Không hardcode gameplay** — mọi thông số trong `js/data/tuning.js`.
5. **Không dùng tranh minh hoạ trong PDF** — emoji + SVG; xe do người dùng cung cấp.
6. **Quyền riêng tư** — không mạng, không tài khoản, tiến độ chỉ trong localStorage.

## File chính

- `index.html`, `css/tokens.css`, `css/app.css`
- `js/core/{rng,vi-numbers,audio,speech,storage}.js`
- `js/data/{tuning,curriculum}.js`
- `js/domain/{questions,lesson-session,progress}.js`
- `js/ui/{components,visuals}.js`
- `js/ui/screens/{home,lesson,result,parent}.js`
- `js/app.js`
- `tests/test-runner.html`, `tests/unit/*.js`
- `tools/smoke_test.py`
- `design/quick-specs/kid-math-web-2026-11-20.md`
- `design/gdd/curriculum-map.md`
- `docs/architecture/ADR-0001-static-offline-web-game.md`
- `production/qa/screenshots/*.png`

## Kết quả kiểm thử hiện tại

| Hạng mục | Kết quả | Bằng chứng |
|----------|---------|------------|
| Unit test (65 test) | PASS 65/65 | `tests/test-runner.html` |
| Smoke test Playwright | PASS | `production/qa/smoke-report.md` |
| Cuộc đua | 28 đối thủ, 3/màn, intro/HUD/podium | `js/data/racers.js`, `js/domain/race.js`, `js/ui/race.js` |
| Phạm vi smoke | 21 màn desktop + mobile, bàn phím, reduced-motion, focus, cổng sai | `tools/smoke_test.py` |
| Offline `file://` | PASS | tự động trong smoke, localStorage + ảnh xe, không lỗi console |
| Mobile 390×844 | PASS | không tràn ngang, nút đáp án ≥ 64 px |
| Lighthouse (trang chủ) | 100/100/100 | `production/qa/lighthouse/lighthouse.html` |
| Review độc lập | CONCERNS → đã sửa HIGH/MEDIUM chính | `production/qa/code-review.md` |
| Giọng tiếng Việt | Không có trên Chrome headless | game không đọc giọng sai; màn Phụ huynh hướng dẫn cài |

## Câu hỏi mở

- Máy của phụ huynh đã cài giọng tiếng Việt (Microsoft Linh) chưa? Nếu chưa, cần
  hướng dẫn cài để bé nghe được đề.
- Có muốn bổ sung chế độ **luyện theo dạng bài** (chỉ cộng, chỉ hình…) ngoài 21 màn không?
- Có muốn thu âm lời khen bằng giọng người thật để thay TTS không?

## Bước tiếp theo

1. [x] Nhận báo cáo review, sửa các mục BLOCKER/HIGH.
2. [x] Chạy lại `python tools/smoke_test.py`, cập nhật ảnh và `production/qa/smoke-report.md`.
3. [x] Build và kiểm tra bản tĩnh `public/` (21 bài, ảnh xe, localStorage, 0 lỗi).
4. Tạo GitHub repo từ `deploy/kid-math-render.zip`, kết nối Render Blueprint
   (`render.yaml`), lấy link HTTPS.
5. Mở link trên tablet, kiểm tra TTS/âm thanh, thêm vào màn hình chính.
6. Giao cho phụ huynh dùng thử 1–2 tuần; đóng băng 1.0.0.
7. Nếu trẻ thích: bổ sung chế độ luyện theo dạng bài và thu âm lời khen.
