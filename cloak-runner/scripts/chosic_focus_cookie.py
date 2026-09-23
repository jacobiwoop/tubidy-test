from __future__ import annotations

import json
import time

from cloakbrowser import launch


URL = "https://www.chosic.com/playlist-generator/"
APP_NAME = "playlist_generator"


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

    # Chosic now issues its anonymous API token during the page handshake.
    # The former Focus click no longer exists on the current page.
    handshake = page.evaluate(
        """
        async ({app}) => {
            const response = await fetch('/api/tools/handshake/', {
                method: 'POST',
                headers: {
                    app,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });
            return { status: response.status, body: await response.text() };
        }
        """,
        {"app": APP_NAME},
    )
    if handshake["status"] != 200:
        raise RuntimeError(f"Chosic handshake failed with HTTP {handshake['status']}")

    handshake_body = json.loads(handshake["body"])
    if not handshake_body.get("success"):
        raise RuntimeError("Chosic handshake returned no success")

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
        "handshake_status": handshake["status"],
        "cookies": chosic_cookies,
        "cookie_header": cookie_header,
        "network_tail": logs[-40:],
    }
    print(json.dumps(result, ensure_ascii=False))
    browser.close()


if __name__ == "__main__":
    main()
