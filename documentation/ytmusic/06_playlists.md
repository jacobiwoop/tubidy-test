# 06 — Playlists

> Les fonctions de lecture sont publiques. Les fonctions de modification nécessitent une **authentification**.

---

## Lire une playlist

### `YTMusic.get_playlist(playlistId, limit=100, related=False, suggestions_limit=0)`

```python
playlist = yt.get_playlist("PLxxxxxxx", limit=100)
```

```python
{
    "id": "PLxxxxxxx",
    "privacy": "PUBLIC",
    "title": "Ma Playlist",
    "thumbnails": [...],
    "description": "Description...",
    "author": {"name": "John Doe", "id": "UCxxxxxxx"},
    "year": "2024",
    "duration": "1 hour, 23 minutes",
    "trackCount": 42,
    "tracks": [
        {
            "videoId": "bx1Bh8ZvH84",
            "title": "Wonderwall",
            "artists": [{"name": "Oasis", "id": "..."}],
            "album": {"name": "Morning Glory", "id": "..."},
            "duration": "4:19",
            "duration_seconds": 259,
            "thumbnails": [...],
            "isAvailable": True,
            "isExplicit": False,
            "feedbackTokens": {"add": "...", "remove": "..."},
            "likeStatus": "INDIFFERENT",
            "setVideoId": "abc123"  # nécessaire pour supprimer le titre
        }
    ],
    "related": [...]    # si related=True
}
```

> Pour les albums/singles/shows, passer le `browseId` à `get_playlist()` (pas à `get_album()`).

---

## Titres aimés

### `YTMusic.get_liked_songs(limit=100)`

Raccourci pour récupérer la playlist "Liked Songs" de l'utilisateur.

```python
liked = yt.get_liked_songs(limit=100)
# Même structure que get_playlist()
```

---

## Épisodes sauvegardés

### `YTMusic.get_saved_episodes(limit=100)`

```python
episodes = yt.get_saved_episodes(limit=100)
```

---

## Créer / Supprimer une playlist

### `YTMusic.create_playlist(title, description, privacy_status='PUBLIC', video_ids=None, source_playlist=None)`

```python
playlist_id = yt.create_playlist(
    title="Ma Nouvelle Playlist",
    description="Une description",
    privacy_status="PUBLIC",    # 'PUBLIC' | 'PRIVATE' | 'UNLISTED'
    video_ids=["bx1Bh8ZvH84", "dQw4w9WgXcQ"],  # optionnel: pré-remplir
    source_playlist="PLxxxxxxx"  # optionnel: copier depuis une autre playlist
)
# → "PLxxxxxxx" (ID de la nouvelle playlist)
```

### `YTMusic.delete_playlist(playlistId)`

```python
yt.delete_playlist("PLxxxxxxx")
# → {"status": "STATUS_SUCCEEDED"} ou erreur
```

---

## Modifier une playlist

### `YTMusic.edit_playlist(playlistId, title=None, description=None, privacy_status=None, moveItem=None, addPlaylistId=None)`

```python
# Renommer
yt.edit_playlist("PLxxxxxxx", title="Nouveau Titre")

# Changer la confidentialité
yt.edit_playlist("PLxxxxxxx", privacy_status="PRIVATE")

# Déplacer un titre (moveItem = (setVideoId_à_déplacer, setVideoId_après_lequel_placer))
yt.edit_playlist("PLxxxxxxx", moveItem=("abc123", "def456"))

# Fusionner avec une autre playlist
yt.edit_playlist("PLxxxxxxx", addPlaylistId="PLyyyyyyy")
```

---

## Ajouter des titres

### `YTMusic.add_playlist_items(playlistId, videoIds=None, source_playlist=None, duplicates=False)`

```python
# Ajouter par videoId
yt.add_playlist_items(
    "PLxxxxxxx",
    videoIds=["bx1Bh8ZvH84", "dQw4w9WgXcQ"],
    duplicates=False    # False = erreur si doublon, True = ajoute quand même
)

# Copier depuis une autre playlist
yt.add_playlist_items(
    "PLxxxxxxx",
    source_playlist="PLyyyyyyy"
)
```

---

## Supprimer des titres

### `YTMusic.remove_playlist_items(playlistId, videos)`

Le paramètre `videos` doit être la liste des tracks tels que retournés par `get_playlist()` (avec le champ `setVideoId`).

```python
playlist = yt.get_playlist("PLxxxxxxx")

# Supprimer le premier titre
yt.remove_playlist_items("PLxxxxxxx", [playlist['tracks'][0]])

# Supprimer plusieurs titres
yt.remove_playlist_items("PLxxxxxxx", playlist['tracks'][:3])
```

> ⚠️ Le champ `setVideoId` est **obligatoire** dans chaque élément du paramètre `videos`. Il est différent du `videoId`.

---

## Exemple complet

```python
from ytmusicapi import YTMusic

yt = YTMusic('oauth.json')

# 1. Rechercher un titre
results = yt.search("Oasis Wonderwall", filter='songs')
video_id = results[0]['videoId']

# 2. Créer une playlist
playlist_id = yt.create_playlist("Best of Oasis", "Ma sélection Oasis")

# 3. Ajouter le titre
yt.add_playlist_items(playlist_id, videoIds=[video_id])

# 4. Vérifier le contenu
playlist = yt.get_playlist(playlist_id)
print(f"Playlist '{playlist['title']}' — {playlist['trackCount']} titre(s)")

# 5. Supprimer le titre
yt.remove_playlist_items(playlist_id, playlist['tracks'])

# 6. Supprimer la playlist
yt.delete_playlist(playlist_id)
```
