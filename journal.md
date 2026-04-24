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

### UI Modernization (Style Monochrome)

- **Layout Immersif & "Sections"** : Passage à une interface basée sur des cartes et des sections (Home, Search) inspirée de Monochrome.
- **Profils Artistes & Albums** : Création de pages profils premium avec extraction de couleur (`vibrant-color`), métadonnées riches et recommandations contextuelles (Similar Albums/Artists).
- **Navigation Responsive & Fixe** : Implémentation d'un header fixe sur mobile, d'un menu latéral coulissant et d'une recherche intégrée en "sub-header" (plus d'overlay plein écran).
- **Gestion de l'Historique (Back Button)** : Intégration de l'API History (`pushState`/`popstate`) pour enregistrer la navigation interne. Le bouton "Retour" du téléphone permet désormais de revenir à l'écran précédent au lieu de quitter l'application.

### Leçons apprises

- Manipuler l'historique de navigation manuellement via `popstate` est crucial pour transformer une SPA web en une application mobile fluide (look-and-feel d'une App Native).
- Le responsive ne se limite pas aux CSS `@media`. La gestion des états de visibilité (Sidebar, Recherche mobile) en React est nécessaire pour une UX de qualité.
- L'ajout de contextuel (recommandations) en bas d'écran augmente considérablement le temps de rétention sur une application musicale.
