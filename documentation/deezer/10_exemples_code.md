# 10 — Exemples de Code

---

## JavaScript (Vanilla) — Recherche et affichage

```javascript
// Recherche de titres
async function searchTracks(query) {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.error('Erreur:', data.error.message);
    return;
  }

  data.data.forEach(track => {
    console.log(`
      🎵 ${track.title}
      👤 ${track.artist.name}
      💿 ${track.album.title}
      ⏱️ ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}
      🔊 Preview: ${track.preview}
    `);
  });
}

searchTracks('daft punk');
```

---

## JavaScript — Récupérer un artiste et ses albums

```javascript
async function getArtistWithAlbums(artistId) {
  const [artistRes, albumsRes] = await Promise.all([
    fetch(`https://api.deezer.com/artist/${artistId}`),
    fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=20`)
  ]);

  const artist = await artistRes.json();
  const albums = await albumsRes.json();

  console.log(`Artiste : ${artist.name}`);
  console.log(`Fans : ${artist.nb_fan.toLocaleString()}`);
  console.log(`\nAlbums :`);

  albums.data.forEach(album => {
    console.log(`  - ${album.title} (${album.release_date?.slice(0, 4) || 'N/A'})`);
  });
}

getArtistWithAlbums(27); // Daft Punk
```

---

## JavaScript — Récupérer les charts globaux

```javascript
async function getGlobalCharts() {
  const response = await fetch('https://api.deezer.com/chart');
  const charts = await response.json();

  console.log('🏆 Top 5 titres :');
  charts.tracks.data.slice(0, 5).forEach((track, i) => {
    console.log(`  ${i + 1}. ${track.title} — ${track.artist.name}`);
  });

  console.log('\n🏆 Top 5 artistes :');
  charts.artists.data.slice(0, 5).forEach((artist, i) => {
    console.log(`  ${i + 1}. ${artist.name}`);
  });
}

getGlobalCharts();
```

---

## React — Composant de recherche musicale

```jsx
import { useState } from 'react';

function DeezerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await res.json();
      setResults(data.data || []);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>🎵 Recherche Deezer</h1>

      <div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Rechercher un titre..."
        />
        <button onClick={search} disabled={loading}>
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      <ul>
        {results.map(track => (
          <li key={track.id}>
            <img src={track.album.cover_small} alt={track.album.title} width={50} />
            <div>
              <strong>{track.title}</strong>
              <span> — {track.artist.name}</span>
            </div>
            <audio controls src={track.preview} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DeezerSearch;
```

---

## Python — Wrapper simple

```python
import requests

BASE_URL = "https://api.deezer.com"

def search_tracks(query, limit=10):
    """Rechercher des titres sur Deezer"""
    response = requests.get(f"{BASE_URL}/search", params={
        "q": query,
        "limit": limit
    })
    data = response.json()
    return data.get("data", [])

def get_artist(artist_id):
    """Récupérer les infos d'un artiste"""
    response = requests.get(f"{BASE_URL}/artist/{artist_id}")
    return response.json()

def get_album(album_id):
    """Récupérer les infos d'un album"""
    response = requests.get(f"{BASE_URL}/album/{album_id}")
    return response.json()

def get_playlist(playlist_id):
    """Récupérer les infos d'une playlist"""
    response = requests.get(f"{BASE_URL}/playlist/{playlist_id}")
    return response.json()

def get_user_playlists(access_token):
    """Récupérer les playlists de l'utilisateur connecté"""
    response = requests.get(f"{BASE_URL}/user/me/playlists", params={
        "access_token": access_token
    })
    return response.json()

# Exemples d'utilisation
if __name__ == "__main__":
    # Recherche
    tracks = search_tracks("daft punk", limit=5)
    for t in tracks:
        print(f"{t['title']} — {t['artist']['name']}")

    # Artiste
    artist = get_artist(27)
    print(f"\n{artist['name']} — {artist['nb_fan']:,} fans")

    # Album
    album = get_album(302127)
    print(f"\n{album['title']} ({album['nb_tracks']} titres)")
```

---

## Python — Avec la bibliothèque deezer-python

```bash
pip install deezer-python
```

```python
import deezer

client = deezer.Client()

# Recherche de titres
results = client.search("daft punk")
for track in results[:5]:
    print(f"{track.title} — {track.artist.name}")

# Récupérer un artiste
artist = client.get_artist(27)
print(f"\n{artist.name}: {artist.nb_fan} fans")

# Albums d'un artiste
albums = artist.get_albums()
for album in albums[:5]:
    print(f"  - {album.title} ({album.release_date})")

# Détails d'un album
album = client.get_album(302127)
tracks = album.get_tracks()
for track in tracks:
    print(f"  {track.track_position}. {track.title}")
```

---

## Java — Exemple avec la bibliothèque deezer-api

```xml
<!-- pom.xml -->
<dependency>
  <groupId>com.github.yvasyliev</groupId>
  <artifactId>deezer-api</artifactId>
  <version>2.1.2</version>
</dependency>
```

```java
import com.github.yvasyliev.deezer.DeezerApi;

public class DeezerExample {
    public static void main(String[] args) throws Exception {
        DeezerApi api = new DeezerApi();

        // Récupérer un album
        var album = api.album().getById(302127).execute();
        System.out.println("Album: " + album.getTitle());

        // Recherche de titres
        var tracks = api.search().searchTrack("eminem").execute();
        tracks.getData().forEach(t ->
            System.out.println(t.getTitle() + " — " + t.getArtist().getName())
        );
    }
}
```

---

## cURL — Exemples rapides

```bash
# Rechercher un artiste
curl "https://api.deezer.com/search/artist?q=daft+punk"

# Détails d'un titre
curl "https://api.deezer.com/track/3135556"

# Détails d'un album
curl "https://api.deezer.com/album/302127"

# Top charts
curl "https://api.deezer.com/chart"

# Profil utilisateur (avec token)
curl "https://api.deezer.com/user/me?access_token=VOTRE_TOKEN"

# Recherche avancée avec tri
curl "https://api.deezer.com/search?q=electronic&order=DURATION_DESC&limit=5"

# Pagination
curl "https://api.deezer.com/artist/27/albums?index=0&limit=50"
```
