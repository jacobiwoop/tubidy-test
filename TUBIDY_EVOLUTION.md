# 🎵 Tubidy Native : Rapport d'Évolution & Leçons Apprises

Ce document récapitule les étapes majeures de la transformation de l'application Tubidy vers son esthétique **Monochrome** et ses fonctionnalités **Premium**.

## 🚀 Fonctionnalités Implémentées

### 1. Système de Téléchargement & Mode Hors-ligne
- **Downloader Robuste :** Création d'un module utilisant `expo-file-system/legacy` pour stocker les MP3 localement.
- **Smart Skip :** Algorithme intelligent qui détecte l'absence de réseau et saute automatiquement les morceaux non-téléchargés dans une playlist pour une lecture fluide.
- **Lecture Locale :** Priorité aux fichiers stockés sur le téléphone pour économiser la data et permettre l'écoute sans Wi-Fi.

### 2. Design "Monochrome" Premium
- **HomeScreen :** Refonte totale avec un dégradé d'aura, une salutation dynamique et une grille de raccourcis rapides (Style Spotify/Monochrome Web).
- **Library :** Ajout d'une vue dédiée aux téléchargements avec barres de progression en temps réel.
- **Player :** Intégration d'un bouton "Reload" intelligent qui apparaît uniquement en cas d'erreur de lecture pour permettre une retentative rapide.

### 3. Expérience Utilisateur (UX)
- **Lecteur Persistant :** Configuration du mode arrière-plan et des contrôles sur l'écran de verrouillage (Titre, Artiste, Pochette).
- **Feedback Visuel :** Masquage automatique du bouton de téléchargement si le morceau est déjà présent sur le téléphone.

---

## 🛠️ Défis Techniques & Solutions (Leçons Apprises)

### 📦 Gestion des Dépendances
- **Leçon :** Éviter les "bibliothèques zombies".
- **Cas concret :** `react-native-track-player` causait des erreurs de compilation majeures. En créant un "audioFactory" basé sur **`expo-audio`**, on a pu garder la même logique de code tout en utilisant un moteur plus moderne et léger, supprimant ainsi les conflits Kotlin.

### 🤖 Compilation Android & SDK
- **Leçon :** Les versions "Beta" (SDK 35) peuvent casser les bibliothèques stables.
- **Solution :** Toujours vérifier la compatibilité entre la version de Kotlin et le moteur KSP d'Expo. Le retour à des versions stables (`targetSdkVersion 34` ou `kotlin 2.0.21` selon les besoins) est souvent la clé d'un build réussi.

### 🌐 Réseaux & IPs Locales
- **Leçon :** Une IP locale (`10.45...`) est volatile.
- **Solution :** L'utilisation de `BASE_URL` exportée permet de changer l'adresse du serveur à un seul endroit pour tout l'APK. Pour une utilisation mondiale, l'étape suivante sera un tunnel (Cloudflare/ngrok).

### 📱 Expo Go vs APK
- **Leçon :** Expo Go a des limites.
- **Cas concret :** Le mode arrière-plan et les notifications Now Playing ne sont pleinement fonctionnels que dans un build autonome (APK) car ils nécessitent des autorisations système que seul l'APK possède.

---

## 🏁 État Actuel du Projet
L'application est maintenant une plateforme de streaming et de téléchargement capable de fonctionner en mode déconnecté, avec une interface élégante et un pipeline de build automatisé via GitHub Actions.

*Document généré le 01 Mai 2026.*
