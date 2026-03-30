from ytmusicapi import YTMusic

yt = YTMusic('browser.json', proxies={
    'http': 'socks5://127.0.0.1:1080',
    'https': 'socks5://127.0.0.1:1080'
})

results = yt.search("damso")
print(results[:1])