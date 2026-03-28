# 05 — Utilisateurs

> Tous les endpoints `/user/me` nécessitent un **access_token** valide.

---

## Profil utilisateur

### Obtenir le profil de l'utilisateur connecté

```http
GET https://api.deezer.com/user/me?access_token=TOKEN
```

```json
{
  "id": 5557228304,
  "name": "John Doe",
  "lastname": "Doe",
  "firstname": "John",
  "email": "john@example.com",
  "birthday": "1990-01-01",
  "inscription_date": "2015-06-20",
  "gender": "M",
  "link": "https://www.deezer.com/profile/5557228304",
  "picture": "https://api.deezer.com/user/5557228304/image",
  "country": "FR",
  "lang": "fr",
  "is_kid": false,
  "explicit_content_level": "explicit_display",
  "status": 0
}
```

### Obtenir le profil d'un autre utilisateur

```http
GET https://api.deezer.com/user/{user_id}
```

---

## Bibliothèque musicale

### Titres favoris

```http
GET https://api.deezer.com/user/me/tracks?access_token=TOKEN
```

```http
# Ajouter un titre aux favoris
POST https://api.deezer.com/user/me/tracks?access_token=TOKEN&track_id=3135556

# Supprimer un titre des favoris
DELETE https://api.deezer.com/user/me/tracks?access_token=TOKEN&track_id=3135556
```

### Albums favoris

```http
GET https://api.deezer.com/user/me/albums?access_token=TOKEN
POST https://api.deezer.com/user/me/albums?access_token=TOKEN&album_id=302127
DELETE https://api.deezer.com/user/me/albums?access_token=TOKEN&album_id=302127
```

### Artistes favoris

```http
GET https://api.deezer.com/user/me/artists?access_token=TOKEN
POST https://api.deezer.com/user/me/artists?access_token=TOKEN&artist_id=27
DELETE https://api.deezer.com/user/me/artists?access_token=TOKEN&artist_id=27
```

### Radios favorites

```http
GET https://api.deezer.com/user/me/radios?access_token=TOKEN
POST https://api.deezer.com/user/me/radios?access_token=TOKEN&radio_id=6
DELETE https://api.deezer.com/user/me/radios?access_token=TOKEN&radio_id=6
```

---

## Playlists

### Lister les playlists de l'utilisateur

```http
GET https://api.deezer.com/user/me/playlists?access_token=TOKEN
```

### Créer une playlist

```http
POST https://api.deezer.com/user/me/playlists?access_token=TOKEN&title=Ma+Playlist
```

### Ajouter une playlist aux favoris

```http
POST https://api.deezer.com/user/me/playlists?access_token=TOKEN&playlist_id=908622995
```

---

## Recommandations et Flow

### Flow personnalisé

```http
GET https://api.deezer.com/user/me/flow?access_token=TOKEN
```

### Recommandations de titres

```http
GET https://api.deezer.com/user/{user_id}/recommendations/tracks
```

### Recommandations d'albums

```http
GET https://api.deezer.com/user/{user_id}/recommendations/albums
```

### Recommandations d'artistes

```http
GET https://api.deezer.com/user/{user_id}/recommendations/artists
```

---

## Historique d'écoute

> Nécessite la permission `listening_history`

```http
GET https://api.deezer.com/user/me/history?access_token=TOKEN
```

---

## Abonnements / Abonnés

### Liste des abonnements (followings)

```http
GET https://api.deezer.com/user/me/followings?access_token=TOKEN
```

### Liste des abonnés (followers)

```http
GET https://api.deezer.com/user/me/followers?access_token=TOKEN
```

### Suivre un utilisateur

```http
POST https://api.deezer.com/user/me/followings?access_token=TOKEN&user_id=123
```

> Nécessite la permission `manage_community`

### Ne plus suivre un utilisateur

```http
DELETE https://api.deezer.com/user/me/followings?access_token=TOKEN&user_id=123
```

---

## Permissions requises par action

| Action | Permission requise |
|---|---|
| Lire le profil | `basic_access` |
| Lire l'email | `email` |
| Lire/modifier la bibliothèque | `manage_library` |
| Supprimer de la bibliothèque | `delete_library` |
| Suivre/ne plus suivre | `manage_community` |
| Accès à l'historique | `listening_history` |
| Token sans expiration | `offline_access` |
