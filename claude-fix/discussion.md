Parfait. Je vois tout clairement. La v3 est déjà bien avancée — nos fixes précédents sont intégrés. Voilà l'état exact :

---

## Ce qui est déjà en place ✅

- `radioSource` → dans le Context + QueueModal affiché
- `onPlayTrack(item, [])` dans SearchScreen → correct
- `fetchRecommendations` avec `autoPlay` → correct
- Chosic à la place de Last.fm pour les recommendations
- Mode offline + lecture locale
- `StatsService` / ADN musical
- `repeatMode` par défaut à `REPEAT_MODE.ALL` (boucle liste)

## Ce qui manque encore ❌

**1. `TrackPlayer.reset()` avant l'appel réseau** — l'ancienne musique continue pendant 1-2s quand tu changes depuis la recherche. Le `reset()` est toujours placé **après** la résolution du lien.

**2. Prefetch des 3 prochains** — pas encore implémenté dans cette version.

**3. `currentQueueIndex` pas mis à jour quand on avance dans la queue** — `playTrackAtIndex` appelle `handlePlayTrack(queue[index], queue, index)` mais dans `handlePlayTrack`, le `setCurrentQueueIndex` ne se met à jour que si `forceIndex !== null` — ce qui est bien le cas, donc c'est OK. Mais dans le QueueModal, `isPlaying = currentQueueIndex === index` — il faut vérifier que ça se synchronise bien.

**4. `fetchRecommendations` utilise `/chosic/recommend`** — mais si Chosic échoue, pas de fallback sur Deezer radio.

Tu veux qu'on applique les 2 fixes manquants (reset immédiat + prefetch) sur cette v3 ?

---

---

---

Laisse-moi lire les fichiers concernés.J'ai tout ce qu'il faut. Voilà les 3 problèmes bien identifiés :

---

## Problème 1 — Fin de musique ne passe pas au suivant

**Cause :** Le `service.js` (headless) et `playbackService.js` coexistent — **les deux sont potentiellement enregistrés**. Dans `playbackService.js` :

```js
TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
```

Mais surtout — le vrai problème : `Event.PlaybackTrackChanged` avec `nextTrack == null` est censé être intercepté dans `PlayerContext` via `useTrackPlayerEvents`. Mais le `repeatMode` par défaut est `REPEAT_MODE.ALL` (1), donc ce code ne s'exécute jamais :

```js
const isLast = !shuffle && idx >= queue.length - 1;
if (isLast && repeat === REPEAT_MODE.NONE) {
  // ← jamais vrai si repeat=ALL
  fetchRecommendations(lastTrack, true);
  return;
}
const nextIdx = getNextIndex(queue, idx, shuffle);
playTrackAtIndex(queue, nextIdx); // ← devrait marcher...
```

Le vrai bug : `repeatRef.current` vaut `REPEAT_MODE.ALL` (1) mais `getNextIndex` avec `idx = queue.length - 1` retourne `0` (modulo) — donc ça boucle sur le 1er. Si la queue ne contient qu'**un seul morceau** (avant que Chosic réponde), index 0 = dernier = suivant = index 0 → boucle sur lui-même au lieu de charger les suggestions.

**Mais le vrai vrai bug :** `playTrackAtIndex` est défini **après** `useTrackPlayerEvents` dans le fichier — et `useCallback` sur `playTrackAtIndex` capture une référence stale de `handlePlayTrack` (qui n'est pas dans un `useCallback`). Donc quand l'event se déclenche, `handlePlayTrack` est l'ancienne version.

## Problème 2 — Téléchargements qui disparaissent en prod

**Cause :** Android 10+ a supprimé `WRITE_EXTERNAL_STORAGE` et `READ_EXTERNAL_STORAGE` pour les apps qui ciblent API 29+. `expo-file-system` avec `FileSystem.documentDirectory` n'en a **pas besoin** — mais le vrai problème c'est que `documentDirectory` en prod pointe vers un chemin privé de l'app qui **survit aux mises à jour** mais que le user ne peut pas voir dans son explorateur de fichiers. Le téléchargement se fait bien, mais l'user croit que ça n'a pas marché car il ne voit rien.

De plus : `handleDownload` dans App.js ne recharge pas `downloads` après succès :

```js
await startDownload(track, link, ...);
// ← manque loadDownloads() ici !
```

Donc l'état `downloads` n'est pas rafraîchi → la musique reste marquée comme "non téléchargée" dans l'UI même si le fichier existe.

## Problème 3 — `playbackService.js` mort

Il existe mais n'est **pas enregistré** dans `index.js` (c'est `service.js` qui l'est). Il crée de la confusion mais ne fait rien.

---

On applique les 3 fixes ?Confirmé. On applique les 3 fixes maintenant.**Fix 1 — `handlePlayTrack` dans un `useCallback` + `handlePlayTrackRef` pour éviter les stale closures :\*\***Fix 2 — `TrackPlayer.reset()` immédiat + prefetch + mise à jour de la ref :**Maintenant ajouter le prefetch après `TrackPlayer.play()` et mettre à jour la ref :**Fix 3 — `handleDownload` dans App.js : ajouter `loadDownloads()` après succès :\***\*Fix 4 — `app.json` : retirer les permissions storage inutiles sur Android 10+ et ajouter `react-native-track-player` plugin :**3 fichiers. Voilà le récap des fixes :

---

**`PlayerContext_v3.js` — 3 corrections**

`handlePlayTrackRef` — `playTrackAtIndex` utilise maintenant une ref mise à jour à chaque render au lieu d'une closure stale. C'est la cause principale du "ne passe pas au suivant" — l'event RNTP appelait une vieille version de `handlePlayTrack` qui ne faisait plus rien.

`TrackPlayer.reset()` déplacé **avant** l'appel réseau → l'ancienne musique coupe instantanément au clic, même si le lien prend 2s à arriver. Le deuxième `reset()` en bas de la fonction a été supprimé (doublon).

`prefetchNext` — après chaque lecture, les 3 liens suivants sont résolus en arrière-plan et mis en cache 10 min. Quand le morceau suivant joue, le lien est déjà prêt → quasi instantané.

---

**`App_v3.js` — 1 correction**

`loadDownloads()` ajouté après `startDownload()` → l'UI se met à jour après le téléchargement, l'icône passe en "téléchargé". Avant ce fix le fichier existait bien sur le disque mais l'app ne le savait pas.

---

**`app.json` — 1 correction**

`READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE` supprimés. Sur Android 10+ (API 29+) ces permissions sont dépréciées et refusées. `expo-file-system` utilise `documentDirectory` qui est un répertoire privé de l'app — aucune permission externe nécessaire. Les garder pouvait causer des rejets sur le Play Store.

---

---

---

On corrige les 4 points restants.Maintenant je corrige les 4 points en une passe propre :Maintenant retirer le `await TrackPlayer.reset()` qu'on avait mis trop tôt au début :**Fix 4 — Fallback Deezer radio si Chosic échoue :\*\***Fix — `playbackService.js` mort : supprimer l'import s'il existe, et nettoyer :\***\*Fix — `currentQueueIndex` synchronisation dans QueueModal :**`currentQueueIndex` est bien passé et `onPlayTrackAt` passe `index` comme `forceIndex` → `setCurrentQueueIndex(newIdx)` se met à jour correctement. Ce point est OK. Le vrai problème était la stale closure de `handlePlayTrack` dans `playTrackAtIndex` — déjà corrigé avec `handlePlayTrackRef`.

On package tout :Récap des 4 corrections :

---

**1. Reset au bon moment** — le `reset()` est maintenant placé **après** le check offline. Avant il était tout en haut, ce qui coupait le son même si on découvrait ensuite qu'on est hors-ligne et qu'on ne peut pas jouer le morceau. Maintenant : check offline → si OK → reset → résolution lien → play.

**2. Prefetch des 3 prochains** — `prefetchNext()` est appelé après chaque lecture ET après chaque chargement de `fetchRecommendations`. Les liens sont mis en cache 10 min. Quand le morceau suivant joue, le lien est déjà là.

**3. Fallback Deezer radio** — `fetchRecommendations` essaie Chosic en premier (timeout 8s). Si ça échoue → fallback sur `getTrackRadio(track.id)` de Deezer. Avantage du fallback Deezer : IDs natifs → résolution directe sans pipeline `cho-`/`lfm-`.

**4. `playbackService.js` clarifié** — marqué comme fichier mort avec un commentaire expliquant que `service.js` est le vrai service enregistré. À supprimer sans risque.
