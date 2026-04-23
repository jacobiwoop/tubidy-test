Pour démarrer le projet principal (Backend + Client Web), vous devez lancer deux terminaux séparés :

1. Démarrer le Backend (API)
   Dans le premier terminal (à la racine du projet) :

bash

# Installation des dépendances (si ce n'est pas déjà fait)

npm install

# Lancement en mode développement

npm run dev
Le backend tournera sur le port configuré (probablement 3000 ou celui défini dans .env).

2. Démarrer le Client Web (Frontend)
   Dans un deuxième terminal (dans le dossier client/) :

bash
cd client

# Installation des dépendances

npm install

# Lancement avec Vite

npm run dev
Vite vous donnera une URL locale (généralement http://localhost:5173) pour accéder à l'interface.

Note sur le dossier monochrome : C'est une excellente idée de l'utiliser comme source d'inspiration ! Comme c'est un projet Capacitor, vous y trouverez des configurations spécifiques pour le mobile (capacitor.config.ts, dossiers android / ios) et des optimisations PWA que vous pourrez adapter à votre client/.

Voulez-vous que je vous aide à identifier des éléments spécifiques dans monochrome à copier en priorité ?
