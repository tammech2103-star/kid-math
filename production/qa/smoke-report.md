# Smoke Report — Bé Vui Học Toán 1

**Ngày**: 2026-11-20 19:12
**Phiên bản**: 1.0.0
**Môi trường**: Windows · Chrome 157.0.8103.80 · Python 3.12.10 · Playwright 1.65.2
**Server kiểm thử**: `python -m http.server 8765 --bind 127.0.0.1`
**Kết luận**: **PASS** — không có lỗi console, không tài nguyên 404.

## 1. Kết quả tổng hợp

| Hạng mục | Kết quả |
|----------|---------|
| Unit test trình duyệt | **67/67 PASS** |
| Smoke E2E desktop 1280×900 | **PASS** |
| Smoke E2E mobile 390×844 | **PASS** |
| Smoke E2E tablet 768×1024 và 1024×768 | **PASS** (xe intro 154/200 px, không tràn) |
| Cuộc đua | 1 đối 1/màn, 28 đối thủ xoay vòng, intro/HUD/podium |
| Mở offline `file://` | **PASS** (21 bài, xe tải, localStorage hoạt động) |
| Bản build tĩnh `public/` | **PASS** (61 mục, 1.6 MB, 0 tài nguyên lỗi) |
| Lighthouse trang chủ | **100 Accessibility / 100 Best Practices / 100 SEO** |
| Lighthouse bài vị trí (b15) | **100 / 100 / 100** — `production/qa/lighthouse/lesson-position.html` |
| **Live Render** | **PASS** — https://be-vui-hoc-toan-1.onrender.com |
| Trên live | Mũi tên ↑↓←→, badge 1/2, xe + confetti khi đúng |
| Lỗi console | 0 |
| Tài nguyên HTTP ≥ 400 | 0 |

## 2. Các bước đã chạy

| ID | Kết quả | Ghi chú |
|----|---------|---------|
| SM-01 | PASS | Splash có xe, nút bắt đầu |
| SM-02 | PASS | 21 thẻ bài, ảnh xe tải, không tràn ngang |
| SM-03 | PASS | Bài mở đầu: 5 câu, hình đồ vật, 3 lựa chọn |
| SM-04 | PASS | Sai: không có xe/confetti, có toast thử lại, giữ câu |
| SM-05 | PASS | Đúng sau sai: xe + confetti, không cộng sao lần đầu |
| SM-06 | PASS | Kết quả 2 sao, mở Bài 1, lưu tiến độ |
| SM-07 | PASS | Bài 1 toàn đúng: 3 sao, mở Bài 2, tổng 5 sao |
| SM-08 | PASS | Mở đủ **21/21 màn**, mỗi màn có lựa chọn + hình, không tràn || SM-09 | PASS | Cổng phụ huynh: trả lời sai vẫn ở cổng + có nhắc; đúng mới mở dashboard |
| SM-10 | PASS | Dashboard 21 dòng, tổng sao đúng, công tắc giọng đọc đổi trạng thái và giữ focus |
| SM-11 | PASS | Tải lại giữ 5 sao và Bài 2 đã mở |
| SM-12 | PASS | 21/21 màn trên mobile: không tràn, mọi nút đáp án ≥ 64 px |
| SM-13 | PASS | `file:///D:/Kid%20Math/index.html` tự động trong smoke: 21 bài, ảnh, localStorage |
| SM-14 | PASS | Bài khoá không mở được từ trang chủ; có nhắc |
| SM-15 | PASS | Lighthouse không còn failure (100/100/100) |
| SM-16 | PASS | Bàn phím: phím số chọn đúng đáp án, có xe + confetti |
| SM-17 | PASS | `prefers-reduced-motion`: animation ảnh xe tắt, confetti `display:none` |
| SM-18 | PASS | Focus: câu hỏi, tiêu đề kết quả, công tắc phụ huynh, h1 trang chủ/cổng |
| SM-19 | PASS | `python tools/build_public.py`: 21 bài, ảnh xe, localStorage, 0 lỗi/404 |
| SM-20 | PASS | Màn xuất phát 2 xe kiểu Feature; badge VS giữa, McQueen bên phải, badge BÉ; xe cao 200 px trên desktop |
| SM-21 | PASS | HUD 2 làn, ảnh tay đua 48 px; tên hiển thị cả trên mobile; McQueen tiến sau câu đúng |
| SM-22 | PASS | Kết quả có hạng 1–2, podium 2 tay đua, xe + confetti |
| SM-23 | PASS | Live Render: 21 bài, intro/HUD/podium, 30 ảnh Asset 200, 0 lỗi console/404 |
| SM-24 | PASS | Tablet 768×1024 và 1024×768: intro 2 xe cao 154/200 px, HUD 2 làn, không tràn ngang |
## 3. Ảnh chụp bằng chứng

| Tệp | Nội dung |
|-----|----------|
| `01-splash.png` | Màn chào có xe |
| `02-home.png` | Trang chủ 21 bài |
| `03-lesson-question.png` | Câu hỏi bài mở đầu |
| `04-intro-wrong.png` | Phản hồi sai (không có xe) |
| `04-intro-reward.png` | Xe + sao + confetti khi đúng |
| `04-intro-result.png` | Kết quả 2 sao |
| `05-b1-question.png`, `06-b1-*` | Bài 1 và kết quả 3 sao |
| `07-home-stars.png` | Trang chủ sau khi có 5 sao |
| `08-type-*.png` | 8 dạng hoạt động đại diện |
| `09-parent-gate.png` | Cổng phụ huynh |
| `10-parent-dashboard.png` | Dashboard tiến độ/cài đặt |
| `11-mobile-home.png`, `12-mobile-lesson.png` | Giao diện 390×844 |
| `13-file-offline.png` | Mở trực tiếp file, không server |
| `14-render-build.png` | Bản build tĩnh `public/` dùng để deploy Render |
| `03b-race-intro.png` | Màn xuất phát 1 đối 1 kiểu Feature |
| `11b-mobile-race-intro.png` | Màn xuất phát 1 đối 1 trên mobile |
| `12-mobile-lesson.png` | Bài học + HUD 2 làn trên mobile |
| `20-tablet-*-race-intro.png` | Màn xuất phát trên tablet (dọc/ngang) |
| `21-tablet-*-race-hud.png` | HUD 2 làn trên tablet (dọc/ngang) |
| `17-live-race-intro.png` | Intro 1 đối 1 trên bản Live |
| `18-live-race-hud.png` | HUD 2 làn trên bản Live |
| `19-live-race-result.png` | Podium 2 tay đua + xe + sao trên bản Live |

## 4. Lỗi phát hiện trong QA và đã sửa

1. Toast "Thử lại" còn hiện khi bé vừa trả lời đúng → đã xoá toast khi đúng.
2. Nút sai còn viền đỏ khi đã chọn đúng → đã xoá trạng thái sai.
3. Hai nhóm đồ vật dính vào nhau, khó đếm trên mobile → thêm khung trắng cho từng nhóm,
   xếp dọc trên mobile, thêm dấu `+` cho phép cộng.
4. Nhãn "Bên trái/Bên phải" sai khi hai nhóm xếp dọc → đổi thành **Nhóm A/Nhóm B**.
5. Số 0 đọc "không quả táo"/"không bé hơn một" gây nhầm → thêm cách đọc **"số không"**
   và "không có ... nào"; bổ sung câu trừ ra 0 (ví dụ `4 - 4 = 0`).
6. Thiếu landmark `<main>` → chuyển `#app` thành `<main>`, Lighthouse từ 98 lên 100.
7. Timer lời khen ở màn kết quả có thể đọc lẫn sang màn sau → đã huỷ khi rời màn.
8. Chữ tiêu đề kết quả 2 sao chưa mượt → "Bé cố thêm chút nữa nhé!".
9. Màu chữ/nút chưa đạt WCAG AA (trắng trên coral 2.8:1) → gradient đậm hơn,
   nhãn chương dùng màu ink riêng, focus ring đậm; Lighthouse giữ 100.
10. Mất focus sau mỗi câu/thiết lập → focus câu hỏi, tiêu đề kết quả, công tắc,
    h1 trang chủ/cổng; smoke kiểm tra `document.activeElement`.
11. Thiếu giọng Việt nhưng vẫn đọc bằng giọng mặc định → chỉ đọc khi có voice `vi`;
    nút "Nghe thử" báo thiếu giọng, không đọc sai.
12. Chơi lại 1 sao nhưng màn kết quả hiện 1 sao trong khi nhà hiện 3 → hiện kỷ lục,
    thêm dòng "Lần này: X sao · Kỷ lục: Y sao".
13. Addend lộ đáp án, thiếu phép với 0 → che nhóm cần tìm; thêm `n − n = 0`,
    `0 + n`, `n + 0`; đọc 0 là "số không".
14. Bằng chứng QA chưa tự động → smoke có `file://`, bàn phím, reduced-motion,
    focus, cổng sai; ghi rõ debug hook dùng để chọn đáp án.
15. Chuẩn bị deploy Render → thêm `render.yaml`, `tools/build_public.py`,
    `tools/pack_deploy.py`, `deploy/kid-math-render.zip`; bản `public/` 215.7 KB
    đã được kiểm tra 21 bài/ảnh/localStorage, không 404.
16. Trẻ lớp 1 chưa đọc được "Bên trái/Bên phải" → đổi lựa chọn vị trí sang
    **mũi tên lớn**, nhóm so sánh sang **badge 1/2 + màu**, dấu `=`; nhãn chữ nhỏ
    phía dưới. Ảnh `08-type-position.png`, `08-type-compare-groups.png`.
17. Bản deploy sau thay đổi đọc-bằng-mắt → build lại `public/` 218.2 KB, kiểm tra
    21 bài/ảnh/localStorage/0 404; ảnh `14-render-build.png` chụp bài vị trí.

## 5. Rủi ro còn lại

- **Giọng đọc tiếng Việt** phụ thuộc hệ điều hành. Chrome headless của máy kiểm thử
  không có giọng `vi-VN`; game **không đọc bằng giọng sai ngôn ngữ**, chuyển sang
  chế độ chữ + hình và màn Phụ huynh hướng dẫn cài giọng. Cần kiểm tra thủ công trên
  máy phụ huynh có giọng Việt.
- **Nội dung phụ thuộc thị giác**: câu đếm/đếm hình cần nhìn để đếm; chưa có mô tả
  thay thế đầy đủ cho người khiếm thị (mô tả đầy đủ sẽ làm lộ đáp án).
- **Smoke dùng debug hook** `KMApp.current().debugState()` để chọn đáp án đúng;
  phản hồi và mở khoá được kiểm tra qua DOM, mapping đáp án được unit test kiểm tra.
- **localStorage trên `file://`** phụ thuộc trình duyệt; đã có fallback bộ nhớ phiên.
- **Emoji** khác nhau giữa các hệ điều hành; hình học dùng SVG nên ổn định.
- **Nội dung** là tập con được chọn lọc, không thay thế sách giấy.

## 6. Lệnh tái lập

```powershell
cd "D:\Kid Math"
python -m http.server 8765 --bind 127.0.0.1
python tools/smoke_test.py
```

Mở `tests/test-runner.html` để xem 56 unit test.
