# Frame smoothness on a throttled "phone": rAF frame intervals + long tasks per scenario.
import re, sys, json
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; RATE=float(sys.argv[1]) if len(sys.argv)>1 else 4; TAG=sys.argv[2] if len(sys.argv)>2 else "before"
PROBE = """() => { window.__f=[]; window.__lt=[]; let last=performance.now();
  const loop=t=>{ window.__f.push(t-last); last=t; if(window.__run) requestAnimationFrame(loop); }; window.__run=true; requestAnimationFrame(loop);
  try { new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({type:'longtask',buffered:false}); } catch(e){} }"""
STOP = """() => { window.__run=false; const f=window.__f.slice(2); const n=f.length; const sum=f.reduce((a,b)=>a+b,0);
  const jank=f.filter(x=>x>25).length; const big=f.filter(x=>x>50).length; const sorted=[...f].sort((a,b)=>a-b);
  return {fps: Math.round(n/(sum/1000)), frames:n, jank, big, p95: Math.round(sorted[Math.floor(n*.95)]||0), max: Math.round(sorted[n-1]||0),
          longTasks: window.__lt.length, longMs: Math.round(window.__lt.reduce((a,b)=>a+b,0))}; }"""
out={}
with sync_playwright() as p:
    b=p.chromium.launch(args=["--enable-gpu-rasterization"])
    c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul",is_mobile=True,has_touch=True,device_scale_factor=3)
    pg=c.new_page()
    # build a lived-in journey (5 arrivals) without throttling
    pg.goto(B); pg.get_by_role("button",name="시작하기").click()
    pg.get_by_role("radio",name=re.compile("^서울")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("radio",name=re.compile("^부산")).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("button",name="나중에 할게요").click(); pg.wait_for_timeout(500)
    st=pg.evaluate("() => localStorage.getItem('wandermin.v1')")
    seed=json.loads(st); import time
    now=int(time.time()*1000); day=86400000
    stops=["busan","osaka","kyoto","tokyo","seoul","shanghai"]
    km={"busan":325,"osaka":588,"kyoto":43,"tokyo":360,"seoul":1149,"shanghai":870}
    seed["plan"]["stops"]=stops
    seed["plan"]["addedAt"]=[now-30*day]*len(stops) if isinstance(seed["plan"].get("addedAt"),list) else seed["plan"].get("addedAt")
    ledger=[]; t=now-20*day
    for i,s in enumerate(stops[:5]):
        ms=int(km[s]/50*60000)+2000; t+=day
        ledger.append({"id":f"s{i}","completedAt":t,"focusedMs":ms,"kmPerMinute":50,"activity":"studying","startedAt":t-ms})
    seed["ledger"]=ledger; seed["pendingArrivals"]=[]
    pg.evaluate("s => localStorage.setItem('wandermin.v1', s)", json.dumps(seed))
    cdp=c.new_cdp_session(pg)
    def measure(name, action, settle=600):
        pg.wait_for_timeout(settle)
        cdp.send("Emulation.setCPUThrottlingRate",{"rate":RATE})
        pg.evaluate(PROBE); action(); r=pg.evaluate(STOP)
        cdp.send("Emulation.setCPUThrottlingRate",{"rate":1}); out[name]=r; print(name, r, flush=True)
    def scroll(steps=30, dy=120, wait=16):
        def f():
            for _ in range(steps): pg.mouse.wheel(0, dy); pg.wait_for_timeout(wait)
            for _ in range(steps): pg.mouse.wheel(0, -dy); pg.wait_for_timeout(wait)
        return f
    pg.goto(B); pg.wait_for_timeout(1500)
    print("seed ok:", pg.locator("h1").inner_text())
    # cold navigation timing to each tab (throttled)
    for path in ["/","/map","/journal","/profile","/focus"]:
        cdp.send("Emulation.setCPUThrottlingRate",{"rate":RATE})
        t0=time.time(); pg.goto(B+path, wait_until="load"); pg.wait_for_timeout(50); dt=time.time()-t0
        cdp.send("Emulation.setCPUThrottlingRate",{"rate":1}); out["load"+path]=round(dt*1000); print("load",path,round(dt*1000),"ms")
    pg.goto(B); measure("home-scroll", scroll(20))
    pg.goto(B+"/journal"); pg.wait_for_timeout(1500)
    sa=pg.get_by_role("button",name=re.compile("더 보기"))
    if sa.count(): sa.click()
    pg.wait_for_timeout(800); measure("journal-scroll", scroll(40), 1500)
    pg.goto(B+"/map"); measure("map-scroll", scroll(15))
    # client-side tab switching
    def tabs():
        for name in ["홈","지도","엽서함","설정","홈"]:
            pg.get_by_role("navigation").last.get_by_role("link",name=name,exact=True).click(); pg.wait_for_timeout(500)
    pg.goto(B); measure("tab-switch", tabs)
    # a sheet: postcard viewer from the journal
    pg.goto(B+"/journal"); pg.wait_for_timeout(1500)
    measure("open-postcard", lambda: (pg.locator("main button[data-collected]").first.click(), pg.wait_for_timeout(1200)))
    def swipe():
        box=pg.get_by_role("dialog").bounding_box(); x=195; y0=box["y"]+40
        cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y0}]})
        for i in range(1,31):
            cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x,"y":y0+i*3}]}); pg.wait_for_timeout(16)
        cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); pg.wait_for_timeout(400)
    measure("sheet-swipe", swipe, 300)
    pg.keyboard.press("Escape")
    # focus: takeoff + flying
    pg.goto(B+"/focus"); pg.wait_for_timeout(1000)
    measure("takeoff", lambda: (pg.get_by_role("button",name=re.compile("^집중 시작")).click(), pg.wait_for_timeout(2600)), 200)
    measure("flying-10s", lambda: pg.wait_for_timeout(10000))
    measure("flying-calm-10s", lambda: pg.wait_for_timeout(10000), 62000)
    b.close()
json.dump(out, open(f"perf-{TAG}-{int(RATE)}x.json","w"), indent=1)
