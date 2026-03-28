# 08 — Limites, Quotas & Erreurs

---

## Quotas de requêtes

L'API Deezer est **gratuite** mais soumise à un **quota de requêtes**.

- Il n'y a **pas de limite sur le volume de données** retournées
- Il existe une **limite sur le nombre de requêtes** par intervalle de temps
- Le dépassement de quota retourne une erreur `code 4`

### Erreur de quota dépassé

```json
{
  "error": {
    "type": "Exception",
    "message": "Quota limit exceeded",
    "code": 4
  }
}
```

> En cas de quota dépassé, attendez quelques instants avant de réessayer.

### Augmenter les quotas

Il n'est **pas possible** de faire whitelister votre application pour éviter les limitations, sauf en cas d'**accord commercial** avec Deezer. Pour une application commerciale à fort trafic, contactez Deezer via ce formulaire : https://forms.gle/DXogJXou24x6xMbA6

---

## Codes d'erreur

| Code | Type | Description |
|---|---|---|
| `4` | Exception | Quota de requêtes dépassé |
| `100` | ItemNotFoundException | Ressource introuvable |
| `200` | PermissionException | Permission manquante |
| `300` | OAuthException | Token invalide ou expiré |
| `500` | DataException | Erreur de données |
| `800` | IndividualAccountChangedNotAllowedException | Action non autorisée |

### Structure d'erreur standard

```json
{
  "error": {
    "type": "OAuthException",
    "message": "Invalid OAuth access token.",
    "code": 300
  }
}
```

---

## Gestion des erreurs — Bonnes pratiques

### Vérification d'erreur JavaScript

```javascript
async function deezerRequest(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    const { code, type, message } = data.error;

    switch (code) {
      case 4:
        console.error('Quota dépassé — réessayez dans quelques secondes');
        // Implémenter un backoff exponentiel
        break;
      case 300:
        console.error('Token invalide — reconnectez l\'utilisateur');
        break;
      case 100:
        console.error('Ressource introuvable');
        break;
      default:
        console.error(`Erreur ${code}: ${message}`);
    }
    return null;
  }

  return data;
}
```

### Backoff exponentiel pour le quota

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const data = await deezerRequest(url);

    if (data !== null) return data;

    // Attendre de plus en plus longtemps entre chaque tentative
    const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  throw new Error('Nombre maximum de tentatives atteint');
}
```

---

## Limitations légales

| Restriction | Détail |
|---|---|
| **Streaming audio** | Seuls les aperçus de 30 secondes sont accessibles via l'API directe |
| **Streaming complet** | Uniquement via les SDKs officiels, pour utilisateurs authentifiés |
| **Cache d'images** | Les images Deezer **ne peuvent pas** être mises en cache localement |
| **Données textuelles** | Il est possible de stocker les noms d'artistes et titres localement (sans audio) |
| **URLs audio complètes** | Ne doivent **jamais** être exposées ou rendues téléchargeables à l'utilisateur final |

---

## Accès au contenu selon le type d'utilisateur

| Type d'utilisateur | Accès catalogue | Audio complet | HQ Audio |
|---|---|---|---|
| Non connecté | ✅ Lecture seule | ❌ (30s preview) | ❌ |
| Compte Free | ✅ | ❌ (30s preview) | ❌ |
| Compte Premium | ✅ | ✅ (via SDK) | ❌ |
| Compte HiFi | ✅ | ✅ (via SDK) | ✅ |

> Le contenu accessible varie également selon les **droits par région** négociés avec les ayants droit locaux.

---

## CORS

Si vous faites des appels API en JavaScript depuis le navigateur :

- Les appels **GET publics** fonctionnent normalement
- Les appels au endpoint OAuth `/oauth/access_token.php` doivent être faits **côté serveur** (pas depuis le navigateur)
- Pour une intégration JS côté client complète, utilisez le **SDK JavaScript officiel**
- Pour les réponses JSON avec CORS, utilisez le format **JSONP** :

```javascript
// Avec JSONP
const script = document.createElement('script');
script.src = 'https://api.deezer.com/track/3135556?output=jsonp&callback=handleTrack';
document.body.appendChild(script);

function handleTrack(data) {
  console.log(data);
}
```

---

## Optimisation des requêtes

**Bonnes pratiques pour rester dans les quotas :**

- Mettre en **cache les données** qui changent rarement (infos d'artistes, d'albums)
- Utiliser la **pagination** (`index` + `limit`) plutôt que de tout charger d'un coup
- **Éviter les requêtes en boucle** — groupez les opérations
- Ne pas stocker d'images (interdit) mais utilisez les URLs directement
- Implémenter un **backoff exponentiel** en cas d'erreur 4
