# 04 — Recherche (Search API)

## Endpoint principal

```
GET https://api.deezer.com/search?q={query}
```

> ⚠️ Le paramètre `q` est **obligatoire**. Une recherche sans query n'est pas possible.

---

## Endpoints de recherche par type

| Endpoint           | Type de résultat     |
| ------------------ | -------------------- |
| `/search`          | Titres (pa r défaut) |
| `/search/track`    | Titres               |
| `/search/artist`   | Artistes             |
| `/search/album`    | Albums               |
| `/search/playlist` | Playlists            |
| `/search/podcast`  | Podcasts             |
| `/search/radio`    | Radios / Mixes       |
| `/search/user`     | Utilisateurs         |

---

## Paramètres disponibles

| Paramètre | Type    | Description                                                      |
| --------- | ------- | ---------------------------------------------------------------- |
| `q`       | string  | **Obligatoire.** Terme de recherche                              |
| `order`   | string  | Tri des résultats (voir liste ci-dessous)                        |
| `index`   | integer | Index de départ pour la pagination (défaut: 0)                   |
| `limit`   | integer | Nombre de résultats (défaut: 25)                                 |
| `strict`  | boolean | Mode strict (`on`) — ne retourne que des correspondances exactes |

---

## Valeurs d'ordre disponibles (`order=`)

| Valeur          | Description             |
| --------------- | ----------------------- |
| `RANKING`       | Par pertinence (défaut) |
| `TRACK_ASC`     | Titre A → Z             |
| `TRACK_DESC`    | Titre Z → A             |
| `ARTIST_ASC`    | Artiste A → Z           |
| `ARTIST_DESC`   | Artiste Z → A           |
| `ALBUM_ASC`     | Album A → Z             |
| `ALBUM_DESC`    | Album Z → A             |
| `RATING_ASC`    | Note croissante         |
| `RATING_DESC`   | Note décroissante       |
| `DURATION_ASC`  | Durée croissante        |
| `DURATION_DESC` | Durée décroissante      |

### Exemple d'utilisation du tri

```http
GET https://api.deezer.com/search?q=eminem&order=DURATION_DESC
```

---

## Recherche avancée (filtres dans la query)

Vous pouvez affiner la recherche en utilisant des **mots-clés spéciaux** dans le paramètre `q` :

| Mot-clé    | Description                  | Exemple                 |
| ---------- | ---------------------------- | ----------------------- |
| `artist:`  | Filtrer par artiste          | `artist:"Daft Punk"`    |
| `album:`   | Filtrer par album            | `album:"Discovery"`     |
| `track:`   | Filtrer par titre            | `track:"Harder Better"` |
| `label:`   | Filtrer par label            | `label:"Columbia"`      |
| `dur_min:` | Durée minimale (en secondes) | `dur_min:120`           |
| `dur_max:` | Durée maximale (en secondes) | `dur_max:300`           |
| `bpm_min:` | BPM minimum                  | `bpm_min:120`           |
| `bpm_max:` | BPM maximum                  | `bpm_max:140`           |

### Exemples de recherche avancée

```http
# Chercher des titres de Daft Punk dans l'album Discovery
GET https://api.deezer.com/search?q=artist:"Daft Punk" album:"Discovery"

# Chercher des titres entre 3min et 5min
GET https://api.deezer.com/search?q=electronic&dur_min=180&dur_max=300

# Mode strict
GET https://api.deezer.com/search?q=daft punk&strict=on
```

---

## Structure de la réponse

```json
{
  "data": [
    {
      "id": 3135556,
      "title": "Harder Better Faster Stronger",
      "title_short": "Harder Better Faster Stronger",
      "duration": 224,
      "rank": 855516,
      "explicit_lyrics": false,
      "preview": "https://cdns-preview-d.dzcdn.net/stream/...",
      "artist": {
        "id": 27,
        "name": "Daft Punk",
        "picture": "https://api.deezer.com/artist/27/image"
      },
      "album": {
        "id": 302127,
        "title": "Discovery",
        "cover": "https://api.deezer.com/album/302127/image"
      }
    }
  ],
  "total": 1337,
  "next": "https://api.deezer.com/search?q=daft+punk&index=25&limit=25"
}
```

### Champs de la réponse

| Champ   | Description                          |
| ------- | ------------------------------------ |
| `data`  | Tableau des résultats                |
| `total` | Nombre total de résultats            |
| `next`  | URL de la page suivante (pagination) |
| `prev`  | URL de la page précédente            |

---

## Exemples de code

### JavaScript (Fetch)

```javascript
const query = "daft punk";
const response = await fetch(
  `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`,
);
const data = await response.json();

data.data.forEach((track) => {
  console.log(`${track.title} — ${track.artist.name}`);
});
```

### Recherche par type

```javascript
// Chercher des artistes
const artists = await fetch("https://api.deezer.com/search/artist?q=radiohead");
const artistData = await artists.json();

// Chercher des albums
const albums = await fetch("https://api.deezer.com/search/album?q=ok+computer");
const albumData = await albums.json();

// Chercher des playlists
const playlists = await fetch("https://api.deezer.com/search/playlist?q=chill");
const playlistData = await playlists.json();
```

---

## Limitations et comportements connus

- La recherche **partielle ou incomplète** peut ne pas retourner de résultats — le moteur de recherche cherche des correspondances précises.
- La recherche dans **plusieurs labels à la fois** n'est pas supportée.
- Certains résultats (podcasts, playlists vides/sans titre) **peuvent apparaître sur PC mais pas sur mobile**, en raison de différences de traitement.
- Il n'est **pas possible de rechercher sans query** — même avec uniquement des paramètres `order` ou `limit`.
