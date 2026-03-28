# 06 — Playlists

---

## Lire une playlist

```http
GET https://api.deezer.com/playlist/{playlist_id}
```

### Réponse

```json
{
  "id": 908622995,
  "title": "Top France",
  "description": "Les meilleurs titres français du moment",
  "public": true,
  "is_loved_track": false,
  "collaborative": false,
  "nb_tracks": 100,
  "unseen_track_count": 0,
  "duration": 21600,
  "fans": 250000,
  "link": "https://www.deezer.com/playlist/908622995",
  "picture": "https://api.deezer.com/playlist/908622995/image",
  "picture_medium": "https://...",
  "creation_date": "2020-04-05 16:48:07",
  "creator": {
    "id": 2529,
    "name": "Deezer Charts"
  },
  "tracks": {
    "data": [...]
  }
}
```

---

## Titres d'une playlist

```http
GET https://api.deezer.com/playlist/{playlist_id}/tracks
```

### Avec pagination

```http
GET https://api.deezer.com/playlist/908622995/tracks?index=0&limit=50
```

### Structure d'un titre dans une playlist

```json
{
  "id": 3135556,
  "title": "Harder Better Faster Stronger",
  "duration": 224,
  "rank": 855516,
  "explicit_lyrics": false,
  "time_add": 1582214747,
  "preview": "https://cdns-preview-d.dzcdn.net/stream/...",
  "artist": { "id": 27, "name": "Daft Punk" },
  "album": {
    "id": 302127,
    "title": "Discovery",
    "cover_medium": "https://..."
  }
}
```

> ⚠️ Les titres récupérés via `/playlist/{id}/tracks` peuvent ne pas contenir **tous les champs** disponibles sur `/track/{id}`. Si vous avez besoin de données supplémentaires (ex : genre de l'album), il faut faire une requête supplémentaire par titre.

---

## Créer une playlist

> Nécessite `manage_library` + access_token

```http
POST https://api.deezer.com/user/me/playlists?access_token=TOKEN&title=Ma+Nouvelle+Playlist
```

### Réponse

```json
{
  "id": 123456789
}
```

---

## Ajouter des titres à une playlist

```http
POST https://api.deezer.com/playlist/{playlist_id}/tracks?access_token=TOKEN&songs=3135556,906474,912486
```

Le paramètre `songs` est une **liste d'IDs séparés par des virgules**.

---

## Supprimer des titres d'une playlist

```http
DELETE https://api.deezer.com/playlist/{playlist_id}/tracks?access_token=TOKEN&songs=3135556
```

---

## Supprimer une playlist

```http
DELETE https://api.deezer.com/playlist/{playlist_id}?access_token=TOKEN
```

---

## Ajouter une playlist aux favoris

```http
POST https://api.deezer.com/user/me/playlists?access_token=TOKEN&playlist_id=908622995
```

---

## Exemple POST complet (ajouter un titre)

```
POST /playlist/123456789/tracks?access_token=XXXXXXXXXXXXX&songs=3135556
HTTP/1.1
Host: api.deezer.com
```

---

## Exemples de code

### JavaScript — Créer une playlist et y ajouter des titres

```javascript
const token = 'VOTRE_ACCESS_TOKEN';

// 1. Créer une playlist
const createRes = await fetch(
  `https://api.deezer.com/user/me/playlists?access_token=${token}&title=Ma%20Playlist`,
  { method: 'POST' }
);
const { id: playlistId } = await createRes.json();

// 2. Ajouter des titres
const trackIds = [3135556, 906474].join(',');
await fetch(
  `https://api.deezer.com/playlist/${playlistId}/tracks?access_token=${token}&songs=${trackIds}`,
  { method: 'POST' }
);

console.log(`Playlist ${playlistId} créée avec succès !`);
```

### JavaScript — Récupérer les titres d'une playlist avec pagination

```javascript
async function getAllTracks(playlistId) {
  let tracks = [];
  let index = 0;
  const limit = 50;

  while (true) {
    const res = await fetch(
      `https://api.deezer.com/playlist/${playlistId}/tracks?index=${index}&limit=${limit}`
    );
    const data = await res.json();

    tracks = [...tracks, ...data.data];

    if (!data.next) break;
    index += limit;
  }

  return tracks;
}
```
