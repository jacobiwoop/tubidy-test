from __future__ import annotations

import json
import time

from cloakbrowser import launch


URL = "https://www.chosic.com/playlist-generator/"


def main() -> None:
    browser = launch(headless=True, humanize=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()

    logs: list[str] = []
    page.on("request", lambda req: logs.append(f"REQ {req.method} {req.url}"))
    page.on("response", lambda res: logs.append(f"RES {res.status} {res.url}"))

    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass

    focus = page.get_by_text("Focus", exact=True).first
    focus.wait_for(state="visible", timeout=30000)
    focus.click()

    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        time.sleep(3)

    cookies = context.cookies()
    chosic_cookies = [
        c for c in cookies
        if "chosic.com" in c.get("domain", "") or c.get("name", "").startswith("r_")
    ]
    cookie_header = "; ".join(f"{c['name']}={c['value']}" for c in chosic_cookies)

    result = {
        "ok": True,
        "url": page.url,
        "title": page.title(),
        "cookies": chosic_cookies,
        "cookie_header": cookie_header,
        "network_tail": logs[-40:],
    }
    print(json.dumps(result, ensure_ascii=False))
    browser.close()


if __name__ == "__main__":
    main()
