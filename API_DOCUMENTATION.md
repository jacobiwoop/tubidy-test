# 🎵 API Documentation — Music API

Cette documentation détaille l'architecture et les différents services disponibles dans le backend `music-api`.

## 🏗️ Architecture Générale

Le système suit une architecture modulaire en trois couches :

1.  **Scrapers (`scrapers/`)** : Gèrent l'extraction de données brutes (HTML/DOM) via `cheerio`.
2.  **Services (`services/`)** : Implémentent la logique métier et les appels API (Axios).
3.  **Routes (`routes/`)** : Exposent les fonctionnalités via des endpoints REST Express.

---

## 1. 📂 Service Tubidy (Scraping & Download)

Utilisé pour la recherche de masse et l'extraction de liens de téléchargement.

### Endpoints

- **GET `/api/search`** : Recherche multi-pages sur Tubidy.
- **GET `/api/download`** : Obtient un lien de téléchargement direct.
  - `url` : URL de la page Tubidy.
  - `format` : `audio` ou `video`.

### Fonctionnement du Téléchargement

Le service simule le flux de sécurité de Tubidy en 3 étapes :

1. Extraction du jeton CSRF et du payload initial (Regex).
2. Récupération des payloads de formats (`POST /api/video/formats`).
3. Génération du lien final (`POST /api/video/download`).

---

## 2. 🎧 Service Deezer (Official API)

Utilisé pour récupérer des métadonnées riches et officielles.

### Endpoints

- **GET `/api/deezer/search`** : Recherche de titres (limit, order, index).
- **GET `/api/deezer/artist`** : Recherche d'artistes.
- **GET `/api/deezer/album`** : Recherche d'albums.
- **GET `/api/deezer/track/:id`** : Détails complets d'un titre.

---

## 3. 🔗 Service de Mapping (Bridge)

Le "cerveau" qui lie les métadonnées Deezer aux téléchargements Tubidy.

### Endpoint

- **GET `/api/deezer/track/:id/download`** :
  1. Récupère les infos sur Deezer.
  2. Cherche automatiquement le meilleur match sur Tubidy.
  3. Retourne le lien de téléchargement final.

---

## ⚙️ Configuration & Dépendances

- **Port** : 3000 (configurable via `apis.config.js`).
- **Axios** : Pour les requêtes API et le polling.
- **Cheerio** : Pour le parsing DOM des scrapers.
- **Rate Limit** : Inclus sur les routes de recherche pour éviter les bannissements d'IP.
