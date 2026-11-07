import re, json
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; res=[]
def ok(n,c,d=""): res.append(c); print(("PASS " if c else "FAIL ")+n, d)
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul",is_mobile=True,has_touch=True)
    pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
    pg.clock.install(time="2026-11-06T21:00:00+09:00")
    pg.goto(B); pg.get_by_role("button",name="시작하기").click()
    pg.get_by_role("radio",name=re.compile("^서울")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("radio",name=re.compile("^부산")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("button",name=re.compile("^탑승하고")).click(); pg.wait_for_url("**/focus"); pg.wait_for_timeout(2700)
    ok("destination local time shown while flying", "부산 현지 시각 21:0" in pg.locator("[data-dest-time]").inner_text(), pg.locator("[data-dest-time]").inner_text())
    pg.clock.fast_forward("08:00"); pg.wait_for_timeout(1500)
    d=pg.get_by_role("dialog"); pg.screenshot(path="nx/1_arrival.png", full_page=False)
    lt=d.locator("[data-local-time]").inner_text().replace("\n"," ")
    ok("arrival shows local time and the difference", "현지 시각" in lt and "같은 시간대" in lt, lt)
    nf=d.get_by_role("region", name=re.compile("다음 비행"))
    txt=nf.inner_text().replace("\n"," "); ok("arrival offers next flights incl. a new country", nf.locator("[data-new-country]").count()>=1, txt)
    d.locator("[data-local-time]").scroll_into_view_if_needed(); pg.screenshot(path="nx/2_arrival_next.png")
    btn=nf.get_by_role("button").filter(has=pg.locator("[data-new-country]")).first
    city=btn.inner_text().split("\n")[0]
    btn.click(); pg.wait_for_url("**/focus"); pg.wait_for_timeout(1200)
    st=pg.evaluate("() => JSON.parse(localStorage.getItem('wandermin.v1'))")
    ok("one tap from the arrival sheet takes off to the new country", st["active"] is not None and pg.get_by_role("timer").is_visible(), f"{city} stops={st['plan']['stops']}")
    ok("no sheet left open and app still navigable", pg.get_by_role("dialog").count()==0 and "/focus" in pg.url)
    pg.screenshot(path="nx/3_flying.png")
    # back button should not reopen the arrival
    pg.go_back(); pg.wait_for_timeout(600)
    ok("back after taking off stays in the app", "localhost:3100" in pg.url and pg.get_by_role("dialog").count()==0, pg.url)
    # fitted duration: Osaka 829km=17min from Busan? check the home quick start uses landing
    pg.goto(B+"/journal"); pg.wait_for_timeout(1200)
    ok("no page errors", not errs, "; ".join(errs))
    b.close()
print(f"{sum(res)}/{len(res)} passed")
