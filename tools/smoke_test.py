"""Smoke test tự động cho Bé Vui Học Toán 1 (Playwright + Chrome có sẵn).

Cách chạy:
    python -m http.server 8765 --bind 127.0.0.1
    python tools/smoke_test.py

Ảnh chụp được lưu vào production/qa/screenshots/.
Script thoát với mã 1 nếu có kiểm tra thất bại.

Yêu cầu: python -m pip install -r tools/requirements-test.txt
(dùng Chrome cài sẵn, không tải Chromium).
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8765"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "production" / "qa" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

# Đếm thực tế bằng `grep -c 'T.test(' tests/unit/*.test.js` sau khi viết xong:
# cũ 92 + game-map-v2 10 + game-intro 7 + sprite 7 + splatoon 1 = 117.
EXPECTED_UNIT_TESTS = 117
HD_MAX_BYTES = 400000
COVER_MAX_BYTES = 400000
SPRITE_MAX_BYTES = 180000
INTRO_FLAG_PREFIX = "km_game_intro_v1_"
PHASE1_GAMES = {
    "intro": ("mario-bros", "Super Mario Bros.", "Asset/hd/intro.webp"),
    "b5": ("animal-crossing", "Animal Crossing", "Asset/hd/b5.webp"),
    "b20": ("mario-kart", "Mario Kart 8", "Asset/hd/b20.webp"),
}
RESTORE_RESULT = """() => KMApp.navigate('result', {
  lessonId: 'intro',
  summary: { stars: 2, firstTryCorrect: 3, total: 5, bestStreak: 2 },
  record: { stars: 2, isNewBest: false, nextLessonId: 'b1' }
})"""


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def filter_console_errors(errors: list[str]) -> list[str]:
    """Bỏ cảnh báo headless không liên quan (đồng nhất với gate cuối script cũ)."""
    return [
        error for error in errors
        if "favicon" not in error.lower() and "speech" not in error.lower()
    ]


def check_no_new_errors(errors: list[str], before: int, label: str) -> None:
    new_errors = filter_console_errors(errors[before:])
    check(not new_errors, f"{label}: lỗi console mới: " + " | ".join(new_errors[:3]))


def watch_errors(page, errors: list[str]) -> None:
    # Gắn URL nguồn để gate cuối có thể bỏ qua 404 favicon của test-runner.html.
    page.on(
        "console",
        lambda message: errors.append(
            f"{message.text} @ {message.location.get('url', '')}"
        ) if message.type == "error" else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))


def check_hd_background(page, src: str, label: str) -> None:
    """Ảnh nền HD phải tải thật (không chỉ có URL trong CSS)."""
    result = page.evaluate(
        """(src) => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ loaded: true, width: img.naturalWidth });
          img.onerror = () => resolve({ loaded: false, width: 0 });
          img.src = src;
        })""",
        src,
    )
    check(
        result["loaded"] and result["width"] > 0,
        f"{label}: ảnh HD {src} không tải được (naturalWidth={result['width']})",
    )


def check_game_stage(page, lesson_id: str, label: str) -> None:
    """Kiểm tra mount .game-stage, nhãn cảm hứng và ảnh nền của game mẫu."""
    game_id, tribute, bg = PHASE1_GAMES[lesson_id]
    check(
        page.locator(f'.game-stage[data-game-id="{game_id}"]').count() == 1,
        f"{label}: thiếu .game-stage[data-game-id=\"{game_id}\"]",
    )
    label_text = page.locator(".game-tribute").first.text_content() or ""
    check(
        "Cảm hứng: " + tribute in label_text,
        f"{label}: nhãn cảm hứng sai: {label_text}",
    )
    background = page.evaluate(
        "() => getComputedStyle(document.querySelector('.game-stage')).backgroundImage"
    )
    check(bg in background, f"{label}: nền game sai: {background}")
    check_hd_background(page, bg, label)


def check_stage(page, lesson_id: str, label: str) -> None:
    """ADR-0003: mọi bài đều có factory → đúng 1 .game-stage."""
    info = page.evaluate(
        """() => {
          const list = document.querySelectorAll('.game-stage');
          const stage = list[0];
          return {
            count: list.length,
            gameId: stage ? stage.getAttribute('data-game-id') : null,
            sprite: document.querySelectorAll('.game-stage canvas.km-sprite').length
          };
        }"""
    )
    check(info["count"] == 1, f"{label}: cần đúng 1 .game-stage, nhận {info['count']}")
    check(info["gameId"], f"{label}: .game-stage thiếu data-game-id")
    check(
        info["sprite"] >= 1,
        f"{label}: .game-stage thiếu canvas sprite (runtime không khởi tạo)",
    )


def check_asset_files(lesson_ids: list[str]) -> None:
    """21 HD + 21 cover + 21 sprite = 63 ảnh, đúng tên bài, đúng ngân sách."""
    groups = [
        ("hd", HD_MAX_BYTES, "HD"),
        ("covers", COVER_MAX_BYTES, "cover"),
        ("sprites", SPRITE_MAX_BYTES, "sprite"),
    ]
    expected_names = set(lesson_ids)
    for folder, budget, label in groups:
        files = sorted((ROOT / "Asset" / folder).glob("*.webp"))
        check(
            len(files) == 21,
            f"Asset/{folder} cần đúng 21 ảnh, nhận {len(files)}",
        )
        check(
            {f.stem for f in files} == expected_names,
            f"Asset/{folder} sai tên file so với 21 lessonId",
        )
        for path in files:
            size = path.stat().st_size
            check(
                size <= budget,
                f"Ảnh {label} vượt {budget} bytes: {path.name} ({size} bytes)",
            )
        biggest = max(path.stat().st_size for path in files)
        print(f"ASSET {label}: 21 file, lớn nhất {biggest} bytes / budget {budget}")


def check_all_images(page, lesson_ids: list[str]) -> None:
    """Tải thật 63 ảnh trong trình duyệt; ảnh lỗi là FAIL smoke."""
    results = page.evaluate(
        """(ids) => {
          const srcs = [];
          ids.forEach((id) => {
            srcs.push('Asset/hd/' + id + '.webp');
            srcs.push('Asset/covers/' + id + '.webp');
            srcs.push('Asset/sprites/' + id + '.webp');
          });
          return Promise.all(srcs.map((src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ src, ok: img.naturalWidth > 0, width: img.naturalWidth });
            img.onerror = () => resolve({ src, ok: false, width: 0 });
            img.src = src;
          })));
        }""",
        lesson_ids,
    )
    bad = [item for item in results if not item["ok"]]
    check(len(results) == 63, f"Phải kiểm tra 63 ảnh, nhận {len(results)}")
    check(not bad, "63 ảnh có file tải lỗi: " + ", ".join(
        f"{item['src']} (width={item['width']})" for item in bad[:5]
    ))
    print(f"ASSET load: {len(results)}/63 ảnh tải OK")


def enter_intro(page, lesson_id: str, label: str, shot: str | None = None) -> None:
    """Điều hướng trực tiếp tới màn intro (reason manual luôn render)."""
    page.evaluate(
        "(id) => KMApp.navigate('gameIntro', { lessonId: id, reason: 'manual' })",
        lesson_id,
    )
    page.wait_for_selector(".game-intro", timeout=8000)
    check(
        page.locator(f'.game-intro[data-lesson-id="{lesson_id}"]').count() == 1,
        f"{label}: intro sai lessonId",
    )
    if shot:
        page.screenshot(path=str(OUT / shot))


def observe_layout(
    page,
    lesson_id: str,
    vp_label: str,
    vp_key: str,
    failures: list[str],
    observations: list[str],
    *,
    flag_stage_height: bool,
) -> None:
    """Đo .game-stage + nút đáp án cuối TRƯỚC khi cuộn (OBS-01)."""
    page.evaluate("() => window.scrollTo({ top: 0, behavior: 'instant' })")
    data = page.evaluate(
        """() => {
          const stages = document.querySelectorAll('.game-stage');
          const stage = stages[0];
          const choices = Array.from(document.querySelectorAll('.choice'));
          const last = choices[choices.length - 1];
          const rect = last ? last.getBoundingClientRect() : null;
          return {
            stageCount: stages.length,
            stageHeight: stage ? stage.getBoundingClientRect().height : 0,
            choices: choices.length,
            lastTop: rect ? Math.round(rect.top) : 0,
            lastBottom: rect ? Math.round(rect.bottom) : 0,
            viewport: innerHeight,
            overflowX: document.documentElement.scrollWidth > innerWidth + 1
          };
        }"""
    )
    observations.append(
        f"{lesson_id} · {vp_label}: stage={data['stageHeight']:.1f}px "
        f"choices={data['choices']} last.bottom={data['lastBottom']} "
        f"viewport={data['viewport']} overflowX={data['overflowX']}"
    )
    tag = f"{lesson_id} · {vp_label}"
    if data["stageCount"] != 1:
        failures.append(f"{tag}: có {data['stageCount']} .game-stage, cần 1")
    if data["choices"] < 2:
        failures.append(f"{tag}: chỉ có {data['choices']} nút đáp án")
    if flag_stage_height and data["stageHeight"] > 170:
        failures.append(
            f"{tag}: .game-stage cao {data['stageHeight']:.1f}px > 170px "
            "(OBS-01 chưa nén)"
        )
    if data["lastBottom"] > data["viewport"] + 1:
        failures.append(
            f"{tag}: nút đáp án cuối nằm dưới fold khi chưa cuộn "
            f"(bottom={data['lastBottom']} viewport={data['viewport']})"
        )
    if data["overflowX"]:
        failures.append(f"{tag}: tràn ngang (overflowX=true)")
    page.screenshot(path=str(OUT / f"obs01-{lesson_id}-{vp_key}.png"))


def puzzle_pieces(page) -> list:
    raw = page.evaluate("() => localStorage.getItem('kidmath.v1')")
    check(raw is not None, "Thiếu storage key kidmath.v1")
    state = json.loads(raw)
    return state.get("puzzle", {}).get("pieces", [])


def current_question(page) -> dict:
    return page.evaluate(
        "() => { const s = KMApp.current().debugState().session;"
        " const q = s.current(); const p = s.progress();"
        " return { answer: q.answer, kind: q.kind, text: q.text,"
        " index: p.index, total: p.total, answered: p.isAnswered }; }"
    )


def click_choice(page, value) -> None:
    page.evaluate(
        "(v) => { const b = Array.from(document.querySelectorAll('.choice'))"
        ".find((x) => x.dataset.value === String(v)); if (!b) throw new Error('choice'); b.click(); }",
        value,
    )


def wait_for_advance(page, previous_index: int, total: int) -> None:
    if previous_index + 1 < total:
        page.wait_for_function(
            "(i) => { const c = KMApp.current();"
            " if (!c || !c.debugState) return false;"
            " return c.debugState().session.progress().index === i; }",
            arg=previous_index + 1,
            timeout=8000,
        )
    else:
        page.wait_for_selector(".result-card", timeout=8000)


def skip_race_intro(page) -> None:
    if page.locator(".race-intro").count():
        if page.locator(".race-skip").count():
            page.click(".race-skip")
        page.wait_for_selector(".race-intro", state="detached", timeout=5000)
    if page.locator(".choice").count() == 0:
        page.wait_for_selector(".choice", timeout=5000)


def play_lesson(page, *, wrong_first: bool = False, shot_prefix: str | None = None) -> None:
    skip_race_intro(page)
    first = current_question(page)
    total = first["total"]
    for i in range(total):
        focus = page.evaluate(
            "() => document.activeElement ? document.activeElement.className : ''"
        )
        check("question-text" in focus, f"Focus không ở câu hỏi (câu {i + 1}): {focus}")
        question = current_question(page)
        if i == 0 and wrong_first:
            values = page.evaluate(
                "() => Array.from(document.querySelectorAll('.choice')).map((c) => c.dataset.value)"
            )
            wrong = next(v for v in values if str(v) != str(question["answer"]))
            click_choice(page, wrong)
            page.wait_for_timeout(120)
            check(page.locator(".celebrate").count() == 0, "Xe xuất hiện khi trả lời sai")
            check(page.locator(".toast").count() > 0, "Không thấy nhắc thử lại")
            if shot_prefix:
                page.screenshot(path=str(OUT / f"{shot_prefix}-wrong.png"))
        click_choice(page, question["answer"])
        page.wait_for_selector(".celebrate", timeout=3000)
        page.wait_for_function(
            "() => { const i = document.querySelector('.celebrate-car');"
            " return !!(i && i.complete && i.naturalWidth > 0); }",
            timeout=5000,
        )
        check(page.locator(".confetti").count() > 0, "Thiếu confetti khi trả lời đúng")
        if i == 0:
            player_progress = page.evaluate(
                "() => document.querySelector('.race-lane.is-player')"
                ".getAttribute('data-progress')"
            )
            check(float(player_progress) > 0, "McQueen không tiến trên đường đua")
            check(
                page.evaluate(
                    "() => document.querySelectorAll('.race-lane.is-move').length > 0"
                ),
                "Xe không chạy khi trả lời đúng",
            )
        if shot_prefix and i == 0:
            page.wait_for_timeout(500)
            page.screenshot(path=str(OUT / f"{shot_prefix}-reward.png"))
        wait_for_advance(page, question["index"], total)

    stars = page.evaluate(
        "() => document.querySelectorAll('.result-stars .star.is-on').length"
    )
    focus = page.evaluate(
        "() => document.activeElement ? document.activeElement.className : ''"
    )
    check("result-title" in focus, f"Focus không ở tiêu đề kết quả: {focus}")
    lesson = page.evaluate("() => KMApp.current() && document.body.dataset.screen")
    check(lesson == "result", "Không chuyển sang màn kết quả")
    check(
        page.locator(".podium-step").count() == 2,
        "Màn kết quả thiếu bục trao thưởng 2 tay đua",
    )
    check(
        page.evaluate("() => !!document.querySelector('.podium-step.is-first')"),
        "Bục trao thưởng thiếu bậc nhất",
    )
    check(
        page.evaluate(
            "() => { const a = document.querySelector('.podium-step.is-first .podium-block');"
            " const b = document.querySelector('.podium-step.is-second .podium-block');"
            " return !!a && !!b && a.getBoundingClientRect().top < b.getBoundingClientRect().top; }"
        ),
        "Bậc nhất phải cao hơn bậc nhì",
    )
    page.wait_for_function(
        "() => { const i = document.querySelector('.result-car');"
        " return !!(i && i.complete && i.naturalWidth > 0); }",
        timeout=5000,
    )
    if shot_prefix:
        page.wait_for_timeout(900)
        page.screenshot(path=str(OUT / f"{shot_prefix}-result.png"))
    return stars


def inspect_viewport(
    page,
    label: str,
    failures: list[str],
    observations: list[str],
    *,
    check_result: bool = True,
) -> None:
    """Đo nút đáp án cuối (ngay khi vào màn + sau khi cuộn) và nút kết quả.

    `check_result=False` dùng cho các bài minigame khác `intro`: chỉ đo hàng
    đáp án, không dựng lại màn result (RESTORE_RESULT).
    """
    page.evaluate("() => window.scrollTo({ top: 0, behavior: 'instant' })")
    initial = page.evaluate(
        """() => {
          const list = Array.from(document.querySelectorAll('.choice'));
          const rect = list[list.length - 1].getBoundingClientRect();
          return { top: Math.round(rect.top), bottom: Math.round(rect.bottom),
                   viewport: innerHeight, scrollHeight: document.documentElement.scrollHeight };
        }"""
    )
    observations.append(
        f"{label}: nút đáp án cuối ban đầu top={initial['top']} "
        f"bottom={initial['bottom']} viewport={initial['viewport']} "
        f"scrollHeight={initial['scrollHeight']}"
    )
    # OBS-01: với bé 6 tuổi, nút đáp án phải THẤY NGAY, không cần cuộn.
    if initial["bottom"] > initial["viewport"] + 1:
        failures.append(
            f"{label}: nút đáp án cuối nằm dưới fold khi chưa cuộn "
            f"(bottom={initial['bottom']} viewport={initial['viewport']})"
        )
    # CSS có scroll-behavior: smooth → cuộn xong rồi mới đo ở evaluate riêng.
    page.evaluate("() => window.scrollTo({ top: 100000, behavior: 'instant' })")
    page.wait_for_timeout(120)
    reachable = page.evaluate(
        """() => {
          const list = Array.from(document.querySelectorAll('.choice'));
          const el = list[list.length - 1];
          const rect = el.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
                   width: innerWidth, height: innerHeight,
                   overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
        }"""
    )
    inside = (
        reachable["top"] >= -1 and reachable["bottom"] <= reachable["height"] + 1
        and reachable["left"] >= -1 and reachable["right"] <= reachable["width"] + 1
    )
    if reachable["overflowX"] or not inside:
        failures.append(
            f"{label}: nút đáp án cuối không nằm trọn trong viewport sau khi cuộn "
            f"({json.dumps(reachable, ensure_ascii=False)})"
        )

    if not check_result:
        return
    page.evaluate("() => window.scrollTo({ top: 0, behavior: 'instant' })")
    page.evaluate(RESTORE_RESULT)
    page.wait_for_selector(".result-card")
    result = page.evaluate(
        """() => {
          const el = document.querySelector('.result-actions .btn-primary');
          const rect = el.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
                   width: innerWidth, height: innerHeight,
                   overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
        }"""
    )
    result_inside = (
        result["top"] >= -1 and result["bottom"] <= result["height"] + 1
        and result["left"] >= -1 and result["right"] <= result["width"] + 1
    )
    if result["overflowX"] or not result_inside:
        failures.append(
            f"{label}: nút kết quả không nằm trọn trong viewport "
            f"({json.dumps(result, ensure_ascii=False)})"
        )


def main() -> int:
    console_errors: list[str] = []
    bad_responses: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="vi-VN",
            device_scale_factor=1,
        )
        page = context.new_page()
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: console_errors.append(f"pageerror: {error}"))
        page.on(
            "response",
            lambda response: bad_responses.append(f"{response.status} {response.url}")
            if response.status >= 400
            else None,
        )

        page.goto(f"{BASE_URL}/index.html", wait_until="load")
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="load")
        page.wait_for_selector(".splash-start")
        check(page.locator(".splash-car").is_visible(), "Splash thiếu ảnh xe")
        page.screenshot(path=str(OUT / "01-splash.png"))

        page.click(".splash-start")
        page.wait_for_selector(".home")
        page.wait_for_timeout(400)
        check(
            page.evaluate("() => document.activeElement && document.activeElement.tagName") == "H1",
            "Trang chủ chưa đặt focus vào tiêu đề",
        )
        check(page.locator(".lesson-card").count() == 21, "Không đủ 21 bài")
        check(
            page.evaluate(
                "() => { const i = document.querySelector('.hero-car');"
                " return !!(i && i.complete && i.naturalWidth > 0); }"
            ),
            "Ảnh xe ở trang chủ không tải được",
        )
        check(
            page.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1"),
            "Trang chủ bị tràn ngang",
        )
        page.screenshot(path=str(OUT / "02-home.png"), full_page=True)

        # Giai đoạn C: 21 HD + 21 cover + 21 sprite = 63 ảnh, tải thật trong browser.
        lesson_ids = page.evaluate(
            "() => KMApp.ctx.curriculum.lessons.map((lesson) => lesson.id)"
        )
        check(len(lesson_ids) == 21, f"Không đủ 21 màn: {len(lesson_ids)}")
        check_asset_files(lesson_ids)
        check_all_images(page, lesson_ids)

        errors_before_intro = len(console_errors)
        check(
            page.evaluate(
                "(id) => sessionStorage.getItem('" + INTRO_FLAG_PREFIX + "' + id)",
                "intro",
            ) is None,
            "Flag intro bài intro đã có từ trước khi bấm Học tiếp",
        )
        page.click(".hero-actions .btn-primary")
        page.wait_for_selector(".game-intro", timeout=8000)
        check(
            page.locator('.game-intro[data-lesson-id="intro"]').count() == 1,
            "Nút Học tiếp không mở đúng màn intro của bài intro",
        )
        page.screenshot(path=str(OUT / "03a-game-intro.png"))
        page.click(".game-intro .btn-primary")
        page.wait_for_selector(".question-card")
        check(
            page.evaluate("() => document.body.dataset.screen") == "lesson",
            "Bấm Bắt đầu không vào thẳng màn học (không được skipIntro)",
        )
        check(
            page.evaluate(
                "() => sessionStorage.getItem('" + INTRO_FLAG_PREFIX + "intro')"
            ) == "1",
            "Bấm Bắt đầu chưa ghi flag km_game_intro_v1_intro",
        )
        page.wait_for_selector(".race-intro")
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / "03b-race-intro.png"))
        check_game_stage(page, "intro", "intro (mario-bros)")
        check_no_new_errors(console_errors, errors_before_intro, "intro (mario-bros)")
        check(
            page.locator(".race-start-car").count() == 2,
            "Màn xuất phát không đúng 2 xe (1 đối 1)",
        )
        check(
            page.locator(".race-vs").count() == 1,
            "Màn xuất phát thiếu badge VS",
        )
        check(
            page.evaluate(
                "() => { const i = document.querySelector('.race-start-car');"
                " return i ? i.getBoundingClientRect().height : 0; }"
            ) >= 120,
            "Xe xuất phát quá nhỏ trên desktop",
        )
        skip_race_intro(page)
        check(
            page.locator(".race-lane").count() == 2,
            "Race HUD không đúng 2 tay đua (1 đối 1)",
        )
        check(
            page.evaluate(
                "() => { const i = document.querySelector('.race-car');"
                " return i ? i.getBoundingClientRect().height : 0; }"
            ) >= 56,
            "Xe trên đường đua quá nhỏ trên desktop",
        )
        check(
            page.evaluate(
                "() => Array.from(document.querySelectorAll('.race-car'))"
                ".every((img) => img.complete && img.naturalWidth > 0)"
            ),
            "Ảnh xe trên đường đua không tải được",
        )
        check(
            page.evaluate("() => KMApp.current().debugState().lesson.id") == "intro",
            "Không mở đúng bài mở đầu",
        )
        page.screenshot(path=str(OUT / "03-lesson-question.png"))
        intro_stars = play_lesson(page, wrong_first=True, shot_prefix="04-intro")
        check(intro_stars == 2, f"Bài mở đầu phải 2 sao, nhận {intro_stars}")

        # ADR-0002 AC-3: mảnh 0 được trao, lưu storage, sống qua reload.
        check(
            page.locator(".result-puzzle-strip").count() == 1,
            "Màn kết quả thiếu dải nhận mảnh ghép",
        )
        check(
            "Nhận mảnh 01/21" in (page.locator(".result-puzzle-strip").text_content() or ""),
            "Dải nhận mảnh không đúng thông điệp 'Nhận mảnh 01/21'",
        )
        check(puzzle_pieces(page) == [0], f"puzzle.pieces sai sau intro: {puzzle_pieces(page)}")
        check_no_new_errors(console_errors, errors_before_intro, "intro result")

        page.reload(wait_until="load")
        page.wait_for_selector(".home")
        check(puzzle_pieces(page) == [0], "Mảnh ghép không được giữ sau khi tải lại trang")
        page.evaluate("() => KMApp.navigate('collection')")
        page.wait_for_selector(".collection")
        collection_info = page.evaluate(
            """() => ({
              lit: document.querySelectorAll('.puzzle-piece.is-revealed').length,
              locked: document.querySelectorAll('.puzzle-piece.is-locked').length,
              count: document.querySelector('.collection-count-value').textContent
            })"""
        )
        check(collection_info["lit"] == 1, f"Bộ sưu tập phải sáng 1 ô: {collection_info}")
        check(collection_info["locked"] == 20, f"Bộ sưu tập phải khoá 20 ô: {collection_info}")
        check(collection_info["count"] == "1/21", f"Tiến độ bộ sưu tập sai: {collection_info}")
        page.screenshot(path=str(OUT / "27-collection-1-21.png"), full_page=True)
        # Khôi phục màn kết quả để giữ nguyên luồng smoke cũ (nút "Bài tiếp").
        page.evaluate(RESTORE_RESULT)
        page.wait_for_selector(".result-card")

        stats = page.evaluate("() => KMApp.ctx.progress.stats()")
        check(stats["stars"] == 2, f"Tổng sao sai sau bài mở đầu: {stats}")
        check(
            page.evaluate("() => KMApp.ctx.progress.isUnlocked('b1')"),
            "Bài 1 chưa được mở",
        )

        page.click(".result-actions .btn-primary")
        page.wait_for_selector(".question-card")
        check(
            page.evaluate("() => KMApp.current().debugState().lesson.id") == "b1",
            "Không chuyển sang Bài 1",
        )
        skip_race_intro(page)
        errors_before_fallback = len(console_errors)
        # ADR-0003: 21/21 bài đều có factory → b1 cũng có đúng 1 game-stage.
        check_stage(page, "b1", "b1 sau khi chọn Bài tiếp")
        check(
            page.locator(".race-hud").count() == 1,
            "b1 vẫn phải giữ race HUD",
        )
        page.screenshot(path=str(OUT / "05-b1-question.png"))
        b1_stars = play_lesson(page, shot_prefix="06-b1")
        check_no_new_errors(console_errors, errors_before_fallback, "b1 fallback")
        check(b1_stars == 3, f"Bài 1 phải 3 sao, nhận {b1_stars}")
        check(
            page.evaluate("() => KMApp.ctx.progress.isUnlocked('b2')"),
            "Bài 2 chưa được mở sau khi hoàn thành Bài 1",
        )

        page.click(".result-actions .btn-ghost")
        page.wait_for_selector(".home")
        page.wait_for_timeout(400)
        check(
            page.evaluate("() => KMApp.ctx.progress.totalStars()") == 5,
            "Tổng sao trên trang chủ sai",
        )
        page.screenshot(path=str(OUT / "07-home-stars.png"), full_page=True)

        # Mở tất cả 21 màn để kiểm tra render; chụp ảnh 8 dạng đại diện.
        sample_shots = {
            "b3": "compare-groups",
            "b4": "compare-sign",
            "b5": "compose",
            "b7": "shapes",
            "b10": "addition",
            "b14": "solid",
            "b15": "position",
            "b18": "fact-family",
        }
        for lesson_id in lesson_ids:
            errors_before_lesson = len(console_errors)
            page.evaluate(
                "(id) => KMApp.navigate('lesson', { lessonId: id, preview: true })", lesson_id
            )
            page.wait_for_selector(".question-card")
            skip_race_intro(page)
            page.wait_for_timeout(100)
            check_stage(page, lesson_id, f"{lesson_id} preview")
            if lesson_id in PHASE1_GAMES:
                check_game_stage(page, lesson_id, f"{lesson_id} preview")
            if lesson_id == "b20":
                check(
                    page.locator(".race-hud").count() == 1,
                    "b20 (mario-kart) vẫn phải giữ race HUD",
                )
            check_no_new_errors(console_errors, errors_before_lesson, f"{lesson_id} preview")
            info = page.evaluate(
                "() => ({ total: document.querySelectorAll('.choice').length,"
                " hasVisual: !!document.querySelector('.game-stage, .visual, .equation, .choice svg, .choice-glyph'),"
                " overflow: document.documentElement.scrollWidth > innerWidth + 1 })"
            )
            check(info["total"] >= 2, f"{lesson_id} thiếu lựa chọn")
            check(info["hasVisual"], f"{lesson_id} thiếu hình minh hoạ")
            check(
                page.locator(".visual-slot .visual").count() == 0,
                f"{lesson_id}: không render lại visual cũ khi đã có minigame (OBS-01)",
            )
            check(not info["overflow"], f"{lesson_id} bị tràn ngang")
            if lesson_id in sample_shots:
                page.wait_for_timeout(650)
                page.screenshot(
                    path=str(OUT / f"08-type-{sample_shots[lesson_id]}.png")
                )

        page.evaluate("() => KMApp.navigate('home')")
        page.wait_for_selector(".home")
        page.wait_for_timeout(300)

        # Bài đang khoá không được mở từ thẻ trên trang chủ.
        page.click(".lesson-card.is-locked")
        page.wait_for_timeout(200)
        check(
            page.evaluate("() => document.body.dataset.screen") == "home",
            "Mở được bài đang khoá",
        )
        check(page.locator(".toast").count() > 0, "Thiếu nhắc khi chọn bài khoá")
        page.evaluate("() => KM.Components.dismissToast()")

        # Khu vực phụ huynh + cổng bảo vệ.
        page.click(".topbar-actions .btn-soft")
        page.wait_for_selector(".gate-card")
        page.wait_for_timeout(400)
        check(
            page.evaluate("() => document.activeElement && document.activeElement.tagName") == "H2",
            "Cổng phụ huynh chưa đặt focus vào tiêu đề",
        )
        gate = page.locator(".gate-question").inner_text()
        numbers = [int(n) for n in re.findall(r"\d+", gate)]
        check(len(numbers) == 2, f"Không đọc được câu hỏi cổng: {gate}")
        gate_answer = numbers[0] * numbers[1]
        page.screenshot(path=str(OUT / "09-parent-gate.png"))
        gate_values = page.evaluate(
            "() => Array.from(document.querySelectorAll('.gate-card .choice'))"
            ".map((c) => Number(c.dataset.value))"
        )
        wrong_gate = next(v for v in gate_values if v != gate_answer)
        click_choice(page, wrong_gate)
        page.wait_for_timeout(150)
        check(
            page.evaluate("() => document.body.dataset.screen") == "parent",
            "Trả lời sai cổng lại mở được dashboard",
        )
        check(page.locator(".toast").count() > 0, "Thiếu nhắc khi trả lời sai cổng")
        click_choice(page, gate_answer)
        page.wait_for_selector(".stat-grid")
        page.wait_for_timeout(400)
        page.evaluate("() => KM.Components.dismissToast()")
        page.wait_for_timeout(100)
        check(
            page.evaluate("() => document.querySelectorAll('.progress-row').length") == 21,
            "Bảng tiến độ phụ huynh thiếu bài",
        )
        page.screenshot(path=str(OUT / "10-parent-dashboard.png"), full_page=True)

        # Bật/tắt giọng đọc rồi trả lại trạng thái cũ.
        switch = page.locator(".setting-row").first.locator(".switch")
        before = switch.get_attribute("aria-checked")
        switch.click()
        page.wait_for_timeout(100)
        after = page.locator(".setting-row").first.locator(".switch").get_attribute(
            "aria-checked"
        )
        check(before != after, "Công tắc giọng đọc không đổi trạng thái")
        page.wait_for_timeout(100)
        focused_label = page.evaluate(
            "() => document.activeElement ? document.activeElement.getAttribute('aria-label') : ''"
        )
        check(
            focused_label == "Đọc đề bằng giọng tiếng Việt",
            f"Focus không giữ trên công tắc sau khi đổi: {focused_label}",
        )
        page.locator(".setting-row").first.locator(".switch").click()

        page.click(".parent-topbar .back-btn")
        page.wait_for_selector(".home")

        # Tải lại phải giữ tiến độ.
        page.reload(wait_until="load")
        page.wait_for_selector(".home")
        check(
            page.evaluate("() => KMApp.ctx.progress.totalStars()") == 5,
            "Tiến độ không được giữ sau khi tải lại",
        )
        check(
            page.evaluate("() => KMApp.ctx.progress.isUnlocked('b2')"),
            "Mở khoá không được giữ sau khi tải lại",
        )

        # Thua (hạng hai): hiệu ứng thua + tuỳ chọn "cho chơi lại" của phụ huynh.
        loss_race = """() => KMApp.navigate('result', {
          lessonId: 'intro',
          summary: { stars: 2, firstTryCorrect: 3, total: 5, bestStreak: 2 },
          record: { stars: 2, isNewBest: false, nextLessonId: 'b1' },
          race: {
            playerPlace: 2,
            racers: [
              { id: 'flo', name: 'Flo', src: 'Asset/Flo.webp', color: '#38b6e6',
                isPlayer: false, place: 1, score: 4.4, finalProgress: 100 },
              { id: 'mcqueen', name: 'McQueen', src: 'Asset/Mc_Queen.webp', color: '#d94132',
                isPlayer: true, place: 2, score: 3.6, finalProgress: 82 }
            ]
          }
        })"""
        page.evaluate("() => KMApp.ctx.progress.setSetting('allowRetry', false)")
        page.evaluate(loss_race)
        page.wait_for_selector(".result-card.is-loss")
        page.wait_for_timeout(300)
        check(
            page.evaluate(
                "() => document.querySelector('.result-title').textContent"
            ) == "Bé về đích thứ hai!",
            "Tiêu đề màn thua sai",
        )
        check(page.locator(".confetti").count() == 0, "Màn thua vẫn bắn confetti")
        check(page.locator(".loss-puff").count() == 2, "Màn thua thiếu khói xì hơi")
        check(
            page.evaluate("() => document.querySelector('.result-cheer') !== null"),
            "Màn thua thiếu lời động viên",
        )
        check(
            page.evaluate(
                "() => document.querySelectorAll('.result-actions .btn').length"
            ) == 2,
            "Phụ huynh tắt chơi lại nhưng vẫn còn nút Chơi lại",
        )
        check(
            page.evaluate(
                "() => !!document.querySelector('.podium-step.is-first .podium-crown')"
            ),
            "Màn thua không đánh dấu người thắng trên bục",
        )
        page.screenshot(path=str(OUT / "26-result-loss.png"))

        win_race = """() => KMApp.navigate('result', {
          lessonId: 'intro',
          summary: { stars: 3, firstTryCorrect: 5, total: 5, bestStreak: 5 },
          record: { stars: 3, isNewBest: false, nextLessonId: 'b1' },
          race: {
            playerPlace: 1,
            racers: [
              { id: 'mcqueen', name: 'McQueen', src: 'Asset/Mc_Queen.webp', color: '#d94132',
                isPlayer: true, place: 1, score: 5, finalProgress: 100 },
              { id: 'flo', name: 'Flo', src: 'Asset/Flo.webp', color: '#38b6e6',
                isPlayer: false, place: 2, score: 4.4, finalProgress: 88 }
            ]
          }
        })"""
        page.evaluate(win_race)
        page.wait_for_selector(".result-card:not(.is-loss)")
        page.wait_for_timeout(200)
        check(
            page.evaluate(
                "() => document.querySelectorAll('.result-actions .btn').length"
            ) == 2,
            "Tắt chơi lại nhưng màn thắng vẫn còn nút Chơi lại",
        )

        page.evaluate("() => KMApp.ctx.progress.setSetting('allowRetry', true)")
        page.evaluate(loss_race)
        page.wait_for_selector(".result-card.is-loss")
        page.wait_for_timeout(200)
        check(
            page.evaluate(
                "() => document.querySelectorAll('.result-actions .btn').length"
            ) == 3,
            "Bật cho chơi lại nhưng thiếu nút Chơi lại",
        )
        page.evaluate(win_race)
        page.wait_for_selector(".result-card:not(.is-loss)")
        page.wait_for_timeout(200)
        check(
            page.evaluate(
                "() => document.querySelectorAll('.result-actions .btn').length"
            ) == 3,
            "Màn thắng thiếu nút Chơi lại khi đang bật",
        )

        # Bàn phím: chọn đáp án bằng phím số.
        page.evaluate(
            "() => KMApp.navigate('lesson', { lessonId: 'b10', preview: true })"
        )
        page.wait_for_selector(".question-card")
        skip_race_intro(page)
        keyboard_q = current_question(page)
        keyboard_values = page.evaluate(
            "() => Array.from(document.querySelectorAll('.choice')).map((c) => c.dataset.value)"
        )
        keyboard_index = keyboard_values.index(str(keyboard_q["answer"]))
        page.keyboard.press(str(keyboard_index + 1))
        page.wait_for_selector(".celebrate", timeout=3000)
        check(
            page.locator(".choice.is-correct").count() == 1,
            "Phím số không chọn đúng đáp án",
        )
        page.evaluate("() => KMApp.navigate('home')")
        page.wait_for_selector(".home")
        page.wait_for_timeout(300)
        check(
            page.evaluate("() => document.activeElement && document.activeElement.tagName") == "H1",
            "Trang chủ không nhận focus sau khi thoát bài",
        )

        # Kiểm tra giao diện điện thoại.
        mobile = context.new_page()
        mobile.set_viewport_size({"width": 390, "height": 844})
        mobile.goto(f"{BASE_URL}/index.html", wait_until="load")
        if mobile.locator(".splash-start").count():
            mobile.click(".splash-start")
        mobile.wait_for_selector(".home")
        mobile.wait_for_timeout(400)
        check(
            mobile.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1"),
            "Trang chủ mobile bị tràn ngang",
        )
        mobile.screenshot(path=str(OUT / "11-mobile-home.png"), full_page=True)
        mobile.evaluate(
            "() => KMApp.navigate('lesson', { lessonId: 'b1', preview: true })"
        )
        mobile.wait_for_selector(".race-intro")
        mobile.wait_for_timeout(350)
        mobile.screenshot(path=str(OUT / "11b-mobile-race-intro.png"))
        check(
            mobile.locator(".race-start-car").count() == 2,
            "Mobile: màn xuất phát không đúng 2 xe",
        )
        check(
            mobile.evaluate(
                "() => { const i = document.querySelector('.race-start-car');"
                " return i ? i.getBoundingClientRect().height : 0; }"
            ) >= 60,
            "Mobile: xe xuất phát quá nhỏ",
        )
        skip_race_intro(mobile)
        check(
            mobile.locator(".race-lane").count() == 2,
            "Mobile: HUD không đúng 2 tay đua",
        )
        check(
            mobile.evaluate(
                "() => { const i = document.querySelector('.race-car');"
                " return i ? i.getBoundingClientRect().height : 0; }"
            ) >= 40,
            "Mobile: xe trên đường đua quá nhỏ",
        )
        for lesson_id in lesson_ids:
            mobile.evaluate(
                "(id) => KMApp.navigate('lesson', { lessonId: id, preview: true })", lesson_id
            )
            mobile.wait_for_selector(".question-card")
            skip_race_intro(mobile)
            mobile.wait_for_timeout(60)
            info = mobile.evaluate(
                "() => ({ total: document.querySelectorAll('.choice').length,"
                " minChoice: Math.min.apply(null, Array.from(document.querySelectorAll('.choice'))"
                ".map((c) => c.getBoundingClientRect().height)),"
                " overflow: document.documentElement.scrollWidth > innerWidth + 1 })"
            )
            check(info["total"] >= 2, f"{lesson_id} thiếu lựa chọn trên mobile")
            check(not info["overflow"], f"{lesson_id} bị tràn ngang trên mobile")
            check(info["minChoice"] >= 64, f"{lesson_id} có nút < 64px trên mobile")
        mobile.evaluate("() => KMApp.navigate('lesson', { lessonId: 'b10', preview: true })")
        mobile.wait_for_selector(".question-card")
        skip_race_intro(mobile)
        mobile.wait_for_timeout(650)
        mobile.screenshot(path=str(OUT / "12-mobile-lesson.png"))
        mobile.close()

        # Giảm chuyển động: animation tắt, confetti ẩn.
        reduced = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="vi-VN",
            reduced_motion="reduce",
        )
        reduced_page = reduced.new_page()
        reduced_page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        reduced_page.on(
            "pageerror", lambda error: console_errors.append(f"pageerror: {error}")
        )
        reduced_page.goto(f"{BASE_URL}/index.html", wait_until="load")
        if reduced_page.locator(".splash-start").count():
            reduced_page.click(".splash-start")
        reduced_page.wait_for_selector(".home")
        reduced_info = reduced_page.evaluate(
            "() => ({ reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,"
            " hero: getComputedStyle(document.querySelector('.hero-car')).animationName })"
        )
        check(reduced_info["reduce"], "Trình duyệt không báo prefers-reduced-motion")
        check(reduced_info["hero"] == "none", "Ảnh xe vẫn chạy animation khi giảm chuyển động")
        reduced_page.evaluate(
            "() => KMApp.navigate('lesson', { lessonId: 'b10', preview: true })"
        )
        reduced_page.wait_for_selector(".question-card")
        skip_race_intro(reduced_page)
        reduced_q = current_question(reduced_page)
        click_choice(reduced_page, reduced_q["answer"])
        reduced_page.wait_for_selector(".confetti", state="attached", timeout=5000)
        check(
            reduced_page.evaluate(
                "() => getComputedStyle(document.querySelector('.confetti')).display"
            ) == "none",
            "Confetti vẫn hiện khi giảm chuyển động",
        )
        reduced.close()

        # Mở trực tiếp file://, không server.
        file_page = context.new_page()
        file_page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        file_page.on(
            "pageerror", lambda error: console_errors.append(f"pageerror: {error}")
        )
        file_url = (ROOT / "index.html").as_uri()
        file_page.goto(file_url, wait_until="load")
        if file_page.locator(".splash-start").count():
            file_page.click(".splash-start")
        file_page.wait_for_selector(".home")
        file_info = file_page.evaluate(
            "() => ({ lessons: document.querySelectorAll('.lesson-card').length,"
            " car: (() => { const i = document.querySelector('.hero-car');"
            " return !!(i && i.complete && i.naturalWidth > 0); })(),"
            " persistent: KMApp.ctx.progress.isPersistent(),"
            " speech: KMApp.ctx.speech.status().hasVietnameseVoice })"
        )
        check(file_info["lessons"] == 21, "file:// không đủ 21 bài")
        check(file_info["car"], "file:// không tải được ảnh xe")
        check(file_info["persistent"], "file:// không lưu được tiến độ")
        file_page.screenshot(path=str(OUT / "13-file-offline.png"), full_page=True)
        file_page.close()

        # AC-6: trình chạy unit test trong trình duyệt (117 test sau Giai đoạn C).
        test_page = context.new_page()
        watch_errors(test_page, console_errors)
        test_page.goto(f"{BASE_URL}/tests/test-runner.html", wait_until="load")
        test_page.wait_for_function("() => !!window.__TEST_RESULTS__", timeout=15000)
        unit_results = test_page.evaluate("() => window.__TEST_RESULTS__")
        check(
            unit_results["failed"] == 0,
            "Unit test runner có test lỗi: "
            + str([item for group in unit_results["suites"]
                   for item in group["tests"] if not item["pass"]][:3]),
        )
        check(
            unit_results["total"] == EXPECTED_UNIT_TESTS,
            f"Unit test runner có {unit_results['total']} test, "
            f"cần {EXPECTED_UNIT_TESTS}",
        )
        print(
            f"Unit test: {unit_results['passed']} PASSED / "
            f"{unit_results['failed']} FAILED (tổng {unit_results['total']})"
        )
        test_page.close()

        # AC-3: chơi lại bài đã có mảnh — số mảnh không tăng (context riêng).
        replay_ctx = browser.new_context(
            viewport={"width": 1280, "height": 900}, locale="vi-VN"
        )
        replay_page = replay_ctx.new_page()
        watch_errors(replay_page, console_errors)
        replay_page.goto(f"{BASE_URL}/index.html", wait_until="load")
        replay_page.evaluate(
            """() => localStorage.setItem('kidmath.v1', JSON.stringify({
              v: 1, createdAt: Date.now(),
              settings: { speech: true, sfx: true, unlockAll: false, allowRetry: true },
              lessons: { intro: { stars: 2, best: 3, plays: 1, lastPlayed: Date.now() } },
              puzzle: { v: 1, pieces: [0] }
            }))"""
        )
        replay_page.reload(wait_until="load")
        replay_page.click(".splash-start")
        replay_page.wait_for_selector(".home")
        replay_page.evaluate(RESTORE_RESULT)
        replay_page.wait_for_selector(".result-card")
        check(
            "đã có trong bộ sưu tập"
            in (replay_page.locator(".result-puzzle-strip").text_content() or ""),
            "Mảnh đã có nhưng thông điệp nhận mảnh không đúng",
        )
        replay_page.click(".result-actions .btn-soft")
        replay_page.wait_for_selector(".question-card")
        check(
            replay_page.evaluate("() => KMApp.current().debugState().lesson.id") == "intro",
            "Nút Chơi lại không mở lại bài intro",
        )
        play_lesson(replay_page)
        check(
            puzzle_pieces(replay_page) == [0],
            f"Chơi lại intro làm tăng số mảnh: {puzzle_pieces(replay_page)}",
        )
        replay_ctx.close()

        # AC-5: b20 dùng race có sẵn → vẫn có bục trao thưởng ở màn kết quả.
        errors_before_b20_result = len(console_errors)
        page.evaluate(
            """() => KMApp.navigate('result', {
              lessonId: 'b20',
              summary: { stars: 2, firstTryCorrect: 5, total: 8, bestStreak: 3 },
              record: { stars: 2, isNewBest: false, nextLessonId: null },
              race: {
                playerPlace: 1,
                racers: [
                  { id: 'mcqueen', name: 'McQueen', src: 'Asset/Mc_Queen.webp',
                    color: '#d94132', isPlayer: true, place: 1, score: 5, finalProgress: 100 },
                  { id: 'flo', name: 'Flo', src: 'Asset/Flo.webp',
                    color: '#38b6e6', isPlayer: false, place: 2, score: 4.4, finalProgress: 88 }
                ]
              }
            })"""
        )
        page.wait_for_selector(".result-card")
        check(page.locator(".podium-step").count() == 2, "b20: result thiếu bục 2 bậc")
        check(
            page.locator(".result-puzzle-strip").count() == 1,
            "b20: result thiếu dải nhận mảnh",
        )
        check_no_new_errors(console_errors, errors_before_b20_result, "b20 result")

        # OBS-01 mở rộng Giai đoạn C: 21 bài × 4 viewport (84 ảnh) + 4 ảnh intro.
        # Gom mọi failure lại, in hết, chụp đủ evidence RỒI mới FAIL gate.
        layout_failures: list[str] = []
        layout_observations: list[str] = []
        viewport_sizes = [
            ("desktop 1280x900", "1280x900", 1280, 900, False),
            ("tablet landscape 1024x768", "1024x768", 1024, 768, True),
            ("tablet portrait 768x1024", "768x1024", 768, 1024, False),
            ("mobile 390x844", "390x844", 390, 844, True),
        ]
        for vp_label, vp_key, vp_width, vp_height, flag_stage in viewport_sizes:
            vp_ctx = browser.new_context(
                viewport={"width": vp_width, "height": vp_height}, locale="vi-VN"
            )
            vp_page = vp_ctx.new_page()
            watch_errors(vp_page, console_errors)
            vp_page.goto(f"{BASE_URL}/index.html", wait_until="load")
            if vp_page.locator(".splash-start").count():
                vp_page.click(".splash-start")
            vp_page.wait_for_selector(".home")

            # Ảnh intro mỗi viewport + kiểm tra luồng home → gameIntro → lesson.
            enter_intro(
                vp_page, "intro", f"{vp_label} · intro",
                f"obs01-gameintro-{vp_key}.png",
            )
            vp_page.click(".game-intro .btn-primary")
            vp_page.wait_for_selector(".question-card", timeout=8000)
            check(
                vp_page.evaluate(
                    "() => sessionStorage.getItem('" + INTRO_FLAG_PREFIX + "intro')"
                ) == "1",
                f"{vp_label}: intro không ghi flag sau khi bấm Bắt đầu",
            )
            skip_race_intro(vp_page)
            vp_page.evaluate("() => KMApp.navigate('home')")
            vp_page.wait_for_selector(".home")

            for lesson_id in lesson_ids:
                # Cố định đề để measurement OBS-01 lặp lại được (đặc biệt b5 hay xấu nhất).
                vp_page.evaluate(
                    "(id) => { KMApp.ctx.rng = KM.Rng.create("
                    "id === 'b5' ? 'probe-b5-2' : 'obs01-' + id); }",
                    lesson_id,
                )
                vp_page.evaluate(
                    "(id) => KMApp.navigate('lesson', { lessonId: id, preview: true })",
                    lesson_id,
                )
                vp_page.wait_for_selector(".question-card", timeout=8000)
                skip_race_intro(vp_page)
                vp_page.wait_for_timeout(60)
                observe_layout(
                    vp_page,
                    lesson_id,
                    vp_label,
                    vp_key,
                    layout_failures,
                    layout_observations,
                    flag_stage_height=flag_stage,
                )
                vp_page.evaluate("() => KMApp.navigate('home')")
                vp_page.wait_for_selector(".home")
            vp_ctx.close()

        for observation in layout_observations:
            print("LAYOUT " + observation)
        for failure in layout_failures:
            print("LAYOUT-FAIL " + failure)
        # Luôn in tóm tắt OBS-01 để log PASS có số liệu, không chỉ log FAIL.
        if layout_failures:
            print(
                f"OBS-01: {len(layout_failures)} failures / "
                f"{len(layout_observations)} measurements — "
                "screenshots vẫn được lưu đầy đủ"
            )
        else:
            print(
                f"OBS-01: {len(layout_failures)} failures / "
                f"{len(layout_observations)} measurements — "
                "tất cả bài đạt ngân sách chiều cao stage"
            )
        browser.close()

    # Bỏ qua cảnh báo không phải lỗi của trình duyệt headless.
    real_errors = filter_console_errors(console_errors)
    check(not real_errors, "Lỗi console: " + " | ".join(real_errors))
    check(not bad_responses, "Tài nguyên lỗi: " + ", ".join(bad_responses[:5]))
    print(f"CONSOLE/HTTP: 0 lỗi console, 0 response >=400 ({len(console_errors)} raw)")

    # OBS-01 là gate cuối: mọi screenshot/evidence + console/404 đã được kiểm tra.
    check(
        not layout_failures,
        f"OBS-01 có {len(layout_failures)} lỗi layout: "
        + " | ".join(layout_failures[:6]),
    )

    print("PASS — smoke test hoàn tất")
    print(f"Ảnh chụp: {OUT}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as error:
        print(f"FAIL — {error}")
        sys.exit(1)