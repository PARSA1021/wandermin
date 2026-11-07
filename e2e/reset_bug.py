import sys, re
import os
CHROME = {"executable_path": os.environ["WM_CHROME"]} if os.environ.get("WM_CHROME") else {}  # Google Chrome plays the AAC cabin audio; plain Chromium may not
from onb import onboard
from playwright.sync_api import sync_playwright, expect
B="http://localhost:3100"; OUT=sys.argv[1]; res=[]
def check(n, ok, d=""): res.append(ok); print(("PASS " if ok else "FAIL ")+n+(f" — {d}" if d else ""))
with sync_playwright() as p:
    br=p.chromium.launch(**CHROME, args=["--no-sandbox"])
    for label, size in [("phone", (390, 844)), ("desktop", (1280, 800))]:
        c=br.new_context(viewport={"width":size[0],"height":size[1]},is_mobile=label=="phone",has_touch=label=="phone",locale="ko-KR",timezone_id="Asia/Seoul")
        pg=c.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(B+"/"); onboard(pg,"서울","도쿄")
        pg.goto(B+"/journal"); pg.goto(B+"/profile")
        pg.get_by_role("button",name="여행 기록 전체 삭제").click()
        pg.get_by_role("alertdialog").get_by_role("button",name="여행 기록 전체 삭제").click()
        pg.wait_for_timeout(900)
        pg.screenshot(path=f"{OUT}/reset-{label}.png")
        nav_links = pg.locator("nav[aria-label=Main] a:visible").count()
        on_welcome = pg.get_by_role("button", name="시작하기").count() > 0
        check(f"{label}: after erasing, the user lands somewhere they can continue (welcome screen or visible tabs)", on_welcome or nav_links > 0, f"url={pg.url} tabs={nav_links} welcome={on_welcome}")
        pg.go_back(); pg.wait_for_timeout(600)
        check(f"{label}: back button after erasing stays in the app with something to do", "localhost:3100" in pg.url and (pg.get_by_role("button", name="시작하기").count() > 0 or pg.locator("nav[aria-label=Main] a:visible").count() > 0), pg.url)
        pg.goto(B+"/profile"); pg.wait_for_timeout(500)
        check(f"{label}: profile (with no trip) still offers navigation", pg.locator("nav[aria-label=Main] a:visible").count() > 0)
        check(f"{label}: no page errors", not errs, "; ".join(errs[:2]))
        c.close()
    br.close()
print(f"{sum(res)}/{len(res)} passed")
