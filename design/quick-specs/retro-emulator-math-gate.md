# Quick Design Spec: Retro Emulator Math Gate

**Type**: Thay thế toàn bộ ứng dụng Kid Math hiện tại bằng EmulatorJS-based game player với question-gate.
**Scope**: Toàn bộ ứng dụng. 21 bài toán hiện có được giữ nguyên làm nguồn câu hỏi.
**Date**: 2026-11-24
**Status**: Draft — chờ duyệt
**Ranh giới bản quyền**: EmulatorJS là open-source (GPL-3.0). ROM do người dùng tự cung cấp (không bundle ROM có bản quyền). Game assets tự sinh.

## 1. Tổng quan

Ứng dụng web chạy EmulatorJS (emulator đa hệ máy). Người dùng chọn file ROM từ máy → tự nhận dạng console → chơi game toàn màn hình. Cứ mỗi 5 phút, game bị pause và hiện modal câu hỏi toán (từ 21 bài hiện có). Trả lời sai → đổi câu hỏi khác (cùng level hoặc level thấp hơn). Trả lời đúng → game tiếp tục.

**Question progression**: Câu hỏi escalate từ bài 1 (đếm 1-5) đến bài 21 (tổng hợp). Mỗi lần trả lời đúng, độ khó tăng. Sau bài 21 → lặp lại từ bài 1 với câu hỏi mới.

## 2. Tech Stack

| Thành phần | Công nghệ | Ghi chú |
|------------|-----------|---------|
| Emulator | EmulatorJS (WASM) | Self-hosted cores, auto-detect console |
| Frontend | Vanilla JS (ES5-ish) | Không framework |
| Offline | Service Worker + Cache API | Cache EmulatorJS cores + app shell |
| Storage | localStorage | Progress, settings, question level |
| ROM loading | File API | User selects file, no path saved |
| Audio | Web Audio API | Emulator audio + app SFX |
| UI | CSS + DOM | Modal overlay, virtual controls |

## 3. Console Support (auto-detect)

| Extension | Console | Core |
|-----------|---------|------|
| .nes | NES | nes |
| .snes, .smc, .sfc | SNES | snes9x |
| .gb | Game Boy | gambatte |
| .gbc | Game Boy Color | gambatte |
| .gba | Game Boy Advance | mgba |
| .md, .gen, .bin | Genesis/Mega Drive | genesis_plus_gx |
| .n64, .z64, .v64 | N64 | mupen64plus_next |
| .cue, .bin, .iso, .chd | PlayStation | pcsx_rearmed |
| .nds | Nintendo DS | desmume |
| .pce | PC Engine | mednafen_pce_fast |

Auto-detect từ file extension. Nếu extension không rõ, thử magic bytes.

## 4. Question Progression

### 4.1 Level system
- **Level 1-5**: Bài 1 (đếm 1-5)
- **Level 6-10**: Bài 2-3 (đếm 6-10, so sánh)
- **Level 11-15**: Bài 4-6 (so sánh số, compose, mixed)
- **Level 16-20**: Bài 7-10 (hình 2D, mixed)
- **Level 21-25**: Bài 11-15 (cộng trừ, fact family)
- **Level 26-30**: Bài 16-20 (hình 3D, vị trí, mixed)
- **Level 31+**: Bài 21 (tổng hợp) → lặp lại từ level 1 với câu hỏi mới

### 4.2 Wrong answer handling
- Trả lời sai → đổi sang câu hỏi khác (cùng level hoặc level-1)
- Sau 3 lần sai liên tiếp → giảm 1 level (easier question)
- Trả lời đúng → tăng level (harder question)

### 4.3 Timer
- 5 phút cố định (300 giây)
- Timer pause khi câu hỏi xuất hiện
- Timer reset sau khi trả lời đúng
- Timer không chạy khi game paused

## 5. UI Layout

```
┌─────────────────────────────────────────────┐
│  [☰ Menu]  [🔊]  [⏱ 4:32]  [⭐ Level 5]   │  ← top bar (auto-hide)
│                                             │
│                                             │
│           EMULATOR CANVAS (full screen)      │
│                                             │
│                                             │
│  [←] [→] [↑] [↓]  [A] [B] [Start] [Select] │  ← virtual controls (touch)
└─────────────────────────────────────────────┘

Khi câu hỏi xuất hiện:
┌─────────────────────────────────────────────┐
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Câu hỏi: "Có mấy quả chuối?"        │  │
│  │                                       │  │
│  │  [  3  ]  [  5  ]  [  2  ]           │  │  ← modal overlay
│  │                                       │  │
│  │  💡 Chạm vào đáp án đúng             │  │
│  │  🔊 Nghe lại                          │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## 6. Flows

### 6.1 ROM loading flow
1. Mở app → màn hình "Chọn ROM"
2. Tap "Chọn file ROM" → file picker
3. Chọn file → auto-detect console → load EmulatorJS
4. Nếu detect fail → hiện dropdown chọn console thủ công
5. Game bắt đầu, timer 5 phút bắt đầu đếm

### 6.2 Question flow
1. Timer 5 phút → pause emulator → show modal question
2. User trả lời:
   - Đúng → modal đóng, game resume, level++, timer reset
   - Sai → modal hiện hint, đổi câu hỏi khác (cùng level), timer không chạy
   - Sau 3 lần sai → giảm level, đổi câu hỏi dễ hơn
3. Game resume → timer 5 phút bắt đầu lại

### 6.3 Offline flow
1. Lần đầu: download EmulatorJS cores (cache)
2. Lần sau: load từ cache (offline)
3. ROM: user chọn lại (không cache path)

## 7. Mobile Considerations

- **Touch controls**: Virtual D-pad (4 buttons) + A/B/Start/Select (6 buttons), mỗi ≥64px
- **Fullscreen**: Android Chrome supports. iOS Safari: use `display: fullscreen` in manifest, fallback to `position: fixed`
- **Audio unlock**: Cần user gesture (tap "Bắt đầu") để unlock AudioContext
- **Orientation**: Landscape recommended, portrait supported (smaller controls)
- **iOS**: Không hỗ trợ File System Access API → dùng `<input type="file">`

## 8. PWA (Progressive Web App)

- **Manifest**: `manifest.json` với icons, theme_color, display: fullscreen
- **Service Worker**: Cache EmulatorJS cores, app shell, CSS/JS
- **Offline**: Works offline sau lần load đầu
- **Install**: "Add to Home Screen" trên mobile

## 9. File Changes (dự kiến)

| File | Thay đổi |
|------|----------|
| `index.html` | Redesign: ROM picker, emulator canvas, virtual controls, question modal |
| `js/app.js` | Redesign: ROM loader, emulator init, timer, question flow |
| `js/core/audio.js` | Thêm: coin, heart, jump, gateOpen (giữ) |
| `js/domain/questions.js` | Giữ nguyên (21 bài) |
| `js/domain/curriculum.js` | Giữ nguyên |
| `js/ui/screens/lesson.js` | Xóa (thay bằng emulator screen) |
| `js/ui/games/*` | Xóa (thay bằng emulator) |
| `css/games.css` | Redesign: emulator layout, virtual controls, question modal |
| `css/app.css` | Redesign: app shell, PWA styles |
| `manifest.json` | Mới: PWA manifest |
| `sw.js` | Mới: Service Worker |
| `emulator/` | Mới: EmulatorJS core files |

## 10. Phases

| Phase | Nội dung | Deliverable |
|-------|----------|-------------|
| 1 | Spec + ADR + architecture | Spec approved |
| 2 | EmulatorJS integration + ROM loader + auto-detect | Prototype (desktop) |
| 3 | Question overlay + 5-min timer + progression | Working prototype |
| 4 | Virtual controls + mobile responsive | Mobile-ready |
| 5 | PWA + Service Worker (offline) | Offline-capable |
| 6 | QA: mobile, desktop, offline, all consoles | Test report |

## 11. Rủi ro

- **EmulatorJS size**: ~50-100MB cores. Cần cache strategy thông minh.
- **iOS Safari**: Fullscreen API hạn chế. Audio context cần user gesture.
- **ROM format**: Không phải ROM nào cũng load được. Cần error handling.
- **Performance**: Emulator + overlay + timer có thể lag trên mobile low-end.
- **Offline**: Lần đầu cần internet để download cores.

## 12. Quyết định cần chốt

1. **Console ưu tiên**: Bạn muốn hỗ trợ tất cả hay bắt đầu với 1-2 console (NES, SNES)?
2. **ROM handling**: File picker (user chọn) hay drag-and-drop?
3. **Question display**: Modal overlay (khóa game) hay side panel (không khóa)?
4. **Offline**: Cần offline đầy đủ hay chỉ online?

---

**Chờ duyệt**: Nếu bạn đồng ý, tôi sẽ bắt đầu Phase 2 (EmulatorJS integration). Không deploy/push/commit.