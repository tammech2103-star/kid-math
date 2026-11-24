# Independent Code Review — Bé Vui Học Toán 1

**Reviewer**: subagent độc lập (lead-programmer + qa-lead), đọc snapshot lúc ~17:15
**Verdict ban đầu**: CONCERNS
**Trạng thái sau xử lý**: CONCERNS còn lại đã chấp nhận có ghi chú (không có BLOCKER)

## Đã sửa

| Mức | Phát hiện | Cách xử lý | Bằng chứng |
|-----|-----------|-----------|------------|
| HIGH | Chữ trắng trên nút coral chỉ 2.8:1 | Đổi gradient primary sang `#C73527 → #A3241A`; nhãn chương dùng `--chapter-ink`; focus ring `#0E6D93`; placeholder đậm hơn | Lighthouse 100, contrast tính lại ≥4.5 |
| HIGH | Mất focus khi chuyển câu/màn | Focus câu hỏi (tabindex −1) sau mỗi câu, focus tiêu đề kết quả, focus switch sau khi đổi, focus h1 khi vào home/parent | Smoke kiểm tra `document.activeElement` |
| HIGH | TTS dùng giọng mặc định khi thiếu giọng Việt | `speak()` chỉ chạy khi có voice `vi`; phụ huynh thấy hướng dẫn cài giọng; nút "Nghe thử" báo thiếu giọng, không đọc sai | `speech.js`, `parent.js`; headless không lỗi |
| HIGH | Bằng chứng QA chưa khớp | Thêm block `file://` thật vào smoke, kiểm tra bàn phím, reduced-motion, focus, cổng sai | `tools/smoke_test.py`, `13-file-offline.png` |
| MEDIUM | Chơi lại hiện sao lượt này lệch với kỷ lục | Result hiện **kỷ lục**; thêm dòng "Lần này: X sao · Kỷ lục: Y sao" khi thấp hơn | `result.js` |
| MEDIUM | "Chưa đúng rồi", "không quả táo" | Đổi "Chưa đúng. Bé thử lại nhé!"; thêm `spoken(0)` = "số không"; count 0 = "Không có ... nào"; test cập nhật | 56/56 test |
| MEDIUM | Lời nhắc bị đọc đề cắt ngang | Lưu timer đọc đề, huỷ khi bé chạm đáp án | `lesson.js` |
| MEDIUM | Nút phụ < 64 px | Icon 64/56 px, "Nghe lại" 56 px, switch 44 px; đáp án 86 px; ghi rõ trong README | CSS + smoke mobile |
| MEDIUM | Hardcode, knob chết | Thêm `generation` + `timing`; bỏ `choiceCount`, `maxNumber`, `introQuestions`, `progress`; dùng `wrongHoldMs`, `resetArmMs`, `resultSpeakDelayMs` | `tuning.js`, `questions.js` |
| MEDIUM | Alt dãy số không đủ | Alt liệt kê từng số và "ô trống" | `questions.js` |
| MEDIUM | Addend lộ đáp án; thiếu phép với 0 | Che nhóm cần tìm; thêm `n − n = 0`, `0 + n`, `n + 0` | Test invariant |
| LOW | Version không kiểm tra | `normalize` chỉ nhận `v === 1` | `progress.js` |
| LOW | Footer luôn nói "đã lưu" | Dùng `isPersistent()` | `home.js` |
| LOW | Mở được bài khoá qua debug | Lesson chặn nếu chưa mở, trừ `preview` dành cho smoke | `lesson.js` |
| LOW | Lựa chọn dấu luôn cùng thứ tự | Xáo trộn `signChoices` | `questions.js` |
| LOW | Tài liệu nói 3 lựa chọn khối | Cập nhật curriculum-map: 2–4 lựa chọn | `design/gdd/curriculum-map.md` |
| LOW | `objects.flower` mồ côi | Xoá | `curriculum.js` |
| LOW | Skip link target thiếu tabindex | `#app` có `tabindex="-1"` | `index.html` |
| LOW | README 55 test | Cập nhật 56 | `README.md` |
| LOW | Hướng dẫn chỉ Windows | Đổi thành "hệ điều hành hoặc trình duyệt" | `parent.js` |
| LOW | Toast không dọn khi chuyển màn | `navigate` gọi `dismissToast` | `app.js` |
| LOW | Smoke lặp reconfigure | Xoá block trùng | `tools/smoke_test.py` |
| LOW | `__pycache__` | Đã xoá, thêm `.gitignore` | repo |

## Chấp nhận / ghi chú

- **Hàm UI dài** (`home`, `lesson`, `parent`) là hàm composition của màn hình; đã tách
  các khối render/answer/choices/finish. Không tách thêm vì tăng indirection mà không
  giảm rủi ro; domain generators đã được kiểm tra bằng 56 test.
- **Nội dung phụ thuộc thị giác**: câu đếm đồ vật/đếm hình không thể mô tả đầy đủ cho
  người khiếm thị nếu không làm lộ đáp án. Đã ghi rõ trong README/test plan; alt dãy số
  đã cải thiện. Đây là giới hạn của dạng bài, không phải lỗi kỹ thuật.
- **Smoke dùng debug hook** `KMApp.current().debugState()` để biết đáp án đúng; phản hồi
  (xe, sao, confetti, toast, focus, mở khoá) được kiểm tra qua DOM. Việc map đáp án ↔
  lựa chọn được unit test kiểm tra.
- **`localStorage` file://** phụ thuộc trình duyệt; có fallback bộ nhớ phiên.

## Kết luận

Không còn BLOCKER/HIGH. Các mục còn lại là trade-off đã ghi chú. Sản phẩm đạt tiêu chí
phát hành cho phụ huynh dùng thử.
