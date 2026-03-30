# 03 — Search (Recherche)

## `YTMusic.search()`

Recherche dans le catalogue YouTube Music.

```python
yt.search(
    query: str,
    filter: str | None = None,
    scope: str | None = None,
    limit: int = 20,
    ignore_spelling: bool = False
) -> list[dict]
```

### Paramètres

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `query` | `str` | — | **Obligatoire.** Terme de recherche |
| `filter` | `str \| None` | `None` | Type de résultat (voir tableau ci-dessous) |
| `scope` | `str \| None` | `None` | Périmètre de la recherche (`library`, `uploads`) |
| `limit` | `int` | `20` | Nombre de résultats à retourner |
| `ignore_spelling` | `bool` | `False` | Si `True`, ignore les corrections orthographiques automatiques |

### Valeurs de `filter`

| Valeur | Description |
|---|---|
| `None` | Recherche globale (tous types mélangés) |
| `'songs'` | Chansons uniquement |
| `'videos'` | Vidéos uniquement |
| `'albums'` | Albums uniquement |
| `'artists'` | Artistes uniquement |
| `'playlists'` | Playlists (toutes) |
| `'community_playlists'` | Playlists communautaires |
| `'featured_playlists'` | Playlists mises en avant |
| `'uploads'` | Uploads personnels (nécessite auth) |

### Valeurs de `scope`

| Valeur | Description |
|---|---|
| `None` | Catalogue public YouTube Music (défaut) |
| `'library'` | Bibliothèque personnelle de l'utilisateur |
| `'uploads'` | Fichiers uploadés par l'utilisateur |

> ⚠️ **Compatibilités filter/scope** :
> - `scope='uploads'` → aucun `filter` possible
> - `scope='library'` → `filter` ne peut pas être `'community_playlists'` ni `'featured_playlists'`
> - Combinaison invalide → lève une exception

---

### Exemples

```python
# Recherche globale
results = yt.search("Oasis Wonderwall")

# Recherche filtrée sur les chansons
songs = yt.search("Wonderwall", filter='songs')

# Recherche d'albums
albums = yt.search("Morning Glory", filter='albums')

# Recherche dans la bibliothèque personnelle
lib_songs = yt.search("Coldplay", filter='songs', scope='library')

# Sans correction orthographique
exact = yt.search("Wonderwal", ignore_spelling=True)

# Augmenter le nombre de résultats
many = yt.search("electronic", filter='songs', limit=50)
```

---

### Structure de la réponse (recherche globale)

```python
[
    {
        "category": "Top result",
        "resultType": "song",
        "videoId": "bx1Bh8ZvH84",
        "title": "Wonderwall",
        "artists": [
            {"name": "Oasis", "id": "UCmMUZbaYdNH0bEd1PAlAqsA"}
        ],
        "album": {
            "name": "(What's The Story) Morning Glory?",
            "id": "MPREb_9nqEki4ZDpp"
        },
        "duration": "4:19",
        "duration_seconds": 259,
        "isExplicit": False,
        "inLibrary": False,
        "thumbnails": [{"url": "...", "width": 60, "height": 60}],
        "feedbackTokens": {"add": None, "remove": None}
    },
    {
        "category": "Albums",
        "resultType": "album",
        "browseId": "MPREb_IInSY5QXXrW",
        "playlistId": "OLAK5uy_kunInnOpcKECWIBQGB0Qj6ZjquxDvfckg",
        "title": "(What's The Story) Morning Glory?",
        "type": "Album",
        "artist": "Oasis",
        "year": "1995",
        "isExplicit": False
    },
    {
        "category": "Community playlists",
        "resultType": "playlist",
        "browseId": "VLPLK1PkWQlWtnNfovRdGWpKffO1Wdi2kvDx",
        "title": "Wonderwall - Oasis",
        "author": "Tate Henderson",
        "itemCount": "174"
    },
    {
        "category": "Videos",
        "resultType": "video",
        "videoId": "bx1Bh8ZvH84",
        "title": "Wonderwall",
        "artists": [{"name": "Oasis", "id": "UCmMUZbaYdNH0bEd1PAlAqsA"}],
        "views": "386M",
        "duration": "4:38",
        "duration_seconds": 278
    },
    {
        "category": "Artists",
        "resultType": "artist",
        "browseId": "UCmMUZbaYdNH0bEd1PAlAqsA",
        "artist": "Oasis",
        "shuffleId": "RDAOkjHYJjL1a3xspEyVkhHAsg",
        "radioId": "RDEMkjHYJjL1a3xspEyVkhHAsg"
    }
]
```

### Champs clés selon `resultType`

| resultType | Champs importants |
|---|---|
| `song` | `videoId`, `title`, `artists`, `album`, `duration`, `duration_seconds`, `thumbnails` |
| `video` | `videoId`, `title`, `artists`, `views`, `duration` |
| `album` | `browseId`, `playlistId`, `title`, `type`, `artist`, `year` |
| `artist` | `browseId`, `artist`, `shuffleId`, `radioId` |
| `playlist` | `browseId`, `title`, `author`, `itemCount` |

---

## `YTMusic.get_search_suggestions()`

Retourne les suggestions de recherche (autocomplétion).

```python
yt.get_search_suggestions(
    query: str,
    detailed_runs: bool = False
) -> list[str] | list[dict]
```

```python
# Suggestions simples (liste de strings)
suggestions = yt.get_search_suggestions("fade")
# → ["faded", "faded alan walker", "faded alan walker lyrics", ...]

# Suggestions détaillées (avec info sur l'historique)
detailed = yt.get_search_suggestions("fade", detailed_runs=True)
# → [{"text": "faded", "fromHistory": True, "feedbackToken": "..."}, ...]
```

---

## `YTMusic.remove_search_suggestions()`

Supprime des suggestions de l'historique de recherche de l'utilisateur.

```python
yt.remove_search_suggestions(
    suggestions: list[dict],   # résultat de get_search_suggestions(detailed_runs=True)
    indices: list[int] | None = None  # None = supprimer tout
) -> bool
```

```python
suggestions = yt.get_search_suggestions("fade", detailed_runs=True)

# Supprimer toutes les suggestions
yt.remove_search_suggestions(suggestions)

# Supprimer seulement la première
yt.remove_search_suggestions(suggestions, indices=[0])
```
