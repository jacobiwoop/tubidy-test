# 07 — SDK JavaScript

> Le SDK JavaScript est la solution recommandée pour jouer de la musique dans le navigateur et gérer l'authentification côté client.
>
> 📖 Documentation officielle : https://developers.deezer.com/sdk/javascript

---

## Pourquoi utiliser le SDK ?

- Contourne les problèmes **CORS** liés aux appels OAuth depuis le navigateur
- Permet de jouer des **titres complets** (et pas seulement les aperçus de 30 secondes) pour les utilisateurs Premium
- Fournit un **player intégré** contrôlable par code
- Gère automatiquement l'authentification et les tokens

---

## Intégration de base

### Chargement du SDK

```html
<script src="https://e-cdns-files.dzcdn.net/js/min/dz.js"></script>
```

### Initialisation

```javascript
DZ.init({
  appId: 'VOTRE_APP_ID',
  channelUrl: 'https://votre-domaine.com/channel.html',
  player: {
    container: 'dz-player',   // ID du div conteneur du player
    format: 'classic',
    width: 700,
    height: 300,
    onload: function(state) {
      console.log('Player prêt');
    }
  }
});
```

### Fichier channel.html (requis)

Ce fichier doit être hébergé sur votre domaine :

```html
<html>
<body>
  <script src="https://e-cdns-files.dzcdn.net/js/min/dz.js"></script>
</body>
</html>
```

---

## Authentification avec le SDK

### Vérifier le statut de connexion

```javascript
DZ.getLoginStatus(function(response) {
  if (response.status === 'connected') {
    console.log('Utilisateur connecté');
    console.log('Token :', response.authResponse.accessToken);
  } else {
    console.log('Non connecté');
  }
});
```

### Connecter l'utilisateur

```javascript
DZ.login(function(response) {
  if (response.authResponse) {
    console.log('Connecté ! Token :', response.authResponse.accessToken);
  } else {
    console.log('Connexion annulée');
  }
}, { perms: 'basic_access,email,manage_library' });
```

### Déconnecter l'utilisateur

```javascript
DZ.logout(function() {
  console.log('Déconnecté');
});
```

---

## Contrôle du Player

### Jouer un titre

```javascript
DZ.player.playTracks([3135556]);          // Par ID de track
DZ.player.playAlbum(302127);              // Par ID d'album
DZ.player.playPlaylist(908622995);        // Par ID de playlist
DZ.player.playArtistRadio(27);           // Radio d'un artiste
```

### Jouer un podcast

```javascript
DZ.player.playPodcast(podcastId);
DZ.player.playEpisodes([episodeId]);
```

### Contrôles de lecture

```javascript
DZ.player.play();        // Lecture
DZ.player.pause();       // Pause
DZ.player.next();        // Titre suivant
DZ.player.prev();        // Titre précédent
DZ.player.setVolume(80); // Volume (0-100)
DZ.player.setMute(true); // Muet
DZ.player.seek(50);      // Position (0-100%)
```

### Informations sur la lecture en cours

```javascript
DZ.player.getCurrentTrack();    // Objet du titre en cours
DZ.player.isPlaying();          // true/false
DZ.player.getCurrentIndex();    // Index dans la queue
DZ.player.getVolume();          // Volume actuel
```

---

## Appels API via le SDK

```javascript
// GET request
DZ.api('/user/me', function(response) {
  console.log('Profil :', response);
});

// POST request
DZ.api('/user/me/playlists', 'POST', { title: 'Ma Playlist' }, function(response) {
  console.log('Playlist créée :', response.id);
});
```

---

## Événements du Player

```javascript
DZ.Event.subscribe('player_play', function() {
  console.log('Lecture démarrée');
});

DZ.Event.subscribe('player_paused', function() {
  console.log('Lecture en pause');
});

DZ.Event.subscribe('current_track', function(obj) {
  console.log('Nouveau titre :', obj.track.title);
});

DZ.Event.subscribe('player_position', function(array) {
  // array[0] = position en secondes, array[1] = durée totale
  console.log(`Position : ${array[0]}s / ${array[1]}s`);
});

DZ.Event.subscribe('tracklist_changed', function() {
  console.log('File de lecture modifiée');
});
```

---

## Limitations connues du SDK JavaScript

| Limitation | Détail |
|---|---|
| **iOS / Safari** | Seuls les aperçus de 30 secondes sont accessibles depuis une page web sur iOS, même pour les utilisateurs Premium |
| **Streaming complet** | Disponible uniquement pour les comptes Premium via le SDK (pas via l'API directe) |
| **Native SDK** | Le SDK natif (Android/iOS) a été **déprécié** et n'est plus supporté |
| **Personnalisation** | Vous pouvez ajouter vos propres fonctionnalités, tant qu'elles respectent les CGU |

---

## Notes importantes

- Si un utilisateur Premium reçoit seulement des aperçus de 30 secondes **après un refresh**, vérifiez qu'il est bien connecté via `DZ.getLoginStatus`.
- Le SDK ne supporte pas la soumission d'applications sur l'App Store — Deezer ne fournit pas de certification pour cela.
