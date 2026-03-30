import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from ytmusicapi import YTMusic

# Configuration du proxy identique au script bridge
PROXIES = {
    'http': 'socks5://127.0.0.1:1080',
    'https': 'socks5://127.0.0.1:1080'
}

# Chemin auth
current_dir = os.path.dirname(os.path.abspath(__file__))
auth_path = os.path.join(current_dir, "../browser.json")

print("[yt-server] Initializing YTMusic...")
try:
    if os.path.exists(auth_path):
        yt = YTMusic(auth_path, proxies=PROXIES)
        print("[yt-server] Initialized with browser.json")
    else:
        yt = YTMusic(proxies=PROXIES)
        print("[yt-server] Initialized without auth (Read-only)")
except Exception as e:
    print(f"[yt-server] Initialization Error: {e}")
    yt = None

class YTMusicHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)

        if not yt:
            self.send_error_response("YTMusic not initialized")
            return

        try:
            if path == "/search":
                q = query_params.get("q", [""])[0]
                filter_type = query_params.get("filter", [None])[0]
                if filter_type == "null": filter_type = None
                limit = int(query_params.get("limit", [20])[0])
                
                results = yt.search(q, filter=filter_type, limit=limit)
                self.send_json_response(results)

            elif path == "/get_song":
                video_id = query_params.get("id", [""])[0]
                result = yt.get_song(video_id)
                self.send_json_response(result)

            elif path == "/get_artist":
                channel_id = query_params.get("id", [""])[0]
                result = yt.get_artist(channel_id)
                self.send_json_response(result)
            
            elif path == "/health":
                self.send_json_response({"status": "ok"})

            else:
                self.send_error(404, "Not Found")

        except Exception as e:
            self.send_error_response(str(e))

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def send_error_response(self, message):
        self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def log_message(self, format, *args):
        # Désactiver les logs par défaut pour plus de clarté
        return

def run(port=3001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, YTMusicHandler)
    print(f"[yt-server] Running on port {port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
