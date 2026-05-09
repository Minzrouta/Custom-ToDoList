---
phase: 02-auth-workspaces
plan: "01"
subsystem: auth
tags: [nextauth, oauth, prisma, session]
dependency_graph:
  requires: [prisma/schema.prisma from phase 01]
  provides: [src/auth.ts, /api/auth/[...nextauth], session.user.id]
  affects: [all server components and API routes that call auth()]
tech_stack:
  added:
    - next-auth@5.0.0-beta.31
    - "@auth/prisma-adapter@2.11.2"
  patterns:
    - NextAuth v5 database sessions with PrismaAdapter
    - OAuth providers (Google + GitHub)
    - Auto-creation of default workspaces on first login
key_files:
  created:
    - src/auth.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/types/next-auth.d.ts
  modified:
    - prisma/schema.prisma
    - package.json
    - package-lock.json
decisions:
  - "Database sessions (not JWT) — plus sûr pour app multi-user avec PrismaAdapter"
  - "Callback signIn crée 3 workspaces Boulot/Ecole/Perso au premier login"
  - "session.user.id exposé via augmentation de type next-auth.d.ts"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-09"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 02 Plan 01: NextAuth v5 Config, Schema Prisma Account/Session Summary

**One-liner:** NextAuth v5 (database sessions) avec providers Google/GitHub, PrismaAdapter, et création automatique des workspaces Boulot/Ecole/Perso au premier login.

## Packages installés

| Package | Version |
|---------|---------|
| next-auth | 5.0.0-beta.31 |
| @auth/prisma-adapter | 2.11.2 |

## Modèles Prisma ajoutés

- **Account** — stocke les comptes OAuth liés (provider, providerAccountId, tokens)
- **Session** — sessions base de données via PrismaAdapter (sessionToken, expires)
- **VerificationToken** — tokens de vérification email (identifier, token, expires)
- **User.accounts** / **User.sessions** — relations ajoutées au modèle User existant

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/auth.ts` | Configuration NextAuth v5 : providers Google/GitHub, PrismaAdapter, callbacks signIn (workspaces par défaut) et session (expose user.id) |
| `src/app/api/auth/[...nextauth]/route.ts` | Route handler OAuth — re-export `{ GET, POST }` depuis handlers |
| `src/types/next-auth.d.ts` | Augmentation du type Session pour inclure `user.id: string` |

## Variables d'environnement requises pour le déploiement

| Variable | Source | Obligatoire |
|----------|--------|-------------|
| `DATABASE_URL` | PostgreSQL Coolify | Oui |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Oui |
| `NEXTAUTH_URL` | `https://tasks.bantou.me` | Oui |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials | Oui |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials | Oui |
| `GITHUB_ID` | GitHub → Settings → Developer settings → OAuth Apps | Oui |
| `GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps | Oui |

## Configuration Google OAuth requise

1. Aller sur Google Cloud Console → APIs & Services → Credentials
2. Créer ou éditer l'OAuth 2.0 Client ID
3. Ajouter dans "Authorized redirect URIs" :
   - `https://tasks.bantou.me/api/auth/callback/google` (prod)
   - `http://localhost:3000/api/auth/callback/google` (dev)

## Configuration GitHub OAuth requise

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `https://tasks.bantou.me`
3. Authorization callback URL: `https://tasks.bantou.me/api/auth/callback/github`

## Blocker documenté : prisma db push

La commande `npx prisma db push --accept-data-loss` **doit être exécutée sur le serveur** (ou dans un environnement avec `DATABASE_URL` configuré). Elle n'a pas pu être exécutée localement car aucune base de données PostgreSQL n'est accessible dans cet environnement.

**Action requise avant déploiement :** Exécuter via Coolify ou en SSH sur le VPS après avoir configuré `DATABASE_URL` :
```bash
npx prisma db push --accept-data-loss
```

Cette commande créera les tables `accounts`, `sessions`, `verification_tokens` en base.

## Commits

| Hash | Description |
|------|-------------|
| 11c23ec | feat(02-01): install next-auth@beta + @auth/prisma-adapter, extend Prisma schema |
| 7ae9bb1 | feat(02-01): NextAuth v5 config, route handler, et augmentation de type Session |

## Vérifications effectuées

- `prisma validate` : schema valide
- `npx prisma generate` : client Prisma régénéré avec Account/Session/VerificationToken
- `npx tsc --noEmit` : aucune erreur TypeScript
- `npm run build` : build Next.js réussi — route `/api/auth/[...nextauth]` enregistrée comme dynamique

## Deviations from Plan

None — plan exécuté exactement tel qu'écrit. Le blocker `prisma db push` était anticipé dans la consigne.

## Known Stubs

None — aucune donnée hardcodée ou placeholder dans les fichiers créés.

## Threat Flags

None — aucune surface de sécurité nouvelle au-delà de ce que couvre le threat model du plan (T-02-01 à T-02-04).

## Self-Check: PASSED

Fichiers créés :
- FOUND: /home/ubuntu/Custom-ToDoList/src/auth.ts
- FOUND: /home/ubuntu/Custom-ToDoList/src/app/api/auth/[...nextauth]/route.ts
- FOUND: /home/ubuntu/Custom-ToDoList/src/types/next-auth.d.ts
- FOUND: /home/ubuntu/Custom-ToDoList/prisma/schema.prisma (modifié)

Commits :
- FOUND: 11c23ec
- FOUND: 7ae9bb1
