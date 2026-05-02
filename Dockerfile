# --- Étape 1 : Build du Frontend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances complètes (pour le build)
RUN npm install

# Copie du reste du code source
COPY . .

# Construction du frontend (crée le dossier dist/)
RUN npm run build

# --- Étape 2 : Image de Production (Backend + Frontend statique) ---
FROM node:20-alpine AS runner

WORKDIR /app

# On définit l'environnement en production
ENV NODE_ENV=production
ENV PORT=3000

# On copie package.json pour installer seulement les dépendances de prod
COPY package*.json ./
RUN npm install --production

# On copie le dossier dist construit à l'étape précédente
COPY --from=builder /app/dist ./dist

# On copie le serveur backend et les dossiers nécessaires
COPY server.js .
# On crée le dossier data pour éviter les erreurs de permissions au démarrage
RUN mkdir -p data/photos

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
