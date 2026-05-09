# 04-01 — SUMMARY

**Plan:** 04-01 — Prisma Discord fields + bot/ scaffold + docker-compose discord-bot service
**Status:** Complete
**Date:** 2026-05-09

## Ce qui a été livré

### Schema Prisma (commit 5a6b667)
- `User.discordId` (String? @unique)
- `Workspace.discordGuildId` (String? @unique)
- `Workspace.discordChannelId` (String?)

### Bot scaffold (commit f4f362e)
- `bot/package.json` — discord.js ^14.16.3, @prisma/client, NodeNext ESM
- `bot/tsconfig.json` — strict, NodeNext, target ES2022
- `bot/Dockerfile` — multi-stage Alpine, non-root user
- `bot/.dockerignore`
- `bot/src/prisma.ts` — singleton client
- `bot/src/index.ts` — Discord.js client init + Events.InteractionCreate handler
- `bot/src/register.ts` — script d'enregistrement des slash commands
- `bot/src/notify-server.ts` — serveur HTTP interne (port 8080) pour notifications app→bot (stub étendu en 04-03)
- `bot/src/commands/index.ts` — SlashCommandBuilder /task avec 3 sous-commandes (handlers stubs, implémentation en 04-02)

### docker-compose.yml
- Nouveau service `discord-bot` (build context: ., dockerfile: bot/Dockerfile)
- env vars : DATABASE_URL, DISCORD_TOKEN, DISCORD_CLIENT_ID, APP_URL, NOTIFY_PORT=8080
- `depends_on: database (service_healthy)` 
- Réseau `coolify`, pas de port public exposé

### .gitignore
- Ajout `/bot/node_modules` et `/bot/package-lock.json`

## Bloqueur documenté
- `npx prisma db push --accept-data-loss` ne peut pas s'exécuter sans DATABASE_URL accessible (localhost:5432 indisponible). Le schema est valide et prêt à être pushé sur le serveur.

## Vérifications
- `npx tsc --noEmit` (Next.js) : aucune erreur
- `npm run build` : succès
- Schema Prisma validé via `prisma generate`
