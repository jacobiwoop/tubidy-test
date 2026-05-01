#!/usr/bin/env python3
"""
YouTube Music — scraper API interne
Usage:
  python ytmusic.py -search "daft punk one more time"
  python ytmusic.py -dl "VIDEO_ID"
"""

import requests, sys, json, subprocess, shutil

API_URL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
API_KEY = "AIzaSyC9XL3ZjWddXya6X67To4MUsmuokwVnNlQ"

HEADERS = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://music.youtube.com",
    "Referer": "https://music.youtube.com/",
}

CONTEXT = {
    "client": {
        "clientName": "WEB_REMIX",
        "clientVersion": "1.20240101.01.00",
        "hl": "en",
        "gl": "US"
    }
}

# params = filtre "Songs" uniquement (EgWKAQIIAWoEEAkQEA==)
SONGS_PARAMS = "EgWKAQIIAWoEEAkQEA=="

# ── 1. Recherche ──────────────────────────────────────────────────────────────

def search(query: str) -> list[dict]:
    body = {"context": CONTEXT, "query": query, "params": SONGS_PARAMS}
    r = requests.post(API_URL, headers=HEADERS, json=body, timeout=15)
    r.raise_for_status()
    data = r.json()

    results = []
    try:
        tabs = data["contents"]["tabbedSearchResultsRenderer"]["tabs"]
        sections = tabs[0]["tabRenderer"]["content"]["sectionListRenderer"]["contents"]
        for section in sections:
            shelf = section.get("musicShelfRenderer", {})
            for item in shelf.get("contents", []):
                renderer = item.get("musicResponsiveListItemRenderer", {})
                cols = renderer.get("flexColumns", [])

                # Titre
                try:
                    title = cols[0]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"][0]["text"]
                except (IndexError, KeyError):
                    continue

                # Artiste + album + durée depuis la 2ème colonne
                try:
                    runs = cols[1]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
                    subtitle = " ".join(r["text"] for r in runs if r["text"] != " • ").strip()
                except (IndexError, KeyError):
                    subtitle = ""

                # videoId
                video_id = None
                nav = renderer.get("navigationEndpoint", {})
                watch = nav.get("watchEndpoint", {})
                if "videoId" in watch:
                    video_id = watch["videoId"]

                # Miniature
                try:
                    thumbs = renderer["thumbnail"]["musicThumbnailRenderer"]["thumbnail"]["thumbnails"]
                    thumbnail = thumbs[-1]["url"]
                except (KeyError, IndexError):
                    thumbnail = ""

                # Ignorer les résultats sans videoId (profils, podcasts, playlists)
                if not video_id:
                    continue

                results.append({
                    "title":     title,
                    "subtitle":  subtitle,
                    "videoId":   video_id,
                    "watch_url": f"https://music.youtube.com/watch?v={video_id}",
                    "thumbnail": thumbnail,
                })
    except (KeyError, IndexError):
        pass

    return results


# ── 2. Liens de téléchargement via yt-dlp ─────────────────────────────────────

def download_links(video_id: str) -> list[dict]:
    if not shutil.which("yt-dlp"):
        return [{"error": "yt-dlp non installé. Lance: pip install yt-dlp"}]

    url = f"https://www.youtube.com/watch?v={video_id}"
    # --js-runtimes nodeJS pour éviter le warning JS runtime
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=web",
        url
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if proc.returncode != 0:
        return [{"error": proc.stderr.strip()}]

    try:
        info = json.loads(proc.stdout)
    except Exception as e:
        return [{"error": str(e)}]

    links = []
    for fmt in info.get("formats", []):
        ext      = fmt.get("ext", "")
        acodec   = fmt.get("acodec", "none")
        vcodec   = fmt.get("vcodec", "none")
        abr      = fmt.get("abr")
        filesize = fmt.get("filesize") or fmt.get("filesize_approx")
        fmt_url  = fmt.get("url", "")

        if not fmt_url or "manifest" in fmt_url:
            continue

        # Audio only
        if acodec != "none" and vcodec == "none":
            label = f"Audio {ext.upper()}"
            if abr:
                label += f" {int(abr)}kbps"
        # Vidéo + audio
        elif vcodec != "none" and acodec != "none":
            height = fmt.get("height", "?")
            label  = f"Video {ext.upper()} {height}p"
        else:
            continue

        size_mb = f"{filesize/1024/1024:.1f} MB" if filesize else "?"

        links.append({
            "label":  label,
            "format": fmt.get("format_id"),
            "size":   size_mb,
            "url":    fmt_url,
        })

    links.sort(key=lambda x: (0 if "Audio" in x["label"] else 1, x["label"]))
    return links


# ── Main ──────────────────────────────────────────────────────────────────────

def usage():
    print("Usage:")
    print("  python ytmusic.py -search <terme>")
    print("  python ytmusic.py -dl <videoId>")
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
    else:
        usage()

    print(json.dumps(result, ensure_ascii=False, indent=2))