# QA Test Plan — Bé Vui Học Toán 1

**Phiên bản**: 1.0.0
**Ngày**: 2026-11-20
**Phạm vi**: Toàn bộ 21 màn, 11 dạng hoạt động, màn kết quả, khu phụ huynh,
lưu tiến độ, offline `file://`, desktop và mobile.

## 1. Mục tiêu chất lượng

- Trẻ 6 tuổi có thể tự chơi mà không cần đọc hết chữ (có giọng đọc, nút lớn).
- Mọi câu hỏi có đúng một đáp án, nằm trong 0–10, đáp án luôn có trong lựa chọn.
- Không có màn thua, không trừ sao, không giới hạn thời gian.
- Xe thưởng chỉ xuất hiện khi trả lời đúng.
- Tiến độ không mất khi tải lại; mở khoá tuần tự đúng.
- Chạy được khi mở trực tiếp `index.html`, không cần mạng.

## 2. Các mức kiểm thử

| Mức | Công cụ | Phạm vi | Bằng chứng |
|-----|---------|---------|------------|
| Unit / property | `tests/test-runner.html` (67 test) | RNG, số tiếng Việt, curriculum, 11 generator, race 1 đối 1 (28 đối thủ, xếp hạng), session, progress | ảnh chụp runner + `window.__TEST_RESULTS__` |
| Smoke E2E | `tools/smoke_test.py` (Playwright + Chrome) | splash → home → chơi 2 bài → kết quả → 8 dạng bài → phụ huynh → reload → mobile | `production/qa/screenshots/` |
| Offline | Playwright `file:///.../index.html` | tải script/CSS/ảnh, localStorage, mở bài | `13-file-offline.png` |
| Bản deploy | `python tools/build_public.py` + Chrome | 21 bài, ảnh xe, localStorage, 0 lỗi/404 | `14-render-build.png` |
| Thủ công | Người dùng | giọng đọc thật, âm thanh, cảm giác chơi | checklist dưới |

## 3. Unit test — 67 mục

- **Core**: đọc số 0–10, capitalize, countNoun; đọc số 0 là "số không" trong câu
  so sánh; RNG cùng seed, biên `int`, `shuffle` không sửa mảng gốc; lọc emoji cho TTS.
- **Race**: 28 đối thủ, mỗi màn đúng 1 đối thủ; 21 màn đầu dùng 21 đối thủ khác nhau;
  chơi lại đổi đối thủ và 28 lần chơi phủ đủ 28 nhân vật; điểm McQueen (1 / 0,55 khi
  thử lại), đối thủ nhích khi sai; xếp hạng 1–2, podium, không có trạng thái thua;
  `settle` lặp lại không đổi.
- **Curriculum**: 5 chủ đề, 21 màn, id/nhãn không trùng, trang tăng dần,
  tham chiếu đồ vật/hình hợp lệ, 5–12 câu mỗi màn.
- **Questions**: 11 generator × 250 câu; schema; không trùng lựa chọn;
  đếm khớp hình; so sánh nhóm; dấu `> < =`; tìm số chỉ một đáp án đúng;
  cộng/trừ/bảng cộng trừ đúng (gồm câu trừ ra 0); mấy và mấy; dãy số;
  đếm hình; khối; vị trí.
- **Theo bài**: mỗi bài × 8 seed sinh đúng số câu, không lỗi; bài trộn có ≥2 dạng;
  không lặp dạng liên tiếp ở Bài 20.
- **Session**: sai không đi tiếp, đúng lần đầu +1 sao, đúng sau sai 0 sao,
  trả lời lại bị bỏ qua, ngưỡng 3/2/1 sao, chuỗi đúng.
- **Progress**: mở khoá tuần tự, không ghi đè điểm cao, tổng sao, unlockAll,
  lưu/đọc lại, reset giữ cài đặt, resetAll.

## 4. Smoke test — các bước

| ID | Bước | Kỳ vọng |
|----|------|---------|
| SM-01 | Mở lần đầu | Splash có xe, nút bắt đầu, không lỗi console |
| SM-02 | Bắt đầu | Home có 21 thẻ bài, ảnh xe tải được, không tràn ngang |
| SM-03 | Vào bài mở đầu | Màn xuất phát 2 xe (1 đối 1, badge VS); sau đó 5 câu, hình đồ vật, 3 lựa chọn |
| SM-04 | Cố ý chọn sai | Không có xe/confetti, có toast thử lại, vẫn ở câu đó |
| SM-05 | Chọn đúng | Xe + confetti + xe tải được; sao không tăng nếu đã sai trước đó; McQueen tiến trên HUD |
| SM-06 | Hoàn thành bài mở đầu | Kết quả 2 sao (4/5 đúng lần đầu), podium 2 tay đua, mở Bài 1 |
| SM-07 | Chơi Bài 1 toàn đúng | Kết quả 3 sao, hạng nhất, mở Bài 2, tổng 5 sao |
| SM-08 | Mở đủ 21 màn | Mỗi màn có lựa chọn + hình/equation, không tràn ngang |
| SM-09 | Cổng phụ huynh | Sai vẫn ở cổng + có nhắc; đúng mở dashboard |
| SM-10 | Dashboard | 21 dòng tiến độ, tổng sao đúng, công tắc đổi trạng thái và giữ focus |
| SM-11 | Tải lại trang | Tổng 5 sao và Bài 2 vẫn mở |
| SM-12 | Mobile 390×844 | 21/21 màn không tràn ngang, nút đáp án ≥ 64 px |
| SM-13 | Offline `file://` | Tự động trong smoke: 21 bài, xe tải, localStorage hoạt động |
| SM-14 | Bài khoá | Không mở được từ trang chủ; có toast nhắc |
| SM-15 | Lighthouse | Accessibility / Best Practices / SEO = 100, không failure |
| SM-16 | Bàn phím | Phím số chọn đúng đáp án, có xe + confetti |
| SM-17 | Reduced motion | Animation ảnh xe tắt, confetti `display:none` |
| SM-18 | Focus | Câu hỏi, tiêu đề kết quả, công tắc, h1 trang chủ/cổng đều nhận focus |

Smoke dùng `KMApp.current().debugState()` để biết đáp án đúng rồi click theo
`data-value`; phản hồi (xe, sao, confetti, toast, focus, mở khoá) được kiểm tra
qua DOM. Mapping đáp án ↔ lựa chọn được unit test kiểm tra.

## 5. Checklist thủ công (phụ huynh)

- [ ] Nghe thử giọng đọc: có đúng tiếng Việt, rõ số và dấu không?
- [ ] Nếu máy chưa có giọng Việt: màn Phụ huynh báo đúng và game không đọc bằng
  giọng tiếng Anh?
- [ ] Tiếng "ting", tiếng xe, âm báo sai có dễ chịu, không quá to?
- [ ] Trẻ có tự bấm "Nghe lại" được không?
- [ ] Trẻ chưa đọc tốt có chọn được câu vị trí bằng mũi tên và câu so sánh nhóm
  bằng badge 1/2 + màu không?
- [ ] Trẻ có hiểu vì sao câu trả lời đúng/sai không? (nhìn hình + đọc lời khen)
- [ ] Chơi trên tablet/điện thoại: nút có dễ chạm, không bị che?
- [ ] Bật "giảm chuyển động" của hệ điều hành: animation có dừng?
- [ ] Tắt mạng và mở lại: game vẫn chạy?
- [ ] Bé có bị cuốn vào việc "cày sao" quá lâu không? (gợi ý nghỉ 10–15 phút)

## 6. Tiêu chí đạt

- 100% unit test PASS.
- 100% bước smoke PASS, không lỗi console, không tài nguyên 404.
- Lighthouse Accessibility / Best Practices / SEO đạt 100 (trang chủ).
- Không có lỗi BLOCKER/HIGH mở sau review.
- Phụ huynh xác nhận trẻ chơi được độc lập ít nhất 1 bài.

**Bằng chứng Lighthouse**: `production/qa/lighthouse/lighthouse.html` (điểm 100/100/100,
không còn failure).

## 7. Rủi ro đã biết

- **Giọng tiếng Việt** phụ thuộc máy; nếu thiếu, game không đọc bằng giọng sai ngôn ngữ,
  chuyển sang chế độ chữ + hình và hướng dẫn cài trong màn Phụ huynh.
- **Nội dung phụ thuộc thị giác**: câu đếm/đếm hình cần nhìn để đếm; mô tả đầy đủ sẽ
  làm lộ đáp án. Alt dãy số đã có; các dạng khác là giới hạn đã ghi nhận.
- **localStorage trên file://** phụ thuộc trình duyệt; có fallback bộ nhớ trong phiên.
- **Emoji** hiển thị khác nhau giữa Windows/macOS; hình học dùng SVG nên ổn định.
- **Nội dung** là một tập con được chọn lọc của sách, không thay thế sách giấy.
