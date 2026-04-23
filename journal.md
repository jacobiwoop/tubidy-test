# Journal de Bord - Projet Tubidy

Ce fichier sert à documenter les modifications importantes, les décisions architecturales et les leçons apprises pour optimiser le développement futur.

## [2026-04-23] - Initialisation et Analyse
### Modifications
- Création du fichier `journal.md`.

### Analyse du projet
- **Backend :** Node.js/Express avec services modulaires (YouTube, Deezer, Spotify).
- **Frontend :** React/Vite/Tailwind (dossier `client/`).
- **Mobile :** Application hybride Capacitor (dossier `monochrome/`).
- **Scripts :** Utilisation de Python (`yt-dlp`) pour les téléchargements.

### Leçons apprises
- Structure hybride complexe : le projet contient à la fois une application web standard (`client/`) et une version mobile (`monochrome/`). Il est crucial de vérifier quel frontend est visé lors des modifications d'UI.
- L'intégration multi-services (Deezer, YT Music, etc.) est centralisée dans `services/`, ce qui facilite l'ajout de nouvelles sources.
