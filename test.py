import requests

def search_deezer(query):
    url = f"https://api.deezer.com/search?q={query}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        items = data.get('data', [])
        
        print(f"\n[*] Résultats Deezer pour '{query}' :\n")
        print(f"{'#':<3} | {'TITRE':<30} | {'ARTISTE':<20} | {'ID'}")
        print("-" * 75)
        
        for i, track in enumerate(items[:20], 1):
            title = track['title']
            artist = track['artist']['name']
            track_id = track['id']
            # Deezer donne aussi un aperçu audio de 30s direct !
            preview = track['preview'] 
            
            print(f"{i:<3} | {title[:30]:<30} | {artist[:20]:<20} | {track_id}")
    else:
        print("Erreur de connexion à Deezer")

search_deezer("Damso")
