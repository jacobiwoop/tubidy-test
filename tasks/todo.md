# Analyse du projet Tubidy / Spotywoop

## Plan

- [x] Lire les consignes locales et les lecons existantes.
- [x] Cartographier les modules, scripts, points d'entree et dependances.
- [x] Analyser l'application mobile Spotywoop: architecture, API consommee, stockage, lecture audio.
- [x] Analyser le backend Express: routes, services externes, cache, persistance, erreurs.
- [x] Evaluer les risques principaux: securite, stabilite, performance, tests, exploitation.
- [x] Documenter une synthese actionnable et les prochaines priorites.

## Review

- Projet principal: backend Express a la racine + app mobile Expo/React Native dans `spotywoop-mobile`.
- Backend: agregateur Deezer/Tubidy/Tubidy.cool/Chosic/LRCLIB/Last.fm avec SQLite local `music.db`, caches memoire et routes `/api/*`.
- Mobile: Expo SDK 50, RN 0.73.6, `react-native-track-player`, stockage local via AsyncStorage et fichiers MP3 via Expo FileSystem.
- Risques critiques: secrets dans Dockerfile/code, proxy audio ouvert SSRF, CORS ouvert + auth no-op, rate limit partiel, workflows CI obsoletes pointant vers `mobile/`, tests absents.
- Risques mobiles: `SearchScreen` utilise `axios.isCancel` sans import, offline incomplet, queue RNTP possiblement incoherente, API Render hardcodee.
- Hygiene repo: keystore, `music.db`, `.expo/`, APK/bundles/ZIP devraient etre exclus ou retires du suivi selon usage.
- Verification: analyse statique avec trois sous-agents cibles; pas de build ni tests lances car la demande etait une analyse, et il n'existe pas de suite de tests declaree.

---

# Analyse du depot CloakBrowser

## Plan

- [x] Lire README et metadonnees du depot.
- [x] Cartographier structure, points d'entree et exemples.
- [x] Identifier usage concret, dependances et risques.
- [x] Resumer clairement l'objectif du projet.

## Review

- CloakBrowser est un wrapper Python et JavaScript autour d'un binaire Chromium modifie pour l'automatisation stealth.
- Usage principal: remplacer Playwright/Puppeteer avec peu de changements de code, via `launch()`, `launch_context()` ou `launchPersistentContext()`.
- Le paquet telecharge/cache automatiquement un Chromium patche dans `~/.cloakbrowser`, avec verification SHA-256 quand disponible.
- Il expose aussi une CLI `cloakbrowser` pour install/info/update/clear-cache, un conteneur Docker, des exemples, des tests et un outil `cloakserve` de multiplexage CDP.
- Public vise: scraping, agents navigateur, tests anti-bot, sessions persistantes, proxies, profils fingerprint, humanisation souris/clavier/scroll.

---

# Runner Docker CloakBrowser HTTP

## Plan

- [x] Creer un runner HTTP Docker base sur CloakBrowser.
- [x] Exposer `POST /run` avec execution de script Python fourni en JSON.
- [x] Deployer le runner sur le serveur distant.
- [x] Construire et lancer le conteneur Docker.
- [x] Tester le scenario Chosic Focus et recuperer les cookies.

## Review

- Fichiers locaux ajoutes: `cloak-runner/Dockerfile`, `cloak-runner/server.py`, `cloak-runner/scripts/chosic_focus_cookie.py`.
- Image Docker construite sur le serveur: `cloak-runner:local`.
- Conteneur lance sur le serveur: `cloak-runner`, port lie uniquement en local `127.0.0.1:8765->8765/tcp`.
- Sante verifiee: `GET http://127.0.0.1:8765/health` retourne `{"ok": true, "service": "cloak-runner"}`.
- Scenario verifie via `POST /run`: job `dc40ab5c800c491494e49a323f9f1e51`, `exit_code=0`, duree environ 82s.
- Resultat Chosic: page `https://www.chosic.com/playlist-generator/`, titre `Similar Songs Finder | Spotify Playlist Generator - Chosic`, clic `Focus` effectue, cookies renvoyes dans `stdout.cookie_header`.
- Note securite: le runner execute du code Python arbitraire; il doit rester lie a `127.0.0.1` ou etre protege par `RUNNER_TOKEN` avant toute exposition reseau.

---

# Runner CloakBrowser integre + domaine

## Plan

- [x] Integrer le scenario Chosic Focus dans l'image Docker.
- [x] Ajouter un endpoint dedie qui lance le scenario sans recevoir de script arbitraire.
- [x] Reconstruire et redeployer l'image sur le serveur.
- [x] Creer l'exposition par sous-domaine `traefik.me`.
- [x] Verifier l'appel local et l'appel via domaine.

## Review

- Le Dockerfile copie maintenant `scripts/` dans l'image.
- Endpoint dedie ajoute: `POST /chosic/focus-cookie`.
- Endpoint generique `/run` desactive par defaut; il ne s'active que si `ENABLE_DEBUG_RUN=1`.
- Image reconstruite sur le serveur: `cloak-runner:local`.
- Conteneur actif: `cloak-runner`, expose localement sur `127.0.0.1:8765`.
- Domaine public configure via Nginx existant, pas via un conteneur Traefik: `http://cloak.204.236.198.29.traefik.me`.
- `GET http://cloak.204.236.198.29.traefik.me/health` retourne `{"ok": true, "service": "cloak-runner"}`.
- Test public du job Chosic valide: job `8dd5f56a14cf4fa2a603d226f9163d31`, `exit_code=0`, duree `39639ms`, `33` cookies, `cookie_header_length=1762`.

---

# Render API + CloakRunner externe

## Plan

- [x] Retirer CloakRunner de l'image Docker Render.
- [x] Revenir a une image Node legere pour le backend.
- [x] Garder les routes `/api/cloak/*` comme pont vers un runner externe.
- [x] Faire echouer clairement `/api/cloak/*` si `CLOAK_RUNNER_URL` n'est pas configure.

## Review

- Le Dockerfile Render ne lance plus Xvfb, Python runner, ni Chromium.
- `routes/cloak.js` utilise maintenant uniquement `CLOAK_RUNNER_URL`.
- Si `CLOAK_RUNNER_URL` est absent, les routes Cloak renvoient une erreur 503 via le handler Express.
- Le runner distant AWS reste la cible prevue pour la suite.

---

# Auto-refresh cookie Chosic via CloakRunner

## Plan

- [x] Rafraichir le cookie Chosic uniquement apres echec.
- [x] Utiliser le runner actuel `http://cloak.204.236.198.29.traefik.me`.
- [x] Ajouter un verrou pour eviter plusieurs refresh Chromium simultanes.
- [x] Retenter la requete Chosic une seule fois apres refresh.
- [x] Informer l'app mobile quand un refresh cookie est en cours.

## Review

- `services/chosic.service.js` garde maintenant le cookie courant en memoire et refresh via CloakRunner seulement si Chosic renvoie une erreur de cookie/token.
- Un verrou `refreshPromise` evite plusieurs refresh Chromium simultanes; les autres requetes attendent le meme refresh.
- Apres refresh, la requete Chosic est retentee une fois avec le nouveau `cookie_header`.
- `GET /api/chosic/status` expose `refreshingCookie` pour l'app.
- HomeScreen et QueueModal affichent une indication pendant la mise a jour du moteur de recommandations.
- Verification: `node -c` OK sur les fichiers backend modifies. ESLint mobile n'a pas rendu la main et a ete arrete; pas de script lint/test mobile configure.
