┌──(.venv)─(aiko㉿tesseract)-[~/Documents/tubidy]
└─$ curl -s "https://mp3.tubidy.com/download/bts-swim-official-performance-video/video/i-Z45yEsGM0" \
 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
 | grep -o "App\.video('[^']_')" \
 | grep -o "'[^']_'" \
 | tr -d "'"
eyJpdiI6Im8wdUc0c1RBS2xRSWdza2MrL0htK0E9PSIsInZhbHVlIjoiaVg0R1hJL3QrU2t5MGExSWtOaGUvcURwTFUvT0xvTmg0OHZ6N0JiaDg4YmFTZGZDa2VKT0ZHS0hweHhjaTF1dlVyUXlWa0lQbUhqK0F4SWxYZElURSt2REtyRW1sTFRvWmtKL2Q4bEk5ZVlBZEhVMmFvRUMwdGJpeHMvZFd0NFAwQzBSRXFKZlMvSkdaZGh6M091SGlvVHl6Y0VPTys2UXJDOU9rVzhmeVc4UG9nU21vYW5jMUhNdHliRHBLb21HNHlJbjBidVRrS1FKWjJabmxwc2lSeW9McC9GajhxdXNiZnFocFBXQ2M5SVdBeWZ1YUJTQ2VKNEJxWitjYVNRWSIsIm1hYyI6IjVjYTUxMGJmYzIwOTNjZWZmNDA2N2Y5YzFiNDI2MjBlMmEwYzg0ZmU5ZGFkMDMyYTUyOTdkNDY2NmIzYzk0NmMiLCJ0YWciOiIifQ==

┌──(.venv)─(aiko㉿tesseract)-[~/Documents/tubidy]
└─$ # Stocker le token
TOKEN=$(curl -s "https://mp3.tubidy.com/download/bts-swim-official-performance-video/video/i-Z45yEsGM0" \
 -H "User-Agent: Mozilla/5.0" \
 | grep -o "App\.video('[^']_')" \
 | grep -o "'[^']_'" \
 | tr -d "'")

# Récupérer le CSRF

CSRF=$(curl -s "https://mp3.tubidy.com/download/bts-swim-official-performance-video/video/i-Z45yEsGM0" \
  -H "User-Agent: Mozilla/5.0" \
  | grep -o 'csrf-token" content="[^"]*"' \
  | grep -o '"[^"]*"$' \
 | tr -d '"')

# Appeler /api/video/formats

curl -X POST "https://mp3.tubidy.com/api/video/formats" \
 -H "Content-Type: application/x-www-form-urlencoded" \
 -H "X-CSRF-TOKEN: $CSRF" \
  -H "Referer: https://mp3.tubidy.com/" \
  -H "User-Agent: Mozilla/5.0" \
  --data-urlencode "payload=$TOKEN"
{"processed":true,"formats":[{"label":"MP3 audio","percentage":"100%","size":"2,62 MB","payload":"eyJpdiI6Inltb0dEZFZqa3diaGtSWm5KemhkWVE9PSIsInZhbHVlIjoiYmxxdjlnRXgrSW9sVTdudEhNVHU3WVpwQXdZeEx3bHZTTlZId081WUZyL2RhR09rVDUzM1BxaWFKamJtU20wNUl6QlBhTkw2VlNIa1RScC9ZOGUzTno4TkU1YVhtZXdYamhXU1JCZUdMMGZmUi9HbCsvMFpXYTF3ZzdLM1lZT2xqU2dmQ0ZYbUlVN1VYMmE2OGxTMldTYUI5SFpiOTBlWEFkdFl0TlE2NkVDQjNjNG1nYmFHTVdadEJJVmdJbjhrUDJSaE9Qck1TRFdGL0RZZDBjVm9jZz09IiwibWFjIjoiNWFmMTk2ZmE1MjA0ZGE1NGNjYzJkNzRiZTAwZmVjYWY1ZDIxNDc1MGJjN2ZlZTcyNWM1MmQxNmE4N2EwM2VlMiIsInRhZyI6IiJ9"},{"label":"MP4 audio","percentage":"100%","size":"2,52 MB","payload":"eyJpdiI6IlZWeXBVWHowVy9ISjJCQ0wwc2JtSnc9PSIsInZhbHVlIjoieFBpZkVoWHpZM1FLZTNYOW1GRkRSQWVPQ2Q5T3NQTndJRVJGZVlKYXJ1Q2JxWXh2NUVBbkw1eENDeEVtV1hJNGhrd1FyTXNjRnNyYm5hYmhCeUUxSDIxY2dCVjJpWG5lbStuNkRVZ2FGUVlzZE5XV1hxY3UyWkw5MnZIS1JoTUpWMG5JNGdSNkcvcTNRNXZVemdrcHR1bU10MUFCQXpiNjBBc3lNYmE1TG9IeU12THVFMjRpeDk1OC9pV084ZndNNnF5ZmZNcGVlK0hSMVBZay9CcWZpdz09IiwibWFjIjoiNmUxZTExYjYzNzRjMGNlZTNmZWJhMWZiNTU3OWVlMzJjYThiNjk0M2JhZjZiNGZjM2Q2NWI0MGNmNDlhYmY1NyIsInRhZyI6IiJ9"},{"label":"MP4 video","percentage":"100%","size":"5,63 MB","payload":"eyJpdiI6Iksvd2tKcW40czFYSElKYVJuenpUY2c9PSIsInZhbHVlIjoiRnJQTjJVVEt3QVFGU3pVRUZ6WThxcGtobnp0aFRQM284NFBpdXJxRlg3Nm01aG5lKytHK1VGeGwycWhwd0gvTGcyNEJlMGNFbGlYSVdvOXlFakZ1dTkxZXYwbHgvbjQxSHRrRFJ1NGhKRW9MVThlYXJzTzhVUE5Gb1czQTkyekhoK1BadXUrYkFQNnROQjhSekUwb1pnQjlHVjFnb2M5K2NDZXo2UER5QmVQZ1l0QnJGV0l2ZmxnSmdUNWtjQU5YT3llc1NIVUQrQ21xSFN6Z1BzVXgwaFFjTmp1Z2Z2dUNxVGRjNVlmUG5VUT0iLCJtYWMiOiI4NDRlNjM4NmQ1YzllOTBlMjNjZDVjNzcxYzZmNzA2ZTU4ODE1ZDI2NWUxYWE2NGFmNDQxMGQ1OTE3NThlYWZmIiwidGFnIjoiIn0="}],"status":"ok","html":"<table class=\"table align-middle mb-0\" id=\"video-formats-table\">\n <thead>\n <tr>\n <th scope=\"col\">Type<\/th>\n <th scope=\"col\">Size<\/th>\n <th scope=\"col\" width=\"45%\"><\/th>\n <\/tr>\n <\/thead>\n <tbody>\n <tr>\n <td>MP3 audio<\/td>\n <td>2,62 MB<\/td>\n <td>\n <div class=\"container\">\n <div class=\"row\">\n <div class=\"col-md-6 col-lg-5 col-xl-4 px-0\">\n <button class=\"btn btn-sm btn-success video-download-button\" type=\"button\" onclick=\"App.download(this, 'eyJpdiI6Inltb0dEZFZqa3diaGtSWm5KemhkWVE9PSIsInZhbHVlIjoiYmxxdjlnRXgrSW9sVTdudEhNVHU3WVpwQXdZeEx3bHZTTlZId081WUZyL2RhR09rVDUzM1BxaWFKamJtU20wNUl6QlBhTkw2VlNIa1RScC9ZOGUzTno4TkU1YVhtZXdYamhXU1JCZUdMMGZmUi9HbCsvMFpXYTF3ZzdLM1lZT2xqU2dmQ0ZYbUlVN1VYMmE2OGxTMldTYUI5SFpiOTBlWEFkdFl0TlE2NkVDQjNjNG1nYmFHTVdadEJJVmdJbjhrUDJSaE9Qck1TRFdGL0RZZDBjVm9jZz09IiwibWFjIjoiNWFmMTk2ZmE1MjA0ZGE1NGNjYzJkNzRiZTAwZmVjYWY1ZDIxNDc1MGJjN2ZlZTcyNWM1MmQxNmE4N2EwM2VlMiIsInRhZyI6IiJ9');\">\n <i class=\"fa-solid fa-download\"><\/i>\n Download <\/button>\n <\/div>\n <div class=\"col-md-6 col-lg-7 col-xl-8 px-0 mt-2 mt-md-0\">\n <button class=\"btn btn-sm btn-primary text-white video-play-button mt-sm-0\" type=\"button\" onclick=\"App.play(this, 'eyJpdiI6Inltb0dEZFZqa3diaGtSWm5KemhkWVE9PSIsInZhbHVlIjoiYmxxdjlnRXgrSW9sVTdudEhNVHU3WVpwQXdZeEx3bHZTTlZId081WUZyL2RhR09rVDUzM1BxaWFKamJtU20wNUl6QlBhTkw2VlNIa1RScC9ZOGUzTno4TkU1YVhtZXdYamhXU1JCZUdMMGZmUi9HbCsvMFpXYTF3ZzdLM1lZT2xqU2dmQ0ZYbUlVN1VYMmE2OGxTMldTYUI5SFpiOTBlWEFkdFl0TlE2NkVDQjNjNG1nYmFHTVdadEJJVmdJbjhrUDJSaE9Qck1TRFdGL0RZZDBjVm9jZz09IiwibWFjIjoiNWFmMTk2ZmE1MjA0ZGE1NGNjYzJkNzRiZTAwZmVjYWY1ZDIxNDc1MGJjN2ZlZTcyNWM1MmQxNmE4N2EwM2VlMiIsInRhZyI6IiJ9');\">\n <i class=\"fa-solid fa-play\"><\/i>\n Play <\/button>\n <\/div>\n <\/div><!-- \/.row -->\n <\/div><!-- \/.container -->\n <\/td>\n <\/tr>\n <tr>\n <td>MP4 audio<\/td>\n <td>2,52 MB<\/td>\n <td>\n <div class=\"container\">\n <div class=\"row\">\n <div class=\"col-md-6 col-lg-5 col-xl-4 px-0\">\n <button class=\"btn btn-sm btn-success video-download-button\" type=\"button\" onclick=\"App.download(this, 'eyJpdiI6IlZWeXBVWHowVy9ISjJCQ0wwc2JtSnc9PSIsInZhbHVlIjoieFBpZkVoWHpZM1FLZTNYOW1GRkRSQWVPQ2Q5T3NQTndJRVJGZVlKYXJ1Q2JxWXh2NUVBbkw1eENDeEVtV1hJNGhrd1FyTXNjRnNyYm5hYmhCeUUxSDIxY2dCVjJpWG5lbStuNkRVZ2FGUVlzZE5XV1hxY3UyWkw5MnZIS1JoTUpWMG5JNGdSNkcvcTNRNXZVemdrcHR1bU10MUFCQXpiNjBBc3lNYmE1TG9IeU12THVFMjRpeDk1OC9pV084ZndNNnF5ZmZNcGVlK0hSMVBZay9CcWZpdz09IiwibWFjIjoiNmUxZTExYjYzNzRjMGNlZTNmZWJhMWZiNTU3OWVlMzJjYThiNjk0M2JhZjZiNGZjM2Q2NWI0MGNmNDlhYmY1NyIsInRhZyI6IiJ9');\">\n <i class=\"fa-solid fa-download\"><\/i>\n Download <\/button>\n <\/div>\n <div class=\"col-md-6 col-lg-7 col-xl-8 px-0 mt-2 mt-md-0\">\n <button class=\"btn btn-sm btn-primary text-white video-play-button mt-sm-0\" type=\"button\" onclick=\"App.play(this, 'eyJpdiI6IlZWeXBVWHowVy9ISjJCQ0wwc2JtSnc9PSIsInZhbHVlIjoieFBpZkVoWHpZM1FLZTNYOW1GRkRSQWVPQ2Q5T3NQTndJRVJGZVlKYXJ1Q2JxWXh2NUVBbkw1eENDeEVtV1hJNGhrd1FyTXNjRnNyYm5hYmhCeUUxSDIxY2dCVjJpWG5lbStuNkRVZ2FGUVlzZE5XV1hxY3UyWkw5MnZIS1JoTUpWMG5JNGdSNkcvcTNRNXZVemdrcHR1bU10MUFCQXpiNjBBc3lNYmE1TG9IeU12THVFMjRpeDk1OC9pV084ZndNNnF5ZmZNcGVlK0hSMVBZay9CcWZpdz09IiwibWFjIjoiNmUxZTExYjYzNzRjMGNlZTNmZWJhMWZiNTU3OWVlMzJjYThiNjk0M2JhZjZiNGZjM2Q2NWI0MGNmNDlhYmY1NyIsInRhZyI6IiJ9');\">\n <i class=\"fa-solid fa-play\"><\/i>\n Play <\/button>\n <\/div>\n <\/div><!-- \/.row -->\n <\/div><!-- \/.container -->\n <\/td>\n <\/tr>\n <tr>\n <td>MP4 video<\/td>\n <td>5,63 MB<\/td>\n <td>\n <div class=\"container\">\n <div class=\"row\">\n <div class=\"col-md-6 col-lg-5 col-xl-4 px-0\">\n <button class=\"btn btn-sm btn-success video-download-button\" type=\"button\" onclick=\"App.download(this, 'eyJpdiI6Iksvd2tKcW40czFYSElKYVJuenpUY2c9PSIsInZhbHVlIjoiRnJQTjJVVEt3QVFGU3pVRUZ6WThxcGtobnp0aFRQM284NFBpdXJxRlg3Nm01aG5lKytHK1VGeGwycWhwd0gvTGcyNEJlMGNFbGlYSVdvOXlFakZ1dTkxZXYwbHgvbjQxSHRrRFJ1NGhKRW9MVThlYXJzTzhVUE5Gb1czQTkyekhoK1BadXUrYkFQNnROQjhSekUwb1pnQjlHVjFnb2M5K2NDZXo2UER5QmVQZ1l0QnJGV0l2ZmxnSmdUNWtjQU5YT3llc1NIVUQrQ21xSFN6Z1BzVXgwaFFjTmp1Z2Z2dUNxVGRjNVlmUG5VUT0iLCJtYWMiOiI4NDRlNjM4NmQ1YzllOTBlMjNjZDVjNzcxYzZmNzA2ZTU4ODE1ZDI2NWUxYWE2NGFmNDQxMGQ1OTE3NThlYWZmIiwidGFnIjoiIn0=');\">\n <i class=\"fa-solid fa-download\"><\/i>\n Download <\/button>\n <\/div>\n <div class=\"col-md-6 col-lg-7 col-xl-8 px-0 mt-2 mt-md-0\">\n <button class=\"btn btn-sm btn-primary text-white video-play-button mt-sm-0\" type=\"button\" onclick=\"App.play(this, 'eyJpdiI6Iksvd2tKcW40czFYSElKYVJuenpUY2c9PSIsInZhbHVlIjoiRnJQTjJVVEt3QVFGU3pVRUZ6WThxcGtobnp0aFRQM284NFBpdXJxRlg3Nm01aG5lKytHK1VGeGwycWhwd0gvTGcyNEJlMGNFbGlYSVdvOXlFakZ1dTkxZXYwbHgvbjQxSHRrRFJ1NGhKRW9MVThlYXJzTzhVUE5Gb1czQTkyekhoK1BadXUrYkFQNnROQjhSekUwb1pnQjlHVjFnb2M5K2NDZXo2UER5QmVQZ1l0QnJGV0l2ZmxnSmdUNWtjQU5YT3llc1NIVUQrQ21xSFN6Z1BzVXgwaFFjTmp1Z2Z2dUNxVGRjNVlmUG5VUT0iLCJtYWMiOiI4NDRlNjM4NmQ1YzllOTBlMjNjZDVjNzcxYzZmNzA2ZTU4ODE1ZDI2NWUxYWE2NGFmNDQxMGQ1OTE3NThlYWZmIiwidGFnIjoiIn0=');\">\n <i class=\"fa-solid fa-play\"><\/i>\n Play <\/button>\n <\/div>\n <\/div><!-- \/.row -->\n <\/div><!-- \/.container -->\n <\/td>\n <\/tr>\n <\/tbody>\n<\/table><!-- \/#video-formats-table -->\n\n"}  
┌──(.venv)─(aiko㉿tesseract)-[~/Documents/tubidy]
└─$ # Extraire le CSRF (même session)
CSRF=$(curl -s "https://mp3.tubidy.com/download/bts-swim-official-performance-video/video/i-Z45yEsGM0" \
  -H "User-Agent: Mozilla/5.0" \
  | grep -o 'csrf-token" content="[^"]*"' \
  | grep -o '"[^"]*"$' \
 | tr -d '"')

# Télécharger le MP4 video (5,63 MB)

curl -X POST "https://mp3.tubidy.com/api/video/download" \
 -H "Content-Type: application/x-www-form-urlencoded" \
 -H "X-CSRF-TOKEN: $CSRF" \
 -H "Referer: https://mp3.tubidy.com/" \
 -H "User-Agent: Mozilla/5.0" \
 --data-urlencode "payload=eyJpdiI6Iksvd2tKcW40czFYSElKYVJuenpUY2c9PSIsInZhbHVlIjoiRnJQTjJVVEt3QVFGU3pVRUZ6WThxcGtobnp0aFRQM284NFBpdXJxRlg3Nm01aG5lKytHK1VGeGwycWhwd0gvTGcyNEJlMGNFbGlYSVdvOXlFakZ1dTkxZXYwbHgvbjQxSHRrRFJ1NGhKRW9MVThlYXJzTzhVUE5Gb1czQTkyekhoK1BadXUrYkFQNnROQjhSekUwb1pnQjlHVjFnb2M5K2NDZXo2UER5QmVQZ1l0QnJGV0l2ZmxnSmdUNWtjQU5YT3llc1NIVUQrQ21xSFN6Z1BzVXgwaFFjTmp1Z2Z2dUNxVGRjNVlmUG5VUT0iLCJtYWMiOiI4NDRlNjM4NmQ1YzllOTBlMjNjZDVjNzcxYzZmNzA2ZTU4ODE1ZDI2NWUxYWE2NGFmNDQxMGQ1OTE3NThlYWZmIiwidGFnIjoiIn0="
{"link":"https:\/\/d324.d2mefast.net\/c.php?s=eNoBMADP%252F7VyvWW8G%252Byc4PAwV4F8THB%252BgoILKMWGr1MuR%252B4yb%252BgkUR41n7CkUId7S8dsfL0DU0yqFsE%253D","ads":"https:\/\/ey43.com\/4\/9368357"}
