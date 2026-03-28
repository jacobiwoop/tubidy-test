# 03 — Référence des Endpoints

> URL de base : `https://api.deezer.com`  
> Format de réponse : **JSON** (ou JSONP avec `?output=jsonp&callback=fn`)

---

## 🎵 Tracks (Titres)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/track/{id}` | ❌ | Détails d'un titre |
| GET | `/track/{id}/radio` | ❌ | Titres similaires |

### Exemple

```http
GET https://api.deezer.com/track/3135556
```

```json
{
  "id": 3135556,
  "title": "Harder Better Faster Stronger",
  "title_short": "Harder Better Faster Stronger",
  "duration": 224,
  "rank": 855516,
  "explicit_lyrics": false,
  "preview": "https://cdns-preview-d.dzcdn.net/stream/...",
  "bpm": 123,
  "gain": -12.4,
  "artist": { "id": 27, "name": "Daft Punk" },
  "album": { "id": 302127, "title": "Discovery" }
}
```

---

## 💿 Albums

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/album/{id}` | ❌ | Détails d'un album |
| GET | `/album/{id}/tracks` | ❌ | Liste des titres de l'album |
| GET | `/album/{id}/fans` | ❌ | Fans de l'album |
| GET | `/album/{id}/comments` | ❌ | Commentaires de l'album |

### Exemple

```http
GET https://api.deezer.com/album/302127
```

```json
{
  "id": 302127,
  "title": "Discovery",
  "upc": "724384960650",
  "nb_tracks": 14,
  "duration": 3660,
  "fans": 1500000,
  "release_date": "2001-03-07",
  "record_type": "album",
  "available": true,
  "genres": { "data": [{ "id": 113, "name": "Dance" }] },
  "artist": { "id": 27, "name": "Daft Punk" },
  "tracks": { "data": [...] }
}
```

---

## 🎤 Artistes

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/artist/{id}` | ❌ | Informations sur un artiste |
| GET | `/artist/{id}/top` | ❌ | Top 10 des titres de l'artiste |
| GET | `/artist/{id}/albums` | ❌ | Albums de l'artiste |
| GET | `/artist/{id}/related` | ❌ | Artistes similaires |
| GET | `/artist/{id}/radio` | ❌ | Radio basée sur l'artiste |
| GET | `/artist/{id}/playlists` | ❌ | Playlists de l'artiste |
| GET | `/artist/{id}/fans` | ❌ | Nombre de fans |
| GET | `/artist/{id}/comments` | ❌ | Commentaires |

### Exemple

```http
GET https://api.deezer.com/artist/27
```

```json
{
  "id": 27,
  "name": "Daft Punk",
  "nb_album": 18,
  "nb_fan": 6700000,
  "radio": true,
  "tracklist": "https://api.deezer.com/artist/27/top?limit=50",
  "picture": "https://api.deezer.com/artist/27/image",
  "picture_medium": "https://e-cdns-images.dzcdn.net/images/artist/..."
}
```

---

## 📋 Playlists

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/playlist/{id}` | ❌ | Détails d'une playlist |
| GET | `/playlist/{id}/tracks` | ❌ | Titres de la playlist |
| GET | `/playlist/{id}/fans` | ❌ | Fans de la playlist |
| GET | `/playlist/{id}/comments` | ❌ | Commentaires |
| POST | `/playlist/{id}/tracks` | ✅ | Ajouter des titres |
| DELETE | `/playlist/{id}/tracks` | ✅ | Supprimer des titres |

### Exemple

```http
GET https://api.deezer.com/playlist/908622995
```

```json
{
  "id": 908622995,
  "title": "Top France",
  "public": true,
  "nb_tracks": 100,
  "duration": 21600,
  "fans": 250000,
  "picture": "https://api.deezer.com/playlist/908622995/image",
  "creator": { "id": 2529, "name": "Deezer Charts" },
  "tracks": { "data": [...] }
}
```

---

## 👤 Utilisateurs

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user/me` | ✅ | Profil de l'utilisateur connecté |
| GET | `/user/{id}` | ❌ | Profil d'un utilisateur |
| GET | `/user/me/playlists` | ✅ | Playlists de l'utilisateur |
| GET | `/user/me/albums` | ✅ | Albums favoris |
| GET | `/user/me/artists` | ✅ | Artistes favoris |
| GET | `/user/me/tracks` | ✅ | Titres favoris |
| GET | `/user/me/flow` | ✅ | Flow personnalisé (recommandations) |
| GET | `/user/me/history` | ✅ | Historique d'écoute |
| GET | `/user/me/followings` | ✅ | Abonnements |
| GET | `/user/me/followers` | ✅ | Abonnés |
| POST | `/user/me/playlists` | ✅ | Créer une playlist |
| POST | `/user/me/albums` | ✅ | Ajouter un album aux favoris |
| POST | `/user/me/tracks` | ✅ | Ajouter un titre aux favoris |
| DELETE | `/user/me/albums` | ✅ | Retirer un album des favoris |
| DELETE | `/user/me/tracks` | ✅ | Retirer un titre des favoris |

---

## 🔍 Recherche

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/search` | ❌ | Recherche globale (tracks) |
| GET | `/search/track` | ❌ | Recherche de titres |
| GET | `/search/artist` | ❌ | Recherche d'artistes |
| GET | `/search/album` | ❌ | Recherche d'albums |
| GET | `/search/playlist` | ❌ | Recherche de playlists |
| GET | `/search/podcast` | ❌ | Recherche de podcasts |
| GET | `/search/radio` | ❌ | Recherche de radios |
| GET | `/search/user` | ❌ | Recherche d'utilisateurs |

> Voir le fichier `04_recherche.md` pour la documentation complète.

---

## 📻 Radio (Mixes)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/radio` | ❌ | Liste des radios disponibles |
| GET | `/radio/{id}` | ❌ | Détails d'une radio |
| GET | `/radio/{id}/tracks` | ❌ | Titres d'une radio |
| GET | `/radio/genres` | ❌ | Radios par genre |
| GET | `/radio/top` | ❌ | Top 5 des radios |

---

## 🎙️ Podcasts & Épisodes

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/podcast/{id}` | ❌ | Détails d'un podcast |
| GET | `/podcast/{id}/episodes` | ❌ | Épisodes d'un podcast |
| GET | `/episode/{id}` | ❌ | Détails d'un épisode |

---

## 🎸 Genres

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/genre` | ❌ | Liste des genres musicaux |
| GET | `/genre/{id}` | ❌ | Détails d'un genre |
| GET | `/genre/{id}/artists` | ❌ | Artistes du genre |
| GET | `/genre/{id}/radios` | ❌ | Radios du genre |
| GET | `/genre/{id}/podcasts` | ❌ | Podcasts du genre |

---

## 📊 Charts (Classements)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/chart` | ❌ | Charts globaux (tracks, albums, artistes, playlists) |
| GET | `/chart/{genre_id}/tracks` | ❌ | Top titres par genre |
| GET | `/chart/{genre_id}/albums` | ❌ | Top albums par genre |
| GET | `/chart/{genre_id}/artists` | ❌ | Top artistes par genre |
| GET | `/chart/{genre_id}/playlists` | ❌ | Top playlists par genre |
| GET | `/chart/{genre_id}/podcasts` | ❌ | Top podcasts par genre |

---

## 📝 Editorial

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/editorial` | ❌ | Liste des éditoriaux |
| GET | `/editorial/{id}` | ❌ | Détails d'un éditorial |
| GET | `/editorial/{id}/selection` | ❌ | Sélection éditoriale |
| GET | `/editorial/{id}/charts` | ❌ | Charts de l'éditorial |

---

## Pagination

La plupart des endpoints de liste supportent la pagination via :

| Paramètre | Description | Défaut |
|---|---|---|
| `index` | Index de départ | 0 |
| `limit` | Nombre de résultats | 25 |

### Exemple

```http
GET https://api.deezer.com/artist/27/albums?index=0&limit=50
```
