# Utilise une image Node.js stable et légère
FROM node:22-slim

# Installation des outils de compilation nécessaires pour better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
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
RUN npm install --production

# Copie du reste du code source
COPY . .

# Port utilisé par ton app.js (3000 par défaut)
EXPOSE 3000

# Commande de lancement
CMD ["npm", "start"]
