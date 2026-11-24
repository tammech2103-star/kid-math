# ADR-0001: Web tĩnh offline, không bước build

- **Status**: Accepted
- **Date**: 2026-11-20
- **Deciders**: technical-director (lead), producer
- **Related**: `design/quick-specs/kid-math-web-2026-11-20.md`

## Context

Mục tiêu là một game học Toán cho trẻ lớp 1, dùng ngay trên máy của phụ huynh:
mở lên, bấm là chơi. Máy hiện tại **không có Node.js**, không có trình quản lý gói,
chỉ có Python. Trẻ có thể dùng chuột, bàn phím hoặc màn hình cảm ứng. Không được
phụ thuộc mạng, không được gửi dữ liệu trẻ em ra ngoài. Thời gian phát triển ngắn,
đội ngũ 1 người + agent hỗ trợ.

Các lựa chọn đã cân nhắc:

1. **Web tĩnh HTML/CSS/JS thuần, mở `index.html`** — không build, không cài đặt.
2. Web tĩnh dùng ES module + JSON, chạy qua `python -m http.server`.
3. Đóng gói desktop bằng Electron/Tauri — cần cài Node/Rust.
4. Engine game (Godot/Unity) xuất Web — nặng hơn nhu cầu, cần cài engine.

## Decision

Chọn **phương án 1**: một trang HTML duy nhất, CSS thuần, JavaScript cổ điển
(classic scripts, không ES module) để chạy được cả trên `file://`. Dữ liệu bài học
là file JS gán vào namespace `KM`, không dùng `fetch()`/JSON rời.

Kiến trúc phân lớp:

```
data/     tuning + curriculum (dữ liệu thuần, không logic)
domain/   sinh câu hỏi, phiên học, tiến độ (hàm thuần, không DOM)
ui/       visuals, components, 4 màn hình (DOM, nhận service qua tham số)
core/     rng, số tiếng Việt, audio, speech, storage (hạ tầng dùng lại)
app.js    composition root: tạo service, router, khởi động
```

Quy ước:

- `Question` là hợp đồng duy nhất giữa domain và UI:
  `{ kind, text, say, visual, choices, choiceRender, answer, cheer }`.
- Không có singleton trạng thái game; `app.js` tạo service và truyền xuống màn hình.
- Domain không đọc/ghi DOM, không đọc `localStorage` trực tiếp (nhận qua tham số).
- Mọi thông số hành vi nằm trong `js/data/tuning.js`; mọi nội dung trong
  `js/data/curriculum.js`.
- Ảnh xe dùng trực tiếp `Asset/car1.webp` (đã có alpha trong suốt, 1000×477).

## Consequences

**Tích cực**

- Phụ huynh chỉ cần nháy đúp `index.html`. Không cài đặt, không mạng, không tài khoản.
- Toàn bộ chạy trong sandbox trình duyệt; dữ liệu tiến độ chỉ nằm trong
  `localStorage` của máy.
- Domain thuần hàm nên test chạy được trong `tests/test-runner.html` mà không cần
  Node, Jest hay bundler.
- Vòng lặp sửa–kiểm tra rất ngắn: sửa file, tải lại trang.

**Tiêu cực / ràng buộc**

- Không dùng `import`/`export`; phải giữ thứ tự `<script>` trong `index.html`.
- `localStorage` trên `file://` phụ thuộc trình duyệt; đã có fallback bộ nhớ trong
  phiên (mất tiến độ khi đóng tab) và ghi chú trong màn Phụ huynh.
- Không có minify/optimize tự động; chấp nhận vì tổng dung lượng nhỏ.
- Nếu sau này cần đồng bộ nhiều thiết bị, phải bổ sung backend (ngoài phạm vi).

## Compliance

- Không CDN, không font ngoài, không thư viện bên thứ ba.
- Không `eval`, không `innerHTML` với dữ liệu người dùng.
- JSDoc cho API công khai; hàm ≤ 40 dòng, complexity ≤ 10.
- Test bắt buộc: `tests/test-runner.html` PASS 100% trước khi giao.
