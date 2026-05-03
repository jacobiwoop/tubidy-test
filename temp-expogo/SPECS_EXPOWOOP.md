# ExpoWoop Dev Client — Spécifications techniques

> Document de référence pour l'assistant IA.
> Ne jamais modifier les versions listées ici sans validation explicite.

---

## Contexte

Ce projet est un **dev client minimal** pour tester l'intégration de `react-native-track-player` avec Expo.
Il sert de base pour l'app **Spotiwoop** (streaming musical).

L'objectif principal est d'obtenir :
- Lecture audio en **background** (quand l'app est minimisée)
- Contrôles sur l'**écran de verrouillage**
- Contrôles dans les **notifications Android**
- Support du **Dynamic Island** (iOS)

---

## Stack technique — VERSIONS FIGÉES

| Outil | Version | Raison du choix |
|---|---|---|
| Expo SDK | `~50.0.14` | SDK 50 = dernière version compatible RNTP sans conflit Kotlin |
| React Native | `0.73.6` | Fourni par SDK 50 |
| React | `18.2.0` | Fourni par SDK 50 |
| react-native-track-player | `4.1.1` | Dernière version stable compatible Kotlin 1.9.x |
| expo-dev-client | `~3.3.11` | Nécessaire pour inclure les modules natifs (RNTP) |
| expo-build-properties | `~0.11.1` | Permet de fixer la version Kotlin |
| Kotlin | `1.9.0` | **CRITIQUE** — Ne pas monter à 2.x (KSP incompatible avec RNTP) |
| Node.js | `18` | Compatible avec SDK 50 |
| Java | `17` | Requis par le toolchain Android |

### Pourquoi ces versions sont figées

Expo SDK 54+ force **KSP (Kotlin Symbol Processing) 2.x**, qui est incompatible avec RNTP 4.1.x.
RNTP utilise du code Kotlin avec des règles de null-safety qui ne compilent pas sous Kotlin 2.x.
SDK 50 + Kotlin 1.9.0 est la combinaison **prouvée fonctionnelle** (validée par la communauté).

---

## Structure du projet

```
expowoop-dev-client/
├── .github/
│   └── workflows/
│       └── build.yml       # CI/CD — build APK via GitHub Actions
├── index.js                # Entry point — DOIT contenir registerPlaybackService
├── service.js              # Playback service RNTP — gère les events remote
├── app.json                # Config Expo — background audio + Kotlin version
├── package.json            # Dépendances
```

---

## Fichiers de configuration

### `package.json`

```json
{
  "name": "expowoop-dev-client",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start --dev-client"
  },
  "dependencies": {
    "expo": "~50.0.14",
    "expo-dev-client": "~3.3.11",
    "expo-build-properties": "~0.11.1",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-track-player": "4.1.1"
  },
  "private": true
}
```

### `app.json`

```json
{
  "expo": {
    "name": "ExpoWoop",
    "slug": "expowoop-dev-client",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "newArchEnabled": false,
    "android": {
      "package": "com.expowoop.app",
      "adaptiveIcon": {
        "backgroundColor": "#000000"
      }
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.0"
          }
        }
      ]
    ]
  }
}
```

### `index.js`

```js
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { View, Text } from 'react-native';

function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', fontSize: 18 }}>ExpoWoop Dev Client</Text>
    </View>
  );
}

// OBLIGATOIRE — doit être avant registerRootComponent
TrackPlayer.registerPlaybackService(() => require('./service'));
registerRootComponent(App);
```

### `service.js`

```js
import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
};
```

### `.github/workflows/build.yml`

```yaml
name: Build Dev Client APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          package-manager-cache: false

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: npm install

      - name: Prebuild Android
        run: npx expo prebuild --platform android --clean

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: expowoop-dev-client
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 7
```

---

## Règles importantes pour l'IA

### NE JAMAIS faire

- Monter Expo SDK au-dessus de 50.x
- Monter `kotlinVersion` à `2.x` ou supérieur
- Monter `react-native-track-player` au-dessus de `4.1.1`
- Utiliser `expo-av` ou `expo-audio` comme remplacement de RNTP
- Supprimer `registerPlaybackService` dans `index.js`
- Supprimer `service.js`
- Activer `newArchEnabled: true`

### TOUJOURS vérifier

- Que `TrackPlayer.registerPlaybackService` est appelé **avant** `registerRootComponent`
- Que `service.js` contient les 5 event listeners (Play, Pause, Next, Previous, Stop)
- Que `kotlinVersion` reste `"1.9.0"` dans `app.json`
- Que le workflow utilise **Node 18** et **Java 17**

---

## Processus de build

Le build se fait via **GitHub Actions** (pas EAS, pas local).

1. Push sur la branche `main`
2. Le workflow se déclenche automatiquement
3. L'APK est généré et uploadé comme artifact GitHub
4. Télécharger l'APK et l'installer manuellement sur l'appareil Android
5. Lancer le serveur dev avec `npx expo start --dev-client`
6. Scanner le QR code depuis l'APK installé

---

## Erreurs connues et leurs causes

| Erreur | Cause | Fix |
|---|---|---|
| `Can't find KSP version for Kotlin 1.9.x` | SDK 54+ force KSP 2.x | Rester sur SDK 50 |
| `compileDebugKotlin FAILURE` | Kotlin 2.x + RNTP 4.x incompatibles | Garder Kotlin 1.9.0 |
| `CAPABILITY_PLAY of null` | RNTP utilisé dans Expo Go | Utiliser le dev build APK |
| `main has not been registered` | `registerPlaybackService` mal placé | Vérifier `index.js` |
