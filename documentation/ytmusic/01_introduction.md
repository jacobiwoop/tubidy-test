# 01 — Introduction

## Qu'est-ce que ytmusicapi ?

`ytmusicapi` est une bibliothèque **Python 3** qui permet d'interagir avec YouTube Music en émulant les requêtes HTTP du client web du navigateur. Elle utilise les cookies/headers de session d'un utilisateur connecté pour s'authentifier.

> ⚠️ **Ce projet n'est pas supporté ni endorsé par Google.** Il repose sur l'ingénierie inverse du client web de YouTube Music et peut cesser de fonctionner à tout moment si Google modifie son interface interne.

---

## Ce que ytmusicapi permet de faire

### 🔍 Browsing (Navigation)
- Recherche avec tous les filtres disponibles + suggestions
- Informations sur un artiste (chansons, vidéos, albums, singles, artistes similaires)
- Informations sur un utilisateur (vidéos, playlists)
- Métadonnées d'un album
- Métadonnées d'un titre/vidéo
- Watch playlists (titres suivants quand tu appuies sur play / radio / shuffle)
- Paroles d'une chanson (avec timestamps si disponibles)

### 🎭 Exploration
- Playlists par humeur et genre ("Moods & Genres")
- Charts globaux et par pays (artistes, vidéos, genres)

### 📚 Gestion de bibliothèque (nécessite authentification)
- Contenu de la bibliothèque : playlists, titres, artistes, albums, abonnements, podcasts, chaînes
- Ajouter/retirer du contenu : noter des titres/albums/playlists, s'abonner/se désabonner d'artistes
- Consulter et modifier l'historique d'écoute

### 📋 Playlists (nécessite authentification)
- Créer et supprimer des playlists
- Modifier des playlists (titre, description, confidentialité)
- Ajouter/supprimer des titres dans une playlist
- Récupérer les titres aimés ("Liked Songs")
- Récupérer les épisodes sauvegardés

### 🎙️ Podcasts (nécessite authentification)
- Accès aux podcasts de la bibliothèque

### ⬆️ Uploads (nécessite authentification Browser)
- Uploader des fichiers audio locaux vers YouTube Music
- Gérer les uploads : lister, supprimer
- Lister les artistes et albums uploadés

---

## Ce que ytmusicapi ne permet PAS

- ❌ **Streaming audio** : la bibliothèque ne fournit pas d'URLs de streaming directes jouables. Pour lire de la musique, il faut passer par `yt-dlp` ou le player YouTube en combinaison.
- ❌ **API officielle** : ce n'est pas une API officielle Google, il n'y a pas de garantie de stabilité.
- ❌ **Uploads via OAuth** : l'upload de musique nécessite obligatoirement l'authentification par browser headers, pas OAuth.

---

## Installation

```bash
pip install ytmusicapi
```

**Prérequis** : Python 3.8+

---

## Version actuelle

`ytmusicapi 1.11.5` (dernière version stable au moment de cette documentation)

---

## Instanciation de base

```python
from ytmusicapi import YTMusic

# Mode non authentifié (catalogue public uniquement)
yt = YTMusic()

# Avec authentification OAuth (recommandé pour les données utilisateur)
yt = YTMusic('oauth.json')

# Avec authentification browser headers
yt = YTMusic('browser.json')

# Avec langue et localisation personnalisées
yt = YTMusic('oauth.json', language='fr', location='FR')
```

### Paramètres du constructeur `YTMusic()`

| Paramètre | Type | Description |
|---|---|---|
| `auth` | `str \| dict \| None` | Chemin vers le fichier d'auth, ou dict de credentials, ou None |
| `user` | `str \| None` | ID du brand account (optionnel) |
| `requests_session` | `Session \| None` | Session requests personnalisée |
| `proxies` | `dict \| None` | Configuration proxy |
| `language` | `str` | Langue des résultats (défaut: `'en'`) |
| `location` | `str` | Localisation géographique (ex: `'FR'`, `'US'`) |
| `oauth_credentials` | `OAuthCredentials \| None` | Credentials OAuth personnalisés |
