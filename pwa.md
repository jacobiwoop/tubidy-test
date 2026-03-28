PWA — Configurée 📱
Spotiwoop est maintenant une Progressive Web App installable :

Icône personnalisée générée (play vert + waveform)
Manifest complet (nom, couleurs, orientation)
Service Worker avec cache intelligent (images Deezer en cache, API en network-first)
Meta tags Apple/Android pour le mode plein écran
Pour installer l'app sur ton téléphone :
Lance un build de production : cd client && npm run build
Sers les fichiers avec ton backend ou npm run preview
Ouvre dans le navigateur mobile → bouton "Ajouter à l'écran d'accueil"
En mode dev (npm run dev), le service worker est désactivé par Vite — c'est normal. Le PWA fonctionne uniquement en build de production.
