# 📚 Documentation ytmusicapi — YouTube Music (Unofficial)

> Documentation complète de `ytmusicapi` v1.11.5 — API non officielle YouTube Music, en français.
> ⚠️ Ce projet **n'est pas supporté ni endorsé par Google**. Il peut casser à tout moment.

---

## Structure de la documentation

| Fichier | Description |
|---|---|
| [01_introduction.md](./01_introduction.md) | Présentation, installation, avertissements |
| [02_authentification.md](./02_authentification.md) | OAuth, Browser headers, Brand accounts |
| [03_search.md](./03_search.md) | Recherche et suggestions |
| [04_browsing.md](./04_browsing.md) | Navigation : artistes, albums, home, lyrics |
| [05_library.md](./05_library.md) | Gestion de la bibliothèque utilisateur |
| [06_playlists.md](./06_playlists.md) | CRUD playlists, titres aimés |
| [07_explore.md](./07_explore.md) | Charts, Moods & Genres |
| [08_podcasts.md](./08_podcasts.md) | Podcasts et épisodes |
| [09_uploads.md](./09_uploads.md) | Upload de musique personnelle |
| [10_watch.md](./10_watch.md) | Watch playlists (radio, lecture suivante) |
| [11_exemples.md](./11_exemples.md) | Exemples de code complets |

---

## Liens utiles

- 📖 **Documentation officielle** : https://ytmusicapi.readthedocs.io/en/stable/
- 💻 **GitHub** : https://github.com/sigma67/ytmusicapi
- 📦 **PyPI** : https://pypi.org/project/ytmusicapi/

---

## Installation

```bash
pip install ytmusicapi
```

## Exemple minimal

```python
from ytmusicapi import YTMusic

# Sans authentification (lecture catalogue public)
yt = YTMusic()
results = yt.search("Daft Punk")

# Avec authentification OAuth
yt = YTMusic('oauth.json')
playlists = yt.get_library_playlists()
```
