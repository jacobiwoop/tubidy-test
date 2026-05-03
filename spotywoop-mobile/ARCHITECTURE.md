# 🎵 Spotywoop Mobile — Architecture & Refonte

Ce document détaille la nouvelle architecture de l'application mobile Spotywoop, basée sur les tests de stabilité réussis du projet `test-mobile`.

## 1. Pourquoi cette nouvelle base ?

L'ancienne version (`old-mobile`) souffrait d'instabilités majeures lors du build Android, principalement dues à des conflits de versions entre le SDK d'Expo, le compilateur Kotlin et les modules natifs de lecture audio.

### La "Magie" de la configuration actuelle :
*   **Expo SDK 50** : Version stable qui permet de garder le contrôle sur le moteur natif.
*   **Kotlin 1.9.0** : **CRITIQUE**. Les versions 2.x de Kotlin cassent la compatibilité avec `react-native-track-player` 4.1.x.
*   **React Native 0.73.6** : Inclus dans le SDK 50, parfaitement équilibré pour le support audio.

---

## 2. Le Nouveau Moteur : React Native Track Player (RNTP)

Contrairement à `expo-audio` ou `expo-av`, RNTP n'est pas un simple wrapper. C'est un **service natif complet**.

### Comment ça fonctionne :
1.  **Service de Lecture** : Le fichier `service.js` s'exécute dans un thread séparé du thread UI de React. Même si l'app est "tuée" ou minimisée, le service natif continue de vivre.
2.  **Contrôles Distants** : RNTP communique directement avec le centre de contrôle d'iOS et les notifications Android sans passer par le bridge React à chaque action (Play/Pause).
3.  **Gestion de la File (Queue)** : La file d'attente est gérée côté natif, ce qui évite les sauts ou les lags entre deux morceaux.

---

## 3. Plan de Refonte (Migration)

Nous allons migrer le code de `old-mobile` vers `spotywoop-mobile` étape par étape.

### Étape 1 : Fondations (Dependencies)
Réinstaller les bibliothèques indispensables dans `spotywoop-mobile` :
- `lucide-react-native` (Icônes)
- `axios` (API)
- `@react-navigation/*` (Navigation)
- `@react-native-async-storage/async-storage` (Stockage local)
- `expo-linear-gradient` (Design)

### Étape 2 : Structure Globale
1.  Recréer les dossiers `src/screens`, `src/components`, `src/utils`, `src/context`, `src/services`.
2.  Migrer le `PlayerContext` pour qu'il utilise les hooks de RNTP au lieu de `expo-audio`.

### Étape 3 : UI & Navigation
1.  Copier les écrans (`HomeScreen`, `SearchScreen`, `PlayerScreen`, `ArtistScreen`).
2.  Adapter `PlayerScreen` pour afficher la barre de progression via `useProgress()` de RNTP.
3.  Nettoyer les imports de `expo-audio`.

### Étape 4 : Build & Validation
1.  Mettre à jour le workflow GitHub Actions pour pointer vers `spotywoop-mobile`.
2.  Générer l'APK final.

---

## 4. Règles d'Or pour le Développement
- **Ne jamais monter la version de Kotlin** au-delà de 1.9.0.
- **Ne jamais monter le SDK Expo** au-delà de 50 sans une validation complète de RNTP.
- Toujours utiliser `npx expo start --dev-client` pour le développement.

---

> *Document généré par Antigravity pour le projet Spotywoop.*
