import re
"""Realistic user simulation for WANDERMIN. Each persona runs a whole journey; every problem is logged."""
import sys, re, json, random, traceback
from playwright.sync_api import sync_playwright, expect
B = "http://localhost:3100"; OUT = sys.argv[1]; ONLY = sys.argv[2:]
findings = []
def note(persona, kind, msg, page=None):
    findings.append({"persona": persona, "kind": kind, "msg": msg[:300]})
    if page is not None:
        try: page.screenshot(path=f"{OUT}/{persona}-{len(findings)}.png")
        except Exception: pass

def instrument(page, persona):
    page.on("pageerror", lambda e: note(persona, "pageerror", str(e)))
    page.on("console", lambda m: m.type == "error" and note(persona, "console", m.text))
    page.on("response", lambda r: r.status >= 400 and "favicon" not in r.url and note(persona, f"http {r.status}", r.url))

def state(page): return page.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1') || 'null')")

def stuck_check(page, persona, where):
    """A screen is a dead end if nothing actionable is visible (judged after the app has loaded)."""
    try: page.wait_for_load_state("networkidle", timeout=4000)
    except Exception: pass
    page.wait_for_timeout(600)
    n = page.evaluate("""() => [...document.querySelectorAll('button, a[href], input, select')].filter(e => {
        const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.disabled; }).length""")
    if n == 0: note(persona, "dead-end", f"no actionable element on {where}", page)

def ctx_for(br, kind, locale, tz):
    if kind == "phone": return br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale=locale, timezone_id=tz)
    if kind == "tablet-land": return br.new_context(viewport={"width": 1180, "height": 820}, has_touch=True, is_mobile=True, locale=locale, timezone_id=tz)
    if kind == "phone-land": return br.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True, locale=locale, timezone_id=tz)
    return br.new_context(viewport={"width": 1440, "height": 900}, locale=locale, timezone_id=tz)

def run(name, fn, br, kind, locale, tz):
    if ONLY and name not in ONLY: return
    c = ctx_for(br, kind, locale, tz); p = c.new_page(); instrument(p, name)
    try: fn(p, c)
    except Exception as e:
        note(name, "FAILED STEP", f"{type(e).__name__}: {str(e).splitlines()[0]}", p)
        traceback.print_exc(limit=1)
    finally: c.close()

# ---------------------------------------------------------------- personas
def student_ko(p, c):
    """Korean student on an iPhone: first visit, first flight, closes the app, comes back, keeps going."""
    P = "student"
    p.clock.install(time="2026-11-05T20:00:00+09:00")
    p.goto(B + "/"); stuck_check(p, P, "welcome")
    p.get_by_role("button", name="시작하기").click()
    # tries the browser back button on step 2 (very common on phones)
    p.go_back(); p.wait_for_timeout(500)
    if "localhost:3100" not in p.url: note(P, "stuck", "browser back during onboarding leaves the app"); p.goto(B + "/")
    if p.get_by_role("button", name="시작하기").count(): p.get_by_role("button", name="시작하기").click()
    p.get_by_role("button", name="다음").click()
    p.get_by_role("radio", name=re.compile("^부산")).click()
    p.get_by_role("button", name="다음").click()
    p.get_by_role("button", name=re.compile("^탑승하고 집중 시작")).click()
    p.wait_for_url("**/focus"); stuck_check(p, P, "focus running")
    # locks the phone (page hidden) for 10 minutes, then opens it again
    p.evaluate("() => { Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }")
    p.clock.fast_forward("10:00")
    p.evaluate("() => { Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); }")
    p.wait_for_timeout(800)
    if p.get_by_role("dialog").count() == 0: note(P, "stuck", "came back after landing in Busan but no arrival sheet", p)
    else:
        txt = p.get_by_role("dialog").inner_text()
        if "부산" not in txt: note(P, "wrong", "arrival sheet not for Busan: " + txt[:60], p)
        # hardware back to close the sheet
        p.go_back(); p.wait_for_timeout(500)
        if "localhost:3100" not in p.url: note(P, "stuck", "back button with the arrival sheet open leaves the app"); p.goto(B + "/journal")
        if p.get_by_role("dialog").count(): p.get_by_role("dialog").locator("[data-arrival-close]").click()
    p.goto(B + "/"); stuck_check(p, P, "home after first arrival")
    # picks next destination from home
    sug = p.get_by_role("button", name=re.compile("^(제주|오사카)"))
    if sug.count() == 0: note(P, "dead-end", "home after arrival shows no next destination choices", p); return
    sug.first.click(); p.wait_for_timeout(500)
    if p.get_by_role("timer").count() == 0: note(P, "dead-end", "tapping a suggested city did not take off", p); return
    p.wait_for_url("**/focus")
    p.clock.fast_forward("03:00")
    p.get_by_role("timer").click()  # the controls have faded a minute in; a tap brings them back
    p.get_by_role("button", name="일시정지").click(); p.clock.fast_forward("05:00")
    p.reload(); p.wait_for_timeout(600)
    if p.get_by_role("button", name="다시 시작").count() == 0: note(P, "wrong", "paused state lost after reload", p)
    else: p.get_by_role("button", name="다시 시작").click()
    p.get_by_role("button", name="지금 마치기").click()
    p.get_by_role("alertdialog").get_by_role("button", name="지금 마치기").click(); p.wait_for_timeout(500)
    stuck_check(p, P, "after finishing early")
    st = state(p)
    if len(st["ledger"]) != 2: note(P, "wrong", f"expected 2 sessions, got {len(st['ledger'])}")
    # takes a break, closes the app for 2 hours
    br = p.get_by_role("button", name=re.compile("휴식"))
    if br.count(): br.first.click()
    p.close()
    p2 = c.new_page(); instrument(p2, P)
    p2.clock.install(time="2026-11-05T23:00:00+09:00")
    p2.goto(B + "/"); p2.wait_for_timeout(600); stuck_check(p2, P, "home next day")
    p2.goto(B + "/journal"); stuck_check(p2, P, "journal")
    if p2.locator("main button[data-collected]").count() < 1: p2.wait_for_timeout(1500)
    if p2.locator("main button[data-collected]").count() < 1: note(P, "wrong", "Busan postcard missing in journal", p2)

def worker_en_keyboard(p, c):
    """Office worker on a desktop, English, mostly keyboard: Paris start, reroutes far away, long multi-session flight."""
    P = "worker"
    p.clock.install(time="2026-11-05T09:00:00+01:00")
    p.goto(B + "/")
    # keyboard-only onboarding
    for _ in range(40):
        f = p.evaluate("() => document.activeElement && (document.activeElement.innerText||'').trim()")
        if f == "Get started": break
        p.keyboard.press("Tab")
    else: note(P, "a11y", "could not reach Get started with Tab")
    p.keyboard.press("Enter")
    p.get_by_role("radio", name=re.compile("^Paris")).focus(); p.keyboard.press("Space")
    p.get_by_role("button", name="Next").focus(); p.keyboard.press("Enter")
    p.get_by_role("button", name="Next").focus(); p.keyboard.press("Enter")
    p.get_by_role("button", name=re.compile("^Not now")).click()
    stuck_check(p, P, "home after onboarding (not now)")
    # reroute: wants to fly to Tokyo from Paris (multi-stop)
    p.goto(B + "/map")
    ch = p.get_by_role("button", name="Change destination")
    if ch.count(): ch.click()
    box = p.locator("#dest-search")
    if box.count() == 0: note(P, "dead-end", "no way to pick any city from the map page", p); return
    box.fill("tok"); p.wait_for_timeout(300)
    hit = p.get_by_role("list", name="Search results").get_by_role("button", name=re.compile("^Tokyo"))
    if hit.count() == 0: note(P, "dead-end", "searching 'tok' does not offer Tokyo", p); return
    hit.first.click(); p.wait_for_timeout(600)
    # picking a city now takes off at once; this persona wants 90-minute sessions, so stop and set up
    if p.get_by_role("timer").count():
        p.get_by_role("button", name="Stop without saving").click(); p.get_by_role("alertdialog").get_by_role("button", name="Stop").click(); p.wait_for_timeout(300)
    st = state(p); stops = st["plan"]["stops"]
    if stops[-1] != "tokyo": note(P, "wrong", f"route does not end in Tokyo: {stops}")
    # long multi-session flight with 90-minute sessions, using Space to pause/resume
    p.goto(B + "/focus")
    p.get_by_role("button", name="Change").click()
    p.get_by_role("button", name="90 min").click()
    for i in range(14):
        b = p.get_by_role("button", name=re.compile("^Start focus"))
        if b.count() == 0:
            if p.get_by_role("dialog").count(): p.get_by_role("dialog").locator("[data-arrival-close]").click(); continue
            note(P, "dead-end", f"no start button on session {i}", p); break
        b.click(); p.wait_for_timeout(200)
        p.keyboard.press("Space"); p.clock.fast_forward("02:00"); p.keyboard.press("Space")
        p.clock.fast_forward("01:31:00"); p.wait_for_timeout(700)
        while p.get_by_role("dialog").count():
            p.get_by_role("dialog").locator("[data-arrival-close]").click(); p.wait_for_timeout(300)
        st = state(p)
        if st["plan"]["stops"][-1] == "tokyo" and "tokyo" in [a for a in st["pendingArrivals"]]: break
        p.goto(B + "/focus")
        from_ = state(p)
        jour = [s for s in from_["ledger"]]
        if from_["active"] is None and p.get_by_text(re.compile("Choose your next destination")).count() and "tokyo" in [x for x in from_["plan"]["stops"]]:
            # arrived at Tokyo already
            break
    p.goto(B + "/journal"); p.wait_for_timeout(1200)
    cards = p.locator("main button[data-collected]").count()
    st = state(p)
    if cards < 3: note(P, "wrong", f"after the long trip only {cards} postcards; stops={st['plan']['stops']}", p)
    p.goto(B + "/map"); stuck_check(p, P, "map at the end")

def tablet_ja(p, c):
    """Japanese user on a tablet in landscape: Tokyo start, long-haul to Honolulu across sessions, language switch mid-flight."""
    P = "tablet"
    p.clock.install(time="2026-11-05T19:00:00+09:00")
    p.goto(B + "/")
    p.get_by_role("button", name="はじめる").click()
    p.get_by_role("button", name="次へ").click()
    more = p.get_by_role("button", name=re.compile("^ほかの直行便"))
    if more.count(): more.click()
    hn = p.get_by_role("radio", name=re.compile("^ホノルル"))
    if hn.count() == 0: note(P, "wrong", "Honolulu not offered from Tokyo", p); return
    hn.click(); p.get_by_role("button", name="次へ").click()
    p.get_by_role("button", name=re.compile("^搭乗して集中")).click(); p.wait_for_url("**/focus")
    p.clock.fast_forward("20:00")
    # switches the language to English mid-session from profile
    p.goto(B + "/profile")
    p.locator("select").first.select_option("en"); p.wait_for_timeout(300)
    if p.get_by_role("heading", name="Settings").count() == 0: note(P, "wrong", "language did not switch to English", p)
    p.goto(B + "/focus")
    if p.get_by_role("timer").count() == 0: note(P, "stuck", "running session lost after switching language", p)
    p.clock.fast_forward("06:00"); p.wait_for_timeout(600)
    # session ended (25 min) — not yet in Honolulu
    if p.get_by_role("dialog").count(): note(P, "wrong", "arrival shown after 25 of 124 minutes", p)
    p.goto(B + "/"); h = p.get_by_role("heading", level=1).inner_text()
    if "Honolulu" not in h and "%" not in h: note(P, "unclear", f"home headline mid-flight: {h}", p)
    st = state(p)
    if len(st["ledger"]) != 1: note(P, "wrong", f"ledger {len(st['ledger'])}")

def edge_cases(p, c):
    """Things people do by accident."""
    P = "edge"
    p.clock.install(time="2026-11-05T12:00:00+09:00")
    p.goto(B + "/focus")  # deep link before onboarding
    stuck_check(p, P, "focus deep link before onboarding")
    p.goto(B + "/does-not-exist"); stuck_check(p, P, "404 page")
    if p.get_by_role("link").count() == 0: note(P, "dead-end", "404 page has no way back", p)
    p.goto(B + "/")
    p.get_by_role("button", name="시작하기").click(); p.get_by_role("button", name="다음").click(); p.get_by_role("button", name="다음").click()
    p.get_by_role("button", name="나중에 할게요").click()
    # start and cancel immediately, undo, finish before 1 min
    p.goto(B + "/focus"); p.get_by_role("button", name=re.compile("^집중 시작")).click()
    p.clock.fast_forward("00:20")
    p.get_by_role("button", name="지금 마치기").click()
    body = p.get_by_role("alertdialog").inner_text()
    p.get_by_role("alertdialog").get_by_role("button", name="지금 마치기").click(); p.wait_for_timeout(300)
    if len(state(p)["ledger"]) != 0: note(P, "wrong", "a 20-second session was recorded")
    stuck_check(p, P, "after too-short finish")
    # two tabs
    p.get_by_role("button", name=re.compile("^집중 시작")).click()
    t2 = c.new_page(); instrument(t2, P); t2.clock.install(time="2026-11-05T12:01:00+09:00")
    t2.goto(B + "/focus"); t2.wait_for_timeout(500)
    if t2.get_by_role("timer").count() == 0: note(P, "wrong", "second tab does not show the running session", t2)
    t2.get_by_role("button", name="일시정지").click(); p.wait_for_timeout(600)
    if p.get_by_role("button", name="다시 시작").count() == 0: note(P, "wrong", "pause in tab 2 not reflected in tab 1", p)
    t2.close()
    # offline
    c.set_offline(True); p.goto(B + "/journal"); p.wait_for_timeout(500); stuck_check(p, P, "journal offline")
    c.set_offline(False)
    # reset everything
    p.goto(B + "/profile")
    p.get_by_role("button", name="여행 기록 전체 삭제").click()
    p.get_by_role("alertdialog").get_by_role("button", name="여행 기록 전체 삭제").click(); p.wait_for_timeout(300)
    p.goto(B + "/"); stuck_check(p, P, "home after reset")
    if p.get_by_role("button", name="시작하기").count() == 0 and p.get_by_role("button", name=re.compile("바로 시작")).count() == 0:
        note(P, "dead-end", "after reset, neither onboarding nor a start button", p)
    # dark mode
    p.goto(B + "/profile"); p.get_by_role("radio", name="어둡게").click(); p.goto(B + "/"); stuck_check(p, P, "dark home")
    bg = p.evaluate("() => getComputedStyle(document.documentElement).backgroundColor")
    if bg in ("rgb(244, 236, 216)",): note(P, "wrong", "dark mode did not apply", p)

def settings_and_taps(p, c):
    """Lock-screen options with permission denied, sound on, double-tapping Start, a 3-hour session, sheets and the back button."""
    P = "extras"
    p.clock.install(time="2026-11-05T14:00:00+09:00")
    p.goto(B + "/")
    p.get_by_role("button", name="시작하기").click(); p.get_by_role("button", name="다음").click(); p.get_by_role("button", name="다음").click()
    p.get_by_role("button", name="나중에 할게요").click()
    # step back through onboarding with the browser back button after finishing: must not reopen onboarding
    p.go_back(); p.wait_for_timeout(500)
    if p.get_by_role("button", name="시작하기").count(): note(P, "wrong", "back after onboarding shows onboarding again", p)
    p.goto(B + "/focus")
    (p.get_by_role("button", name="설정 바꾸기").click() if p.get_by_role("button", name="설정 바꾸기").count() else None)
    opt = p.get_by_role("button", name=re.compile("잠금 화면에 비행"))
    if opt.count(): opt.first.click()
    p.context.grant_permissions([])  # notifications denied
    sw = p.get_by_role("switch", name=re.compile("착륙 알림"))
    if sw.count():
        sw.click(); p.wait_for_timeout(500)
        if sw.get_attribute("aria-checked") == "true": note(P, "wrong", "notification switch on although permission denied", p)
        if p.get_by_text(re.compile("허용|설정|알림을")).count() == 0: note(P, "unclear", "no explanation when notification permission is denied", p)
    snd = p.get_by_role("switch", name=re.compile("기내 소음"))
    if snd.count(): snd.click(); p.wait_for_timeout(300)
    # 3-hour custom session, double tap on start
    p.get_by_placeholder("직접 입력").first.fill("180")
    start = p.get_by_role("button", name=re.compile("^집중 시작"))
    start.dblclick(); p.wait_for_timeout(500)
    st = state(p)
    if st["active"] is None: note(P, "wrong", "custom 180-minute session did not start", p)
    if p.get_by_role("timer").count() and ":" in p.get_by_role("timer").inner_text() and p.get_by_role("timer").inner_text().count(":") == 1 and st["active"] and st["active"]["plannedMs"] >= 3600000:
        note(P, "wrong", "hour-long timer shown without hours: " + p.get_by_role("timer").inner_text())
    p.get_by_role("button", name="기록하지 않고 그만두기").click(); p.get_by_role("alertdialog").get_by_role("button", name="그만두기").click(); p.wait_for_timeout(300)
    if state(p)["active"] is not None: note(P, "wrong", "session not cancelled")
    # postcard viewer + back button
    p.goto(B + "/focus"); p.get_by_role("button", name=re.compile("^집중 시작")).click(); p.clock.fast_forward("30:00"); p.wait_for_timeout(800)
    if p.get_by_role("dialog").count(): p.get_by_role("dialog").locator("[data-arrival-close]").click()
    p.goto(B + "/journal"); p.wait_for_timeout(1200)
    cards = p.locator("main button[data-collected]")
    if cards.count():
        cards.first.click(); p.wait_for_timeout(300)
        p.go_back(); p.wait_for_timeout(500)
        if p.get_by_role("dialog").count(): note(P, "stuck", "back button doesn't close the postcard viewer", p)
        if "/journal" not in p.url: note(P, "wrong", "back with the postcard open left the journal: " + p.url, p)
    else: note(P, "wrong", "no postcard after a full session", p)

def monkey(p, c):
    """Random tapping for a long time, with time jumps, on a landscape phone."""
    P = "monkey"; rnd = random.Random(7)
    p.clock.install(time="2026-11-05T08:00:00+09:00")
    p.goto(B + "/")
    p.get_by_role("button", name="시작하기").click(); p.get_by_role("button", name="다음").click(); p.get_by_role("button", name="다음").click()
    p.get_by_role("button", name="나중에 할게요").click()
    stuck_streak = 0
    for i in range(350):
        els = p.locator("button:visible, a[href]:visible, [role=radio]:visible")
        n = els.count()
        if n == 0:
            stuck_streak += 1
            if stuck_streak > 3: note(P, "dead-end", f"nothing to tap at {p.url}", p); p.goto(B + "/"); stuck_streak = 0
            continue
        stuck_streak = 0
        el = els.nth(rnd.randrange(n))
        label = (el.inner_text() or el.get_attribute("aria-label") or "")[:20]
        if re.search(r"삭제|Erase|Restore|불러오기|English|日本語|Share|공유", label): continue  # keep the run in one language with data
        try: el.click(timeout=1500)
        except Exception: pass
        if rnd.random() < 0.15: p.clock.fast_forward(f"{rnd.randint(1, 40):02d}:00")
        if rnd.random() < 0.05: p.go_back()
        if rnd.random() < 0.03: p.reload()
        if "localhost:3100" not in p.url: p.goto(B + "/")
        p.wait_for_timeout(60)
    st = state(p)
    print("monkey end:", {"sessions": len(st["ledger"]) if st else None, "stops": st["plan"]["stops"] if st and st.get("plan") else None})

with sync_playwright() as pw:
    br = pw.chromium.launch()
    run("student", student_ko, br, "phone", "ko-KR", "Asia/Seoul")
    run("worker", worker_en_keyboard, br, "desktop", "en-GB", "Europe/Paris")
    run("tablet", tablet_ja, br, "tablet-land", "ja-JP", "Asia/Tokyo")
    run("edge", edge_cases, br, "phone", "ko-KR", "Asia/Seoul")
    run("extras", settings_and_taps, br, "phone", "ko-KR", "Asia/Seoul")
    run("monkey", monkey, br, "phone-land", "ko-KR", "Asia/Seoul")
    br.close()
seen = set(); uniq = []
for f in findings:
    k = (f["persona"], f["kind"], re.sub(r"\d+", "#", f["msg"])[:120])
    if k not in seen: seen.add(k); uniq.append(f)
print(json.dumps(uniq, ensure_ascii=False, indent=1))
print(f"{len(uniq)} distinct findings")
