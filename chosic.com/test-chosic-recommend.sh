#!/bin/bash

# Commande curl pour obtenir des recommandations depuis Chosic
# Nécessite un cookie valide (r_34874064)

curl -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Referer: https://www.chosic.com/playlist-generator/" \
     -H "Cookie: pll_language=en; r_34874064=1777902685%7C4e2bfcf40f4bef5f%7Ce8254c82a5bc41c9b68926907b183abe92ea0912ed7b419b5c92c95a94744a7a" \
     "https://www.chosic.com/api/tools/recommendations?seed_tracks=2ewjMyCbNv2X1dB2qIDCwD&limit=10" | jq
