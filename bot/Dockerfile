# bot/Dockerfile
# Build context = repo racine (voir docker-compose.yml: build.context: .)
# Permet d'accéder au prisma/schema.prisma partagé.

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY bot/package.json bot/package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copier dépendances installées
COPY --from=deps /app/node_modules ./node_modules

# Copier le schema Prisma partagé (depuis la racine du repo)
COPY prisma ./prisma

# Générer le client Prisma à l'intérieur du conteneur (prisma generate)
RUN npx --yes prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Copier le code du bot
COPY bot/package.json ./package.json
COPY bot/tsconfig.json ./tsconfig.json
COPY bot/src ./src

# Port HTTP interne pour les notifications (non exposé publiquement)
EXPOSE 8080

CMD ["npx", "--yes", "tsx", "src/index.ts"]
