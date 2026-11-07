# Real update scenario: build A is live and open in a browser; build B is deployed; the open app notices,
# offers the update, applies it on tap (mid-flight), and says it updated.
import re, subprocess, time, os
from playwright.sync_api import sync_playwright
APP=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); B="http://localhost:3100"; res=[]
def ok(n,c,d=""): res.append(c); print(("PASS " if c else "FAIL ")+n, d, flush=True)
def deploy(build):
    subprocess.run("pkill -f next-server; pkill -f 'next start'", shell=True)
    env=dict(os.environ, VERCEL_GIT_COMMIT_SHA=build)
    r=subprocess.run("npx next build", shell=True, cwd=APP, env=env, capture_output=True, text=True)
    assert r.returncode==0, r.stdout[-800:]+r.stderr[-800:]
    subprocess.Popen("nohup npx next start -p 3100 >/tmp/s.log 2>&1 &", shell=True, cwd=APP)
    for _ in range(60):
        try:
            import urllib.request; urllib.request.urlopen(B+"/version.json", timeout=2); break
        except Exception: time.sleep(0.5)
deploy("aaaaaaa1111")
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul"); pg=c.new_page()
    errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.goto(B); pg.get_by_role("button",name="시작하기").click(); pg.get_by_role("radio",name=re.compile("^서울")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("radio",name=re.compile("^오사카")).click(); pg.get_by_role("button",name="다음").click(); pg.get_by_role("button",name="나중에 할게요").click()
    pg.wait_for_timeout(2500)
    sw=pg.evaluate("async () => { const r = await navigator.serviceWorker.getRegistration(); return (r && (r.active||r.installing||r.waiting) || {}).scriptURL || null }")
    ok("service worker is named after the build", sw and "v=aaaaaaa" in sw, str(sw))
    pg.goto(B+"/profile"); pg.wait_for_timeout(800)
    ok("settings shows the running version", "aaaaaaa" in pg.locator("[data-version]").inner_text(), pg.locator("[data-version]").inner_text())
    pg.get_by_role("button",name="업데이트 확인").click(); pg.wait_for_timeout(1200)
    ok("'check for updates' says it's up to date", pg.locator("[data-update-status=latest]").count()==1, pg.locator("[data-about]").inner_text().replace("\n"," "))
    pg.screenshot(path="audit/about-latest.png")
    # start a flight, then a new build goes live
    pg.goto(B); pg.get_by_role("button",name=re.compile("바로 시작")).click(); pg.wait_for_url("**/focus"); pg.wait_for_timeout(2600)
    before=pg.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1')).active")
    deploy("bbbbbbb2222")
    pg.evaluate("() => document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(2000)
    ok("no update banner over a flight on the focus screen", pg.locator("[data-update=available]").count()==0)
    pg.goto(B+"/profile") if False else None
    # leave the focus screen in-app (client navigation keeps the old build running)
    pg.evaluate("() => history.back()"); pg.wait_for_timeout(300)
    pg.get_by_role("navigation").last.get_by_role("link",name="설정").click() if pg.get_by_role("navigation").count() else None
    pg.wait_for_timeout(1500)
    banner=pg.locator("[data-update=available]")
    ok("the open app notices the new build and offers to update", banner.count()==1 and "bbbbbbb" in banner.inner_text(), banner.inner_text().replace("\n"," ") if banner.count() else pg.url)
    pg.screenshot(path="audit/update-available.png")
    if banner.count():
        banner.get_by_role("button",name="지금 업데이트").click(); pg.wait_for_load_state("load"); pg.wait_for_timeout(2500)
    done=pg.locator("[data-update=done]")
    ok("after updating it says so, with the new version", done.count()==1 and "bbbbbbb" in done.inner_text(), done.inner_text().replace("\n"," ") if done.count() else "")
    pg.screenshot(path="audit/update-done.png")
    after=pg.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1')).active")
    ok("the flight in progress survives the update", after and before and after["id"]==before["id"])
    pg.wait_for_timeout(2000)
    sw=pg.evaluate("async () => { const r = await navigator.serviceWorker.getRegistration(); return (r && (r.active||r.waiting||r.installing) || {}).scriptURL || null }")
    ok("the new service worker took over", sw and "v=bbbbbbb" in sw, str(sw))
    pg.goto(B+"/profile"); pg.wait_for_timeout(800)
    ok("settings now shows the new version", "bbbbbbb" in pg.locator("[data-version]").inner_text())
    # plain refresh: nothing new → no banner; offline check → friendly message
    pg.reload(); pg.wait_for_timeout(4000)
    ok("a plain refresh with nothing new shows no banner", pg.locator("[data-update]").count()==0)
    c.set_offline(True); pg.get_by_role("button",name="업데이트 확인").click(); pg.wait_for_timeout(1200)
    ok("offline: the check explains it needs internet", pg.locator("[data-update-status=offline]").count()==1)
    c.set_offline(False)
    ok("no page errors", not errs, "; ".join(errs[:2]))
    b.close()
print(f"{sum(res)}/{len(res)} passed")
