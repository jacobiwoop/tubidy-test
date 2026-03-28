# 02 — Authentification (OAuth 2.0)

## Vue d'ensemble

L'API Deezer utilise le protocole **OAuth 2.0** pour authentifier les utilisateurs et sécuriser l'accès aux données privées.

Le flux se déroule en 3 étapes :
1. Rediriger l'utilisateur vers la page de login Deezer
2. Récupérer le **code** de retour dans l'URL
3. Échanger ce code contre un **access_token**

---

## Étape 1 — Rediriger l'utilisateur

Construisez l'URL de connexion et redirigez l'utilisateur :

```
https://connect.deezer.com/oauth/auth.php
  ?app_id=YOUR_APP_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &perms=basic_access,email
```

### Paramètres

| Paramètre | Obligatoire | Description |
|---|---|---|
| `app_id` | ✅ | Votre identifiant d'application |
| `redirect_uri` | ✅ | URL de retour après connexion (une seule URI possible) |
| `perms` | ✅ | Permissions demandées (séparées par des virgules) |

> ⚠️ Il n'est **pas possible** de définir plusieurs redirect URIs pour des raisons de sécurité.

---

## Étape 2 — Récupérer le code

Après connexion, Deezer redirige l'utilisateur vers votre `redirect_uri` avec un paramètre `code` :

```
https://votre-app.com/callback?code=A_CODE_GENERATED_BY_DEEZER
```

---

## Étape 3 — Obtenir l'access_token

Échangez le `code` contre un token :

```
https://connect.deezer.com/oauth/access_token.php
  ?app_id=YOUR_APP_ID
  &secret=YOUR_APP_SECRET
  &code=THE_CODE_FROM_STEP2
  &output=json
```

### Réponse

```json
{
  "access_token": "fr09J5aJm5L3pHe9s0...",
  "expires": 0
}
```

> Si `expires` est `0`, le token n'a **pas de date d'expiration**.

---

## Utiliser le token dans les requêtes

Ajoutez le token en paramètre de chaque requête protégée :

```
https://api.deezer.com/user/me?access_token=YOUR_ACCESS_TOKEN
```

Ou via un POST :

```
POST /user/me/playlists?access_token=YOUR_ACCESS_TOKEN&playlist_id=123
Host: api.deezer.com
```

---

## Permissions disponibles (perms)

| Permission | Description |
|---|---|
| `basic_access` | Accès aux infos publiques du profil utilisateur |
| `email` | Accès à l'adresse email de l'utilisateur |
| `offline_access` | Token sans expiration (accès hors-ligne) |
| `manage_library` | Ajouter/supprimer des titres, albums, artistes dans la bibliothèque |
| `manage_community` | Suivre/ne plus suivre des utilisateurs |
| `delete_library` | Supprimer des éléments de la bibliothèque |
| `listening_history` | Accès à l'historique d'écoute |

### Exemple d'URL complète avec permissions multiples

```
https://connect.deezer.com/oauth/auth.php
  ?app_id=123456
  &redirect_uri=https://monapp.com/callback
  &perms=basic_access,email,manage_library,offline_access
```

---

## Erreurs OAuth courantes

### OAuthException

```json
{
  "error": {
    "type": "OAuthException",
    "message": "Invalid OAuth access token.",
    "code": 300
  }
}
```

**Causes possibles :**
- Token expiré → regénérez-en un nouveau
- Mauvais token utilisé pour un endpoint privé
- Permission insuffisante (ex : `manage_library` manquant)

### Erreur CORS avec JavaScript

> Si votre requête de token est bloquée par CORS en JavaScript, c'est normal : il ne faut pas appeler l'endpoint de token depuis le navigateur. Utilisez le **SDK JavaScript officiel** à la place.

---

## Exemple complet en JavaScript

```javascript
const APP_ID = 'VOTRE_APP_ID';
const REDIRECT_URI = 'https://monapp.com/callback';

// Étape 1 : Rediriger vers Deezer
const loginUrl = `https://connect.deezer.com/oauth/auth.php`
  + `?app_id=${APP_ID}`
  + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
  + `&perms=basic_access,email,manage_library`;

window.location.href = loginUrl;

// Étape 2 : Récupérer le code depuis l'URL de retour
const params = new URLSearchParams(window.location.search);
const code = params.get('code');

// Étape 3 : Échanger le code contre un token (à faire côté serveur !)
// Ce call doit être effectué DEPUIS VOTRE SERVEUR, pas depuis le navigateur
const response = await fetch(
  `https://connect.deezer.com/oauth/access_token.php`
  + `?app_id=${APP_ID}&secret=${APP_SECRET}&code=${code}&output=json`
);
const { access_token } = await response.json();
```
