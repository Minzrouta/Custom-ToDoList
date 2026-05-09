---
phase: 01-bootstrap-infrastructure
plan: "02"
subsystem: database
tags: [prisma, postgresql, orm, health-check, schema]
dependency_graph:
  requires: ["01-01"]
  provides: ["db-schema", "prisma-client", "health-endpoint"]
  affects: ["02-auth", "03-workspaces"]
tech_stack:
  added: ["prisma@5.22.0", "@prisma/client@5.22.0"]
  patterns: ["PrismaClient singleton (globalThis)", "Next.js Route Handler"]
key_files:
  created:
    - prisma/schema.prisma
    - src/lib/prisma.ts
    - src/app/api/health/route.ts
    - .env.example
  modified:
    - .gitignore
    - package.json
    - package-lock.json
decisions:
  - "Prisma v5.22.0 utilisé (v7 requiert Node 20.19+, VPS est en 20.18.1)"
  - "Response.json() natif plutôt que NextResponse.json() (recommandé Next.js 16)"
  - "!.env.example ajouté dans .gitignore pour permettre le commit du template"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-09"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 1 Plan 2: Prisma ORM + PostgreSQL Schema + Health Check Summary

Prisma v5 configuré avec schema User/Workspace/WorkspaceMember et singleton client, endpoint /api/health retournant JSON statut DB, build Next.js 16 propre.

## What Was Built

### Task 1: Schema Prisma et client singleton

- `prisma/schema.prisma` : 3 modèles (User, Workspace, WorkspaceMember) + enum Role
  - `User` : id (cuid), email unique, name, emailVerified, image, timestamps
  - `Workspace` : id, name, description, timestamps
  - `WorkspaceMember` : relation User-Workspace avec role (OWNER/MEMBER), contrainte `@@unique([userId, workspaceId])`
  - Cascade delete sur les deux relations
- `src/lib/prisma.ts` : PrismaClient singleton via pattern `globalThis` (évite les multiples connexions en hot-reload Next.js)
- `.env.example` : template documenté avec DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
- `.gitignore` modifié : `!.env.example` ajouté pour exclure le template du pattern `.env*`

### Task 2: Endpoint `/api/health`

- `src/app/api/health/route.ts` : Route Handler GET qui exécute `prisma.$queryRaw\`SELECT 1\``
  - Succès (DB connectée) → `{ status: "ok", db: "connected", timestamp }` HTTP 200
  - Echec (DB injoignable) → `{ status: "error", db: "disconnected", timestamp }` HTTP 503
  - Erreur DB loggée côté serveur uniquement (mitigation T-01-04 : pas d'exposition dans la réponse)

## Build Result

```
npx tsc --noEmit   → 0 erreurs
npm run build      → ✓ Compiled successfully
Route (app)
  ○ /
  ○ /_not-found
  ƒ /api/health    ← Dynamic (server-rendered on demand)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma v7 incompatible avec Node 20.18.1**
- **Found during:** Task 1, npm install
- **Issue:** Prisma v7+ requiert Node 20.19+ ; le VPS tourne en 20.18.1
- **Fix:** Installation de prisma@5 et @prisma/client@5 (v5.22.0 — dernière version v5, supporte Node >=16.13)
- **Files modified:** package.json, package-lock.json
- **Impact:** Aucun — l'API Prisma v5 est identique pour les besoins du projet

**2. [Rule 2 - Pattern] Response.json() natif au lieu de NextResponse.json()**
- **Found during:** Task 2, lecture docs Next.js 16
- **Issue:** La doc Next.js 16 recommande `Response.json()` natif pour les Route Handlers ; `NextResponse` est principalement pour les middlewares
- **Fix:** Utilisation de `Response.json()` sans import supplémentaire
- **Files modified:** src/app/api/health/route.ts

**3. [Rule 2 - Gitignore] .env.example exclu du pattern .env***
- **Found during:** Task 1, vérification .gitignore
- **Issue:** Le .gitignore contenait `.env*` qui aurait ignoré `.env.example`, empêchant son commit
- **Fix:** Ajout de `!.env.example` dans .gitignore
- **Files modified:** .gitignore

## Known Stubs

Aucun stub — le health check est intentionnellement dynamique (retourne 503 sans DB active, 200 avec DB).

## Threat Flags

Aucun nouveau threat surface non couvert par le threat_model du plan.

T-01-04 (Information Disclosure /api/health) : mitigé — erreur DB loggée `console.error` uniquement, réponse JSON ne contient que "error"/"disconnected".
T-01-05 (DATABASE_URL) : mitigé — .env dans .gitignore (.env*), .env.example commitable.

## Self-Check: PASSED

- prisma/schema.prisma : FOUND
- src/lib/prisma.ts : FOUND
- src/app/api/health/route.ts : FOUND
- .env.example : FOUND
- Commit 3c11bf2 : FOUND
