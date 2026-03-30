# 02 — Authentification

Il existe deux méthodes d'authentification : **OAuth** (recommandée) et **Browser headers**. Chacune a ses cas d'usage spécifiques.

---

## Méthode 1 — OAuth (recommandée)

### Quand l'utiliser
- Accès à la bibliothèque, playlists, historique
- Toutes les opérations authentifiées **sauf les uploads**

### Setup initial

```bash
# Lance la commande interactive en terminal
ytmusicapi oauth
```

Cela crée un fichier `oauth.json` dans le répertoire courant. Suivre les instructions affichées (copier une URL dans le navigateur, approuver l'accès).

Ce flux utilise le **Google OAuth flow pour appareils TV** (device code flow), ce qui évite les problèmes CORS.

### Utilisation dans le code

```python
from ytmusicapi import YTMusic, OAuthCredentials

# Simple (avec oauth.json généré par ytmusicapi oauth)
yt = YTMusic('oauth.json')

# Avec credentials OAuth personnalisés (client_id/secret de ta propre app Google)
yt = YTMusic(
    'oauth.json',
    oauth_credentials=OAuthCredentials(
        client_id='YOUR_CLIENT_ID',
        client_secret='YOUR_CLIENT_SECRET'
    )
)
```

### Via code Python sans passer par le terminal

```python
import ytmusicapi

# Génère le fichier oauth.json de manière programmatique
ytmusicapi.setup_oauth(filepath='oauth.json')
```

---

## Méthode 2 — Browser headers (authentification navigateur)

### Quand l'utiliser
- **Obligatoire pour les uploads** de musique
- Alternative si OAuth ne fonctionne pas

### Comment récupérer les headers

1. Ouvrir un nouvel onglet dans **Firefox** (recommandé) ou Chrome/Edge
2. Ouvrir les outils de développement (`Ctrl+Shift+I`) → onglet **Network**
3. Aller sur `https://music.youtube.com` et vérifier que vous êtes connecté
4. Filtrer les requêtes par `/browse`
5. Cliquer sur une requête POST correspondante (Status 200, Method POST, Domain music.youtube.com)
6. Clic droit sur la requête → **Copy** → **Copy request headers**

### Traitement des headers copiés

```bash
# Mode interactif en terminal (coller les headers quand demandé)
ytmusicapi browser
```

Ou en Python directement :

```python
import ytmusicapi

# Passer les headers directement comme string
ytmusicapi.setup(
    filepath="browser.json",
    headers_raw="<headers copiés depuis le navigateur>"
)
```

> ⚠️ **macOS** : le terminal macOS ne peut accepter que 1024 caractères depuis le presse-papier. Utiliser `pbpaste` :
> ```bash
> pbpaste | ytmusicapi browser
> ```

### Durée de validité
Les credentials browser restent valides **aussi longtemps que votre session YouTube Music dans le navigateur est active** (~2 ans sauf déconnexion).

### Utilisation dans le code

```python
from ytmusicapi import YTMusic

yt = YTMusic('browser.json')
```

---

## Brand Accounts (Comptes de marque)

Pour utiliser ytmusicapi avec un compte de marque Google (brand account) :

```python
from ytmusicapi import YTMusic

# Récupérer l'ID du brand account depuis :
# https://myaccount.google.com/b/VOTRE_ID_21_CHIFFRES
yt = YTMusic('oauth.json', user='101234161234936123473')
```

Aucun changement de credentials n'est nécessaire — il suffit de fournir l'ID du brand account en paramètre `user`.

---

## Résumé des méthodes

| Méthode | Fichier généré | Uploads | Stabilité | Recommandée |
|---|---|---|---|---|
| **OAuth** | `oauth.json` | ❌ | ✅ Bonne | ✅ Oui |
| **Browser headers** | `browser.json` | ✅ | ⚠️ ~2 ans | Pour uploads uniquement |
| **Aucune** | — | ❌ | ✅ | Pour lecture seule du catalogue |

---

## Erreur si non authentifié

Si vous appelez une fonction nécessitant une authentification sans credentials :

```
Please provide authentication before using this function
```
