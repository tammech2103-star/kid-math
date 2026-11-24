# Quick Design Spec: Intro Platformer — "Bé Khám Phá" + Question-Gate

**Type**: Thay thế game module `mario-bros` (bài `intro`) từ quiz đếm sang platformer gốc với question-gate.
**Scope**: Chỉ bài `intro`/`gameId: 'mario-bros'`. 20 bài khác nguyên vẹn. Giữ nguyên Question, LessonSession, Curriculum, Tuning, TTS, localStorage, toán học.
**Date**: 2026-11-23
**Status**: Draft — chờ duyệt
**Ranh giới bản quyền**: Nhân vật "Bé Khám Phá", art, map, SFX đều tự sinh qua pipeline 5 skill. Không copy/sao chép bất kỳ tài sản Nintendo nào. "Cảm hứng: Super Mario Bros." chỉ ghi credit, không dùng asset gốc.

## 1. Tổng quan

Bài `intro` ("Bé Thợ đếm trái cây" → đổi tên "Bé Khám Phá") trở thành một **platformer 2D đơn giản** lấy cảm hứng từ thể loại platformer kinh điển. Nhân vật "Bé Khám Phá" đi, nhảy trên map tile-based; gặp **cửa tri thức** (question-gate) thì màn hình bị khóa bởi modal overlay chứa câu hỏi toán. Phải trả lời đúng mới được tiếp tục; sai → hint + respawn tại checkpoint trước cửa.

**Cơ chế toán học không đổi**: câu hỏi vẫn do `Questions.forLesson()` sinh, `LessonSession` vẫn là nguồn chân lý, shell vẫn gọi `session.answer(value)` và module vẫn báo qua `km:answer` CustomEvent trên `options.mount`.

## 2. Quyết định đã chốt với người dùng (2026-11-23)

1. **B** — Platformer gốc với question-gate (không chỉ gate trong quiz).
2. Nhân vật mới: **"Bé Khám Phá"** (không dùng Bé Thợ).
3. Điều khiển: **phím mũi tên** (← → di chuyển, ↑/Space nhảy) + **nút ảo chạm** (D-pad + Jump) ≥64px.
4. Question-gate: **modal overlay khóa màn hình** (không thể tắt, phải trả lời đúng).
5. Sai nhiều lần → **hint** + respawn checkpoint.

## 3. Nhân vật: Bé Khám Phá

- **Tên**: Bé Khám Phá
- **Ngoại hình**: trẻ em phiêu lưu, mũ khám phá (mũ thám hiểm với đèn pin nhỏ), áo khoác nhẹ, giày đi rừng, ba lô nhỏ. Tông màu ấm (cam/vàng/xanh lá) để khác Bé Thợ (xanh dương/cam).
- **Animation states** (sprite sheet, mỗi state 4–6 frame):
  - `idle` — đứng yên, thở nhẹ
  - `run` — chạy (4 frame)
  - `jump` — nhảy (2 frame: lên + đỉnh)
  - `fall` — rơi (2 frame)
  - `hurt` — bị va chạm (2 frame, nháy)
  - `celebrate` — vui mừng (3 frame)
- **Kích thước**: 48×64 px (sprite), hitbox 32×48 px (AABB).
- **Art**: sinh qua pipeline vex/kiln/loom/chirp (SVG/PNG spritesheet). Tạm thời dùng hình chữ nhật màu trong prototype.

## 4. Điều khiển

### Desktop (phím)
| Phím | Hành động |
|------|-----------|
| ← / A | Di chuyển trái |
| → / D | Di chuyển phải |
| ↑ / Space / W | Nhảy |
| R | Đọc lại đề (TTS) |
| Esc | Về nhà |

### Touch (nút ảo)
- **D-pad trái**: nút ← và → (mỗi ≥64×64px, cố định góc dưới-trái)
- **Nút Jump**: ≥64×64px, góc dưới-phải
- Nút ảo chỉ hiện trên touch device (`@media (pointer: coarse)` hoặc detect touch)
- Nút ảo có `:active` feedback (scale 0.92) và `aria-label`

### Reduced motion
- `.is-reduced`: tắt animation sprite (chỉ frame idle), tắt screen shake, tắt particle.
- Physics vẫn chạy bình thường (gravity, jump) — chỉ tắt hiệu ứng thị giác.

## 5. Physics (đơn giản)

| Thông số | Giá trị | Ghi chú |
|----------|---------|---------|
| Gravity | 1200 px/s² | Kéo xuống liên tục |
| Move speed | 180 px/s | Không inertia (bấm → đi ngay, thả → dừng ngay) |
| Jump velocity | -420 px/s | Cố định chiều cao, không variable jump |
| Max fall speed | 600 px/s | Terminal velocity |
| Coyote time | 80 ms | Cho phép nhảy briefly sau khi rời đất |
| Jump buffer | 100 ms | Nhấn trước khi chạm đất → nhảy ngay khi chạm |

**Collision**: AABB character vs tilemap. Phân tách trục X rồi Y (resolve X trước, rồi Y). One-way platform: nhảy xuyên lên, đứng được từ trên (kiểm tra velocity.y > 0 và feet trên platform).

## 6. Map / Level

### Cấu trúc tilemap
- **Grid**: 32×32 px mỗi tile.
- **Map size**: 40×15 tiles (1280×480 px) cho bài intro.
- **Layers**: ground, platforms, hazards, collectibles, gates, exit.
- **Tiles**:
  - `0` = empty (sky)
  - `1` = solid ground (brick)
  - `2` = one-way platform
  - `3` = hazard (pit/spike) → respawn checkpoint
  - `4` = collectible (coin/fruit) → +1 điểm, remove tile
  - `5` = question-gate (door) → trigger modal
  - `6` = exit (flag/star) → hoàn thành bài

### Map layout (bài intro, 40×15)
```
Row 0-2:   sky (empty)
Row 3-5:   floating platforms (one-way, scattered)
Row 6-8:   ground with gaps (pits)
Row 9-11:  platforms at various heights
Row 12-14: ground + hazards + gate + exit
```

Chi tiết layout sẽ được xác định khi code (dùng array 2D).

### Spawn & checkpoint
- Spawn point: tile (2, 12) — góc dưới-trái.
- Checkpoint: trước mỗi question-gate (lưu vị trí spawn mới).
- Respawn: teleport về checkpoint, reset velocity, trừ 0 sao (không phạt sao).

## 7. Question-Gate (modal overlay)

### Trigger
- Nhân vật chạm tile `5` (question-gate) → pause game loop (freeze physics), hiện modal.
- Modal khóa input: không thể di chuyển/nhảy cho đến khi trả lời.

### Modal UI
- Overlay toàn màn hình, nền mờ (`rgba(0,0,0,0.6)`).
- Card trung tâm: câu hỏi (text + TTS), đáp án (2–4 nút ≥64px), nút "Nghe lại".
- Nút đáp án: grid 2 cột (touch) hoặc hàng ngang (desktop).
- `aria-live`, focus trap (Tab chỉ trong modal).

### Answer flow
- Chạm đáp án → dispatch `km:answer` (giữ nguyên contract).
- Shell gọi `session.answer(value)`:
  - **Đúng**: modal đóng, gate tile biến mất (hoặc mở), nhân vật đi tiếp, `onCorrect` + sao + confetti.
  - **Sai**: hiện hint "Thử lại nhé!" (hoặc "Bé đếm lại nhé!"), modal vẫn mở, có thể thử lại. Sau 3 lần sai → hint cụ thể hơn ("Bé đếm lại từ đầu nhé!").
- Modal không thể đóng bằng Esc/backdrop click — phải trả lời đúng.

### Integration với shell
- Module vẫn trả `{ render, onWrong, onCorrect, celebrate, destroy, handleKey }`.
- `render(question)`: load question vào gate hiện tại (gate tile đang chờ).
- `onWrong(choice)`: hiện hint trong modal, tăng counter sai.
- `onCorrect(result)`: đóng modal, mở gate, gọi `celebrate()`.
- `handleKey(key)`: trong modal, phím 1–9 chọn đáp án; ngoài modal, phím điều khiển game.

## 8. Camera

- **Follow player**: camera center theo player X, clamp trong map bounds.
- **Dead zone**: ±80px horizontal (player di chuyển trong dead zone → camera không động).
- **Vertical**: camera cố định Y (map nhỏ, không scroll vertical).
- **Smooth**: lerp factor 0.15 per frame (tôn trọng reduced-motion → snap ngay lập tức).

## 9. Collectibles & Scoring

- Collectible (tile `4`): chạm → +1 điểm, tile biến mất, SFX "ting", particle nhỏ.
- Điểm collectible **không** ảnh hưởng toán học (toán vẫn qua `km:answer`).
- Exit (tile `6`): chạm → hoàn thành bài (gọi finish qua shell).
- Sao: first-try correct → +1 sao (giữ nguyên logic shell).

## 10. Audio

- `audio.tap()` khi chạm nút/đáp án.
- `audio.correct()` / `audio.wrong()` / `audio.star()` (shell gọi).
- SFX mới: jump, land, collect coin, gate open, hazard hit — sinh qua chirp pipeline hoặc dùng tone đơn giản.
- TTS: đọc câu hỏi khi gate mở (shell gọi `speakCurrent`).

## 11. UI Layout

```
┌─────────────────────────────────────────────┐
│ [←] MỞ ĐẦU · Tiết học đầu tiên  [🔊][🎵] │  ← header (shell)
│ Câu 1/5    ⭐ 0                              │  ← progress (shell)
│ ┌─────────────────────────────────────────┐ │
│ │  Question text: "Có mấy quả chuối?"      │ │  ← question card (shell)
│ │                                         │ │
│ │  ┌───────────────────────────────────┐   │ │
│ │  │     GAME VIEWPORT (canvas/div)    │   │ │  ← mount (game)
│ │  │   [character]  [platforms]        │   │ │
│ │  │   [coins] [gate] [exit]           │   │ │
│ │  └───────────────────────────────────┘   │ │
│ │                                         │ │
│ │  [←] [→]              [JUMP]            │   │  ← virtual buttons (touch only)
│ └─────────────────────────────────────────┘ │
│ Chạm phím mũi tên để đi, ↑ để nhảy         │  ← input hint (shell)
└─────────────────────────────────────────────┘
```

- Game viewport: `position: relative`, `overflow: hidden`, background = pipe-park-gameplay-bg.svg.
- World container: `position: absolute`, transform translateX for camera.
- Tiles: div elements with CSS classes (`mp-tile-ground`, `mp-tile-platform`, etc.) hoặc canvas. Prototype dùng div; production có thể chuyển canvas nếu performance cần.

## 12. Tech Stack & Constraints

- **Rendering**: DOM-based (div + CSS transform) cho prototype; canvas nếu cần.
- **Game loop**: `requestAnimationFrame` với delta time. Cleanup trong `destroy()`.
- **ES5-ish**: `var`, functions, no arrow/let/const/template literals. `KM.*` namespace.
- **Offline**: không fetch runtime asset ngoài. Sprite sheet load từ `Asset/` (local).
- **Touch targets**: ≥64px (nút ảo, đáp án trong modal).
- **Reduced motion**: `.is-reduced` class, tắt animation/particle/shake.
- **Keys**: 1–9 (đáp án trong modal), R (TTS), Esc (home), ← → ↑ (game). Shell xử lý Esc/R.
- **localStorage**: không thay đổi (progress, settings).
- **Accessibility**: modal có focus trap, `aria-live` cho counter, `aria-label` cho nút ảo.

## 13. File Changes (dự kiến)

| File | Thay đổi |
|------|----------|
| `js/ui/games/mario-bros.js` | Viết lại hoàn toàn thành platformer + question-gate |
| `css/games.css` | Block `01 · intro`: thêm styles cho tiles, character, virtual buttons, modal overlay, camera viewport |
| `js/data/game-map.js` | Entry đầu: đổi `introText`/`inputHint`/`title` cho phù hợp platformer; `bg` giữ nguyên SVG |
| `Asset/v2/...` | Nhân vật "Bé Khám Phá" spritesheet (qua pipeline) — sau prototype |
| `design/quick-specs/...` | Spec này |

**Không đổi**: `lesson.js`, `questions.js`, `curriculum`, `tuning`, `audio`, `speech`, `progress`, `localStorage`, các game khác.

## 14. Phases

| Phase | Nội dung | Deliverable |
|-------|----------|-------------|
| 1 | Spec + review | Spec approved |
| 2 | Prototype: physics, collision, 1 map, 1 gate, modal, virtual buttons | `mario-bros.js` v2 (nhân vật = hình chữ nhật) |
| 3 | Art: nhân vật "Bé Khám Phá" spritesheet + tiles + collectibles | Asset mới qua pipeline |
| 4 | Polish: animation, particle, SFX, camera smooth | Production-ready |
| 5 | QA: touch, keyboard, reduced-motion, mobile, offline | Test report |

## 15. Rủi ro

- **Performance**: DOM-based rendering với nhiều tiles có thể lag trên mobile. Mitigation: dùng canvas nếu cần, hoặc giới hạn tile count.
- **Complexity**: game loop + physics + collision trong ES5 thuần, không framework. Mitigation: giữ physics đơn giản, map nhỏ.
- **Scope creep**: chỉ làm bài `intro`. Không mở rộng sang bài khác cho đến khi prototype ổn.
- **Accessibility**: modal focus trap + keyboard navigation phải đúng. Mitigation: test kỹ với screen reader.

---

**Chờ duyệt**: Nếu bạn đồng ý với spec này, tôi sẽ bắt đầu Phase 2 (prototype) với nhân vật tạm thời là hình chữ nhật, rồi nâng cấp art ở Phase 3. Không deploy/push/commit.