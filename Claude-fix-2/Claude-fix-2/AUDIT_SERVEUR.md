# Audit Serveur Spotiwoop — Rapport de corrections

**Date :** Mai 2026  
**Scope :** Backend Node.js/Express (`tubidy-test-projet/`)  
**Fichiers modifiés :** `services/mapping.service.js`, `services/deezer.service.js`, `routes/stream.js`, `.gitignore`

---

## Architecture de streaming — rappel

```
Téléphone (RNTP)
    │
    │ 1. GET /api/deezer/track/:id/download
    ▼
Serveur Render
    ├── Deezer API  →  titre + artiste
    ├── Tubidy.cool →  lien MP3 (chemin "turbo")
    └── Tubidy.com  →  lien MP3 (fallback scraping)
    │
    │ Répond: { target: { link: "https://d2mefast.net/xxx.mp3" } }
    ▼
Téléphone contacte d2mefast.net DIRECTEMENT
    → Render n'est plus dans la boucle
    → flux MP3 streamé directement sur le téléphone
```

Le serveur est uniquement un **résolveur de lien**. Il ne proxyfie pas l'audio.

---

## Problèmes identifiés et corrigés

---

### 🔴 CRITIQUE — `isLinkReachable()` inutile après le turbo

**Fichier :** `services/mapping.service.js`  
**Gain estimé :** ~400ms sur chaque requête de lecture

**Problème :**

```js
const turboResult = await tubidyCoolService.findBestDirectLink(track.title, track.artist.name);
if (turboResult?.link) {
  const alive = await isLinkReachable(turboResult.link, signal); // ← HEAD request inutile
  if (alive) { return result; }
}
```

`findBestDirectLink()` extrait le lien MP3 directement depuis la page Tubidy.cool **en temps réel**. Le lien vient d'être généré dynamiquement — il est forcément valide à cet instant. Faire un `HEAD` request supplémentaire pour "vérifier" ajoute ~400ms pour rien.

La même erreur existait dans `getDirectLinkByQuery()` (utilisé pour les suggestions Last.fm).

**Correction :**

```js
const turboResult = await tubidyCoolService.findBestDirectLink(track.title, track.artist.name);
if (turboResult?.link) {
  // Plus de isLinkReachable() ici — lien frais = lien valide
  setCachedLink(cacheKey, result);
  return result;
}
```

`isLinkReachable()` est conservé uniquement dans le **fallback Tubidy.com** où les liens sont moins fiables (cache SQLite potentiellement périmé).

---

### 🔴 CRITIQUE — Aucun timeout sur les appels Deezer

**Fichier :** `services/deezer.service.js`  
**Gain estimé :** prévention de requêtes pendantes indéfiniment

**Problème :**

```js
const response = await axios.get(`${BASE_URL}/track/${id}`, { signal });
// ↑ Pas de timeout — si Deezer ne répond pas, la requête pend jusqu'au crash
```

Tous les appels `axios` vers `api.deezer.com` n'avaient **aucun timeout configuré**. Si Deezer était lent ou en panne, le serveur restait bloqué indéfiniment sur la requête, occupant un worker et bloquant d'autres requêtes.

**Correction :**

```js
const DEFAULT_TIMEOUT = 8000; // 8 secondes max

const response = await axios.get(`${BASE_URL}/track/${id}`, {
  timeout: DEFAULT_TIMEOUT, // ajouté sur TOUS les appels
  signal,
});
```

La constante `DEFAULT_TIMEOUT = 8000` est appliquée à **toutes** les fonctions du service (search, getTrack, getArtist, getAlbum, etc.).

---

### 🟡 IMPORTANT — Pas de cache sur le lien MP3 final

**Fichier :** `services/mapping.service.js`  
**Gain estimé :** -3 à 5s sur les répétitions (replay, retour en arrière)

**Problème :**

À chaque appel de `/api/deezer/track/:id/download`, le serveur relançait tout le pipeline (Deezer + Tubidy), même si l'utilisateur avait déjà joué ce morceau 2 minutes auparavant.

Le seul cache existant était :
- Cache SQLite sur les **infos Deezer** (titre, artiste) → OK
- Cache SQLite sur l'**URL de la page Tubidy** → OK mais partiel
- **Aucun cache sur le lien MP3 final** → pipeline complet à chaque fois

**Correction :**

```js
// Cache mémoire avec TTL 10 minutes
const linkCache = new Map();
const LINK_CACHE_TTL = 10 * 60 * 1000;

// Au début de getTubidyDownloadByDeezerId()
const cacheKey = `${deezerId}:${format}`;
const cached = getCachedLink(cacheKey);
if (cached) {
  console.log(`[mapping] Cache hit pour ID: ${deezerId}`);
  return cached; // réponse instantanée
}

// À la fin, après avoir trouvé le lien
setCachedLink(cacheKey, result);
```

**Pourquoi 10 minutes et pas plus ?** Les liens `d2mefast.net` expirent. 10 min est un compromis raisonnable — assez long pour couvrir un replay ou une reprise après pause, assez court pour éviter de servir un lien mort.

**Pourquoi en mémoire et pas SQLite ?** Les liens expirent — un cache persistant (SQLite) serait dangereux car il survivrait aux redémarrages du serveur. Le cache mémoire est vidé au redémarrage, ce qui est le comportement souhaité.

---

### 🟡 IMPORTANT — `Promise.race` mal implémenté dans le fallback

**Fichier :** `services/mapping.service.js`

**Problème :**

```js
const finalResult = await Promise.race(testPromises.map(p => p.then(res => {
  if (res) return res;
  throw new Error("Lien invalide"); // ← si le 1er échoue, race() rejette tout
}))).catch(() => null);

if (finalResult) return finalResult;

// Si race échoue → on attend Promise.all de toutes façon
const allRes = await Promise.all(testPromises);
```

Le problème : si le **premier** candidat échoue, `Promise.race` rejette immédiatement et on tombe dans le `.catch(() => null)`. Puis on fait `Promise.all` en attendant que **tous** les candidats terminent — y compris ceux qui auraient réussi. La logique est correcte dans l'intention mais inefficace et difficile à lire.

**Correction :**

```js
const raceResult = await new Promise(async (resolve, reject) => {
  let failures = 0;
  for (const match of candidates) {
    (async () => {
      try {
        const dl = await tubidyService.getDownloadLink(match.download_page, format, signal);
        if (!dl?.link) throw new Error("Pas de lien");
        // ... validation
        resolve(result); // le premier qui réussit gagne
      } catch (e) {
        failures++;
        if (failures === candidates.length) {
          reject(new Error("Aucun lien Tubidy valide.")); // tous ont échoué
        }
      }
    })();
  }
});
```

Les 3 candidats sont lancés **en parallèle**. Le premier qui réussit résout la promesse. Si tous échouent, on rejette avec une erreur claire.

---

### 🟢 MINEUR — Route `stream.js` non implémentée (stub mort)

**Fichier :** `routes/stream.js`

**Problème :**

```js
router.get('/:id', async (req, res, next) => {
  res.json({ message: 'stream route OK', id: req.params.id });
});
```

Route complètement vide qui renvoyait un JSON inutile. Trompeur pour quiconque lirait le code ou l'API docs.

**Correction :** La route renvoie maintenant un message explicatif indiquant que le streaming est géré côté client (RNTP → d2mefast), et pointe vers la bonne route à utiliser (`/api/deezer/track/:id/download`).

---

### 🟢 MINEUR — Sécurité : `cookies.txt` commité dans le repo

**Fichier :** `.gitignore` (manquant)

**Problème :**

Le fichier `cookies.txt` (sessions HTTP de scraping Tubidy) était commité dans le dépôt Git. Ce fichier contient des données de session qui permettraient à quelqu'un d'usurper l'identité du scraper.

De même, `music.db`, `music.db-shm` et `music.db-wal` (base SQLite avec le cache) étaient commités.

**Correction :** Création d'un `.gitignore` couvrant :

```
cookies.txt
*.db / *.db-shm / *.db-wal
.env
node_modules/
```

> ⚠️ **Action requise :** Si le repo est déjà sur GitHub, supprimer ces fichiers de l'historique avec `git filter-repo` ou `BFG Repo Cleaner`. Un simple `.gitignore` ne suffit pas pour les fichiers déjà commités.

---

## Ce qui était déjà bien fait ✅

- **`AbortController`** sur les routes longues (search, download) — le client peut annuler en cours de route
- **`withRetry` + backoff exponentiel** sur les erreurs réseau dans Deezer et Tubidy
- **Cache SQLite** sur les infos Deezer (getTrack) — la 2e requête pour le même ID est instantanée
- **Cache SQLite** sur le mapping Deezer ID → URL page Tubidy
- **Cache mémoire** sur les redirections `proxyAudio` dans `app.js`
- **Error handler global** propre avec logging
- **Health check** `/health`
- **Logger HTTP** sur toutes les requêtes

---

## Résumé des gains attendus

| Fix | Gain par requête | Fréquence |
|-----|-----------------|-----------|
| Suppression `isLinkReachable` après turbo | ~400ms | Toutes les lectures |
| Cache lien MP3 final (TTL 10min) | 3-5s → 0ms | Replays, reprises |
| Timeout Deezer | Prévention blocage infini | Cas de panne Deezer |
| Promise.race propre | ~0ms mais stabilité | Fallback Tubidy |

**Gain total estimé sur le chemin "turbo" (le plus fréquent) : ~400ms**  
**Gain total estimé sur un replay dans les 10 minutes : ~3-5s → instantané**

---

## Problèmes restants non corrigés (hors scope)

Ces problèmes sont identifiés mais nécessitent des décisions d'architecture plus larges :

1. **Liens d2mefast expirent** — si l'utilisateur met pause 30min et reprend, le lien est mort. Solution : re-résoudre automatiquement côté mobile si `Date.now() > expires_at`. Nécessite d'ajouter `expires_at` dans la réponse du serveur.

2. **Seek non garanti** — fonctionne seulement si `d2mefast.net` supporte le header `Range` (généralement oui, mais pas garanti). Solution à long terme : proxy audio via `/api/proxy-audio` déjà présent dans `app.js`.

3. **Cold starts Render** — sur le plan gratuit Render, le serveur s'endort après inactivité. Le premier réveil peut prendre 15-30s. Solution : migrer vers un plan payant, ou utiliser un service de "ping" périodique.

4. **Cache mémoire vidé au redémarrage** — sur Render, les redémarrages sont fréquents (déploiements, cold starts). Le cache lien MP3 repart de zéro à chaque fois. Solution à long terme : Redis ou cache persistant externe.
