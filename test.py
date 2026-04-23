from ytmusicapi import YTMusic
import json

yt = YTMusic('browser.json', proxies={
    'http': 'socks5://127.0.0.1:1080',
    'https': 'socks5://127.0.0.1:1080'
})

results = yt.search("music similar to damso")

print(json.dumps(results, indent=4, ensure_ascii=False))