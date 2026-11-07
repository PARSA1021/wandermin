import re
import sys, json, re
from onb import onboard
from playwright.sync_api import sync_playwright, expect
B="http://localhost:3100"; OUT=sys.argv[1]; only=sys.argv[2:] 
VPS={
 "se1":(320,568,True),"se2":(375,667,True),"ip15":(390,844,True),"promax":(430,932,True),"android":(360,780,True),
 "se1-land":(568,320,True),"se2-land":(667,375,True),"ip15-land":(844,390,True),"promax-land":(932,430,True),
 "ipadmini":(768,1024,True),"ipadmini-land":(1024,768,True),"ipadair":(820,1180,True),"ipadair-land":(1180,820,True),
 "ipadpro":(1024,1366,True),"laptop":(1280,800,False),"desktop":(1440,900,False),"fhd":(1920,1080,False),"p430":(430,932,True),"p360":(360,800,True),"tab768":(768,1024,True),"wide":(2560,1440,False),
}
with sync_playwright() as p:
    br=p.chromium.launch()
    # seed: Seoul -> Tokyo arrived, next leg to Osaka chosen
    c=br.new_context(viewport={"width":390,"height":844},locale="ko-KR",timezone_id="Asia/Seoul")
    pg=c.new_page(); pg.clock.install(time="2026-11-05T09:00:00+09:00")
    pg.goto(B+"/"); onboard(pg,"서울","도쿄")
    pg.get_by_role("button",name=re.compile("바로 시작")).click(); pg.wait_for_url("**/focus")
    pg.clock.fast_forward("24:00"); pg.wait_for_timeout(800)
    pg.get_by_role("dialog").locator("[data-arrival-close]").click(); pg.wait_for_timeout(300)
    pg.goto(B+"/"); pg.get_by_role("button",name=re.compile("^오사카")).first.click(); pg.wait_for_timeout(500)
    # one tap took off; stop without saving to get an idle state with the Osaka leg planned
    pg.get_by_role("button",name="기록하지 않고 그만두기").click(); pg.get_by_role("alertdialog").get_by_role("button",name="그만두기").click(); pg.wait_for_timeout(300)
    idle=pg.evaluate("() => localStorage.getItem('wandermin.v1')")
    c.close()
    issues={}
    for name,(w,h,touch) in VPS.items():
        if only and name not in only: continue
        ctx=br.new_context(viewport={"width":w,"height":h},device_scale_factor=1,locale="ko-KR",timezone_id="Asia/Seoul",is_mobile=touch and w<1100,has_touch=touch)
        pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e: errs.append(str(e)))
        pg.clock.install(time="2026-11-05T11:00:00+09:00")
        def shot(tag, full=False):
            pg.wait_for_timeout(700)
            m=pg.evaluate("""() => {
              const d=document.documentElement, out=[];
              if (d.scrollWidth > innerWidth + 1) out.push('hscroll '+d.scrollWidth+'>'+innerWidth);
              for (const el of document.querySelectorAll('main *, [role=dialog] *, [role=alertdialog] *, nav *')) { if (el.closest('svg') || el.closest('.window-view')) continue;
                const r=el.getBoundingClientRect(); if (!r.width) continue;
                if (r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed') { out.push('overflow: '+(el.className||el.tagName).toString().slice(0,50)+' right='+Math.round(r.right)); break; }
              }
              for (const el of document.querySelectorAll('button, a')) {
                const r=el.getBoundingClientRect(); if (!r.width || r.height===0) continue;
                const st=getComputedStyle(el); if (st.visibility==='hidden') continue;
                if (el.scrollWidth > el.clientWidth + 2 && st.overflow!=='visible') out.push('clipped text: '+el.innerText.slice(0,30));
                if ((r.height < 36 || r.width < 36) && el.innerText.trim() && innerWidth < 1100) out.push('small target '+Math.round(r.width)+'x'+Math.round(r.height)+': '+el.innerText.slice(0,20));
              }
              return out;
            }""")
            if m: issues.setdefault(name,[]).append((tag,m[:6]))
            pg.screenshot(path=f"{OUT}/{name}-{tag}.png", full_page=full)
        # onboarding
        pg.goto(B+"/"); shot("onb1")
        pg.get_by_role("button",name="시작하기").click(); pg.get_by_role("button",name="다음").click(); pg.get_by_role("button",name="다음").click(); shot("onb4")
        # seeded idle state
        pg.evaluate("s => localStorage.setItem('wandermin.v1', s)", idle)
        for path in ["/","/map","/journal","/profile","/focus"]:
            pg.goto(B+path); shot(path.strip("/") or "home", full=True)
        # active session
        pg.get_by_role("button",name=re.compile("^집중 시작")).click(); pg.clock.fast_forward("03:00"); shot("focus-active")
        # arrival sheet
        pg.clock.fast_forward("10:00"); pg.wait_for_timeout(600); shot("arrival")
        pg.keyboard.press("Escape")
        # postcard viewer
        pg.goto(B+"/journal")
        try:
            pg.locator("main button[data-collected]").first.click(timeout=8000); shot("viewer")
        except Exception as e:
            pg.screenshot(path=f"{OUT}/{name}-viewer-FAIL.png", full_page=True)
            issues.setdefault(name,[]).append(("viewer", ["could not open a collected postcard: " + str(e).splitlines()[0][:80]]))
        if errs: issues.setdefault(name,[]).append(("errors",errs[:2]))
        ctx.close()
    print(json.dumps(issues,ensure_ascii=False,indent=1))
    br.close()
