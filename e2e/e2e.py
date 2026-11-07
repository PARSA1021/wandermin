import re
import os
CHROME = {"executable_path": os.environ["WM_CHROME"]} if os.environ.get("WM_CHROME") else {}  # Google Chrome plays the AAC cabin audio; plain Chromium may not
import json, sys
from onb import onboard
from playwright.sync_api import sync_playwright, expect
BASE = "http://localhost:3100"
OUT = sys.argv[1]

def secs(t):
    p=[int(x) for x in t.split(":")]
    return p[0]*60+p[1] if len(p)==2 else p[0]*3600+p[1]*60+p[2]
def clock(n):
    return f"{n//60}:{n%60:02d}"
results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail)); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

def no_overflow(page, name):
    w = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    check(f"no horizontal overflow: {name}", w[0] <= w[1], f"{w[0]} <= {w[1]}")

with sync_playwright() as p:
    browser = p.chromium.launch(**CHROME, args=["--no-sandbox"])
    # ---------- phone, Korean, full first trip ----------
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ko-KR", timezone_id="Asia/Seoul", is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.install(time="2026-11-04T22:00:00+09:00")
    page.goto(BASE + "/")
    expect(page.get_by_role("button", name="시작하기")).to_be_visible()
    check("onboarding shown in device language (ko)", True)
    page.screenshot(path=f"{OUT}/01-phone-onboarding.png")
    onboard(page, "서울", "도쿄")
    expect(page.get_by_role("button", name=re.compile("바로 시작"))).to_be_visible()
    no_overflow(page, "phone home")
    page.screenshot(path=f"{OUT}/02-phone-home.png", full_page=True)
    page.get_by_role("link", name="시간·활동 바꾸기").click()
    page.wait_for_url("**/focus")
    page.screenshot(path=f"{OUT}/03-phone-focus-setup.png", full_page=True)
    page.get_by_role("button", name=re.compile("^집중 시작")).click()
    expect(page.get_by_role("timer")).to_be_visible()
    start_t = secs(page.get_by_role("timer").inner_text())
    check("Seoul→Tokyo is ~23 min of flight, so the 25-min session is shortened to land with the plane", 22*60 < start_t <= 23*60, clock(start_t))
    bottom_nav_hidden = page.locator("nav[aria-label=Main]").filter(has=page.locator("ul")).count() == 0
    check("bottom tabs hidden while focusing (distraction-free)", bottom_nav_hidden)
    page.clock.fast_forward("10:00")
    page.wait_for_timeout(400)
    t = page.get_by_role("timer").inner_text()
    check("timer counts from timestamps (10 min later)", secs(t) == start_t - 600, t)
    page.screenshot(path=f"{OUT}/04-phone-in-flight.png", full_page=True)
    # reload mid-session
    page.reload()
    expect(page.get_by_role("timer")).to_be_visible()
    t = page.get_by_role("timer").inner_text()
    check("timer recovers after reload", start_t - 601 <= secs(t) <= start_t - 600, t)
    # pause, wait, resume
    page.get_by_role("timer").click()  # a minute in, the controls have faded: a tap brings them back
    page.get_by_role("button", name="일시정지").click()
    page.clock.fast_forward("05:00")
    page.wait_for_timeout(300)
    t2 = page.get_by_role("timer").inner_text()
    check("paused time does not count", start_t - 603 <= secs(t2) <= start_t - 600, t2)  # a couple of real seconds pass while tapping
    page.get_by_role("button", name="다시 시작").click()
    page.clock.fast_forward("15:10")
    page.wait_for_timeout(800)
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    check("arrival sheet appears when Tokyo is reached", "도쿄에 오신 걸 환영해요!" in dialog.inner_text())
    page.screenshot(path=f"{OUT}/05-phone-arrival.png", full_page=True)
    page.get_by_role("dialog").locator("[data-arrival-close]").click()
    expect(dialog).to_have_count(0)
    st = page.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1'))")
    check("exactly one session recorded", len(st["ledger"]) == 1, json.dumps(st["ledger"]))
    check("recorded focus = the flight time, pause excluded", st["ledger"][0]["focusedMs"] == start_t * 1000, str(st["ledger"][0]["focusedMs"]))
    page.goto(BASE + "/journal")
    expect(page.get_by_role("heading", name="엽서함", exact=True)).to_be_visible()
    no_overflow(page, "phone journal")
    page.screenshot(path=f"{OUT}/06-phone-journal.png", full_page=True)
    # language switch → Japanese, in place
    page.goto(BASE + "/profile")
    page.locator("select").first.select_option("ja")
    expect(page.get_by_role("heading", name="設定")).to_be_visible()
    lang = page.evaluate("() => document.documentElement.lang")
    check("language switches in place and sets <html lang>", lang == "ja", lang)
    page.screenshot(path=f"{OUT}/07-phone-profile-ja.png", full_page=True)
    # session that finished while closed
    page.locator("select").first.select_option("ko")
    page.goto(BASE + "/focus")
    expect(page.get_by_text("다음 목적지를 골라 주세요")).to_be_visible()
    check("after arriving, Focus asks for the next destination first", True)
    page.get_by_role("button", name="오사카").first.click()  # one tap: picks Osaka and takes off
    page.wait_for_selector("main img[alt*='→']")
    pass_text = page.locator("main img[alt*='→']").first.get_attribute("alt") or ""
    check("live pass is for Tokyo → Osaka", "도쿄 → 오사카" in pass_text, pass_text)
    loaded = page.evaluate("() => { const i = document.querySelector(\"main img[alt*='→']\"); return !!i && i.complete && i.naturalWidth > 0 }")
    check("pass image is rendered by the worker (PNG loaded)", loaded)
    page.close()
    page = ctx.new_page(); page.on("pageerror", lambda e: errors.append(str(e)))
    page.clock.install(time="2026-11-05T01:00:00+09:00")
    page.goto(BASE + "/")
    expect(page.get_by_role("status")).to_be_visible()
    check("honest notice when a session completed while away", re.search(r"자리를 비운 사이 \d+분 세션이 완료되었어요", page.get_by_role("status").inner_text()) is not None)
    st = page.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1'))")
    check("away session recorded once", len(st["ledger"]) == 2)
    check("no page errors on phone", not errors, "; ".join(errors))
    ctx.close()

    # ---------- tablet and desktop layouts, English ----------
    for name, vp in [("tablet", {"width": 820, "height": 1180}), ("desktop", {"width": 1440, "height": 900})]:
        c = browser.new_context(viewport=vp, locale="en-US", timezone_id="Asia/Seoul")
        pg = c.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.install(time="2026-11-04T22:00:00+09:00")
        pg.goto(BASE + "/")
        onboard(pg, "Paris", "London", "en")
        pg.goto(BASE + "/focus")
        pg.get_by_role("button", name=re.compile("^Start focus")).click()
        pg.clock.fast_forward("04:00")
        pg.wait_for_timeout(500)
        if name == "desktop":
            pg.goto(BASE + "/")
            expect(pg.get_by_role("link", name="Home")).to_be_visible()
            h1 = pg.get_by_role("heading", level=1).inner_text()
            check("desktop Home shows the live flight during a session", h1.startswith("Flying to London"), h1)
        no_overflow(pg, name)
        pg.screenshot(path=f"{OUT}/08-{name}.png", full_page=True)
        check(f"no page errors on {name}", not errs, "; ".join(errs))
        c.close()
    browser.close()
print(f"\n{sum(r[1] for r in results)}/{len(results)} checks passed")
