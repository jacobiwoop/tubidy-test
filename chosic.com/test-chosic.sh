#!/bin/bash

# Commande curl pour interroger l'API Chosic en imitant un navigateur
# q=damso peut être remplacé par n'importe quelle recherche

curl -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" \
     -H "X-Requested-With: XMLHttpRequest" \
     -H "Referer: https://www.chosic.com/playlist-generator/" \
     -H "Accept: application/json, text/javascript, */*; q=0.01" \
     -H "Sec-Ch-Ua: \"Not:A-Brand\";v=\"99\", \"Brave\";v=\"145\", \"Chromium\";v=\"145\"" \
     -H "Sec-Ch-Ua-Mobile: ?0" \
     -H "Sec-Ch-Ua-Platform: \"Linux\"" \
     "https://www.chosic.com/api/tools/search?q=damso&type=track&limit=10" | jq
