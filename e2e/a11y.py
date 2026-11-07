import re, json
from playwright.sync_api import sync_playwright
B="http://localhost:3100"; AXE=open("node_modules/axe-core/axe.min.js").read()
out={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for scheme in ["light","dark"]:
        c=b.new_context(viewport={"width":390,"height":844},locale="ko-KR",color_scheme=scheme); pg=c.new_page()
        pg.goto(B); pg.wait_for_timeout(800)
        def scan(name):
            pg.add_script_tag(content=AXE)
            r=pg.evaluate("async () => (await axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']})).violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,ex:v.nodes.slice(0,2).map(n=>n.target.join(' '))}))")
            out[f"{scheme}:{name}"]=r; print(scheme,name,[(v['id'],v['impact'],v['n']) for v in r], flush=True)
        scan("welcome")
        pg.get_by_role("button",name="시작하기").click(); pg.get_by_role("radio",name=re.compile("^서울")).click(); pg.get_by_role("button",name="다음").click()
        pg.get_by_role("radio",name=re.compile("^부산")).click(); pg.get_by_role("button",name="다음").click(); pg.wait_for_timeout(500); scan("onboarding-ready")
        pg.get_by_role("button",name="나중에 할게요").click(); pg.wait_for_timeout(1000)
        for path in ["/","/map","/journal","/profile","/focus"]:
            pg.goto(B+path); pg.wait_for_timeout(1500); scan(path)
        pg.get_by_role("button",name=re.compile("^집중 시작")).click(); pg.wait_for_timeout(3000); scan("focus-active")
        c.close()
    b.close()
json.dump(out,open("audit/a11y.json","w"),indent=1,ensure_ascii=False)
