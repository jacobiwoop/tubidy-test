# Documentation Service Tubidy (Node.js)

Cette documentation détaille l'architecture et le fonctionnement du service de recherche et de téléchargement Tubidy intégré au backend.

## Architecture

Le système est divisé en trois couches :

1. **Scraper (`scrapers/`)** : Couche basse qui gère le fetch HTML et le parsing DOM (Cheerio).
2. **Service (`services/`)** : Couche intermédiaire qui expose des méthodes métier (`search`, `getDownloadLink`).
3. **Route (`routes/`)** : Couche haute exposant les endpoints API via Express.

---

## 1. Recherche (Search)

### Service : `tubidy.service.js`

- **`search(query, options)`** :
  - `query` (string) : Termes de recherche.
  - `options.page` (default: 1) : Numéro de la page à récupérer.
  - `options.allPages` (boolean) : Si `true`, scrape toutes les pages jusqu'à la limite.
- **`findBestMatch(title, artist)`** : Effectue une recherche combinée et retourne le premier résultat.

### API Endpoint

**GET** `/api/search`

- **Paramètres :**
  - `q` : La requête.
  - `page` : Page spécifique.
  - `all` : `true` pour scraper l'intégralité des résultats.

---

## 2. Téléchargement (Download)

La logique de téléchargement a été portée de Python vers Node.js pour garantir l'autonomie du backend.

### Service : `tubidy.service.js`

- **`getDownloadLink(videoUrl, formatType)`** :
  - `videoUrl` : URL complète de la page de téléchargement Tubidy (ex: `https://mp3.tubidy.com/download/...`).
  - `formatType` : `"mp3"` (audio) ou `"video"` (vidéo MP4).

#### Flux de Sécurité (Reverse Engineering)

Pour obtenir un lien, le service effectue 3 étapes critiques :

1.  **Extraction des Secrets** : Récupère le `X-CSRF-TOKEN` dans les metas et le `payload` initial dans le script `App.video('...')` du HTML.
2.  **Listing des Formats** : Envoie un `POST` à `/api/video/formats`. L'API Tubidy renvoie alors une liste de payloads spécifiques à chaque format (MP3, MP4, etc.).
3.  **Génération du Lien** : Envoie un second `POST` à `/api/video/download` avec le payload du format choisi pour obtenir l'URL finale de téléchargement.

### API Endpoint

**GET** `/api/download`

- **Paramètres :**
  - `url` : L'URL de la page Tubidy.
  - `format` : `"audio"` ou `"video"`.

---

## 3. Configuration

Le service utilise `config/apis.config.js` pour :

- Le `port` d'écoute (par défaut : 3000).
- Les `headers` HTTP (User-Agent, Referer) nécessaires pour éviter le blocage par Cloudflare.

## 4. Dépendances Clés

- **Axios** : Requêtes HTTP.
- **Cheerio** : Parsing HTML (équivalent jQuery).
- **URLSearchParams** : Formatage des données POST en `application/x-www-form-urlencoded`.
