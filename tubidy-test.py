#!/usr/bin/env python3
"""
Usage:
  python tubidy.py -search "lush life"
  python tubidy.py -dl "https://tubidy.cool/watch/..."
  python tubidy.py -get "https://tubidy.cool/watch.php?id=...&lnk=6"
"""

import requests, sys, uuid, json
from bs4 import BeautifulSoup

BASE    = "https://tubidy.cool"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Referer": BASE + "/",
}

def fetch(url: str) -> BeautifulSoup:
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")

def search(query: str) -> list[dict]:
    soup = fetch(f"{BASE}/search.php?q={query}&sid={uuid.uuid4().hex}")
    results = []
    for a in soup.find_all("a", href=lambda h: h and "/watch/" in h):
        title = a.get_text(strip=True)
        if title:
            href = a["href"]
            results.append({
                "title": title,
                "url": href if href.startswith("http") else "https:" + href
            })
    return results

def download_links(watch_url: str) -> list[dict]:
    soup  = fetch(watch_url)
    links = []
    for li in soup.select("li.list-group-item"):
        a = li.find("a", href=True)
        if not a:
            continue
        size_tag = a.find("span", class_="mb-text")
        size  = size_tag.get_text(strip=True) if size_tag else ""
        label = a.get_text(separator=" ", strip=True).replace(size, "").strip()
        href  = a["href"]
        url   = href if href.startswith("http") else BASE + href
        links.append({"label": label, "size": size, "url": url})
    return links

def get_final_link(lnk_url: str) -> list[dict]:
    """
    Prend un lien watch.php?...&lnk=X et retourne les vrais liens
    de téléchargement (play + download) depuis d2mefast.net
    """
    soup  = fetch(lnk_url)
    links = []
    for li in soup.select("li.list-group-item"):
        a = li.find("a", href=True)
        if not a:
            continue
        href = a["href"]
        if href.startswith("whatsapp") or "playlist" in href:
            continue
        size_tag = a.find("span", class_="mb-text")
        size  = size_tag.get_text(strip=True) if size_tag else ""
        label = a.get_text(separator=" ", strip=True).replace(size, "").strip()
        url   = href if href.startswith("http") else "https:" + href
        links.append({"label": label, "size": size, "url": url})
    return links

def usage():
    print("Usage:")
    print("  python tubidy.py -search <terme>")
    print("  python tubidy.py -dl <watch_url>")
    print("  python tubidy.py -get <watch.php?...&lnk=X>")
    sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        usage()

    flag = sys.argv[1]
    arg  = " ".join(sys.argv[2:])

    if flag == "-search":
        result = search(arg)
    elif flag == "-dl":
        result = download_links(arg)
    elif flag == "-get":
        result = get_final_link(arg)
    else:
        usage()

    print(json.dumps(result, ensure_ascii=False, indent=2))