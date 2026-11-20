# Session State — Bé Vui Học Toán 1

**Cập nhật**: 2026-11-20 17:45
**Trạng thái**: MVP hoàn chỉnh; review + smoke + Lighthouse PASS; đã đóng gói deploy Render
(`render.yaml`, `public/`, ZIP hướng dẫn); chờ tài khoản GitHub + Render để bấm deploy.

## Việc đang làm

Bàn giao game web dạy Toán lớp 1 Tập 1 (Kết nối tri thức), chạy offline bằng
`index.html`, thưởng bằng `Asset/car1.webp`, 21 màn và 11 dạng hoạt động.

## Tiến độ

- [x] Đọc mục lục + các trang hoạt động mẫu của PDF (Bài 4, 5, 10, 15)
- [x] Chốt 4 quyết định với người dùng: toàn bộ Tập 1, thưởng xe + sao + confetti,
      giọng đọc tiếng Việt + hiệu ứng, web tĩnh offline
- [x] Quick design spec + ADR-0001 + bản đồ nội dung 21 màn
- [x] Core: RNG có seed, số tiếng Việt, WebAudio, Web Speech, storage có fallback
- [x] Domain: 11 generator, phiên học, tính sao, mở khoá, lưu tiến độ
- [x] UI: home, lesson, result, parent; visual cho đồ vật/hình/scene/phương trình
- [x] 56 unit test trong trình duyệt — PASS 56/56 (QuickJS + Chromium)
- [x] Smoke Playwright cuối — PASS: 21 màn desktop + mobile, `file://`, bàn phím,
      reduced-motion, focus, cổng sai, 8 dạng bài
- [x] Lighthouse trang chủ — 100/100/100, không failure
- [x] Review độc lập (CONCERNS) — đã sửa HIGH/MEDIUM chính; ghi chú trade-off
- [x] Cập nhật báo cáo QA cuối cùng
- [x] Đóng gói deploy Render: `render.yaml`, `tools/build_public.py`, `public/`,
      `tools/pack_deploy.py`, `deploy/kid-math-render.zip`, `DEPLOY-RENDER.md`
- [ ] Tạo GitHub repo + Render Blueprint (cần tài khoản người dùng)

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
| Unit test (56 test) | PASS 56/56 | `tests/test-runner.html` |
| Smoke test Playwright | PASS | `production/qa/smoke-report.md` |
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
