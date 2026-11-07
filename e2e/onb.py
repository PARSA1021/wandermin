import re
L = {"ko": ("시작하기", "다음", "나중에 할게요", "직항 더 보기"), "en": ("Get started", "Next", "Not now — go to Home", "More direct flights")}
def onboard(page, dep, dest, lang="ko"):
    start, nxt, later, more = L[lang]
    page.get_by_role("button", name=start).click()
    page.get_by_role("radio", name=re.compile("^" + dep)).click()
    page.get_by_role("button", name=nxt).click()
    target = page.get_by_role("radio", name=re.compile("^" + dest))
    if target.count() == 0:
        page.get_by_role("button", name=re.compile("^" + more)).click()
    target.click()
    page.get_by_role("button", name=nxt).click()
    page.get_by_role("button", name=later).click()
