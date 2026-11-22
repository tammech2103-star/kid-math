# Báo cáo QA — Giai đoạn C: redesign 21 bài + màn intro + sprite runtime

- **Ngày**: 2026-11-22 (baseline 15:31 · rerun trung gian · **FINAL GATE PASS** — log `phase-c-final-gate.log`)
- **Người lập**: QA Lead
- **Phạm vi**: gói test Giai đoạn C (unit mới, smoke mở rộng, baseline evidence)
- **Căn cứ**: `production/qa/qa-plan-minigames-dot1.md`, ADR-0003
  (per-game identity & sprite runtime), quick-spec redesign 21 bài
- **Kết luận**: **PASS — FINAL GATE** (QA tự chạy lại sau fix CSS, không chỉ tin
  self-audit): `OBS-01: 0 failures / 84 measurements`, unit **117/117 PASS**,
  63/63 ảnh, 0 console error, 0 HTTP ≥400, dòng cuối **PASS**. BUG-001 đã
  **Resolved/Closed**. Baseline 15:31 (39/84) và rerun trung gian được giữ lại
  làm bằng chứng trước/sau ở mục 1.1 và mục 6.

---

## FINAL GATE — PASS

**Người chạy**: QA Lead (rerun thật bằng `tools/smoke_test.py`, script đã sửa để luôn
in dòng tóm tắt OBS-01). **Log**: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-final-gate.log`
(84 dòng `LAYOUT`, **0** dòng `LAYOUT-FAIL`, exit code **0**).

```
ASSET HD: 21 file, lớn nhất 17864 bytes / budget 400000
ASSET cover: 21 file, lớn nhất 8478 bytes / budget 400000
ASSET sprite: 21 file, lớn nhất 43916 bytes / budget 180000
ASSET load: 63/63 ảnh tải OK
Unit test: 117 PASSED / 0 FAILED (tổng 117)
OBS-01: 0 failures / 84 measurements — tất cả bài đạt ngân sách chiều cao stage
CONSOLE/HTTP: 0 lỗi console, 0 response >=400 (0 raw)
PASS — smoke test hoàn tất
```

### Before → After (stage `.game-stage`, px)

| Bài | Baseline 15:31 · 1024×768 / 390×844 | Rerun trung gian | **FINAL** | Kết quả |
|---|---|---|---|---|
| `intro` | 179.5 / 168.1 ❌✅ | 179.5 / 168.1 | **165.5 / 154.1** | ✅✅ |
| `b1` | 185.6 / 200.7 ❌❌ | 185.6 / 200.7 | **166.0 / 166.0** | ✅✅ |
| `b5` | 261.6 / 421.3 ❌❌ | 261.6 / 421.3 | **138.0 / 138.0** | ✅✅ |
| `b6` | 255.6 / 270.7 ❌❌ | 255.6 / 270.7 | **166.0 / 166.0** | ✅✅ |
| `b19` | 201.6 / 198.3 ❌❌ | 201.6 / 198.3 | **166.0 / 166.0** | ✅✅ |
| `b20` | 104.0 / 109.7 ✅✅ | 104.0 / 109.7 | **104.0 / 109.7** | ✅✅ (giữ nguyên) |

Trên toàn bộ 84 measurement: **cao nhất 166.0px ≤ 170px**, thấp nhất 104px.
Mọi `last.bottom ≤ viewport + 1`, `overflowX=False`. Ảnh evidence được chụp lại
đầy đủ 84 lesson + 4 intro trong `production/qa/screenshots/`.

### Thay đổi tool (duy nhất được phép)

`tools/smoke_test.py` ~dòng 1214: dòng `OBS-01: {n} failures / {m} measurements`
giờ **luôn được in**; thông điệp nhánh fail giữ nguyên, nhánh 0 fail thêm chuỗi
"tất cả bài đạt ngân sách chiều cao stage". **Không đổi logic gate** (check cuối
vẫn `not layout_failures`), **không đổi `EXPECTED_UNIT_TESTS = 117`** — đã kiểm tra
đếm `T.test(` = 117 và smoke báo 117/117 sau thay đổi.

### Nguồn fix (CSS agent, QA không đụng)

Chỉ append vào `css/games.css`: root `min-height: 0 !important` cho nhóm `*-root`
(triệt inline `148px` từ `js/ui/games/kit.js:430`) + nén `.mario-scene`,
`.ac-scene`, `.ac-garden`, `.ac-bed`. Không sửa JS, không đụng `.choices`/`.choice`.
Xem chi tiết [BUG-001](bugs/BUG-001-OBS-01-stage-height.md) mục 8.

---

## 1.1. Rerun trung gian sau báo cáo "xong 100%" của CSS agent (FAIL — đã lưu làm bằng chứng)

Yêu cầu: chạy lại ngay smoke với CSS hiện tại. Kết quả: **không có cải thiện**.

| Hạng mục | Baseline (15:31) | Rerun (sau báo cáo CSS) | Kết luận |
|---|---|---|---|
| Unit test | 117/117 PASS | **117/117 PASS** | `EXPECTED_UNIT_TESTS=117` vẫn khớp (`T.test(` count = 117) ✅ |
| Ảnh HD/cover/sprite | 63 file, load 63/63 | **63 file, load 63/63** | ✅ |
| Console / HTTP ≥400 | 0 / 0 | **0 / 0** | ✅ |
| OBS-01 | 39 failures / 84 measurements | **39 failures / 84 measurements** | ❌ không đổi |
| FAIL dòng cuối | `FAIL — OBS-01 có 39 lỗi layout` | **`FAIL — OBS-01 có 39 lỗi layout`** | ❌ |
| `b1` 1024×768 / 390×844 | 185.6 / 200.7 | **185.6 / 200.7** | ❌ y hệt |
| `b5` 1024×768 / 390×844 | 261.6 / 421.3 | **261.6 / 421.3** | ❌ y hệt |
| `b20` 1024×768 / 390×844 | 104.0 / 109.7 | **104.0 / 109.7** | ✅ y hệt |

Log rerun: `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-smoke-final.log`
(84 `LAYOUT`, 39 `LAYOUT-FAIL`). Ảnh evidence được chụp đè lại đúng bộ 84+4.

**Kiểm tra nguồn CSS**: `css/games.css` = 1723 dòng / 63,100 bytes / mtime **15:12:06**,
không đổi giữa hai lần chạy; khối ADR-0003 từ dòng 697 (1027 dòng) đã có trong baseline.
Không có worktree nào khác; bản cũ trong `public/css/games.css` (12:56, 20,691 B)
không được `index.html` nạp. → Chưa có thay đổi CSS mới land trong workspace.

**DOM probe** (chi tiết mục 7.3 của BUG-001): tài liệu CSS **đang áp dụng** —
`.mo-field` 152px→112px, `.sp-range` 280px→128px, root padding →`26px 8px 6px`.
Nhưng `.mo-root`/`.mp-root`/`.sp-root` vẫn giữ **inline `min-height: 148px`**
(computed 148px, nguồn `js/ui/games/kit.js:430`) và `.ac-scene` bị đẩy bởi nội dung
luống hoa (327px trên mobile). Đó là phần cần sửa tiếp, không phải CSS chưa được nạp.

Self-audit "0 problem / 0 undersized target / answer row in fold" của CSS agent dùng
tiêu chí khác OBS-01 (≤170px). Smoke xác nhận riêng phần đó đạt 84/84 — nhưng không
đủ để gate xanh. Không delegate `qa-tester` ở bước này theo chỉ đạo.

---

## 1. Kết quả tổng hợp

| Hạng mục | Kết quả | Gate |
|---|---|---|
| Unit test trình duyệt `tests/test-runner.html` | **117 PASSED / 0 FAILED** (tổng 117) | BLOCKING ✅ |
| Ảnh HD / cover / sprite | 21 + 21 + 21 = **63 file, đúng tên 21 lessonId** | ADVISORY ✅ |
| Ngân sách ảnh | HD max 17,864 B / 400,000 · cover max 8,478 B / 400,000 · sprite max 43,916 B / 180,000 | ADVISORY ✅ |
| Tải ảnh thật trong browser | **63/63 `naturalWidth > 0`** | ADVISORY ✅ |
| Luồng `home → gameIntro → lesson` + flag `km_game_intro_v1_<id>` | **PASS** (xem mục 5) | BLOCKING ✅ |
| 21 bài đều có đúng 1 `.game-stage` + sprite | **PASS 21/21** | BLOCKING ✅ |
| Console / HTTP ≥400 | **0 / 0** (0 raw) | BLOCKING ✅ |
| Regression cũ (race, puzzle, replay, parent gate, reduced-motion, `file://`, keyboard, focus) | **PASS** (smoke chạy xuyên suốt trước gate cuối) | BLOCKING ✅ |
| OBS-01 — 21 bài × 4 viewport, ngân sách stage ≤170px | **39 failures / 84 measurements** | BLOCKING ❌ |
| Ảnh evidence | 84 lesson + 4 intro + 1 intro-flow = **89 ảnh mới** | ADVISORY ✅ |

---

## 2. Phân loại story & evidence gate (shift-left)

| Story / thành phần | Loại | Evidence bắt buộc | Gate | Trạng thái |
|---|---|---|---|---|
| GameMap v2: 21 style/layout/variant/motionMs, palette 63 hex, introText <60 | Config/Data + Logic | `tests/unit/game-map-v2.test.js` (10 test) | BLOCKING | ✅ PASS |
| Màn intro: flag session, render cover, start/home/Esc, guard | Integration | `tests/unit/game-intro.test.js` (7 test) + smoke luồng | BLOCKING | ✅ PASS |
| Sprite runtime 4×4: rAF chung, reduced-motion, freeze/resume, destroy | Logic | `tests/unit/sprite.test.js` (7 test) | BLOCKING | ✅ PASS |
| Splatoon 4 đáp án → 4 target riêng ≥64px (user tự sửa `splatoon.js`) | Integration | `tests/unit/splatoon.test.js` (1 regression) | BLOCKING | ✅ PASS |
| 21 bài mount stage + asset thật + flag intro | Integration | `tools/smoke_test.py` | BLOCKING | ✅ PASS |
| OBS-01 nén stage trên 1024×768 / 390×844 | UI | 84 measurement + screenshot | BLOCKING | ❌ BUG-001 |

Ghi chú: `game-intro` thực tế có **7 test** (tách thêm test guard), không phải 6 như
dự kiến ban đầu → tổng số test đếm được là **117**, đã cập nhật vào
`EXPECTED_UNIT_TESTS`.

---

## 3. Unit test

```
Unit test: 117 PASSED / 0 FAILED (tổng 117)
```

| Nhóm | Số test | Nguồn |
|---|---|---|
| Cũ (Đợt 1 trở về trước) | 92 | các `tests/unit/*.test.js` cũ |
| GameMap v2 | 10 | `tests/unit/game-map-v2.test.js` |
| GameIntro | 7 | `tests/unit/game-intro.test.js` |
| Sprite runtime | 7 | `tests/unit/sprite.test.js` |
| Splatoon regression | 1 | `tests/unit/splatoon.test.js` |
| **Tổng** | **117** | |

`tests/test-runner.html` đã thêm `<base href="../">` để ảnh `Asset/...` tải đúng từ
root dự án (trước đó test runner ở `/tests/` phát 404 `/tests/Asset/...`), cài rAF stub
trước khi nạp `sprite.js`, và nạp `components.js` trước `game-intro.js`.

---

## 4. Asset & console

```
ASSET HD: 21 file, lớn nhất 17864 bytes / budget 400000
ASSET cover: 21 file, lớn nhất 8478 bytes / budget 400000
ASSET sprite: 21 file, lớn nhất 43916 bytes / budget 180000
ASSET load: 63/63 ảnh tải OK
CONSOLE/HTTP: 0 lỗi console, 0 response >=400 (0 raw)
```

Gate được sắp có chủ đích: console/404 được kiểm tra **trước** gate layout, nên baseline
FAIL vẫn có bằng chứng sạch về console và tài nguyên.

---

## 5. Luồng intro & kiểm tra stage 21 bài

- Từ trang chủ, nút "Học tiếp" mở `.game-intro[data-lesson-id="intro"]` (không vào
  thẳng lesson), chụp `03a-game-intro.png`.
- Bấm "Bắt đầu" → vào màn `lesson`, sessionStorage có `km_game_intro_v1_intro = "1"`.
- 4 viewport đều lặp lại luồng trên, chụp `obs01-gameintro-<viewport>.png`.
- 21 bài `preview: true` đều có **đúng 1** `.game-stage` kèm `data-game-id` và canvas
  sprite; `.visual-slot .visual` không render cạnh minigame (OBS-01 v1 giữ nguyên).

---

## 6. OBS-01 — 84 measurement (21 bài × 4 viewport)

Seed deterministic: `obs01-<lessonId>`, riêng `b5` = `probe-b5-2` (đề xấu nhất 7
hoa/luống). `stage` là `getBoundingClientRect().height`; `bottom` là đáy nút `.choice`
cuối **khi chưa cuộn**. Ngân sách `>170px` chỉ flag ở `1024×768` và `390×844`.
`overflowX=False` và `bottom ≤ viewport + 1` ở **toàn bộ 84 tổ hợp**.

### 6.1. 1280×900 — không flag (0 fail)

| Bài | stage | choices | bottom/viewport | Bài | stage | choices | bottom/viewport |
|---|---|---|---|---|---|---|---|
| intro | 175.5 | 3 | 763/900 | b11 | 193.6 | 3 | 782/900 |
| b1 | 185.6 | 3 | 774/900 | b12 | 201.6 | 3 | 792/900 |
| b2 | 193.6 | 3 | 781/900 | b13 | 201.6 | 3 | 792/900 |
| b3 | 185.6 | 3 | 773/900 | b14 | 201.6 | 2 | 792/900 |
| b4 | 193.6 | 3 | 781/900 | b15 | 185.6 | 4 | 773/900 |
| b5 | **347.6** | 3 | 886/900 | b16 | 185.6 | 4 | 773/900 |
| b6 | 255.6 | 3 | 846/900 | b17 | 201.6 | 3 | 792/900 |
| b7 | 193.6 | 3 | 781/900 | b18 | 193.6 | 3 | 781/900 |
| b8 | 201.6 | 3 | 792/900 | b19 | 201.6 | 4 | 792/900 |
| b9 | 201.6 | 3 | 792/900 | b20 | 117.0 | 3 | 704/900 |
| b10 | 193.6 | 3 | 781/900 | | | | |

### 6.2. 1024×768 — flag: 20/21 FAIL (chỉ `b20` đạt)

| Bài | stage | Kết quả | Bài | stage | Kết quả |
|---|---|---|---|---|---|
| intro | 179.5 | ❌ | b11 | 193.6 | ❌ |
| b1 | 185.6 | ❌ | b12 | 201.6 | ❌ |
| b2 | 193.6 | ❌ | b13 | 201.6 | ❌ |
| b3 | 185.6 | ❌ | b14 | 201.6 | ❌ |
| b4 | 193.6 | ❌ | b15 | 185.6 | ❌ |
| b5 | **261.6** | ❌ | b16 | 185.6 | ❌ |
| b6 | 255.6 | ❌ | b17 | 201.6 | ❌ |
| b7 | 193.6 | ❌ | b18 | 193.6 | ❌ |
| b8 | 201.6 | ❌ | b19 | 201.6 | ❌ |
| b9 | 201.6 | ❌ | b20 | **104.0** | ✅ |
| b10 | 193.6 | ❌ | | | |

`bottom` dao động 638–754 / 768 — tất cả nằm trọn màn hình.

### 6.3. 768×1024 — không flag (0 fail)

| Bài | stage | bottom | Bài | stage | bottom |
|---|---|---|---|---|---|
| intro | 178.5 | 760 | b11 | 193.6 | 775 |
| b1 | 185.6 | 767 | b12 | 201.6 | 783 |
| b2 | 193.6 | 775 | b13 | 201.6 | 783 |
| b3 | 185.6 | 767 | b14 | 201.6 | 783 |
| b4 | 193.6 | 775 | b15 | 185.6 | 767 |
| b5 | **359.1** | 943 | b16 | 185.6 | 767 |
| b6 | 255.6 | 837 | b17 | 201.6 | 783 |
| b7 | 193.6 | 775 | b18 | 193.6 | 775 |
| b8 | 201.6 | 783 | b19 | 201.6 | 783 |
| b9 | 201.6 | 783 | b20 | 133.1 | 717 |
| b10 | 193.6 | 775 | | | |

### 6.4. 390×844 — flag: 19/21 FAIL (`intro`, `b20` đạt)

| Bài | stage | Kết quả | Bài | stage | Kết quả |
|---|---|---|---|---|---|
| intro | 168.1 | ✅ | b11 | 208.7 | ❌ |
| b1 | 200.7 | ❌ | b12 | 216.7 | ❌ |
| b2 | 208.7 | ❌ | b13 | 216.7 | ❌ |
| b3 | 200.7 | ❌ | b14 | 216.7 | ❌ |
| b4 | 190.3 | ❌ | b15 | 182.3 | ❌ |
| b5 | **421.3** | ❌ | b16 | 200.7 | ❌ |
| b6 | 270.7 | ❌ | b17 | 216.7 | ❌ |
| b7 | 208.7 | ❌ | b18 | 190.3 | ❌ |
| b8 | 216.7 | ❌ | b19 | 198.3 | ❌ |
| b9 | 216.7 | ❌ | b20 | 109.7 | ✅ |
| b10 | 208.7 | ❌ | | | |

`bottom` lớn nhất 830 / 844 — vẫn không có nút nào dưới fold.

### 6.5. Nguyên nhân đã xác nhận bằng DOM probe

Khối CSS nén `css/games.css:1615–1695` đã có mặt lúc baseline chạy (file sửa 15:12,
log 15:31). `.game-stage` đã có `min-height: 104px`; cái đẩy cao là **con bên trong**:

- `b1`: `.mo-root` giữ inline `min-height: 148px` (từ `js/ui/games/kit.js:430`) +
  padding 26px/6px → 180px → stage 186px. CSS hiện chỉ override `padding`.
- `b5`: `.ac-scene` 256px do `.ac-garden`/`.ac-bed` 183px và `.ac-flowers` 132px.
- `b20`: không có child vượt 130px → stage đúng 104px.

Chi tiết trong [BUG-001](bugs/BUG-001-OBS-01-stage-height.md). QA **không sửa app code**.

---

## 7. Evidence

| Nhóm | Tệp | Số lượng |
|---|---|---|
| Lesson OBS-01 | `production/qa/screenshots/obs01-<lessonId>-1280x900.png` | 21 |
| | `...obs01-<lessonId>-1024x768.png` | 21 |
| | `...obs01-<lessonId>-768x1024.png` | 21 |
| | `...obs01-<lessonId>-390x844.png` | 21 |
| Intro riêng | `obs01-gameintro-1280x900.png`, `-1024x768.png`, `-768x1024.png`, `-390x844.png` | 4 |
| Luồng home → intro | `03a-game-intro.png` | 1 |
| Log thô | `C:\Users\2103\AppData\Local\Temp\opencode\phase-c-smoke.log` | 84 `LAYOUT` + 39 `LAYOUT-FAIL` |

---

## 8. Bug & gate verdict

| ID | Tiêu đề | Severity | Priority | Trạng thái |
|---|---|---|---|---|
| [BUG-001](bugs/BUG-001-OBS-01-stage-height.md) | `.game-stage` >170px ở 1024×768 & 390×844 | S2 | P1 | **Resolved/Closed** — QA rerun xác nhận 0/84 fail, max 166.0px |

**Verdict: PASS — ready for manual QA hand-off.** Sau khi CSS agent append override
`min-height: 0 !important` cho `*-root` + nén `.mario-scene`/`.ac-scene`/`.ac-garden`/
`.ac-bed`, QA đã tự rerun gate thật (không chỉ tin self-audit): `OBS-01: 0 failures /
84 measurements`, 117/117 unit, 63/63 ảnh, 0 console/404, exit code 0, dòng cuối
`PASS — smoke test hoàn tất`. BUG-001 đã đóng kèm số đo before→after.

### Lệnh tái lập gate (đã chạy PASS)

```powershell
cd "D:\Kid Math"
$log = 'C:\Users\2103\AppData\Local\Temp\opencode\phase-c-final-gate.log'
$p = Start-Process -FilePath python -ArgumentList @('-m','http.server','8765','--bind','127.0.0.1') -WorkingDirectory (Get-Location) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try { python tools/smoke_test.py *> $log } finally { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
```

Tiêu chí PASS — **đều đã đạt**: `Unit test: 117 PASSED`, `CONSOLE/HTTP: 0 ...`,
`OBS-01: 0 failures / 84 measurements`, dòng cuối `PASS — smoke test hoàn tất`.

---

## 9. Phạm vi & giới hạn

- Không đụng `js/`, `css/`, `index.html`, `Asset/`, `public/`,
  `production/session-state/active.md`. Riêng `js/ui/games/splatoon.js` do user tự sửa,
  QA **không revert và không chỉnh sửa**.
- Không commit. Working tree Giai đoạn C giữ nguyên để reviewer kiểm tra.
- Rủi ro phối hợp (đã resolve): trước đây CSS agent báo "xong 100%" nhưng file nguồn
  không đổi và self-audit không đo OBS-01 ≤170px — rerun trung gian vẫn 39/84.
  Sau fix append-only, QA đã tự rerun: **0/84 fail**, gate xanh; định nghĩa "xong"
  đã chốt là **smoke gate xanh**, không phải self-audit riêng. BUG-001 Closed.
- **Rủi ro còn lại (không chặn gate tự động)**: chưa có playtest trẻ em thật cho
  redesign 21 bài. Báo cáo này là QA automation + baseline evidence/final gate,
  **chưa thay thế sign-off Visual/Feel của lead**; cần lên lịch manual QA với trẻ em
  trước khi coi redesign hoàn tất về mặt trải nghiệm.
- Máy test không có `node` trên PATH; JS parse kiểm tra bằng quickjs, chạy test thật
  trong Chrome qua `tests/test-runner.html`.
