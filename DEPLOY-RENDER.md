# Deploy lên Render — Bé Vui Học Toán 1

**Trạng thái:** đã deploy tại **https://be-vui-hoc-toan-1.onrender.com**
(static site, commit `8c021af`, deploy 2026-11-21 12:27 GMT+7). Bản này là
**cuộc đua 1 đối 1** với đường đua 2 làn có hai xe cỡ lớn chạy bám đuổi, có
hiệu ứng thua khi về đích thứ hai và tuỳ chọn "cho bé chơi lại khi thua".

Mục tiêu: có một link HTTPS dạng `https://be-vui-hoc-toan-1.onrender.com` để mở trên tablet.
Đây là **static site** — không backend, không database, không thu dữ liệu trẻ em.

> Mình đã chuẩn bị sẵn `render.yaml`, script build `public/` và file ZIP để upload.
> Bước cuối cần tài khoản **GitHub** + **Render** của bạn (mình không có quyền đăng nhập
> thay bạn). Không gửi mật khẩu/API key qua chat.

## Có gì trong gói

- `render.yaml` — Render Blueprint: build `public/` rồi publish.
- `tools/build_public.py` — build tĩnh thủ công (chỉ copy file runtime).
- `deploy/kid-math-render.zip` — bản sạch để upload GitHub (tạo bằng
  `python tools/pack_deploy.py`; file ZIP không commit vào repo).
- `public/` — bản build đã kiểm tra cục bộ (không cần commit; Render tự build lại).

Gói ZIP đã được kiểm tra end-to-end: giải nén → `python tools/build_public.py` →
Chrome mở 21 bài, ảnh xe tải, localStorage hoạt động, **0 lỗi console/404**
(ảnh `production/qa/screenshots/14-render-build.png`).

## Cách 1 — Upload bằng GitHub web (không cần cài Git)

1. Nếu chưa có `deploy/kid-math-render.zip`, chạy `python tools/pack_deploy.py`,
   rồi giải nén file ZIP.
2. Vào <https://github.com/new>, tạo repository:
   - Tên: `kid-math`
   - Private hoặc Public đều được (Render đọc được private nếu bạn cấp quyền).
   - Không thêm README/gitignore (đã có trong gói).
3. Trong repo vừa tạo, chọn **Add file → Upload files**.
4. Kéo **toàn bộ nội dung bên trong thư mục đã giải nén** (không kéo cả thư mục cha)
   vào trang upload. Đảm bảo `render.yaml` nằm ở gốc repo.
5. Bấm **Commit changes**.
6. Vào <https://dashboard.render.com> → **New +** → **Blueprint**.
7. Chọn GitHub → repo `kid-math` → **Connect** → Render đọc `render.yaml` → **Apply**.
8. Đợi trạng thái **Live** (khoảng 1–2 phút). Link có dạng:
   `https://be-vui-hoc-toan-1.onrender.com`
   Nếu tên đã bị dùng, sửa `name:` trong `render.yaml` thành tên khác rồi commit lại.

Nếu repo để **Public**, có thể dùng nút deploy nhanh sau khi thay `TÊN-BẠN`:

```markdown
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TÊN-BẠN/kid-math)
```

Với repo **Private**, dùng Blueprint như bước 6–8 và cấp quyền GitHub cho Render.

## Cách 2 — Dùng Git (nếu muốn cập nhật bằng push)

Máy hiện tại **chưa cài Git**. Cài một lần:

```powershell
winget install --id Git.Git -e
```

Mở terminal mới, rồi:

```powershell
cd "D:\Kid Math"
git init
git add .
git commit -m "feat: Bé Vui Học Toán 1"
git branch -M main
git remote add origin https://github.com/<TÊN-BẠN>/kid-math.git
git push -u origin main
```

Sau đó làm bước 6–8 ở Cách 1. Từ lần sau chỉ cần `git push` là Render tự deploy lại.

## Nếu không dùng Blueprint (tạo Static Site thủ công)

Trong Render: **New + → Static Site** → chọn repo, nhánh `main`, rồi điền:

| Trường | Giá trị |
|--------|---------|
| Build Command | `rm -rf public && mkdir -p public && cp index.html public/ && cp -r css js Asset public/` |
| Publish Directory | `public` |

Bấm **Create Static Site**. Không cần biến môi trường, không cần database.

## Kiểm tra trên tablet

1. Mở link Render bằng Safari (iPad) hoặc Chrome (Android).
2. Bấm **Bấm để bắt đầu** — thao tác này mở khoá âm thanh/giọng đọc của trình duyệt.
3. Chơi thử Bài 1; kiểm tra xe + sao + confetti khi trả lời đúng.
4. Thêm vào màn hình chính:
   - iPad/Safari: **Chia sẻ → Thêm vào MH chính**.
   - Android/Chrome: **⋮ → Thêm vào màn hình chính**.
5. **Giọng đọc tiếng Việt**:
   - iPad: Cài đặt → Trợ năng → Nội dung đọc → Giọng → Tiếng Việt.
   - Android: Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói →
     cài giọng Việt (Google TTS).
   - Nếu máy chưa có giọng Việt, game **không đọc bằng giọng tiếng Anh**; bé vẫn học
     bằng chữ + hình. Màn **Phụ huynh** sẽ báo và có nút “Nghe thử giọng đọc”.

## Lưu ý

- **Tiến độ lưu trên từng thiết bị** (localStorage), không đồng bộ giữa các tablet.
- Trang là **công khai** với ai có link; không có tài khoản, không thu thập dữ liệu.
- Static site Render miễn phí, không “ngủ” như web service free.
- Link Render có HTTPS; không cần cài chứng chỉ.
- Muốn dùng tên miền riêng: Render → Settings → Custom Domains.
- Cập nhật nội dung: push commit mới, Render tự build lại. Nếu trình duyệt còn bản cũ,
  tải lại trang (header `Cache-Control: no-cache` đã bật).

## Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách sửa |
|------------|------------------------|
| 404 hoặc trang trắng | Publish Directory phải là `public`; xem Build Log có copy đủ `index.html`, `css`, `js`, `Asset` |
| Không thấy ảnh xe | Thiếu thư mục `Asset/` (phân biệt hoa/thường trên Linux) |
| Không có tiếng | Bấm nút bắt đầu trước; kiểm tra âm lượng/silent mode; cài giọng Việt |
| Deploy lỗi tên service | Đổi `name:` trong `render.yaml` sang tên chưa ai dùng |
| Sửa code mà web không đổi | Kiểm tra commit đã push; Render → Manual Deploy → Clear build cache |

## Kiểm tra cục bộ trước khi deploy

```powershell
python tools/build_public.py
python -m http.server 8766 --bind 127.0.0.1 --directory public
# mở http://127.0.0.1:8766
```

Bản `public/` đã được kiểm tra: 21 bài, ảnh xe, chuyển bài, localStorage, không lỗi console.
