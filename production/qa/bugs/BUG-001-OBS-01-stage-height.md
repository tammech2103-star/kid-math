# BUG-001 — OBS-01: `.game-stage` vượt ngân sách 170px trên tablet-ngang và mobile

- **Severity**: **S2 — Major** (ảnh hưởng lớn tới bố cục 21 bài, không phải crash/mất tiến độ)
- **Priority**: **P1** (chặn gate Giai đoạn C)
- **Status**: **Resolved / Closed** — QA tự rerun xác nhận **0 failures / 84 measurements**,
  stage cao nhất **166.0px ≤ 170px**, exit code 0, dòng cuối `PASS — smoke test hoàn tất`
  (xem mục 8). Baseline 39/84 và rerun trung gian 39/84 được giữ lại ở mục 5 và 7
  làm bằng chứng trước/sau.
- **Ngày phát hiện**: 2026-11-22
- **Ngày đóng**: 2026-11-22 (QA rerun sau fix CSS)
- **Người phát hiện / verify**: QA Lead (baseline & final gate Giai đoạn C)
- **Loại**: UI / Layout — Integration (OBS-01)
- **Gắn gate**: `production/qa/phase-c-qa-report.md` → BLOCKING
- **Liên quan**: `css/games.css`, `js/ui/games/kit.js:430`, `tools/smoke_test.py`

## 1. Tóm tắt

Baseline Giai đoạn C đo **84 tổ hợp (21 bài × 4 viewport)** thì có **39 tổ hợp vượt
ngân sách chiều cao `.game-stage` (>170px)**: `1024×768` 20/21 bài (tất cả trừ `b20`),
`390×844` 19/21 bài (`b1`–`b19`; `intro` và `b20` đạt). 1280×900 và 768×1024
không áp ngân sách này.

Đây là **baseline có chủ đích**, chạy trước khi bản CSS nén tiếp theo cho OBS-01 land.
Không phải regression do gói test Giai đoạn C gây ra: unit 117/117 PASS, 0 lỗi console,
0 response ≥400, 63/63 ảnh tải OK.

## 2. Cách tái lập

```powershell
cd "D:\Kid Math"
$p = Start-Process -FilePath python -ArgumentList @('-m','http.server','8765','--bind','127.0.0.1') -WorkingDirectory (Get-Location) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try { python tools/smoke_test.py } finally { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
```

Smoke tự gom failure, in hết `LAYOUT ...` / `LAYOUT-FAIL ...`, chụp đủ 84 ảnh lesson
+ 4 ảnh intro, kiểm tra console/404 **trước**, rồi mới FAIL ở gate OBS-01.

## 3. Kỳ vọng vs thực tế

| | Kỳ vọng | Thực tế |
|---|---|---|
| `.game-stage` ở 1024×768, 390×844 | ≤ 170px | 179.5–421.3px (39 tổ hợp) |
| Nút đáp án cuối khi chưa cuộn | `bottom ≤ viewport + 1` | **Đạt 84/84** (không có nút nào dưới fold) |
| Tràn ngang | `overflowX = false` | **Đạt 84/84** |
| Console / HTTP | 0 / 0 | **0 / 0** |

Số liệu tiêu biểu (seed deterministic `obs01-<id>`, riêng `b5` = `probe-b5-2`):

| Bài | 1024×768 | 390×844 | Ghi chú |
|---|---|---|---|
| `intro` | 179.5px ❌ | 168.1px ✅ | — |
| `b1` | 185.6px ❌ | 200.7px ❌ | `.mo-root` inline 148px |
| `b5` | 261.6px ❌ | 421.3px ❌ | đề xấu nhất (7 hoa/luống) |
| `b6` | 255.6px ❌ | 270.7px ❌ | — |
| `b20` | 104.0px ✅ | 109.7px ✅ | kart đã nén đúng |

`last.bottom` lớn nhất là 886/900 (`b5`, 1280×900) — vẫn nằm trọn viewport.
Vì vậy đây là lỗi **ngân sách chiều cao stage**, không phải lỗi "nút bị khuất".

## 4. Phân tích nguyên nhân (đã probe DOM, không đoán)

Khối CSS nén ở `css/games.css:1615–1695` **đã có mặt** trong lần chạy baseline
(file sửa lúc 15:12, log smoke lúc 15:31). Probe computed style trực tiếp cho thấy:

- `.game-stage` đã có `min-height: 104px` đúng như `games.css:616`
  → không còn lỗi ở bản thân stage.
- `b1`: `.mo-root` giữ **inline `min-height: 148px`** (nguồn `js/ui/games/kit.js:430`,
  thuộc shared kit root) cộng padding `26px + 6px` → cao 180px → stage **186px**.
  CSS nén hiện tại chỉ override `padding` của `.mo-root` (`games.css:1635`),
  **chưa override `min-height` inline đó**.
- `b5`: `.ac-scene` cao **256px** do `.ac-garden` / `.ac-bed` (mỗi luống 183px,
  `.ac-flowers` 132px) — nội dung luống hoa tự đẩy cao, không bị `min-height` kìm.
- `b20`: `.game-stage` đúng 104px, không có child vượt 130px → PASS.

→ **Hướng sửa (cho ui-programmer, QA không tự sửa app code)**: bổ sung override
`min-height: 0 !important` cho nhóm `*-root` trong `.screen.lesson.has-minigame .game-stage`
và kìm chiều cao luống hoa trên mobile/tablet-ngang, **giữ nguyên sàn 64px của ô bấm**
và không đụng `.choices`/`.choice` (bài học OBS-01 v1).

## 5. Bằng chứng

- Log: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-smoke.log`
  (39 dòng `LAYOUT-FAIL`, 84 dòng `LAYOUT`).
- Ảnh: `production/qa/screenshots/obs01-<lessonId>-<viewport>.png` (84 ảnh),
  `obs01-gameintro-<viewport>.png` (4 ảnh), `03a-game-intro.png`.
- Bảng đầy đủ 84 measurement: xem mục 4 của `production/qa/phase-c-qa-report.md`.

## 6. Tác động & gate

- Người dùng: 21 bài bị stage cao hơn thiết kế trên tablet-ngang/mobile; nút vẫn bấm
  được nhưng khoảng trống/cảnh quan sát bị ép (đặc biệt `b5` gấp ~2.5 lần ngân sách).
- Gate: **BLOCKING** cho Giai đoạn C. Không hand-off manual QA khi bug còn Open.
- Sau khi CSS land: chạy lại đúng lệnh mục 2; kỳ vọng `OBS-01: 0 failures / 84
  measurements` và dòng cuối `PASS — smoke test hoàn tất`. Nếu số failure giảm
  nhưng chưa về 0, cập nhật bug này với measurement mới thay vì mở bug mới.

## 7. Rerun sau báo cáo "xong 100%" của CSS agent (2026-11-22)

### 7.1. Kết quả: không thay đổi so với baseline

| Hạng mục | Baseline 15:31 | Rerun sau báo cáo CSS |
|---|---|---|
| Unit test | 117/117 PASS | **117/117 PASS** |
| Ảnh tải | 63/63 OK | **63/63 OK** |
| Console / HTTP | 0 / 0 | **0 / 0** |
| `LAYOUT` / `LAYOUT-FAIL` | 84 / 39 | **84 / 39** |
| `intro` 1024×768 / 390×844 | 179.5 / 168.1 | **179.5 / 168.1** |
| `b1` 1024×768 / 390×844 | 185.6 / 200.7 | **185.6 / 200.7** |
| `b5` 1024×768 / 390×844 | 261.6 / 421.3 | **261.6 / 421.3** |
| `b6` 1024×768 / 390×844 | 255.6 / 270.7 | **255.6 / 270.7** |
| `b19` 1024×768 / 390×844 | 201.6 / 198.3 | **201.6 / 198.3** |
| `b20` 1024×768 / 390×844 | 104.0 / 109.7 | **104.0 / 109.7** |

Log rerun: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-smoke-final.log`.
Vẫn FAIL: `FAIL — OBS-01 có 39 lỗi layout: ...` (danh sách bài/viewport đầy đủ
trong log và mục 6 của báo cáo QA).

### 7.2. Kiểm tra nguồn CSS

- `css/games.css` trong workspace: **1723 dòng, 63,100 bytes, mtime 15:12:06** —
  **không đổi** giữa baseline và rerun. Khối ADR-0003 bắt đầu dòng 697 đúng như
  CSS agent mô tả, tức đã có mặt khi baseline chạy.
- Chỉ có một bản CSS nguồn trong repo (`public/css/games.css` là artifact build cũ
  20,691 bytes từ 12:56, không được `index.html` nạp). Không có worktree nào khác.
→ Bản "xong 100%" đang được tính là bản QA đã đo ở baseline; chưa có thay đổi mới
nào land trong `D:\Kid Math\css\games.css`.

### 7.3. DOM probe — CSS có áp dụng, nhưng inline root thắng

Probe computed style trực tiếp (Chrome headless, cùng seed) cho thấy **khối nén đã
chạy**, chỉ là chưa đủ để đạt ≤170px:

| Bài / viewport | Rule nén đã áp dụng (bằng chứng) | Selector còn thắng | stage |
|---|---|---|---|
| `b1` 1024×768 | `.mo-field`: inline 152px → computed **112px/max 112px**; `.mo-root` padding inline `32px 10px 8px` → computed **`26px 8px 6px`** | `.mo-root` **inline `min-height: 148px`**, computed vẫn **148px** (nguồn `js/ui/games/kit.js:430`); CSS chỉ override padding | **186px** ❌ |
| `b6` 1024×768 / 390×844 | `.mp-board`: inline 176px → computed **112px/max 112px** | `.mp-root` inline `min-height: 148px` → computed **148px** | **256px / 271px** ❌ |
| `b19` 1024×768 / 390×844 | `.sp-range`: inline 280px → computed **128px/max 128px** | `.sp-root` inline `min-height: 148px` → computed **148px** | **202px / 198px** ❌ |
| `b5` 1024×768 / 390×844 | `.ac-scene` computed `min-height: 0px` (đúng rule nén) | **Không phải inline**: `.ac-garden` 183px / 327px, `.ac-bed` 183px / 194px, `.ac-flowers` 132px — nội dung luống hoa tự đẩy cao | **262px / 421px** ❌ |
| `intro` 1024×768 | — | `.mario-scene` 173px, padding **`34px 10px 6px`** (không nằm trong nhóm `*-root` được override) | **179.5px** ❌ |
| `b20` 1024×768 / 390×844 | stage `min-height` 104px / 109.72px | không có child vượt 130px | **104px / 110px** ✅ |

**Kết luận cho CSS agent**: các rule `min-height/max-height !important` trên play
surface và `padding !important` trên root đã có hiệu lực. Cái cần bổ sung là:
1. override **`min-height` inline của nhóm `*-root`** (`.mo-root`, `.mp-root`,
   `.sp-root`, … — nguồn chung `kit.js:430`), hiện computed vẫn 148px;
2. kìm nội dung `.ac-scene`/`.ac-garden`/`.ac-bed` trên mobile + tablet-ngang;
3. kiểm tra `.mario-scene` cho màn `intro` (padding 34px trên cùng).

Giữ nguyên sàn 64px của ô bấm; không đụng `.choices`/`.choice`, không dùng
`position: fixed|sticky`, không nén trực tiếp `.game-stage`. QA **không tự sửa app code**.

### 7.4. Vì sao self-audit của CSS agent vẫn "0 problem"

Tiêu chí tự audit là "0 problem, 0 undersized target, answer row in fold" — **không
phải** ngân sách `stage ≤ 170px` của OBS-01. Smoke của QA xác nhận riêng phần đó đều
đạt (84/84 `bottom ≤ viewport + 1`, 0 tràn ngang, ô bấm ≥64px). Hai tiêu chí không
xung đột nhưng **self-audit hiện tại không chứng minh được gate OBS-01 xanh**.
Đã chốt lại định nghĩa "xong" là **smoke gate xanh**, không phải self-audit riêng —
xem mục 8.

## 8. Fix & QA verification — CLOSED

### 8.1. Nguyên nhân gốc (đã probe DOM ở mục 7.3, không đoán)

1. `js/ui/games/kit.js:430` đặt **inline `min-height: 148px`** trên nhóm `*-root`
   (`.mo-root`, `.mp-root`, `.sp-root`, …). Rule nén cũ chỉ override `padding`/
   `max-height` của play surface, nên computed `min-height` vẫn 148px và đẩy stage.
2. `.ac-scene` / `.ac-garden` / `.ac-bed` (đặc biệt `b5`, 7 hoa/luống) tự đẩy cao
   từ nội dung luống hoa (`.ac-flowers` 132px, mỗi luống tới 183/327px).
3. `.mario-scene` ở màn `intro` có padding `34px 10px 6px`, không nằm trong nhóm
   `*-root` được override → intro 179.5px ở 1024×768.

### 8.2. Bản chất fix (CSS agent — QA không đụng app code)

**Append-only vào `css/games.css`**, không sửa JS, không đụng `.choices`/`.choice`,
không dùng `position: fixed|sticky`, không nén trực tiếp `.game-stage`:

- thêm `min-height: 0 !important` cho nhóm `*-root` trong
  `.screen.lesson.has-minigame .game-stage` (triệt inline 148px từ `kit.js:430`);
- nén `.mario-scene` (intro), `.ac-scene`, `.ac-garden`, `.ac-bed` (luống hoa);
- giữ nguyên sàn 64px của ô bấm và sàn 104px của stage.

`js/ui/games/splatoon.js` do user tự sửa — QA **không revert, không chỉnh sửa**.

### 8.3. Before → After (QA tự đo lại, px)

| Bài | Baseline 15:31 · 1024×768 / 390×844 | Rerun trung gian | **FINAL** | Kết quả |
|---|---|---|---|---|
| `intro` | 179.5 / 168.1 ❌✅ | 179.5 / 168.1 | **165.5 / 154.1** | ✅✅ |
| `b1` | 185.6 / 200.7 ❌❌ | 185.6 / 200.7 | **166.0 / 166.0** | ✅✅ |
| `b5` | 261.6 / 421.3 ❌❌ | 261.6 / 421.3 | **138.0 / 138.0** | ✅✅ |
| `b6` | 255.6 / 270.7 ❌❌ | 255.6 / 270.7 | **166.0 / 166.0** | ✅✅ |
| `b19` | 201.6 / 198.3 ❌❌ | 201.6 / 198.3 | **166.0 / 166.0** | ✅✅ |
| `b20` | 104.0 / 109.7 ✅✅ | 104.0 / 109.7 | **104.0 / 109.7** | ✅✅ (giữ nguyên) |

Trên toàn bộ 84 measurement: **cao nhất 166.0px ≤ 170px**, thấp nhất 104px;
mọi `last.bottom ≤ viewport + 1`, `overflowX=False`.

### 8.4. Log & xác nhận QA rerun

- **Log final**: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-final-gate.log`
  (84 dòng `LAYOUT`, **0** dòng `LAYOUT-FAIL`, exit code **0**).
- Log self-audit của CSS agent (tham khảo, **không** thay cho QA rerun):
  `C:\Users\2103\AppData\Local\Temp\opencode\smoke_after_fix.log`.
- Log baseline / trung gian (giữ làm bằng chứng trước): `phase-c-smoke.log`,
  `phase-c-smoke-final.log` — cả hai 39/84 fail.
- Dòng tóm tắt mới từ script (sửa ở `tools/smoke_test.py` ~1214, đã compile OK,
  **không đổi logic gate**, `EXPECTED_UNIT_TESTS = 117` giữ nguyên):

```
ASSET load: 63/63 ảnh tải OK
Unit test: 117 PASSED / 0 FAILED (tổng 117)
OBS-01: 0 failures / 84 measurements — tất cả bài đạt ngân sách chiều cao stage
CONSOLE/HTTP: 0 lỗi console, 0 response >=400 (0 raw)
PASS — smoke test hoàn tất
```

- **Verify bởi QA Lead**: tự chạy lại `python tools/smoke_test.py` với server
  `python -m http.server 8765 --bind 127.0.0.1`, server đã dừng sau khi chạy.
  Không chỉ tin báo cáo self-audit của CSS agent. Ảnh evidence 84 lesson + 4 intro
  đã được chụp lại trong `production/qa/screenshots/`.

### 8.5. Điều kiện đóng

`OBS-01: 0 failures / 84 measurements` ✅ · unit 117/117 ✅ · ảnh 63/63 ✅ ·
0 console/404 ✅ · dòng cuối `PASS` ✅ · BUG-001 **Resolved/Closed**.
Rủi ro còn lại (không chặn gate tự động): chưa có manual playtest với trẻ em,
chưa có sign-off Visual/Feel của lead cho redesign 21 bài.
