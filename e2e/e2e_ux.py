import re
import os
CHROME = {"executable_path": os.environ["WM_CHROME"]} if os.environ.get("WM_CHROME") else {}  # Google Chrome plays the AAC cabin audio; plain Chromium may not
import sys
from onb import onboard
from playwright.sync_api import sync_playwright, expect
BASE = "http://localhost:3100"; OUT = sys.argv[1]

def secs(t):
    p=[int(x) for x in t.split(":")]
    return p[0]*60+p[1] if len(p)==2 else p[0]*3600+p[1]*60+p[2]
def clock(n):
    return f"{n//60}:{n%60:02d}"
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

with sync_playwright() as p:
    browser = p.chromium.launch(**CHROME, args=["--no-sandbox"])
    # ---------------- phone ----------------
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ko-KR", timezone_id="Asia/Seoul", is_mobile=True, has_touch=True)
    page = ctx.new_page(); errors = []; dialogs = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    page.clock.install(time="2026-11-05T09:00:00+09:00")
    page.goto(BASE + "/")
    # onboarding language switch
    page.get_by_role("button", name="English").click()
    expect(page.get_by_role("heading", name="Every Minute Takes You Somewhere.")).to_be_visible()
    check("onboarding: switch to English on the first screen", True)
    check("onboarding: how-it-works steps shown", page.get_by_text("Land in a real city and collect its pixel-art postcard.").is_visible())
    page.screenshot(path=f"{OUT}/20-onboarding-en.png", full_page=True)
    page.get_by_role("button", name="한국어").click()
    onboard(page, "서울", "도쿄")
    # one-tap quick start
    page.get_by_role("button", name=re.compile("바로 시작")).click()
    page.wait_for_url("**/focus")
    expect(page.get_by_role("timer")).to_be_visible()
    start_t = secs(page.get_by_role("timer").inner_text())
    check("quick start: one tap from Home starts the flight (lands before 25 min)", 22*60 < start_t <= 23*60, clock(start_t))
    page.clock.fast_forward("01:00"); page.wait_for_timeout(300)
    title = page.title()
    check("tab title shows remaining time and destination", title.startswith(clock(start_t - 60)) and "도쿄" in title, title)
    # lock options folded
    check("lock-screen options folded by default", not page.get_by_role("switch", name=re.compile("기내 소음")).is_visible())
    # cancel through the sheet, then undo
    page.get_by_role("timer").click()  # wake the faded controls
    page.get_by_role("button", name="기록하지 않고 그만두기").click()
    sheet = page.get_by_role("alertdialog")
    expect(sheet).to_be_visible()
    check("cancel asks in an in-app sheet (no browser dialog)", "기록하지 않고 그만둘까요?" in sheet.inner_text() and not dialogs)
    page.screenshot(path=f"{OUT}/21-cancel-sheet.png")
    sheet.get_by_role("button", name="그만두기").click()
    expect(page.get_by_text("세션을 취소했어요")).to_be_visible()
    page.screenshot(path=f"{OUT}/22-undo-toast.png")
    page.clock.fast_forward("00:03"); page.wait_for_timeout(300)
    page.get_by_role("button", name="되돌리기").click()
    expect(page.get_by_role("timer")).to_be_visible()
    t = page.get_by_role("timer").inner_text()
    check("undo restores the session without counting the gap", start_t - 61 <= secs(t) <= start_t - 60, t)
    # finish early through the sheet → break → break-over notice
    page.get_by_role("button", name="지금 마치기").click()
    check("finish asks in an in-app sheet", "여기서 마칠까요?" in page.get_by_role("alertdialog").inner_text())
    page.get_by_role("alertdialog").get_by_role("button", name="지금 마치기").click()
    page.get_by_role("button", name="5분 휴식하기").click()
    expect(page.get_by_role("timer")).to_have_text("5:00")
    page.clock.fast_forward("05:30"); page.wait_for_timeout(800)
    expect(page.get_by_text("휴식이 끝났어요. 다음 비행을 준비할까요?")).to_be_visible()
    check("break end is announced with a next-flight action", page.get_by_role("link", name="다음 비행 시작").is_visible())
    # sticky start button reachable without scrolling
    page.goto(BASE + "/focus")
    btn = page.get_by_role("button", name=re.compile("^집중 시작"))
    box = btn.bounding_box()
    check("start button is in reach without scrolling", box is not None and box["y"] + box["height"] <= 844 - 60, f"bottom at {box and round(box['y'] + box['height'])}")
    page.screenshot(path=f"{OUT}/23-focus-setup-sticky.png")
    # map
    page.goto(BASE + "/map")
    svg = page.get_by_role("img", name="나의 경로가 표시된 세계 지도")
    expect(svg).to_be_visible()
    vb_route = svg.get_attribute("viewBox")
    page.get_by_role("button", name="전체 세계").click(); page.wait_for_timeout(700)
    vb_world = svg.get_attribute("viewBox")
    check("map shows the route zoomed in, and the whole world on request", vb_route != vb_world and vb_world.startswith("0 0 720"), f"{vb_route} → {vb_world}")
    page.get_by_role("button", name="내 경로").click(); page.wait_for_timeout(700)
    page.screenshot(path=f"{OUT}/24-map-phone.png", full_page=True)
    # dark theme
    page.goto(BASE + "/profile")
    page.get_by_role("radio", name="어둡게").click()
    theme = page.evaluate("() => [document.documentElement.dataset.theme, getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.body).color]")
    check("dark theme applies immediately (page and text colours)", theme[0] == "dark" and theme[1] == "rgb(23, 27, 43)" and theme[2] == "rgb(236, 228, 208)", str(theme))
    page.reload()
    check("dark theme survives reload (no light flash)", page.evaluate("() => document.documentElement.dataset.theme") == "dark")
    page.goto(BASE + "/map"); page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/25-map-dark.png", full_page=True)
    page.goto(BASE + "/"); page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/26-home-dark.png", full_page=True)
    # reset uses the sheet
    page.goto(BASE + "/profile")
    page.get_by_role("button", name="여행 기록 전체 삭제").click()
    check("erase asks in an in-app sheet", page.get_by_role("alertdialog").is_visible() and not dialogs)
    page.get_by_role("alertdialog").get_by_role("button", name="취소").click()
    check("no native browser dialogs anywhere", not dialogs, "; ".join(dialogs))
    check("no page errors on phone", not errors, "; ".join(errors))
    ctx.close()

    # ---------------- desktop: keyboard and arrival CTA ----------------
    c = browser.new_context(viewport={"width": 1280, "height": 860}, locale="en-US", timezone_id="Asia/Seoul")
    pg = c.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.clock.install(time="2026-11-05T09:00:00+09:00")
    pg.goto(BASE + "/")
    onboard(pg, "London", "Paris", "en")
    pg.get_by_role("button", name=re.compile("^(Start 25 min|Fly to)")).click()
    pg.wait_for_url("**/focus")
    pg.locator("body").click(position={"x": 5, "y": 5})
    pg.keyboard.press("Space")
    expect(pg.locator("main").get_by_text("Paused", exact=True)).to_be_visible()
    pg.keyboard.press("Space")
    check("Space pauses and resumes", pg.get_by_role("button", name="Pause").is_visible())
    pg.clock.fast_forward("25:10"); pg.wait_for_timeout(900)
    dlg = pg.get_by_role("dialog")
    expect(dlg).to_be_visible()
    check("arrival offers next flights and 'Somewhere else' when the route is done", dlg.get_by_role("region", name=re.compile("Next flights")).is_visible() and dlg.get_by_role("button", name="Somewhere else").is_visible())
    dlg.get_by_role("button", name="Somewhere else").click()
    pg.wait_for_url(BASE + "/")
    check("…and leads to the destination picker", pg.get_by_role("heading", name="Choose your next destination").is_visible())
    pg.goto(BASE + "/map"); pg.wait_for_timeout(700)
    pg.screenshot(path=f"{OUT}/27-map-desktop.png")
    check("no page errors on desktop", not errs, "; ".join(errs))
    c.close(); browser.close()
print(f"\n{sum(results)}/{len(results)} checks passed")
