# Mémoire du Projet - Tubidy / Spotiwoop / CinéWoop

Dernière mise à jour : 10/11/2026

## 1. Projets & Architecture

### Spotiwoop (`spotywoop-kt`)
- **Type :** Application Android native en Kotlin / Jetpack Compose.
- **Package :** `com.spotywoop.kt`.
- **Dépôt GitHub :** `jacobiwoop/spotiwoop`.
- **Version actuelle :** `0.2.9` (`versionCode: 20`).
- **Release GitHub :** `https://github.com/jacobiwoop/spotiwoop/releases/tag/v0.2.9`
- **Moteur de streaming (`StreamResolver`) :**
  - Course multi-couloirs native en local :
    1. Kuwo (MP3 320 kbps direct)
    2. NetEase
    3. QQ Music
    4. Audiomack (M4A)
    5. yt-dlp local (`LocalYoutubeDlSource` / `SpotDlMatcher`)
    6. Dernier recours : Waptrick & serveur `online-resolve` (Vercel)
  - Évite le relais Cloudflare Worker pour les flux directs afin d'éviter les coupures réseau (timeouts).
  - Support de la reconnaissance et de la translittération CJK (japonais / chinois) intégrée dans `SongMatch.kt`.
- **Paroles synchronisées :** Moteur multi-sources TTML / LRC, défilement dynamique mot-à-mot (`AmLyricsView`).
- **Mini-lecteur :**
  - Geste de swipe vers la droite révélant un bouton carré rouge « Stop » (■).
  - Déclenche `player.stop()` (`MediaController.stop()` + `clearMediaItems()`).

### Serveur de résolution (`online-resolve`)
- **Type :** API Go (Golang) déployée sur Vercel (`https://online-resolve.vercel.app`).
- **Dépôt GitHub :** `jacobiwoop/tubidy-test` (sous-dossier `online-resolve`).
- **Moteur de translittération CJK (`provider/translit.go`) :**
  - Go pur (0 dépendance, 0 CGO).
  - Conversion phonétique Hepburn (Hiragana/Katakana ➔ Romaji).
  - Support des métadonnées d'anime et des crochets CJK (`《 》 【 】 「 」 『 』 （ ） 〔 〕`).
  - Validation automatique des correspondances artistes translittérées (`ArtistMatches`) et tolérance CJK (`sameRecording`).
- **Résilience Accueil / Découverte (`server/api.go`) :**
  - Cache de secours Stale-while-error (`getStale`).
  - Repli automatique vers Spotify Top Hits si Audiomack est en panne (504), garantissant que `/api/discover` ne renvoie plus d'erreur 502.

### CinéWoop (`cinewoop.git`)
- **Version actuelle :** `2.15` (`versionCode: 26`).
- **Dépôt Release :** `jacobiwoop/cinewoop-releases`.
- **Mise à jour en ligne :** `https://cinewoop.vercel.app/version.json`.

---

## 2. Périphériques de test
- **Téléphone physique :** Xiaomi Redmi Note 13 4G (`emerald_global`, modèle `23117RA68G`, Android 16 API 36, arm64-v8a). Connecté sur le réseau local via ADB (`192.168.1.12:5555`).
- **Émulateur Waydroid :** `192.168.240.112:5555` (x86_64).

---

## 3. Historique récent & Décisions techniques
- **Sortie de Spotiwoop v0.2.8 :**
  - Tag `v0.2.8` publié sur GitHub avec les APKs `app-arm64-v8a-release.apk`, `app-x86_64-release.apk` et `mapping-v0.2.8.zip`.
  - Intégration du Swipe-to-stop sur le MiniPlayer avec bouton rouge carré (■) et animation de rejet.
  - Intégration de la translittération et de la tolérance CJK dans `SongMatch.kt`.
- **Système d'affichage et de configuration de la translittération CJK (Spotiwoop) :**
  - Moteur centralisé dans `AppSettings.kt` (`TransliterationMode`) avec persistance `SharedPreferences` et `StateFlow`.
  - **Option B par défaut** : `Romaji (Original)` (ex: `Burubado (ブルーバード)`).
  - Écran des paramètres (`SettingsScreen.kt`) doté d'une carte dédiée avec sélection interactive par boutons radio :
    1. `Romaji (Original)` (par défaut)
    2. `Original (Romaji)`
    3. `Romaji seul`
    4. `Original seul (Désactivé)`
  - Affichage translittéré branché sur :
    - Listes de recherche / cartes (`WebStyle.kt` : `CardTitle`, `CardSub`, `TrackItem`, `displayName`, `displayArtists`)
    - Mini-lecteur (`PlayerScreen.kt` : `now.displayTitle`, `now.displayArtist`)
    - Grand lecteur (`NowPlayingScreen`)
    - Liens artistes du lecteur (`PlayerDetails.kt` : `ArtistNameLink`)
  - Tests unitaires `AppSettingsTest.kt` validés à 100% et build release compilé sans erreur.
- **Translittération des paroles (Lyrics Sous-titres Romaji) :**
  - Ajout des champs `transliteratedText` et `bgTransliteratedText` dans `LineUiData` ([LyricsUiModels.kt](file:///home/adechina/Documents/tubidy/spotywoop-kt/app/src/main/java/com/spotywoop/kt/lyrics/ui/LyricsUiModels.kt)).
  - Extraction automatique en local via `SongMatch.transliterate()` si la ligne contient des caractères CJK (japonais / chinois / coréen).
  - Affichage en sous-titre stylisé Romaji sous chaque ligne dans `LyricsLineRow` ([AmLyricsView.kt](file:///home/adechina/Documents/tubidy/spotywoop-kt/app/src/main/java/com/spotywoop/kt/lyrics/ui/AmLyricsView.kt)), préservant 100% de l'animation mot-à-mot (karaoke wipe) sur le texte principal.
  - Bascule instantanée via le bouton « Aa » dans la barre d'outils des paroles et synchronisé avec le paramètre de translittération de l'application.
- **Résilience et déploiement d'online-resolve :**
  - Poussé sur `main` de `jacobiwoop/tubidy-test`.
  - `/api/discover` sécurisé avec repli Spotify et cache stale pour éviter les erreurs 502 dues aux pannes Audiomack.
