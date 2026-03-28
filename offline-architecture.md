# Plan d'Architecture : Spotiwoop Hors-Ligne (PWA)

**Objectif Ultime :** Transformer Spotiwoop en une application totalement autonome capable de fonctionner sans connexion Internet (ex: métro, avion), incluant l'interface, la base de données utilisateur, et la lecture audio native en local.

---

## 🏗️ 1. Piliers Techniques Fondamentaux

### A. Le "Menu de base" hors-ligne (App Shell)

- **Concept :** Le Service Worker doit mettre en cache définitivement l'interface de base de l'application (fichiers HTML, CSS Tailwind, Javascript Vite, SVG, icônes).
- **Résultat :** Au lancement sans Wi-Fi, l'interface graphique (vides) s'affiche instantanément au lieu d'une page d'erreur du navigateur.

### B. Duplication de la Base de Données (IndexedDB)

- **Concept :** Actuellement, les likes et playlists sont sur un fichier SQLite backend. Hors-ligne, le téléphone ne peut pas s'y connecter. Il faut synchroniser les données dans **IndexedDB** (la base de données locale du téléphone).
- **Résultat :** Les noms des artistes, les titres et les URL d'images (textes légers) sont consultables hors-ligne dans la "Library".

### C. Le Stockage Physique de l'Audio (Cache Storage API)

- **Concept :** Un fichier MP3/Audio étant lourd, nous utiliserons le **Cache Storage** du navigateur pour y stocker directement les flux (blob audio).
- **Résultat :** Le Service Worker intercepte les requêtes réseau vers la musique et délivre directement le fichier depuis le disque dur du téléphone, garantissant un lancement sans bufférisation.

---

## ⚙️ 2. Fonctionnalités & Expérience Utilisateur (UX)

### A. Adaptation de l'Interface Visuelle

- **Détection de réseau :** L'application écoute l'état `navigator.onLine`.
- **Réaction UI :** Dès que la connexion est perdue, les onglets nécessitant internet (ex: "Search", "Home dynamique") se grisent, et un bandeau "Mode Hors-ligne activé" redirige l'utilisateur vers sa "Library" téléchargée.

### B. Le Bouton "Download" (Lecteur principal)

- **Emplacement :** Un nouveau bouton dans la section supérieure du grand lecteur (`Player.jsx`).
- **Action :** Force le téléchargement complet du flux audio dans le Cache Storage local.
- **Retour visuel :** Change de couleur (ex: vert avec icône "téléchargé") si la piste est validée en local.

### C. L'Écran Récapitulatif "Downloads"

- **Emplacement :** Nouvel écran `DownloadsScreen.jsx`, accessible via le profil ou la Library.
- **Suivi des Téléchargements :** Affiche une file d'attente / barre de progression pour les musiques en cours d'enregistrement local.
- **Gestion du stockage :** Liste les fichiers pour écoute, et permet leur suppression unitaire pour libérer la mémoire du smartphone.

### D. La File d'Attente Intelligente (Smart Skip)

- **Comportement par défaut :** En lisant une playlist sans connexion, le composant `App.jsx` vérifie la présence locale de la musique avant de lancer la lecture d'une piste.
- **Action Smart Skip :** Si la fonction `playNext()` pointe vers une piste non téléchargée, elle est automatiquement sautée pour lire immédiatement la prochaine piste disponible en cache. La playlist ne s'arrête jamais et ne crashe jamais sur une erreur réseau.

---

## 🧠 3. Configuration du Service Worker (vite-plugin-pwa)

### Routage et Interception Réseau

1. **Règle Globale (`workbox`) :** Dès qu'une requête HTTP vers l'API audio (`https://...` ou `/api/.../audio`) est lancée.
2. **Hit Cache :** Le Service Worker vérifie l'existence dans le "spotiwoop-audio-cache". S'il y est, l'audio est chargé nativement depuis le téléphone => 0 trafic réseau, 0 latence.
3. **Miss Cache :** Si le track n'est pas en cache :
   - Mode en Ligne : La requête sort normalement pour lire en streaming fluide.
   - Mode Hors Ligne : La requête est annulée proprement déclenchant l'événement `onError` du lecteur HTML5, qui provoquera alors le _Smart Skip_.
