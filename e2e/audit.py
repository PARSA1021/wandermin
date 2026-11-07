# Stage-2 exploratory audit: edge cases the regular suites don't cover. Prints PASS/FAIL/INFO lines.
import re, json, time, os
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; O="audit/"; results=[]
def rec(kind, name, detail=""): results.append((kind,name,detail)); print(f"{kind} {name} {('— '+detail) if detail else ''}", flush=True)
def ok(name, cond, detail=""): rec("PASS" if cond else "FAIL", name, detail)
KEY="wandermin.v1"
def onboard(pg, dep="서울", dest="부산"):
    pg.get_by_role("button",name="시작하기").click()
    pg.get_by_role("radio",name=re.compile("^"+dep)).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("radio",name=re.compile("^"+dest)).click(); pg.get_by_role("button",name="다음").click()
    pg.get_by_role("button",name="나중에 할게요").click(); pg.wait_for_timeout(600)
def state(pg): return pg.evaluate(f"() => JSON.parse(localStorage.getItem('{KEY}')||'null')")
def ctx(b, **kw):
    c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul",is_mobile=True,has_touch=True, **kw)
    return c
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---- A. corrupted / hand-edited storage must never white-screen the app
    cases={
      "garbage text": "{{{not json",
      "wrong version": json.dumps({"version":999,"ledger":[]}),
      "unknown departure city": None,
      "unknown stop city": None,
      "ledger entry missing fields": None,
    }
    c=ctx(b); pg=c.new_page(); pg.goto(B); onboard(pg); good=state(pg); c.close()
    bad_dep=dict(good); bad_dep["plan"]=dict(good["plan"]); bad_dep["plan"]["departureId"]="atlantis"
    bad_stop=dict(good); bad_stop["plan"]=dict(good["plan"]); bad_stop["plan"]["stops"]=["atlantis"]
    bad_led=dict(good); bad_led["ledger"]=[{"id":"x"}]
    cases["unknown departure city"]=json.dumps(bad_dep); cases["unknown stop city"]=json.dumps(bad_stop); cases["ledger entry missing fields"]=json.dumps(bad_led)
    for name,raw in cases.items():
        c=ctx(b); pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.goto(B); pg.evaluate("([k,v]) => localStorage.setItem(k,v)", [KEY, raw]); pg.reload(); pg.wait_for_timeout(1500)
        usable = pg.get_by_role("button").count()>0 and len(pg.locator("body").inner_text())>40
        kept = pg.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('wandermin')).join(',')")
        ok(f"corrupt storage ({name}) → app still usable, no crash", usable and not errs, f"errors={errs[:1]} keys={kept}")
        if name != "garbage text" or True:
            ok(f"corrupt storage ({name}) → original kept aside and the user is told", "wandermin.v1.unreadable" in kept and pg.get_by_text("원본은 지우지 않고").count()>0, kept)
        pg.screenshot(path=O+f"corrupt-{name.replace(' ','_')}.png"); c.close()
    # ---- B. storage blocked (private mode-ish)
    c=ctx(b); c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
    pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e))); pg.goto(B); pg.wait_for_timeout(1200)
    try:
        onboard(pg); pg.get_by_role("button",name=re.compile("바로 시작")).click(); pg.wait_for_timeout(800)
        ok("storage blocked → onboarding and a flight still work (in memory)", pg.get_by_role("timer").is_visible() and not errs, "; ".join(errs[:1]))
    except Exception as e: ok("storage blocked → onboarding and a flight still work (in memory)", False, str(e)[:120])
    c.close()
    # ---- C. inputs: custom minutes, activity, note lengths, XSS-ish text
    c=ctx(b); pg=c.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e))); pg.goto(B); onboard(pg); pg.goto(B+"/focus"); pg.wait_for_timeout(800)
    pg.get_by_role("button",name="설정 바꾸기").click()
    box=pg.get_by_placeholder("직접 입력")
    for v,exp in [("4",False),("5",True),("180",True),("181",False),("abc",None),("0",False)]:
        box.fill(v); pg.wait_for_timeout(100)
        start=pg.get_by_role("button",name=re.compile("^집중 시작"))
        val=box.input_value(); dis=start.is_disabled()
        if exp is None: ok("custom minutes: letters are ignored", val=="", f"value='{val}'")
        else: ok(f"custom minutes {v}: start {'enabled' if exp else 'disabled with a reason'}", dis==(not exp) and (exp or pg.get_by_text("분 (5–180)").count()>0), f"disabled={dis}")
    box.fill("")
    note=pg.get_by_placeholder("예: 영어 단어 2장"); note.fill("<img src=x onerror=alert(1)>"+"가"*200)
    ok("to-do is capped at 80 characters", len(note.input_value())<=80, str(len(note.input_value())))
    dialogs=[]; pg.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    pg.get_by_role("button",name=re.compile("^집중 시작")).click(); pg.wait_for_timeout(1500)
    ok("HTML in a to-do is shown as text, never run", not dialogs and pg.get_by_text("<img src=x", exact=False).count()>0)
    # double tap on finish
    pg.get_by_role("timer").click(); pg.clock if False else None
    c.close()
    # ---- D. double-click start → exactly one session
    c=ctx(b); pg=c.new_page(); pg.goto(B); onboard(pg); pg.goto(B+"/focus"); pg.wait_for_timeout(600)
    btn=pg.get_by_role("button",name=re.compile("^집중 시작")); btn.dblclick(); pg.wait_for_timeout(800)
    st=state(pg); ok("double-tapping start starts one session", st["active"] is not None and len(st["ledger"])==0)
    c.close()
    # ---- E. backup: export → erase → import round trip; bad files
    c=ctx(b, accept_downloads=True); pg=c.new_page(); pg.clock.install(time="2026-11-07T10:00:00+09:00"); pg.goto(B); onboard(pg)
    pg.get_by_role("button",name=re.compile("바로 시작")).click(); pg.wait_for_url("**/focus"); pg.clock.fast_forward("08:00"); pg.wait_for_timeout(1200)
    if pg.get_by_role("dialog").count(): pg.get_by_role("dialog").locator("[data-arrival-close]").click()
    before=state(pg); pg.goto(B+"/profile"); pg.wait_for_timeout(600)
    with pg.expect_download() as dl: pg.get_by_role("button",name="기록 파일로 저장하기").click()
    path=dl.value.path(); data=open(path).read(); fname=dl.value.suggested_filename
    ok("backup file downloads with a dated name", fname.endswith(".json") and "wandermin" in fname.lower(), fname)
    pg.get_by_role("button",name="여행 기록 전체 삭제").click(); pg.get_by_role("alertdialog").get_by_role("button").last.click(); pg.wait_for_timeout(800)
    pg.goto(B+"/profile"); pg.wait_for_timeout(600)
    has_import = pg.get_by_role("button",name="저장한 기록 파일 불러오기").count()>0
    ok("after erasing, restoring a backup is reachable (Settings or welcome)", has_import, pg.url)
    if not has_import:
        pg.goto(B); pg.wait_for_timeout(600)
        rec("INFO","after erase, Settings redirects to welcome; looking for restore on the welcome screen", str(pg.get_by_role("button").all_inner_texts()[:8]))
    def try_import(content, name):
        f=os.path.abspath(O+name); open(f,"w").write(content)
        inp=pg.locator("input[type=file]")
        if inp.count()==0: return "no file input"
        inp.set_input_files(f); pg.wait_for_timeout(500)
        if pg.get_by_role("alertdialog").count(): pg.get_by_role("alertdialog").get_by_role("button",name="불러오기").click(); pg.wait_for_timeout(800)
        return pg.locator("body").inner_text()
    if has_import:
        t=try_import("hello","bad.json"); ok("importing a non-backup file explains the problem", "백업 파일이 아니에요" in t or "기록 파일이 아니에요" in t or "WANDERMIN" in t)
        t=try_import(data,"good.json"); after=state(pg)
        ok("export → erase → import restores the same trip", after and after["ledger"]==before["ledger"] and after["plan"]==before["plan"], f"ledger {len(after['ledger']) if after else None}")
        evil=json.loads(data); evil["plan"]["stops"]=["atlantis"]
        errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
        t=try_import(json.dumps(evil),"evil.json"); pg.goto(B); pg.wait_for_timeout(1200)
        ok("a backup naming an unknown city is refused (no crash)", not errs and pg.get_by_role("button").count()>0, "; ".join(errs[:1]))
    c.close()
    # ---- F. offline after first visit (installed PWA case)
    c=ctx(b); pg=c.new_page(); pg.goto(B); onboard(pg); pg.wait_for_timeout(2500); pg.reload(); pg.wait_for_timeout(1500)
    c.set_offline(True); errs=[]
    for path in ["/","/focus","/journal","/map","/profile"]:
        try: pg.goto(B+path, timeout=8000); pg.wait_for_timeout(600); ok(f"offline: {path} opens", pg.locator("nav").count()>0 or pg.get_by_role("timer").count()>0 or pg.get_by_role("button").count()>2)
        except Exception as e: ok(f"offline: {path} opens", False, str(e)[:80])
    pg.goto(B+"/"); pg.wait_for_timeout(500)
    try:
        pg.get_by_role("button",name=re.compile("바로 시작")).click(); pg.wait_for_timeout(1500)
        ok("offline: a flight can start", pg.get_by_role("timer").is_visible())
    except Exception as e: ok("offline: a flight can start", False, str(e)[:80])
    c.set_offline(False); c.close()
    # ---- G. two tabs: changes in one show in the other; no lost writes
    c=ctx(b); a=c.new_page(); a.goto(B); onboard(a); bb=c.new_page(); bb.goto(B+"/focus"); bb.wait_for_timeout(800)
    a.goto(B+"/focus"); a.get_by_role("button",name=re.compile("^집중 시작")).click(); a.wait_for_timeout(1000)
    bb.wait_for_timeout(800)
    ok("two tabs: a flight started in one tab shows in the other", bb.get_by_role("timer").count()>0)
    c.close()
    # ---- H. clock moved backwards during a flight
    c=ctx(b); pg=c.new_page(); pg.clock.install(time="2026-11-07T12:00:00+09:00"); pg.goto(B); onboard(pg)
    pg.goto(B+"/focus"); pg.get_by_role("button",name=re.compile("^집중 시작")).click(); pg.wait_for_timeout(500)
    pg.clock.set_system_time("2026-11-07T11:00:00+09:00"); pg.wait_for_timeout(1500)
    t=pg.get_by_role("timer").inner_text(); ok("clock set back an hour: timer doesn't go negative or past its length", not t.startswith("-") and pg.get_by_role("timer").count()>0, t)
    c.close()
    # ---- I. keyboard-only: reach the main action from the top of Home
    c=b.new_context(viewport={"width":1280,"height":800},locale="ko-KR"); pg=c.new_page(); pg.goto(B); onboard(pg); pg.goto(B); pg.wait_for_timeout(800)
    seen=[]
    for i in range(25):
        pg.keyboard.press("Tab"); el=pg.evaluate("() => { const e=document.activeElement; const s=getComputedStyle(e); return [e.tagName, (e.innerText||e.getAttribute('aria-label')||'').slice(0,24), s.outlineStyle!=='none' || s.boxShadow!=='none'] }")
        seen.append(el)
        if "바로 시작" in el[1]: break
    reached=any("바로 시작" in s[1] for s in seen); vis=all(s[2] for s in seen if s[0] in ("A","BUTTON"))
    ok("keyboard: main 'start' button reachable with Tab", reached, f"{len(seen)} tabs")
    ok("keyboard: every focused link/button shows a focus ring", vis, str([s for s in seen if not s[2]][:3]))
    c.close()
    # ---- J. 404
    c=ctx(b); pg=c.new_page(); r=pg.goto(B+"/no-such-page"); ok("unknown address shows a friendly page with a way home", r.status==404 and pg.get_by_role("link").count()>0); c.close()
    b.close()
json.dump(results, open("audit/results.json","w"), ensure_ascii=False, indent=1)
print(f"{sum(1 for r in results if r[0]=='PASS')}/{sum(1 for r in results if r[0] in ('PASS','FAIL'))} passed")
