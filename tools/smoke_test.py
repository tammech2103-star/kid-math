"""Smoke test cho UI 21 module game độc lập (Playwright + Chrome có sẵn).

Cách chạy:
    python -m http.server 8765 --bind 127.0.0.1
    python tools/smoke_test.py

Script kiểm tra unit runner, home/lesson/result/collection, kênh km:answer,
reload progress, file://, mobile và reduced motion. Ảnh chụp lưu trong
production/qa/screenshots/. Thoát mã 1 nếu có kiểm tra thất bại.
"""
from __future__ import annotations

import pathlib
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

EXPECTED_UNIT_TESTS = 105
EXPECTED_LESSONS = 21
PUZZLE_SRC = "Asset/v2/vex/school-reward.svg"
RACE_SELECTORS = (
    ".race-pill, .race-intro, .race-hud, .race-lane, .race-car, "
    ".race-start-car, .race-vs, .podium, .podium-step, .result-car, "
    ".hero-car, .game-stage, .choices, .choice"
)
RACE_WORDS = ("cuộc đua", "mcqueen", "podium", "bục trao thưởng")


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def watch_errors(page, errors: list[str], bad_responses: list[str] | None = None) -> None:
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error" else None,
    )
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    if bad_responses is not None:
        page.on(
            "response",
            lambda response: bad_responses.append(f"{response.status} {response.url}")
            if response.status >= 400 else None,
        )


def filter_console_errors(errors: list[str]) -> list[str]:
    return [
        error for error in errors
        if "favicon" not in error.lower() and "speech" not in error.lower()
    ]


def check_no_new_errors(errors: list[str], before: int, label: str) -> None:
    new_errors = filter_console_errors(errors[before:])
    check(not new_errors, f"{label}: lỗi console mới: " + " | ".join(new_errors[:3]))


def check_no_race_ui(page, label: str) -> None:
    check(page.locator(RACE_SELECTORS).count() == 0,
          f"{label}: vẫn còn UI đua xe / podium / hàng .choices")
    text = (page.locator("body").inner_text() or "").lower()
    found = [word for word in RACE_WORDS if word in text]
    check(not found, f"{label}: còn text cũ {found}")


def start_app(page, *, clear_storage: bool = True) -> None:
    page.goto(f"{BASE_URL}/index.html", wait_until="load")
    if clear_storage:
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        page.reload(wait_until="load")
    if page.locator(".splash-start").count():
        page.click(".splash-start")
    page.wait_for_selector(".home", timeout=8000)


def check_home(page, label: str, shot: str) -> None:
    page.wait_for_selector(".lesson-card", timeout=8000)
    check(page.locator(".lesson-card").count() == EXPECTED_LESSONS,
          f"{label}: cần đúng {EXPECTED_LESSONS} lesson cards")
    check_no_race_ui(page, label)
    check(
        page.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1"),
        f"{label}: trang chủ bị tràn ngang",
    )
    collection_text = page.locator(".home-collection-btn").inner_text() or ""
    check("Bộ sưu tập Trường vui" in collection_text,
          f"{label}: nút bộ sưu tập sai tên: {collection_text}")
    page.screenshot(path=str(OUT / shot), full_page=True)


def check_lesson_mount(page, lesson_id: str, label: str) -> None:
    page.evaluate(
        "(id) => KMApp.navigate('lesson', { lessonId: id, preview: true })",
        lesson_id,
    )
    page.wait_for_selector(".game-mount", timeout=8000)
    info = page.evaluate(
        """() => {
          const mount = document.querySelector('.game-mount');
          const root = mount && mount.firstElementChild;
          return {
            count: document.querySelectorAll('.game-mount').length,
            gameId: mount ? mount.dataset.gameId : null,
            rootClass: root ? String(root.className) : '',
            legacy: document.querySelectorAll(
              '.race-hud, .race-intro, .race-lane, .podium, .result-car, .choices, .choice'
            ).length
          };
        }"""
    )
    check(info["count"] == 1, f"{label}: cần đúng 1 .game-mount, nhận {info['count']}")
    check(info["gameId"], f"{label}: .game-mount thiếu data-game-id")
    check("kmg-" in info["rootClass"],
          f"{label}: mount không có module root kmg-*: {info['rootClass']}")
    check(info["legacy"] == 0, f"{label}: lesson vẫn render UI cũ/choices")
    check_no_race_ui(page, label)


def check_all_lesson_modules(page, lesson_ids: list[str]) -> None:
    for lesson_id in lesson_ids:
        check_lesson_mount(page, lesson_id, f"lesson {lesson_id}")


def install_answer_capture(page) -> None:
    page.evaluate(
        """() => {
          window.__kmAnswers = [];
          document.addEventListener('km:answer', (event) => {
            window.__kmAnswers.push({
              value: event.detail ? event.detail.value : null,
              bubbles: event.bubbles
            });
          }, false);
        }"""
    )


def answer_count_module_by_touch(page, label: str, before: str) -> list:
    """Chạm đủ đồ rồi chọn số đúng; fallback click DOM khi viewport mobile chặn tap."""
    coins = page.locator(".game-mount .kmg-coin")
    check(coins.count() > 0, f"{label}: module đếm không render nút đồ")
    for index in range(coins.count()):
        coin = coins.nth(index)
        try:
            coin.tap(timeout=1500)
        except Exception:
            # Một số coin nằm ngoài visual viewport khi emulate mobile.
            coin.evaluate("(el) => el.click()")

    count_text = (page.locator(".game-mount .kmg-count").text_content() or "").strip()
    tokens = count_text.split()
    check(bool(tokens), f"{label}: không đọc được số lượng đã đếm")
    expected = tokens[0]
    hotspots = page.locator(".game-mount .kmg-num")
    labels = [item.strip() for item in hotspots.all_inner_texts()]
    check(expected in labels,
          f"{label}: không tìm thấy nút số {expected} trong {labels}")
    correct = hotspots.nth(labels.index(expected))
    try:
        correct.tap(timeout=1500)
    except Exception:
        # Hotspot có thể nằm dưới visual viewport; click DOM vẫn đi qua handler thật.
        correct.evaluate("(el) => el.click()")

    events = page.evaluate("() => window.__kmAnswers.slice()")
    check(events, f"{label}: tap/click không phát km:answer")
    check(all(item["value"] is not None for item in events),
          f"{label}: km:answer thiếu detail.value")
    check(all(item["bubbles"] for item in events),
          f"{label}: km:answer không bubbles")
    page.wait_for_function(
        """(previous) => {
          const node = document.querySelector('.question-progress');
          return (node && node.textContent.trim() !== previous) ||
            document.body.dataset.screen === 'result';
        }""",
        arg=before,
        timeout=3000,
    )
    return events


def answer_one_question(page, label: str, *, use_touch: bool = False) -> list:
    """Thử các nút trong module cho tới khi một đáp án làm câu hỏi tiến lên."""
    install_answer_capture(page)
    before = (page.locator(".question-progress").text_content() or "").strip()
    if use_touch and page.locator(".game-mount .kmg-coin").count():
        return answer_count_module_by_touch(page, label, before)
    classes = page.locator(".game-mount button").evaluate_all(
        "(buttons) => buttons.map((button) => button.className)"
    )
    total = len(classes)
    check(total > 0, f"{label}: module không render nút trả lời nào")
    # Với bài đếm phải chạm đủ đồ trước khi chạm số; thử các nút không phải
    # hotspot trước để fixture không bị coi là trả lời sai.
    order = sorted(
        range(total),
        key=lambda index: 1 if "kmg-num" in classes[index] or
        "kmg-hotspot" in classes[index] else 0,
    )

    for index in order:
        button = page.locator(".game-mount button").nth(index)
        try:
            if use_touch:
                try:
                    button.tap(timeout=1500)
                except Exception:
                    # Một số button bị lớp toast/confetti che trong mobile headless;
                    # click vẫn đi qua handler thật của module.
                    button.click(timeout=2000)
            else:
                button.click(timeout=2000)
        except Exception:
            continue

        events = page.evaluate("() => window.__kmAnswers.slice()")
        if not events:
            continue
        check(all(item["value"] is not None for item in events),
              f"{label}: km:answer thiếu detail.value")
        check(all(item["bubbles"] for item in events),
              f"{label}: km:answer không bubbles")
        try:
            page.wait_for_function(
                """(previous) => {
                  const node = document.querySelector('.question-progress');
                  return (node && node.textContent.trim() !== previous) ||
                    document.body.dataset.screen === 'result';
                }""",
                arg=before,
                timeout=2200,
            )
            return events
        except Exception:
            # Trả lời sai hiện toast 1.6s; đợi toast tắt trước khi thử nút kế.
            try:
                page.wait_for_selector(".toast", state="detached", timeout=2500)
            except Exception:
                pass
            continue

    raise AssertionError(f"{label}: click/tap không phát km:answer hợp lệ hoặc không tiến câu")


def check_unit_runner(browser) -> None:
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="vi-VN")
    page = context.new_page()
    errors: list[str] = []
    watch_errors(page, errors)
    page.goto(f"{BASE_URL}/tests/test-runner.html", wait_until="load")
    page.wait_for_function("() => !!window.__TEST_RESULTS__", timeout=20000)
    results = page.evaluate("() => window.__TEST_RESULTS__")
    summary_text = page.locator("#test-summary").inner_text() or ""
    check(results["total"] == EXPECTED_UNIT_TESTS,
          f"Unit runner: cần {EXPECTED_UNIT_TESTS} test, nhận {results['total']}")
    check(results["failed"] == 0,
          "Unit runner có test lỗi: " + ", ".join(
              f"{group['name']} › {test['name']}"
              for group in results["suites"]
              for test in group["tests"]
              if not test["pass"]
          )[:5])
    check(results["passed"] == EXPECTED_UNIT_TESTS,
          f"Unit runner: passed {results['passed']}/{results['total']}")
    check("PASS" in summary_text, f"Unit runner summary sai: {summary_text}")
    check(not filter_console_errors(errors), "Unit runner có lỗi console: " +
          " | ".join(filter_console_errors(errors)[:3]))
    page.screenshot(path=str(OUT / "11-unit-runner.png"), full_page=True)
    context.close()
    print(f"UNIT: PASS {results['passed']}/{results['total']}")


def check_result_screen(page, label: str, shot: str) -> None:
    page.evaluate(
        """() => KMApp.navigate('result', {
          lessonId: 'intro',
          summary: { stars: 2, firstTryCorrect: 3, total: 5, bestStreak: 2 },
          record: { stars: 2, isNewBest: false, nextLessonId: 'b1' }
        })"""
    )
    page.wait_for_selector(".result-card", timeout=8000)
    title = page.locator(".result-title").inner_text() or ""
    check(title in ("Tuyệt vời! Bé giỏi lắm!", "Bé làm tốt lắm!",
                    "Bé đã hoàn thành bài!"),
          f"{label}: title kết quả sai: {title}")
    check(page.locator(".result-stars .star").count() == 3,
          f"{label}: result thiếu 3 ô sao")
    check(page.locator(".confetti").count() > 0,
          f"{label}: result thiếu confetti")
    check(page.locator(".result-puzzle-strip").count() == 1,
          f"{label}: result thiếu banner mảnh ghép")
    check_no_race_ui(page, label)
    page.screenshot(path=str(OUT / shot), full_page=True)


def check_collection_and_puzzle(page, label: str, shot: str) -> None:
    src = page.evaluate("() => KMApp.ctx.puzzle.src()")
    check(src == PUZZLE_SRC, f"{label}: puzzle src sai: {src}")
    loaded = page.evaluate(
        """(src) => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth > 0);
          img.onerror = () => resolve(false);
          img.src = src;
        })""",
        src,
    )
    check(loaded, f"{label}: không tải được ảnh puzzle {src}")
    check((ROOT / src).is_file(), f"{label}: thiếu file {src}")

    page.evaluate("() => KMApp.navigate('collection')")
    page.wait_for_selector(".collection-title", timeout=8000)
    title = page.locator(".collection-title").inner_text() or ""
    check(title == "Bộ sưu tập Trường vui", f"{label}: title sai: {title}")
    check(page.locator(".puzzle-grid .puzzle-piece").count() == EXPECTED_LESSONS,
          f"{label}: lưới cần đúng {EXPECTED_LESSONS} mảnh")
    check_no_race_ui(page, label)
    page.screenshot(path=str(OUT / shot), full_page=True)


def check_reload_progress(page, label: str) -> None:
    page.evaluate(
        """() => KMApp.ctx.progress.recordResult('intro', {
          stars: 2, firstTryCorrect: 3, total: 5, bestStreak: 2
        })"""
    )
    page.reload(wait_until="load")
    if page.locator(".splash-start").count():
        page.click(".splash-start")
    page.wait_for_selector(".home", timeout=8000)
    total_stars = page.evaluate("() => KMApp.ctx.progress.totalStars()")
    pieces = page.evaluate("() => KMApp.ctx.puzzle.count()")
    check(total_stars >= 2, f"{label}: reload mất sao (totalStars={total_stars})")
    check(pieces >= 1, f"{label}: reload mất mảnh ghép (pieces={pieces})")
    check(int(page.locator(".star-total-value").inner_text() or "0") >= 2,
          f"{label}: home không hiện tổng sao sau reload")


def check_desktop(browser) -> None:
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="vi-VN",
        device_scale_factor=1,
    )
    page = context.new_page()
    errors: list[str] = []
    bad_responses: list[str] = []
    watch_errors(page, errors, bad_responses)
    start_app(page)
    check_home(page, "desktop home", "01-home.png")

    lesson_ids = page.evaluate(
        "() => KMApp.ctx.curriculum.lessons.map((lesson) => lesson.id)"
    )
    check(len(lesson_ids) == EXPECTED_LESSONS,
          f"Không đủ {EXPECTED_LESSONS} bài: {len(lesson_ids)}")
    errors_before = len(errors)
    check_all_lesson_modules(page, lesson_ids)
    check_no_new_errors(errors, errors_before, "21 lesson modules")

    page.evaluate("() => KMApp.navigate('lesson', { lessonId: 'intro', preview: true })")
    page.wait_for_selector(".game-mount", timeout=8000)
    events = answer_one_question(page, "desktop lesson")
    check(events, "desktop lesson: không bắt được km:answer")
    page.screenshot(path=str(OUT / "02-lesson-answer.png"), full_page=True)

    check_result_screen(page, "desktop result", "03-result.png")
    check_collection_and_puzzle(page, "desktop collection", "04-collection.png")
    check_reload_progress(page, "desktop reload")

    check(not filter_console_errors(errors),
          "Desktop có lỗi console: " + " | ".join(filter_console_errors(errors)[:3]))
    check(not bad_responses,
          "Desktop có request lỗi: " + " | ".join(bad_responses[:3]))
    context.close()
    print("DESKTOP: home/21 modules/answer/result/collection/reload OK")


def check_mobile(browser) -> None:
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        locale="vi-VN",
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    errors: list[str] = []
    watch_errors(page, errors)
    start_app(page)
    check_home(page, "mobile home", "05-mobile-home.png")
    check_lesson_mount(page, "intro", "mobile lesson")
    events = answer_one_question(page, "mobile lesson", use_touch=True)
    check(events, "mobile lesson: tap không phát km:answer")
    page.screenshot(path=str(OUT / "06-mobile-lesson.png"), full_page=True)
    check(not filter_console_errors(errors),
          "Mobile có lỗi console: " + " | ".join(filter_console_errors(errors)[:3]))
    context.close()
    print("MOBILE: home/lesson tap OK")


def check_reduced_motion(browser) -> None:
    context = browser.new_context(
        viewport={"width": 1024, "height": 768},
        locale="vi-VN",
        reduced_motion="reduce",
    )
    page = context.new_page()
    errors: list[str] = []
    watch_errors(page, errors)
    start_app(page)
    check(
        page.evaluate("() => matchMedia('(prefers-reduced-motion: reduce)').matches") is True,
        "Reduced-motion context không bật",
    )
    check_lesson_mount(page, "intro", "reduced lesson")
    check(
        page.locator(".game-mount .is-reduced").count() >= 1,
        "Module không nhận cờ reducedMotion",
    )
    page.screenshot(path=str(OUT / "07-reduced-motion.png"), full_page=True)
    check(not filter_console_errors(errors),
          "Reduced motion có lỗi console: " + " | ".join(filter_console_errors(errors)[:3]))
    context.close()
    print("REDUCED MOTION: module is-reduced OK")


def check_file_offline(browser) -> None:
    context = browser.new_context(viewport={"width": 1024, "height": 768}, locale="vi-VN")
    page = context.new_page()
    errors: list[str] = []
    watch_errors(page, errors)
    page.goto((ROOT / "index.html").as_uri(), wait_until="load")
    page.wait_for_selector(".splash-start", timeout=8000)
    check(page.locator(".splash-card").count() == 1, "file:// thiếu splash")
    check_no_race_ui(page, "file splash")
    page.screenshot(path=str(OUT / "08-file-offline.png"), full_page=True)
    check(not filter_console_errors(errors),
          "file:// có lỗi console: " + " | ".join(filter_console_errors(errors)[:3]))
    context.close()
    print("FILE://: splash OK")


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        try:
            check_unit_runner(browser)
            check_desktop(browser)
            check_mobile(browser)
            check_reduced_motion(browser)
            check_file_offline(browser)
        finally:
            browser.close()
    print(f"SMOKE PASS — screenshots: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
