# How much the focus screen draws while flying: compositor frames, main-thread work, style/layout/paint per 10 s.
import re, sys, json, collections
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; TAG=sys.argv[1] if len(sys.argv)>1 else "x"
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul",is_mobile=True,has_touch=True,device_scale_factor=3)
    pg=c.new_page()
    pg.goto(B); pg.get_by_role("button",name="시작하기").click()
    pg.get_by_role("radio",name=re.compile("^서울")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("radio",name=re.compile("^오사카")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("button",name=re.compile("^탑승하고")).click(); pg.wait_for_url("**/focus")
    out={}
    def window(name, secs=10):
        b.start_tracing(page=pg, categories=["devtools.timeline","disabled-by-default-devtools.timeline","viz","cc","benchmark"])
        pg.wait_for_timeout(secs*1000)
        ev=json.loads(b.stop_tracing())["traceEvents"]
        names={(e["pid"],e["tid"]):e["args"]["name"] for e in ev if e.get("ph")=="M" and e.get("name")=="thread_name"}
        main=collections.Counter(); 
        frames=sum(1 for e in ev if e.get("name") in ("DrawFrame","Graphics.Pipeline.DrawAndSwap") and e.get("ph") in ("X","b","I","i"))
        draws=sum(1 for e in ev if e.get("name")=="Display::DrawAndSwap")
        busy=sum(e.get("dur",0) for e in ev if e.get("ph")=="X" and e.get("name")=="RunTask" and names.get((e["pid"],e["tid"]))=="CrRendererMain")
        for e in ev:
            if e.get("ph")=="X" and names.get((e["pid"],e["tid"]))=="CrRendererMain" and e.get("name") in ("Paint","UpdateLayoutTree","Layout","FunctionCall"): main[e["name"]]+=1
        r={"swaps":draws,"frames":frames,"mainBusyMs":round(busy/1000),**main}; out[name]=r; print(name, r, flush=True)
    pg.wait_for_timeout(3000); window("flying")
    pg.wait_for_timeout(60000); window("calm"); pg.screenshot(path=f"power-calm-{TAG}.png")
    pg.get_by_role("timer").click(); pg.get_by_role("button",name="일시정지").click(); pg.wait_for_timeout(1500); window("paused")
    json.dump(out, open(f"power-{TAG}.json","w"))
    b.close()
