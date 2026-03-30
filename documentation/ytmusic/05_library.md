# 05 — Library (Bibliothèque)

> Toutes les fonctions de cette section nécessitent une **authentification**.

---

## Informations du compte

### `YTMusic.get_account_info()`

```python
info = yt.get_account_info()
# → {"accountName": "John Doe", "accountPhotoUrl": "https://..."}
```

---

## Contenu de la bibliothèque

### `YTMusic.get_library_playlists(limit=25)`

```python
playlists = yt.get_library_playlists(limit=25)
```

```python
[
    {
        "playlistId": "PLxxxxxxx",
        "title": "Ma Playlist",
        "thumbnails": [...],
        "count": "42"
    }
]
```

---

### `YTMusic.get_library_songs(limit=25, validateStatus=False, order=None)`

```python
songs = yt.get_library_songs(limit=25, order='recently_added')
# order: 'a_to_z' | 'z_to_a' | 'recently_added'
```

---

### `YTMusic.get_library_albums(limit=25, order=None)`

```python
albums = yt.get_library_albums(limit=25, order='recently_added')
```

---

### `YTMusic.get_library_artists(limit=25, order=None)`

```python
artists = yt.get_library_artists(limit=25, order='a_to_z')
```

---

### `YTMusic.get_library_subscriptions(limit=25, order=None)`

Artistes auxquels l'utilisateur est abonné.

```python
subscriptions = yt.get_library_subscriptions(limit=25)
```

---

### `YTMusic.get_library_podcasts(limit=25, order=None)`

```python
podcasts = yt.get_library_podcasts(limit=25)
```

---

### `YTMusic.get_library_channels(limit=25, order=None)`

Chaînes YouTube auxquelles l'utilisateur est abonné.

```python
channels = yt.get_library_channels(limit=25)
```

---

## Actions sur les éléments

### `YTMusic.rate_song(videoId, rating)`

Note un titre (like/dislike).

```python
yt.rate_song("bx1Bh8ZvH84", "LIKE")
# rating: 'LIKE' | 'DISLIKE' | 'INDIFFERENT'
```

### `YTMusic.edit_song_library_status(feedbackTokens)`

Ajoute ou retire un titre de la bibliothèque via les feedbackTokens.

```python
# feedbackTokens récupérés depuis search() ou get_album()
yt.edit_song_library_status(["AB9zfpIGg9XN4u2iJ..."])
```

### `YTMusic.rate_playlist(playlistId, rating)`

Note une playlist.

```python
yt.rate_playlist("PLxxxxxxx", "LIKE")
# rating: 'LIKE' | 'INDIFFERENT'
```

### `YTMusic.subscribe_artists(channelIds)`

S'abonner à un ou plusieurs artistes.

```python
yt.subscribe_artists(["UCmMUZbaYdNH0bEd1PAlAqsA", "UCr_iyUANcn9OX_yy9piYoLw"])
```

### `YTMusic.unsubscribe_artists(channelIds)`

Se désabonner d'artistes.

```python
yt.unsubscribe_artists(["UCmMUZbaYdNH0bEd1PAlAqsA"])
```

---

## Historique d'écoute

### `YTMusic.get_history()`

Retourne l'historique d'écoute de l'utilisateur.

```python
history = yt.get_history()
```

```python
[
    {
        "videoId": "bx1Bh8ZvH84",
        "title": "Wonderwall",
        "artists": [{"name": "Oasis", "id": "..."}],
        "album": {"name": "Morning Glory", "id": "..."},
        "duration": "4:19",
        "thumbnails": [...],
        "feedbackToken": "AB9zfp..."   # utilisé pour supprimer de l'historique
    }
]
```

### `YTMusic.add_history_item(song)`

Ajoute manuellement un titre à l'historique.

```python
# song = résultat de get_song()
song = yt.get_song("bx1Bh8ZvH84")
yt.add_history_item(song)
```

### `YTMusic.remove_history_items(feedbackTokens)`

Supprime des titres de l'historique.

```python
history = yt.get_history()
# Supprimer le premier élément
yt.remove_history_items([history[0]['feedbackToken']])
```
