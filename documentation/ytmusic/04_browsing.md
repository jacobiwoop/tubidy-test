# 04 — Browsing (Navigation)

## Page d'accueil

### `YTMusic.get_home(limit=3)`

Retourne la page d'accueil YouTube Music, structurée en rangées titrées.

```python
home = yt.get_home(limit=3)
# limit = nombre de rangées à retourner (défaut: 3)
# Appeler à nouveau avec les params retournés pour charger plus
```

La réponse est une liste de sections, chacune contenant un titre et des suggestions (artistes, albums, chansons, playlists, parfois mélangés dans la même rangée).

---

## Artistes

### `YTMusic.get_artist(channelId)`

Retourne les informations complètes d'un artiste.

```python
artist = yt.get_artist("UCmMUZbaYdNH0bEd1PAlAqsA")
```

```python
# Structure de la réponse
{
    "name": "Oasis",
    "description": "Oasis were an English rock band...",
    "views": "1.5B",
    "channelId": "UCmMUZbaYdNH0bEd1PAlAqsA",
    "shuffleId": "RDAOkjHYJjL1a3xspEyVkhHAsg",
    "radioId": "RDEMkjHYJjL1a3xspEyVkhHAsg",
    "thumbnails": [...],
    "songs": {
        "browseId": "VLPLMpM3Z0118S5xuNckw1HUcj1D021AnMEB",
        "results": [
            {
                "videoId": "bx1Bh8ZvH84",
                "title": "Wonderwall",
                "thumbnails": [...],
                "artists": [{"name": "Oasis", "id": "UCmMUZbaYdNH0bEd1PAlAqsA"}],
                "album": {"name": "Morning Glory", "id": "MPREb_..."}
            }
        ]
    },
    "albums": {
        "results": [{"browseId": "MPREb_...", "title": "...", "year": "1995"}],
        "params": "..."
    },
    "singles": {"results": [...], "params": "..."},
    "videos": {
        "results": [{"title": "Wonderwall", "videoId": "bx1Bh8ZvH84", "views": "358M"}],
        "browseId": "..."
    },
    "related": {
        "results": [
            {"browseId": "UCt2KxZpY5D...", "subscribers": "450K", "title": "The Verve"}
        ]
    }
}
```

> ⚠️ Le `channelId` retourné dans la réponse **n'est pas le même** que celui passé en entrée. N'utiliser le channelId retourné qu'avec `subscribe_artists()`.

---

### `YTMusic.get_artist_albums(channelId, params, limit=100, order=None)`

Retourne la liste complète des albums/singles/shows d'un artiste.

```python
# Récupérer d'abord l'artiste pour avoir les params
artist = yt.get_artist("UCmMUZbaYdNH0bEd1PAlAqsA")

# Albums
albums = yt.get_artist_albums(
    artist['channelId'],
    artist['albums']['params'],
    limit=100,
    order='Recency'  # 'Recency' | 'Popularity' | 'Alphabetical order'
)

# Singles
singles = yt.get_artist_albums(
    artist['channelId'],
    artist['singles']['params']
)
```

---

## Albums

### `YTMusic.get_album(browseId)`

```python
album = yt.get_album("MPREb_9nqEki4ZDpp")
```

```python
{
    "title": "(What's The Story) Morning Glory?",
    "type": "Album",
    "thumbnails": [...],
    "description": "...",
    "artists": [{"name": "Oasis", "id": "..."}],
    "year": "1995",
    "trackCount": 12,
    "duration": "50 minutes",
    "audioPlaylistId": "OLAK5uy_...",
    "tracks": [
        {
            "videoId": "bx1Bh8ZvH84",
            "title": "Wonderwall",
            "artists": [...],
            "album": "Morning Glory",
            "likeStatus": "INDIFFERENT",
            "thumbnails": [...],
            "isAvailable": True,
            "isExplicit": False,
            "duration": "4:19",
            "duration_seconds": 259,
            "trackNumber": 3,
            "feedbackTokens": {"add": "...", "remove": "..."}
        }
    ],
    "other_versions": [...]
}
```

### `YTMusic.get_album_browse_id(audioPlaylistId)`

Convertit un `audioPlaylistId` (format `OLAK5uy_...`) en `browseId` (format `MPREb_...`).

```python
browse_id = yt.get_album_browse_id("OLAK5uy_kunInnOpcKECWIBQGB0Qj6ZjquxDvfckg")
# → "MPREb_IInSY5QXXrW"
```

---

## Utilisateurs

### `YTMusic.get_user(channelId)`

```python
user = yt.get_user("UCPVhZsC2od1xjGhgEc2NEPQ")
```

### `YTMusic.get_user_playlists(channelId, params)`

```python
# Récupérer d'abord l'utilisateur pour avoir les params
user = yt.get_user("UCPVhZsC2od1xjGhgEc2NEPQ")
playlists = yt.get_user_playlists(user['channelId'], user['playlists']['params'])
```

### `YTMusic.get_user_videos(channelId, params)`

```python
videos = yt.get_user_videos(user['channelId'], user['videos']['params'])
```

---

## Titres / Vidéos

### `YTMusic.get_song(videoId, signatureTimestamp=None)`

Retourne les métadonnées et infos de streaming d'un titre ou vidéo.

```python
song = yt.get_song("bx1Bh8ZvH84")
```

```python
{
    "videoId": "bx1Bh8ZvH84",
    "title": "Wonderwall",
    "lengthSeconds": "259",
    "channelId": "UCmMUZbaYdNH0bEd1PAlAqsA",
    "isOwnerViewing": False,
    "isCrawlable": True,
    "thumbnail": {"thumbnails": [...]},
    "averageRating": 4.5,
    "allowRatings": True,
    "viewCount": "386000000",
    "author": "Oasis",
    "isLowLatencyLiveStream": False,
    "isPrivate": False,
    "isLiveContent": False,
    "provider": "Virgin Music",
    "artists": ["Oasis"],
    "copyright": "...",
    "microformat": {...},
    "streamingData": {
        "expiresInSeconds": "21540",
        "formats": [...],
        "adaptiveFormats": [...]
    }
}
```

### `YTMusic.get_song_related(browseId)`

Retourne le contenu de l'onglet "Related" du panneau de lecture.

```python
related = yt.get_song_related("Yu5M...")
# → liste de sections similaires à get_home()
```

---

## Paroles

### `YTMusic.get_lyrics(browseId, timestamps=False)`

```python
# Récupérer d'abord la watch playlist pour avoir le browseId des paroles
watch = yt.get_watch_playlist("bx1Bh8ZvH84")
lyrics_browse_id = watch['lyrics']

# Récupérer les paroles
lyrics = yt.get_lyrics(lyrics_browse_id)
# → {"lyrics": "Today is gonna be the day...", "source": "Source: LyricFind"}

# Avec timestamps (si disponibles)
lyrics_ts = yt.get_lyrics(lyrics_browse_id, timestamps=True)
```
