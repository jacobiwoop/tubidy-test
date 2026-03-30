import sys
import json
import os
from ytmusicapi import YTMusic

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments. Usage: script.py <command> <arg1> [arg2]..."}))
        return

    command = sys.argv[1]
    
    # Chemin vers le fichier browser.json à la racine du projet
    current_dir = os.path.dirname(os.path.abspath(__file__))
    auth_path = os.path.join(current_dir, "../browser.json")
    
    proxies = {
        'http': 'socks5://127.0.0.1:1080',
        'https': 'socks5://127.0.0.1:1080'
    }

    try:
        # Initialisation avec auth si le fichier existe
        if os.path.exists(auth_path):
            yt = YTMusic(auth_path, proxies=proxies)
        else:
            yt = YTMusic(proxies=proxies)

        if command == "search":
            query = sys.argv[2]
            filter_type = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "null" else None
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 20
            results = yt.search(query, filter=filter_type, limit=limit)
            print(json.dumps(results, indent=2, ensure_ascii=False))
        
        elif command == "get_song":
            video_id = sys.argv[2]
            result = yt.get_song(video_id)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        elif command == "get_artist":
            channel_id = sys.argv[2]
            result = yt.get_artist(channel_id)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
