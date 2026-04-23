# Journal de Bord - Projet Tubidy

Ce fichier sert à documenter les modifications importantes, les décisions architecturales et les leçons apprises pour optimiser le développement futur.

## [2026-04-23] - Initialisation et Analyse

### Modifications

- Création du fichier `journal.md`.
- **Intégration de la Media Session API** : Ajout des contrôles multimédias système (Play/Pause, Suivant/Précédent) et affichage des métadonnées sur l'écran de verrouillage.
- **Ajout de l'utilitaire `vibrant-color.js`** : Porté depuis le projet Monochrome, cet utilitaire permet d'extraire la couleur dominante d'une pochette d'album.
- **Refonte visuelle dynamique** : Mise à jour du Mini-player et du PlayerScreen pour utiliser les couleurs extraites dynamiquement (barres de progression, accents lumineux).

### Analyse du projet

- **Backend :** Node.js/Express avec services modulaires (YouTube, Deezer, Spotify).
- **Frontend :** React/Vite/Tailwind (dossier `client/`).
- **Monochrome :** Projet externe ajouté comme source d'inspiration pour des fonctionnalités premium (Audio, PWA, UI).
- **Scripts :** Utilisation de Python (`yt-dlp`) pour les téléchargements.

### Leçons apprises

- L'utilisation de `crossOrigin="anonymous"` est indispensable pour analyser les pixels d'une image provenant d'un CDN externe (comme Deezer ou YouTube) via un Canvas.
- L'API Media Session nécessite une gestion particulière du `playbackState` pour rester synchronisée avec l'élément `<audio>` de React.
- L'architecture de Monochrome (Vanilla JS) est très performante, mais nécessite une adaptation (Hooks/State) pour être intégrée proprement dans un projet React.

## [2026-04-24] - Résilience Réseau et Optimisation Backend

### Modifications

- **Gestion des "Race Conditions" (Frontend)** : Ajout d'`AbortController` dans `App.jsx` et `Search.jsx` pour annuler les requêtes obsolètes lors d'un changement rapide de sélection.
- **Propagation de l'Annulation (Backend)** : Le signal d'annulation du client est désormais transmis aux services (Deezer, Tubidy). Le serveur stoppe immédiatement le scraping si l'utilisateur change de musique.
- **Système de Retry avec Backoff Exponentiel** : Implémentation d'une fonction `withRetry` dans `deezer.service.js` pour gérer les erreurs DNS (`EAI_AGAIN`) et les timeouts en réessayant jusqu'à 5 fois avec un délai croissant.
- **Cache de Métadonnées SQLite** : Utilisation de la table `tracks` pour mettre en cache les infos Deezer, réduisant la dépendance aux API externes.

### Leçons apprises

- Annuler une requête côté client ne suffit pas si le backend est lourd (scraping) ; il faut propager le signal pour libérer les ressources du serveur.
- Le "Backoff Exponentiel" est la méthode la plus efficace pour "attendre" la fin d'une micro-coupure internet sans surcharger les services tiers.
- Un cache de métadonnées local transforme radicalement la perception de vitesse de l'application (passage de 2s à 10ms pour les titres connus).
