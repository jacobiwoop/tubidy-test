# 07 — Explore (Charts & Moods)

## Moods & Genres

### `YTMusic.get_mood_categories()`

Retourne les catégories de l'onglet "Moods & Genres" de YouTube Music.

```python
categories = yt.get_mood_categories()
```

```python
{
    "Moods & moments": [
        {"title": "Feel Good", "params": "ggMPOg1uX1ZOdnh3VUgyWUE%3D"},
        {"title": "Workout",   "params": "ggMPOg1uX1ZPOVlYbzdGUVE%3D"},
        ...
    ],
    "Genres": [
        {"title": "Electronic/Dance", "params": "ggMPOg1uX1ZPOVlYbzdGUVE%3D"},
        ...
    ]
}
```

### `YTMusic.get_mood_playlists(params)`

Retourne les playlists d'une catégorie de mood/genre.

```python
# Utiliser les params récupérés depuis get_mood_categories()
playlists = yt.get_mood_playlists("ggMPOg1uX1ZOdnh3VUgyWUE%3D")
```

```python
[
    {
        "title": "Feel Good Hits",
        "playlistId": "PLxxxxxxx",
        "thumbnails": [...],
        "description": "The best feel good hits"
    }
]
```

---

## Charts

### `YTMusic.get_charts(country='ZZ')`

Retourne les charts YouTube Music (artistes et playlists de top vidéos).

```python
# Charts globaux
charts = yt.get_charts()

# Charts d'un pays spécifique
us_charts = yt.get_charts(country='US')
fr_charts = yt.get_charts(country='FR')
```

```python
{
    "countries": {
        "selected": {"text": "United States"},
        "options": ["DE", "ZZ", "ZW", "FR", ...]
    },
    "videos": [
        {
            "title": "Daily Top Music Videos - United States",
            "playlistId": "PL4fGSI1pDJn61unMfmrUSz68RT8IFFnks",
            "thumbnails": [...]
        }
    ],
    "artists": [
        {
            "title": "YoungBoy Never Broke Again",
            "browseId": "UCR28YDxjDE3ogQROaNdnRbQ",
            "subscribers": "9.62M",
            "thumbnails": [...],
            "rank": "1",
            "trend": "neutral"   # 'up' | 'down' | 'neutral'
        }
    ],
    "genres": [   # US uniquement
        {
            "title": "Top 50 Pop Music Videos United States",
            "playlistId": "PL4fGSI1pDJn77aK7sAW2AT0oOzo5inWY8",
            "thumbnails": [...]
        }
    ]
}
```

> 💡 Les utilisateurs **Premium** authentifiés ont accès à des charts journaliers/hebdomadaires séparés.
> La section `genres` n'est disponible que pour les **charts US**.

---

# 08 — Podcasts

> Nécessite une **authentification**.

### `YTMusic.get_podcast(browseId)`

```python
podcast = yt.get_podcast("MPSPxxxxxxx")
```

### `YTMusic.get_episode(videoId)`

```python
episode = yt.get_episode("xxxxxxxxx")
```

### `YTMusic.get_episodes_playlist(playlistId=None)`

Retourne la playlist des épisodes sauvegardés.

```python
episodes = yt.get_episodes_playlist()
# ou avec un playlistId spécifique
```

---

# 09 — Uploads (Musique personnelle)

> Nécessite obligatoirement l'authentification **browser headers** (`browser.json`).
> L'upload **ne fonctionne pas** avec OAuth.

## Uploader un fichier

### `YTMusic.upload_song(filepath)`

```python
response = yt.upload_song("/chemin/vers/fichier.mp3")
# → "STATUS_SUCCEEDED" si succès, ou code d'erreur
```

**Formats supportés** : mp3, flac, m4a, wma, ogg

---

## Lister les uploads

### `YTMusic.get_library_upload_songs(limit=25, order=None)`

```python
uploads = yt.get_library_upload_songs(limit=25, order='recently_added')
# order: 'a_to_z' | 'z_to_a' | 'recently_added'
```

```python
[
    {
        "entityId": "t_po_CICr2crg7OWpchDpjPjrBA",
        "videoId": "Uise6RPKoek",
        "title": "A Sky Full Of Stars",
        "artists": [{"name": "Coldplay", "id": "..."}],
        "album": "Ghost Stories",
        "likeStatus": "LIKE",
        "thumbnails": [...]
    }
]
```

### `YTMusic.get_library_upload_albums(limit=25, order=None)`

```python
albums = yt.get_library_upload_albums(limit=25)
```

### `YTMusic.get_library_upload_artists(limit=25, order=None)`

```python
artists = yt.get_library_upload_artists(limit=25)
```

### `YTMusic.get_library_upload_artist(browseId, limit=25)`

```python
artist_songs = yt.get_library_upload_artist("FEmusic_library_privately_owned_artist_...")
```

### `YTMusic.get_library_upload_album(browseId)`

```python
album = yt.get_library_upload_album("FEmusic_library_privately_owned_release_...")
```

---

## Supprimer un upload

### `YTMusic.delete_upload_entity(entityId)`

```python
uploads = yt.get_library_upload_songs()
yt.delete_upload_entity(uploads[0]['entityId'])
# → "STATUS_SUCCEEDED"
```

---

# 10 — Watch Playlists (Lecture suivante)

## `YTMusic.get_watch_playlist(videoId=None, playlistId=None, limit=25, radio=False, shuffle=False)`

Retourne la queue de lecture suivante (les titres qui seront joués après le titre actuel), comme lorsqu'on appuie sur Play, Radio ou Shuffle dans YouTube Music.

```python
# Queue à partir d'un titre
watch = yt.get_watch_playlist(videoId="bx1Bh8ZvH84")

# Radio basée sur un titre
radio = yt.get_watch_playlist(videoId="bx1Bh8ZvH84", radio=True)

# Shuffle d'une playlist
shuffled = yt.get_watch_playlist(playlistId="PLxxxxxxx", shuffle=True)

# À partir d'une playlist
queue = yt.get_watch_playlist(playlistId="PLxxxxxxx", limit=50)
```

### Structure de la réponse

```python
{
    "tracks": [
        {
            "videoId": "bx1Bh8ZvH84",
            "title": "Wonderwall",
            "length": "4:19",
            "thumbnail": [...],
            "feedbackTokens": {"add": "...", "remove": "..."},
            "likeStatus": "INDIFFERENT",
            "artists": [{"name": "Oasis", "id": "..."}],
            "album": {"name": "Morning Glory", "id": "..."},
            "year": "1995",
            "videoType": "MUSIC_VIDEO_TYPE_ATV",
            "counterpart": {...}   # version vidéo/audio alternative si disponible
        }
    ],
    "playlistId": "RDEMxxxxxxx",
    "lyrics": "MPLYxxxxxxxxx"   # browseId pour get_lyrics()
}
```

> 💡 Le champ `lyrics` retourné ici est le `browseId` à passer directement à `get_lyrics()`.
