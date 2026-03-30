# 08 — Exemples de code complets

---

## Setup initial (une seule fois)

```bash
pip install ytmusicapi

# Générer oauth.json (recommandé)
ytmusicapi oauth

# OU générer browser.json (nécessaire pour les uploads)
ytmusicapi browser
```

---

## Exemple 1 — Recherche et affichage de résultats

```python
from ytmusicapi import YTMusic

yt = YTMusic()  # pas besoin d'auth pour la recherche publique

# Recherche de chansons
results = yt.search("Daft Punk", filter='songs', limit=5)

for song in results:
    artists = ", ".join(a['name'] for a in song['artists'])
    album = song.get('album', {}).get('name', 'N/A')
    print(f"🎵 {song['title']} — {artists} [{album}] ({song['duration']})")
```

---

## Exemple 2 — Récupérer un artiste complet

```python
from ytmusicapi import YTMusic

yt = YTMusic()

# Rechercher l'artiste pour avoir son channelId
results = yt.search("Radiohead", filter='artists')
channel_id = results[0]['browseId']

# Récupérer le profil complet
artist = yt.get_artist(channel_id)

print(f"🎤 {artist['name']}")
print(f"   Vues : {artist.get('views', 'N/A')}")
print(f"\n   Top chansons :")
for song in artist['songs']['results'][:5]:
    print(f"   - {song['title']}")

print(f"\n   Albums :")
albums = yt.get_artist_albums(artist['channelId'], artist['albums']['params'])
for album in albums[:5]:
    print(f"   - {album['title']} ({album.get('year', '?')})")

print(f"\n   Artistes similaires :")
for related in artist['related']['results'][:3]:
    print(f"   - {related['title']} ({related.get('subscribers', '?')} abonnés)")
```

---

## Exemple 3 — Récupérer et afficher un album

```python
from ytmusicapi import YTMusic

yt = YTMusic()

# Rechercher l'album
results = yt.search("OK Computer", filter='albums')
browse_id = results[0]['browseId']

# Récupérer l'album
album = yt.get_album(browse_id)

print(f"💿 {album['title']} — {album['artists'][0]['name']} ({album['year']})")
print(f"   {album['trackCount']} titres — {album['duration']}")
print()

for track in album['tracks']:
    explicit = "🔞" if track['isExplicit'] else "  "
    available = "✅" if track['isAvailable'] else "❌"
    print(f"   {available} {explicit} {track['trackNumber']:2}. {track['title']} ({track['duration']})")
```

---

## Exemple 4 — Gérer sa bibliothèque

```python
from ytmusicapi import YTMusic

yt = YTMusic('oauth.json')

# Afficher les playlists
print("📋 Mes Playlists :")
for pl in yt.get_library_playlists(limit=10):
    print(f"   - {pl['title']} ({pl.get('count', '?')} titres)")

# Afficher les artistes suivis
print("\n🎤 Artistes suivis :")
for artist in yt.get_library_subscriptions(limit=5):
    print(f"   - {artist['artist']}")

# Afficher l'historique
print("\n🕐 Derniers titres écoutés :")
for song in yt.get_history()[:5]:
    artists = ", ".join(a['name'] for a in song['artists'])
    print(f"   - {song['title']} — {artists}")
```

---

## Exemple 5 — Créer une playlist depuis une recherche

```python
from ytmusicapi import YTMusic

yt = YTMusic('oauth.json')

# Chercher des titres
query = "synthwave"
songs = yt.search(query, filter='songs', limit=10)
video_ids = [s['videoId'] for s in songs if s.get('videoId')]

# Créer la playlist
playlist_id = yt.create_playlist(
    title=f"Best of {query.title()}",
    description=f"Sélection auto — {query}",
    privacy_status="PRIVATE",
    video_ids=video_ids
)

print(f"✅ Playlist créée : {playlist_id}")
print(f"   {len(video_ids)} titres ajoutés")

# Vérifier
pl = yt.get_playlist(playlist_id, limit=20)
print(f"\n🎵 Contenu de '{pl['title']}' :")
for track in pl['tracks']:
    artists = ", ".join(a['name'] for a in track['artists'])
    print(f"   - {track['title']} — {artists}")
```

---

## Exemple 6 — Radio / Watch Playlist (lecture continue)

```python
from ytmusicapi import YTMusic

yt = YTMusic('oauth.json')

# Récupérer les titres suivants pour un titre donné
song_id = "bx1Bh8ZvH84"  # Wonderwall - Oasis
watch = yt.get_watch_playlist(videoId=song_id, radio=True, limit=20)

print("📻 Radio basée sur 'Wonderwall' :")
for track in watch['tracks']:
    artists = ", ".join(a['name'] for a in track['artists'])
    print(f"   🎵 {track['title']} — {artists} ({track['length']})")

# Récupérer les paroles du titre de départ
if watch.get('lyrics'):
    lyrics = yt.get_lyrics(watch['lyrics'])
    if lyrics:
        print(f"\n📝 Paroles (extrait) :")
        print(lyrics['lyrics'][:200] + "...")
```

---

## Exemple 7 — Charts globaux

```python
from ytmusicapi import YTMusic

yt = YTMusic()

charts = yt.get_charts(country='US')

print("🏆 Top Artistes US :")
for artist in charts['artists'][:5]:
    trend_icon = {"up": "📈", "down": "📉", "neutral": "➡️"}.get(artist['trend'], "")
    print(f"   {artist['rank']}. {artist['title']} ({artist['subscribers']}) {trend_icon}")

print("\n🎵 Top Playlists Vidéos :")
for video in charts['videos'][:3]:
    print(f"   - {video['title']}")
```

---

## Exemple 8 — Uploader de la musique (browser auth requis)

```python
from ytmusicapi import YTMusic
import os

yt = YTMusic('browser.json')

# Uploader un fichier
filepath = "/musique/ma_chanson.mp3"
if os.path.exists(filepath):
    result = yt.upload_song(filepath)
    print(f"Upload : {result}")

# Lister les uploads
uploads = yt.get_library_upload_songs(limit=10)
print(f"\n⬆️ {len(uploads)} fichiers uploadés :")
for song in uploads:
    artists = ", ".join(a['name'] for a in song['artists'])
    print(f"   - {song['title']} — {artists}")
```

---

## Référence rapide de toutes les méthodes

```python
# Setup
YTMusic(auth, user, language, location)
setup(filepath, headers_raw)
setup_oauth(filepath)

# Recherche
yt.search(query, filter, scope, limit, ignore_spelling)
yt.get_search_suggestions(query, detailed_runs)
yt.remove_search_suggestions(suggestions, indices)

# Navigation
yt.get_home(limit)
yt.get_artist(channelId)
yt.get_artist_albums(channelId, params, limit, order)
yt.get_album(browseId)
yt.get_album_browse_id(audioPlaylistId)
yt.get_user(channelId)
yt.get_user_playlists(channelId, params)
yt.get_user_videos(channelId, params)
yt.get_song(videoId, signatureTimestamp)
yt.get_song_related(browseId)
yt.get_lyrics(browseId, timestamps)

# Playlists
yt.get_playlist(playlistId, limit, related, suggestions_limit)
yt.get_liked_songs(limit)
yt.get_saved_episodes(limit)
yt.create_playlist(title, description, privacy_status, video_ids, source_playlist)
yt.edit_playlist(playlistId, title, description, privacy_status, moveItem, addPlaylistId)
yt.delete_playlist(playlistId)
yt.add_playlist_items(playlistId, videoIds, source_playlist, duplicates)
yt.remove_playlist_items(playlistId, videos)

# Bibliothèque
yt.get_account_info()
yt.get_library_playlists(limit)
yt.get_library_songs(limit, validateStatus, order)
yt.get_library_albums(limit, order)
yt.get_library_artists(limit, order)
yt.get_library_subscriptions(limit, order)
yt.get_library_podcasts(limit, order)
yt.get_library_channels(limit, order)
yt.rate_song(videoId, rating)
yt.edit_song_library_status(feedbackTokens)
yt.rate_playlist(playlistId, rating)
yt.subscribe_artists(channelIds)
yt.unsubscribe_artists(channelIds)
yt.get_history()
yt.add_history_item(song)
yt.remove_history_items(feedbackTokens)

# Watch
yt.get_watch_playlist(videoId, playlistId, limit, radio, shuffle)

# Explore
yt.get_mood_categories()
yt.get_mood_playlists(params)
yt.get_charts(country)

# Podcasts
yt.get_podcast(browseId)
yt.get_episode(videoId)
yt.get_episodes_playlist(playlistId)

# Uploads (browser auth uniquement)
yt.upload_song(filepath)
yt.get_library_upload_songs(limit, order)
yt.get_library_upload_albums(limit, order)
yt.get_library_upload_artists(limit, order)
yt.get_library_upload_artist(browseId, limit)
yt.get_library_upload_album(browseId)
yt.delete_upload_entity(entityId)
```
