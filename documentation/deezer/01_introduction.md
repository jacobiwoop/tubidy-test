# 01 — Introduction à l'API Deezer

## Qu'est-ce que l'API Deezer ?

L'API Deezer est une interface de programmation qui permet aux développeurs d'accéder au catalogue musical de Deezer et d'intégrer ses fonctionnalités dans leurs propres applications. Elle donne accès à des millions de titres, albums, artistes, playlists et podcasts.

Elle est conçue pour être **flexible**, **simple à utiliser** et retourne des données au format **JSON**.

---

## Capacités principales

Avec l'API Deezer, vous pouvez :

- **Rechercher** de la musique par artiste, album, titre ou genre
- **Accéder aux métadonnées** : titres, durée, couvertures d'albums, biographies d'artistes
- **Gérer les playlists** : créer, modifier, supprimer des playlists utilisateur
- **Accéder aux favoris** d'un utilisateur (titres, albums, artistes)
- **Explorer les charts** par genre musical
- **Écouter des aperçus** de 30 secondes (streaming complet via les SDKs uniquement)
- **Accéder aux podcasts** et épisodes
- **Utiliser les radios** (Mixes) via `/radio`

---

## URL de base

```
https://api.deezer.com
```

---

## Accès public vs authentifié

| Type d'accès | Nécessite un token ? | Cas d'usage |
|---|---|---|
| **Public** | ❌ Non | Recherche, catalogues, métadonnées |
| **Authentifié** | ✅ Oui (OAuth 2.0) | Playlists perso, favoris, actions utilisateur |

Pour les requêtes publiques (lecture du catalogue), aucune authentification n'est nécessaire. Pour accéder aux données privées d'un utilisateur ou effectuer des actions en son nom, un token OAuth 2.0 est obligatoire.

---

## Créer une application Deezer

Avant d'utiliser l'API, vous devez enregistrer votre application :

1. Rendez-vous sur https://developers.deezer.com/myapps
2. Connectez-vous avec votre compte Deezer (ou créez-en un)
3. Cliquez sur **"New Application"**
4. Remplissez les informations : nom, description, URL de redirection
5. Récupérez votre **App ID** et votre **App Secret**

> ⚠️ L'App Secret doit rester **strictement confidentiel**. Ne l'exposez jamais côté client.

---

## Format des réponses

Toutes les réponses de l'API sont en **JSON**. Exemple de réponse pour un titre :

```json
{
  "id": 3135556,
  "title": "Harder Better Faster Stronger",
  "duration": 224,
  "preview": "https://cdns-preview-d.dzcdn.net/stream/...",
  "artist": {
    "id": 27,
    "name": "Daft Punk"
  },
  "album": {
    "id": 302127,
    "title": "Discovery",
    "cover": "https://api.deezer.com/album/302127/image"
  }
}
```

---

## JSONP (pour éviter les erreurs CORS)

Pour les requêtes depuis le navigateur sans SDK, vous pouvez utiliser le format **JSONP** :

```
https://api.deezer.com/track/3135556?output=jsonp&callback=myFunction
```

---

## Streaming audio

> ⚠️ Pour des raisons légales, l'API ne fournit que des **aperçus de 30 secondes** (mp3 preview).
> Pour diffuser des titres complets, vous devez utiliser les **SDKs officiels Deezer**.

Les URLs de preview complètes ne doivent **jamais** être rendues accessibles/téléchargeables pour l'utilisateur final.
