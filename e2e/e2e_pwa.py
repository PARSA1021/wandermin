import re
import os
CHROME = {"executable_path": os.environ["WM_CHROME"]} if os.environ.get("WM_CHROME") else {}  # Google Chrome plays the AAC cabin audio; plain Chromium may not
import json, sys, urllib.request
from onb import onboard
from playwright.sync_api import sync_playwright, expect
BASE = "http://localhost:3100"; OUT = sys.argv[1]
results = []
def check(name, ok, detail=""):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))

# manifest and icons
m = json.loads(urllib.request.urlopen(BASE + "/manifest.webmanifest").read())
check("manifest: name, standalone display, start_url", m["name"] == "WANDERMIN" and m["display"] == "standalone" and m["start_url"] == "/", json.dumps({k: m[k] for k in ("name", "display", "start_url")}))
check("manifest: 192 + 512 + maskable icons", {i["sizes"] for i in m["icons"]} == {"192x192", "512x512"} and any(i["purpose"] == "maskable" for i in m["icons"]))
for i in m["icons"]:
    r = urllib.request.urlopen(BASE + i["src"]); check(f"icon served {i['src']}", r.status == 200 and r.headers["Content-Type"] == "image/png")
html = urllib.request.urlopen(BASE + "/").read().decode()
check("iOS home-screen meta + apple-touch-icon present", 'apple-mobile-web-app-title' in html and 'apple-touch-icon' in html)
for f in ("/audio/cabin.m4a", "/audio/cabin.mp3", "/audio/chime.m4a", "/sw.js"):
    check(f"asset served {f}", urllib.request.urlopen(BASE + f).status == 200)

with sync_playwright() as p:
    browser = p.chromium.launch(**CHROME, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, locale="ko-KR", timezone_id="Asia/Seoul", is_mobile=True, has_touch=True)
    ctx.grant_permissions(["notifications"], origin=BASE)
    page = ctx.new_page(); errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE + "/")
    page.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
    page.wait_for_timeout(1500)  # let install precache finish
    page.reload()
    controlled = page.evaluate("() => !!navigator.serviceWorker.controller")
    check("service worker installed and controlling the page", controlled)
    cached = page.evaluate("async () => { const k = await caches.keys(); const c = await caches.open(k[0]); return (await c.keys()).map(r => new URL(r.url).pathname); }")
    check("app shell, build assets and audio precached", "/" in cached and "/focus" in cached and any(u.startswith("/_next/static/") for u in cached) and "/audio/chime.m4a" in cached, f"{len(cached)} entries")

    # plan a trip, turn on both lock-screen features, start
    onboard(page, "서울", "도쿄")
    page.goto(BASE + "/focus")
    (page.get_by_role("button", name="설정 바꾸기").click() if page.get_by_role("button", name="설정 바꾸기").count() else None, page.get_by_text("잠금 화면에 비행 보기"))[1].click()  # options are folded by default
    page.get_by_role("switch", name=re.compile("기내 소음")).click()
    page.get_by_role("switch", name="착륙 알림").click()
    expect(page.get_by_role("switch", name="착륙 알림")).to_have_attribute("aria-checked", "true")
    page.get_by_role("button", name=re.compile("^집중 시작")).click()
    page.wait_for_timeout(1500)
    md = page.evaluate("() => ({ title: navigator.mediaSession.metadata?.title, artist: navigator.mediaSession.metadata?.artist, state: navigator.mediaSession.playbackState })")
    check("lock-screen media card shows the flight", md["title"] == "도쿄행 비행 중" and md["state"] == "playing", json.dumps(md, ensure_ascii=False))
    check("lock-screen media card shows the landing time", "착륙 예정" in (md["artist"] or ""), md["artist"])
    notes = page.evaluate("async () => (await (await navigator.serviceWorker.ready).getNotifications()).map(n => ({ title: n.title, body: n.body, tag: n.tag }))")
    check("lock-screen notice posted with landing time", len(notes) == 1 and notes[0]["title"] == "도쿄행 비행 중" and "착륙 예정" in notes[0]["body"], json.dumps(notes, ensure_ascii=False))
    page.get_by_role("button", name="일시정지").click()
    page.wait_for_timeout(500)
    md = page.evaluate("() => ({ state: navigator.mediaSession.playbackState, artist: navigator.mediaSession.metadata?.artist })")
    check("pausing updates the lock-screen card", md["state"] == "paused" and "일시정지" in (md["artist"] or ""), json.dumps(md, ensure_ascii=False))
    notes = page.evaluate("async () => (await (await navigator.serviceWorker.ready).getNotifications()).map(n => n.body)")
    check("pausing updates the notice", len(notes) == 1 and "일시정지" in notes[0], json.dumps(notes, ensure_ascii=False))
    page.screenshot(path=f"{OUT}/10-phone-lockscreen-options.png", full_page=True)
    page.get_by_role("button", name="취소").click() if False else None

    # offline: reload and navigate with the network cut
    ctx.set_offline(True)
    page.goto(BASE + "/journal")
    expect(page.get_by_role("heading", name="엽서함")).to_be_visible()
    check("works offline: journal loads from cache", True)
    expect(page.get_by_text("오프라인 · 기록은 이 기기에 저장돼요")).to_be_visible()
    check("offline banner shown", True)
    page.goto(BASE + "/focus")
    expect(page.get_by_role("timer")).to_be_visible()
    check("works offline: running session restored on /focus", True)
    page.screenshot(path=f"{OUT}/11-phone-offline.png", full_page=True)
    ctx.set_offline(False)
    check("no page errors", not errors, "; ".join(errors))
    browser.close()
print(f"\n{sum(results)}/{len(results)} checks passed")
