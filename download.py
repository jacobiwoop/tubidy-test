import requests
from bs4 import BeautifulSoup
import time
import json
import re
import sys

def download_tubidy_info(url, format_type="MP4 video"):
    session = requests.Session()
    
    # Simuler un vrai navigateur
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    }

    print(f"[*] Accès à la page : {url}")
    try:
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return f"[!] Erreur de connexion : {e}"

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 1. Extraire le token CSRF
    csrf_meta = soup.find('meta', {'name': 'csrf-token'})
    if not csrf_meta:
        return "[!] Impossible de trouver le token CSRF. Le site a peut-être changé."
    csrf = csrf_meta['content']
    
    # 2. Extraire le payload initial (TOKEN)
    token_match = re.search(r"App\.video\('([^']+)'\)", response.text)
    if not token_match:
        return "[!] Impossible de trouver le payload de la vidéo (App.video)."
    token = token_match.group(1)
    
    # 3. Récupérer les formats disponibles
    api_formats_url = "https://mp3.tubidy.com/api/video/formats"
    headers_post = {
        'User-Agent': headers['User-Agent'],
        'X-CSRF-TOKEN': csrf,
        'Referer': 'https://mp3.tubidy.com/',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    print("[*] Récupération des formats api/video/formats ...")
    formats_res = session.post(api_formats_url, headers=headers_post, data={'payload': token})
    try:
        formats_data = formats_res.json()
    except ValueError:
        return f"[!] Erreur JSON sur {api_formats_url}"
        
    if formats_data.get('status') != 'ok':
        return f"[!] Erreur API formats : {formats_data}"
        
    formats = formats_data.get('formats', [])
    if not formats:
        return "[!] Aucun format trouvé."
        
    # Choisissons le format demandé (MP4 video ou MP3 audio)
    chosen_format = next((fmt for fmt in formats if format_type.lower() in fmt.get('label', '').lower()), None)
    
    if not chosen_format:
        print(f"[!] Format '{format_type}' introuvable. On prend le premier disponible par défaut.")
        chosen_format = formats[0]
        
    print(f"[+] Format choisi: {chosen_format.get('label')} ({chosen_format.get('size')})")
    new_payload = chosen_format.get('payload')
    
    if not new_payload:
        return "[!] Format invalide (pas de payload)."
        
    # 4. Demander le lien final
    api_download_url = "https://mp3.tubidy.com/api/video/download"
    print("[*] Demande du lien de téléchargement final ...")
    final_res = session.post(api_download_url, headers=headers_post, data={'payload': new_payload})
    
    try:
        final_data = final_res.json()
    except ValueError:
        return f"[!] Erreur JSON sur {api_download_url}"
        
    link = final_data.get('link')
    if link:
        print("[+] Lien final obtenu :", link)
        return link
    else:
        return f"[!] Impossible d'obtenir le lien final : {final_data}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 download.py <url_video> [audio|video]")
        print("Exemple: python3 download.py https://mp3.tubidy.com/... video")
        sys.exit(1)
        
    url_video = sys.argv[1]
    
    # Par défaut, on choisit MP4 video
    format_arg = "MP4 video"
    if len(sys.argv) >= 3:
        if sys.argv[2].lower() == "audio":
            format_arg = "MP3 audio"
        elif sys.argv[2].lower() == "video":
            format_arg = "MP4 video"
        else:
            format_arg = sys.argv[2] # Si l'utilisateur tape un format exact

    print(f"[*] Lancement du téléchargement pour le format : {format_arg}")
    resultat = download_tubidy_info(url_video, format_type=format_arg)
    print("\n--- Résultat du Lien Final ---")
    print(resultat)
