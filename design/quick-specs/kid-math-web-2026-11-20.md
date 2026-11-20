# Quick Design Spec: Bé Vui Học Toán 1 (Web Game)

**Type**: New Small System
**Scope**: Web game tĩnh, chạy offline, dạy Toán lớp 1 Tập 1 (Kết nối tri thức với cuộc sống) cho trẻ 6 tuổi. Không tài khoản, không máy chủ, không dữ liệu trẻ em rời khỏi máy.
**Date**: 2026-11-20
**Estimated Implementation**: 12–16 giờ

## Overview

Trẻ chọn một bài trong sách (21 màn: Tiết học đầu tiên + Bài 1–20), nghe đề đọc bằng
tiếng Việt, quan sát hình minh hoạ và chạm vào đáp án. Trả lời đúng thì xe đua
(`Asset/car1.webp`) xuất hiện kèm sao và confetti; trả lời sai thì chỉ rung nhẹ và
cho chọn lại, không mất sao, không có màn thua. Hết bài, trẻ nhận 1–3 sao và màn
kết quả có xe cỡ lớn, sao, confetti. Tiến độ lưu bằng `localStorage` trên máy.

## Core Rules

1. **Cấu trúc nội dung**: 5 chủ đề, 21 màn, bám thứ tự và số trang của sách Tập 1.
   Mỗi màn 8 câu (màn mở đầu 5 câu, màn ôn tập chung 10 câu).
2. **Sinh đề tự động**: 11 dạng hoạt động dùng chung một hợp đồng `Question`.
   Đề không lặp nguyên văn giữa các lần chơi nhưng luôn nằm trong phạm vi bài học.
3. **Trả lời**:
   - Đúng ngay lần đầu: +1 sao trong bài, xe + sao + confetti, đọc lời khen.
   - Đúng ở lần thử lại: được đi tiếp, không cộng sao lần đầu.
   - Sai: rung nút, âm báo nhẹ, đọc "Bé thử lại nhé", không trừ sao, không giới hạn số lần thử.
4. **Xếp hạng sao cuối bài**: 3 sao nếu tỉ lệ đúng-ngay-lần-đầu ≥ 90%; 2 sao nếu ≥ 60%;
   1 sao khi đã hoàn thành bài.
5. **Mở khoá**: màn đầu tiên luôn mở; màn sau mở khi màn trước đạt ≥ 1 sao.
   Phụ huynh có thể bật "Mở khoá tất cả bài".
6. **Phần thưởng xe**: xe chỉ xuất hiện khi trẻ làm đúng (không xuất hiện khi sai,
   không dùng xe để gây áp lực thời gian). Không có đồng hồ đếm ngược.
7. **Âm thanh**: giọng đọc tiếng Việt qua Web Speech API (có nút nghe lại), hiệu ứng
   tổng hợp bằng WebAudio (không cần file âm thanh). Có công tắc riêng cho giọng đọc
   và hiệu ứng, lưu vào cài đặt.
8. **Phụ huynh**: khu vực riêng có cổng kiểm tra bằng phép nhân đơn giản; xem sao
   từng bài, tổng sao, bật/tắt giọng đọc – hiệu ứng, mở khoá tất cả, đặt lại tiến độ.
9. **Không phạt**: không trừ sao, không khoá bài vì sai, không âm thanh chói, không
   hiệu ứng nhấp nháy nhanh. Tôn trọng `prefers-reduced-motion`.

## Tuning Knobs

| Knob | Default | Range | Category | Rationale |
|------|---------|-------|----------|-----------|
| `questionsPerLesson` | 8 | 5–12 | pacing | Đủ ngắn cho trẻ 6 tuổi, khoảng 4–6 phút/bài |
| `introQuestions` | 5 | 3–8 | pacing | Màn làm quen nhẹ hơn |
| `choiceCount` | 3 | 2–4 | difficulty | 3 lựa chọn đủ thử thách, không gây choáng |
| `stars.three` | 0.9 | 0.8–1.0 | scoring | 3 sao cần gần như đúng hết ngay lần đầu |
| `stars.two` | 0.6 | 0.4–0.8 | scoring | 2 sao cho mức khá |
| `timing.correctHoldMs` | 1500 | 800–3000 | feel | Đủ thời gian nhìn xe và sao, không quá lâu |
| `timing.wrongHoldMs` | 900 | 400–2000 | feel | Nhịp phản hồi nhẹ nhàng |
| `confetti.count` | 60 | 20–90 | feel | Vui nhưng không rối mắt |
| `speech.rate` | 0.9 | 0.7–1.1 | accessibility | Chậm rõ cho trẻ lớp 1 |
| `maxNumber` | 10 | 10 | curriculum | Đúng phạm vi Tập 1 |

Mọi giá trị nằm trong `js/data/tuning.js`; không hardcode trong logic.

## Acceptance Criteria

- [ ] Mở `index.html` trực tiếp bằng Chrome/Edge là chơi được, không cần mạng, không cần cài đặt.
- [ ] Đủ 21 màn, đúng thứ tự 5 chủ đề, mỗi màn hiển thị đúng số trang sách.
- [ ] 11 dạng hoạt động đều sinh được câu hỏi hợp lệ; đáp án luôn nằm trong danh sách lựa chọn.
- [ ] Trả lời đúng: xe + sao + confetti xuất hiện; trả lời sai: không có xe, cho thử lại.
- [ ] Hết bài: lưu sao, mở bài kế tiếp khi đạt ≥ 1 sao; tải lại trang vẫn giữ tiến độ.
- [ ] Giọng đọc tiếng Việt đọc đề và lời khen; tắt/bật được, có nút nghe lại.
- [ ] Khu vực phụ huynh có cổng bảo vệ, xem được tiến độ và đặt lại.
- [ ] Bộ test tự động trong `tests/test-runner.html` chạy 100% PASS.
- [ ] Không có giá trị gameplay hardcode ngoài `js/data/`.
- [ ] Bàn phím dùng được (1–9 chọn đáp án, Esc về nhà), nút tối thiểu 64px.

## Systems Index

Game độc lập, không nằm trong `design/gdd/systems-index.md`. Đây là sản phẩm nhỏ
(quick-spec đủ), không cần GDD đầy đủ. Bản đồ nội dung chi tiết nằm ở
`design/gdd/curriculum-map.md`.

## Deviations đã được người dùng chấp thuận

- Đồ vật minh hoạ bằng emoji; chỉ ảnh xe là tài sản thật (`Asset/car1.webp`).
- Bài 15 "trước/sau" quy về trên/dưới/trái/phải cho rõ trên màn hình 2D.
- Khối 3D vẽ SVG cách điệu thay vì ảnh chụp như sách.
- Không tái sử dụng tranh minh hoạ trong PDF (bản quyền NXB Giáo dục Việt Nam);
  sách chỉ dùng làm nguồn nội dung và trình tự bài học.
