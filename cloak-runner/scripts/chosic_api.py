from __future__ import annotations

import json
import os
from urllib.parse import urlencode

from cloakbrowser import launch


BASE_URL = "https://www.chosic.com/playlist-generator/"
API_PATHS = {
    "search": "/api/tools/search",
    "recommendations": "/api/tools/recommendations",
}


def main() -> None:
    operation = os.environ.get("CLOAK_CHOSIC_OPERATION", "")
    if operation not in API_PATHS:
        raise RuntimeError("Unsupported Chosic operation")

    try:
        params = json.loads(os.environ.get("CLOAK_CHOSIC_PARAMS", "{}"))
    except json.JSONDecodeError as exc:
        raise RuntimeError("Invalid Chosic params") from exc
    if not isinstance(params, dict):
        raise RuntimeError("Invalid Chosic params")

    browser = launch(headless=True, humanize=True)
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    try:
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
        handshake = page.evaluate(
            """
            async () => {
                const response = await fetch('/api/tools/handshake/', {
                    method: 'POST',
                    headers: {
                        app: 'playlist_generator',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                });
                return { status: response.status, body: await response.text() };
            }
            """
        )
        if handshake["status"] != 200:
            raise RuntimeError(f"Chosic handshake failed with HTTP {handshake['status']}")

        query = urlencode({key: value for key, value in params.items() if value not in (None, "")})
        api_url = f"{API_PATHS[operation]}?{query}"
        result = page.evaluate(
            """
            async ({url}) => {
                const response = await fetch(url, {
                    headers: {
                        app: 'playlist_generator',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json, text/javascript, */*; q=0.01',
                    },
                    credentials: 'include',
                });
                const text = await response.text();
                let data;
                try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
                return { status: response.status, data };
            }
            """,
            {"url": api_url},
        )
        if result["status"] != 200:
            raise RuntimeError(f"Chosic {operation} failed with HTTP {result['status']}")

        print(json.dumps({"ok": True, "operation": operation, "status": result["status"], "data": result["data"]}))
    finally:
        browser.close()


if __name__ == "__main__":
    main()
