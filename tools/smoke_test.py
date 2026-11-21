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


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


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
        page.locator(".podium-card").count() == 2,
        "Màn kết quả thiếu podium 2 tay đua",
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

        page.click(".hero-actions .btn-primary")
        page.wait_for_selector(".question-card")
        page.wait_for_selector(".race-intro")
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / "03b-race-intro.png"))
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
        page.screenshot(path=str(OUT / "05-b1-question.png"))
        b1_stars = play_lesson(page, shot_prefix="06-b1")
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
        lesson_ids = page.evaluate(
            "() => KMApp.ctx.curriculum.lessons.map((lesson) => lesson.id)"
        )
        check(len(lesson_ids) == 21, f"Không đủ 21 màn: {len(lesson_ids)}")
        for lesson_id in lesson_ids:
            page.evaluate(
                "(id) => KMApp.navigate('lesson', { lessonId: id, preview: true })", lesson_id
            )
            page.wait_for_selector(".question-card")
            skip_race_intro(page)
            page.wait_for_timeout(100)
            info = page.evaluate(
                "() => ({ total: document.querySelectorAll('.choice').length,"
                " hasVisual: !!document.querySelector('.visual, .equation, .choice svg, .choice-glyph'),"
                " overflow: document.documentElement.scrollWidth > innerWidth + 1 })"
            )
            check(info["total"] >= 2, f"{lesson_id} thiếu lựa chọn")
            check(info["hasVisual"], f"{lesson_id} thiếu hình minh hoạ")
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

        browser.close()

    # Bỏ qua cảnh báo không phải lỗi của trình duyệt headless.
    real_errors = [
        error
        for error in console_errors
        if "favicon" not in error.lower() and "speech" not in error.lower()
    ]
    check(not real_errors, "Lỗi console: " + " | ".join(real_errors))
    check(not bad_responses, "Tài nguyên lỗi: " + ", ".join(bad_responses[:5]))

    print("PASS — smoke test hoàn tất")
    print(f"Ảnh chụp: {OUT}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as error:
        print(f"FAIL — {error}")
        sys.exit(1)