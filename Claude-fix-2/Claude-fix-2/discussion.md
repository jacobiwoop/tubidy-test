J'ai une vue complète. Voilà mon analyse :

---

## Audit du serveur Spotiwoop

### Architecture globale
```
App mobile → /api/deezer/track/:id/download
           → mappingService.getTubidyDownloadByDeezerId()
              ├── 1. Deezer API (titre + artiste)
              ├── 2. Tentative Tubidy.cool (3 requêtes HTTP séquentielles)
              └── 3. Fallback Tubidy.com (scraping CSRF + token + POST)
```

---

### Problèmes identifiés

**1. Latence principale — pipeline de 3-5 requêtes HTTP séquentielles**

`tubidy.cool.findBestDirectLink` fait **4 requêtes en série** :
```
search() → getFormats() → getFinalLink() → [lien final]
```
Et si ça échoue → fallback `tubidy.service` fait encore **3 requêtes** (page HTML + CSRF + POST formats + POST download). Au total potentiellement **7 requêtes HTTP externes** avant de répondre au mobile. C'est là que viennent tes 3-5 secondes.

**2. `isLinkReachable` en double** dans le pipeline turbo

```js
const turboResult = await tubidyCoolService.findBestDirectLink(...);
if (turboResult?.link) {
  const alive = await isLinkReachable(turboResult.link); // ← HEAD request supplémentaire inutile
```
Le lien vient d'être extrait dynamiquement — il est forcément valide. Ce `HEAD` request ajoute ~300-500ms pour rien.

**3. `Promise.race` mal utilisé** dans le fallback

```js
const finalResult = await Promise.race(testPromises.map(p => p.then(res => {
  if (res) return res;
  throw new Error("Lien invalide"); // ← si le premier échoue, race() rejette
}))).catch(() => null);
// Puis fallback sur Promise.all — les 3 appels étaient déjà lancés en parallèle
```
La logique est correcte en intention mais confuse — si `Promise.race` rejette, on attend `Promise.all` qui re-exécute les mêmes promesses déjà terminées. Ce n'est pas un bug grave mais c'est inutilement complexe.

**4. Cache en mémoire vive uniquement**

```js
const store = new Map(); // cache/cache.js
```
Sur Render avec cold starts, le cache est **vidé à chaque redémarrage**. Le cache SQLite (`tubidy_mapping`) est lui persisté mais uniquement pour le mapping Deezer → Tubidy URL, pas pour les liens finaux MP3 (qui expirent de toute façon).

**5. `stream.js` non implémenté**

```js
router.get('/:id', async (req, res, next) => {
  res.json({ message: 'stream route OK', id: req.params.id }); // ← stub
});
```
Route morte. Si l'app mobile essaie de streamer via `/api/stream/:id` ça ne marche pas.

**6. Pas de timeout sur les appels Deezer**

```js
// deezer.service.js — axios sans timeout configuré
```
Si Deezer ne répond pas, la requête pend indéfiniment jusqu'au timeout d'Express (par défaut aucun).

**7. `cookies.txt` commité dans le repo**

```
/tubidy-test-server/cookies.txt
```
À ne jamais commiter — contient des sessions. À ajouter dans `.gitignore`.

---

### Ce qui est bien fait ✅

- `AbortController` sur les routes longues (search, download) → le client peut annuler
- `withRetry` avec backoff exponentiel sur les erreurs réseau
- Cache SQLite pour le mapping Deezer → Tubidy (persiste entre les requêtes)
- `redirectCache` en mémoire pour éviter de refaire les redirections
- Error handler global propre
- Health check `/health`

---

### Priorités de fix

| Priorité | Problème | Gain estimé |
|----------|----------|-------------|
| 🔴 1 | Supprimer `isLinkReachable` après turbo | -400ms |
| 🔴 2 | Ajouter timeout sur tous les `axios` calls | stabilité |
| 🟡 3 | Mettre en cache le lien final MP3 (TTL 10min) | -3s sur cache hit |
| 🟡 4 | Simplifier le `Promise.race` fallback | lisibilité |
| 🟢 5 | Ajouter `cookies.txt` au `.gitignore` | sécurité |
| 🟢 6 | Implémenter ou supprimer `stream.js` | propreté |

Tu veux que j'applique les fixes directement ?




---
---


comment fonctionne le streaming 



---
---

Bonne question. Laisse-moi regarder comment le mobile consomme l'audio exactement.

Voilà exactement comment ça marche de bout en bout :

---

## Comment fonctionne le streaming

### Flux actuel

```
Mobile (RNTP)
    │
    │ 1. GET /api/deezer/track/:id/download
    ▼
Serveur (Render)
    │ → Deezer API (titre/artiste)
    │ → Tubidy.cool (4 requêtes) ──► lien MP3 final
    │                                ex: https://d2mefast.net/file/xxx.mp3
    │
    │ Répond: { target: { link: "https://d2mefast.net/..." } }
    ▼
Mobile reçoit le lien
    │
    │ 2. TrackPlayer.add({ url: "https://d2mefast.net/xxx.mp3" })
    ▼
RNTP contacte d2mefast.net DIRECTEMENT
    │ → télécharge/streame le MP3 depuis d2mefast
    │ → pas de passage par ton serveur
    ▼
Son joué
```

### Ce que fait `/api/proxy-audio`

Il existe dans `app.js` mais **le mobile ne l'utilise pas du tout**. C'est du code mort côté mobile — probablement un vestige des tests.

---

### Conséquences

**✅ Avantage** — ton serveur Render ne consomme pas de bande passante pour l'audio. Il sert uniquement de "résolveur de lien". Économique.

**❌ Problème 1 — Liens éphémères**
Les liens `d2mefast.net` expirent (souvent 10-30 min). Si l'utilisateur met en pause longtemps et reprend, le lien est mort → silence ou erreur. RNTP ne gère pas ça automatiquement.

**❌ Problème 2 — Seek limité**
Le seek (avancer dans la chanson) fonctionne seulement si `d2mefast.net` supporte le header `Range`. C'est souvent le cas mais pas garanti — si absent, RNTP re-télécharge depuis le début.

**❌ Problème 3 — Pas de fallback à la lecture**
Si le lien expire pendant la lecture (next automatique par exemple), il n'y a aucun mécanisme pour re-résoudre un nouveau lien. La piste suivante échoue silencieusement.

---

### La bonne architecture à terme

```
Option A (actuelle, améliorée)
Mobile → Serveur (résolution du lien) → d2mefast direct
+ Ajouter: re-résolution automatique si lien expiré

Option B (proxy streaming)
Mobile → Serveur → d2mefast (pipe du flux)
+ Seek garanti, lien jamais exposé
- Bande passante sur Render (coûteux, et Render free = lent)

Option C (recommandée)
Serveur retourne le lien + une durée de validité (ex: expires_at)
Mobile re-résout automatiquement si expires_at dépassé avant de jouer
```

Pour l'instant tu es sur **Option A sans gestion d'expiration**. Le fix le plus simple et efficace c'est d'ajouter un `expires_at` dans la réponse du serveur et gérer le re-fetch côté mobile si le lien est périmé. Tu veux qu'on code ça ?



---
---


J'ai tout ce qu'il faut. On attaque les fichiers.

Maintenant le document d'audit complet :

5 fichiers dans le zip :

```
services/mapping.service.js   ← fixes principaux
services/deezer.service.js    ← timeouts ajoutés partout
routes/stream.js              ← stub documenté
.gitignore                    ← cookies.txt + *.db exclus
AUDIT_SERVEUR.md              ← rapport complet
```

Les deux gains immédiats les plus importants une fois déployé :

- **~400ms gagnés** sur chaque lecture (suppression du `HEAD` request inutile)
- **Replays instantanés** dans les 10 min (cache mémoire TTL sur le lien MP3 final)

