# Image one-shot pour Render: API Node + CloakBrowser runner local.
FROM cloakhq/cloakbrowser:latest

# Outils de compilation nécessaires pour better-sqlite3 si le prebuild n'est pas disponible.
RUN apt-get update && apt-get install -y --no-install-recommends \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Dossier de travail
WORKDIR /app

# Décodage des clés obscurcies (Base64 + ROT13)
RUN echo "OG80NG8wMDdvbjI3NnNvb3I4ODkyMzU2M3I0b3NzOTAK" | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m' > .env.tmp \
    && echo "LASTFM_API_KEY=$(cat .env.tmp)" > .env \
    && echo "bjlzNm44cHFwczQzMTFuc3E3NjVwMTNvMjBwczA4M3MK" | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m' > .env.tmp \
    && echo "LASTFM_SECRET=$(cat .env.tmp)" >> .env \
    && rm .env.tmp

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances de production uniquement
RUN npm ci --omit=dev

# Copie du reste du code source
COPY . .

RUN chmod +x /app/docker/render-entrypoint.sh

# Port utilisé par ton app.js (3000 par défaut)
EXPOSE 3000

# Render expose le port de l'API Node. Le runner reste local dans le conteneur.
ENV CLOAK_RUNNER_URL=http://127.0.0.1:8765 \
    RUNNER_HOST=127.0.0.1 \
    RUNNER_PORT=8765 \
    RUNNER_MAX_TIMEOUT_SECONDS=300 \
    ENABLE_DEBUG_RUN=0

ENTRYPOINT ["/app/docker/render-entrypoint.sh"]
