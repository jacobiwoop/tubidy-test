#!/usr/bin/env python3
"""
Tubidy Search Scraper
Usage: python3 tubidy_scraper.py "BTS Swim"
"""

import sys
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlencode, quote

BASE_URL = "https://mp3.tubidy.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://mp3.tubidy.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def parse_duration(datetime_attr: str) -> str:
    """Convertit PT2M47S -> 2:47"""
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", datetime_attr)
    if not match:
        return datetime_attr
    h, m, s = match.group(1), match.group(2), match.group(3)
    h = int(h) if h else 0
    m = int(m) if m else 0
    s = int(s) if s else 0
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def scrape_page(query: str, page: int) -> tuple[list[dict], bool]:
    """
    Scrape une page de résultats.
    Retourne (résultats, has_next_page)
    """
    params = {"q": query, "page": page} if page > 1 else {"q": query}
    url = f"{BASE_URL}/search?{urlencode(params)}"

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[!] Erreur page {page}: {e}", file=sys.stderr)
        return [], False

    soup = BeautifulSoup(resp.text, "html.parser")
    articles = soup.select("article.item")

    if not articles:
        return [], False

    results = []
    for article in articles:
        # Titre
        title_tag = article.select_one("a.title")
        title = title_tag.get_text(strip=True) if title_tag else None

        # URL page de téléchargement
        download_url = title_tag["href"] if title_tag and title_tag.get("href") else None
        if download_url and not download_url.startswith("http"):
            download_url = BASE_URL + download_url

        # Thumbnail (lazy-loaded -> data-src)
        img_tag = article.select_one("img.thumb")
        thumbnail = img_tag.get("data-src") or img_tag.get("src") if img_tag else None

        # Durée
        time_tag = article.select_one("time.duration")
        duration_iso = time_tag.get("datetime") if time_tag else None
        duration_span = time_tag.select_one("span").get_text(strip=True) if time_tag and time_tag.select_one("span") else None
        duration = duration_span or (parse_duration(duration_iso) if duration_iso else None)

        results.append({
            "title": title,
            "download_page": download_url,
            "thumbnail": thumbnail,
            "duration": duration,
            "duration_iso": duration_iso,
        })

    # Vérifier s'il y a une page suivante
    next_page = soup.select_one("a[rel='next']") or soup.select_one(".pagination .next") or soup.find("a", string=lambda t: t and "next" in t.lower())
    has_next = next_page is not None

    # Fallback : si la page retourne des résultats, on suppose qu'il y en a d'autres
    # (Tubidy ne montre pas toujours un bouton "next" explicite)
    if not has_next and len(articles) > 0:
        # On vérifie en regardant si un lien ?page=N+1 existe dans la pagination
        pagination_links = soup.select(".pagination a")
        for link in pagination_links:
            href = link.get("href", "")
            if f"page={page + 1}" in href:
                has_next = True
                break

    return results, has_next


def scrape_all(query: str, delay: float = 1.0) -> list[dict]:
    """Scrape toutes les pages pour une requête."""
    all_results = []
    page = 1

    print(f'[*] Recherche : "{query}"', file=sys.stderr)

    while True:
        print(f"[*] Page {page}...", file=sys.stderr)
        results, has_next = scrape_page(query, page)

        if not results:
            print(f"[*] Aucun résultat page {page}, arrêt.", file=sys.stderr)
            break

        all_results.extend(results)
        print(f"    -> {len(results)} résultats (total: {len(all_results)})", file=sys.stderr)

        if not has_next:
            print("[*] Dernière page atteinte.", file=sys.stderr)
            break

        page += 1
        time.sleep(delay)  # Pause pour ne pas ban

    return all_results


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 tubidy_scraper.py \"BTS Swim\"", file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]
    results = scrape_all(query)

    output = {
        "query": query,
        "total": len(results),
        "results": results,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
