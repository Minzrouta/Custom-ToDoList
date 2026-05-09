---
phase: 02-auth-workspaces
plan: "02"
subsystem: api-workspaces
tags: [proxy, workspaces, membership, isolation, next16]
dependency_graph:
  requires:
    - 02-01-PLAN.md  # src/auth.ts, prisma schema, src/lib/prisma.ts
  provides:
    - src/proxy.ts                                    # Protection routes Next.js 16
    - src/app/api/workspaces/route.ts                 # GET liste + POST création
    - src/app/api/workspaces/[id]/route.ts            # GET + PATCH + DELETE workspace
    - src/app/api/workspaces/[id]/members/route.ts    # GET membres + POST invitation
  affects:
    - Toutes les routes de l'app (proxy intercepte avant rendu)
tech_stack:
  added: []
  patterns:
    - "proxy.ts (Next.js 16) — remplace middleware.ts déprécié"
    - "requireMembership() helper — isolation workspace garantie"
    - "Response.json() Web API (pas NextResponse.json())"
    - "await params — compatibilité Next.js 15+ routes dynamiques"
key_files:
  created:
    - src/proxy.ts
    - src/app/api/workspaces/route.ts
    - src/app/api/workspaces/[id]/route.ts
    - src/app/api/workspaces/[id]/members/route.ts
  modified: []
decisions:
  - "proxy.ts exporte la fonction proxy() nommée (pas middleware) — convention Next.js 16"
  - "requireMembership() interne à [id]/route.ts — pas de fichier lib séparé (YAGNI)"
  - "Invitation par email uniquement pour comptes existants — pas de création implicite"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-09T03:16:27Z"
  tasks_completed: 2
  files_created: 4
---

# Phase 02 Plan 02: Proxy + API Workspaces Summary

**One-liner:** Protection de routes via `src/proxy.ts` (Next.js 16) + CRUD workspaces avec isolation membership et invitation par email.

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/proxy.ts` | Intercepte toutes les routes, redirige vers `/auth/signin` si non authentifié. Laisse passer `/`, `/auth/signin`, `/api/auth/*`. |
| `src/app/api/workspaces/route.ts` | `GET` liste les workspaces de l'user (par membership) — `POST` crée un workspace avec l'user comme OWNER. |
| `src/app/api/workspaces/[id]/route.ts` | `GET` détail — `PATCH` renommer (OWNER) — `DELETE` supprimer (OWNER). Isolation via `requireMembership()`. |
| `src/app/api/workspaces/[id]/members/route.ts` | `GET` liste membres (membre requis) — `POST` invitation par email (OWNER requis). |

## Endpoints API disponibles

| Méthode | URL | Auth | Rôle requis | Description |
|---------|-----|------|-------------|-------------|
| GET | `/api/workspaces` | 401 | membre | Liste les workspaces de l'user |
| POST | `/api/workspaces` | 401 | — | Crée un workspace (user = OWNER) |
| GET | `/api/workspaces/[id]` | 401 | membre (403) | Détail workspace + membres |
| PATCH | `/api/workspaces/[id]` | 401 | OWNER (403) | Renommer le workspace |
| DELETE | `/api/workspaces/[id]` | 401 | OWNER (403) | Supprimer le workspace |
| GET | `/api/workspaces/[id]/members` | 401 | membre (403) | Liste les membres |
| POST | `/api/workspaces/[id]/members` | 401 | OWNER (403) | Inviter un user par email |

## Sécurité — Isolation workspace (NFR-02)

Chaque route `[id]` vérifie le membership avant de retourner des données :

- **401** si aucune session active
- **403** si l'user n'est pas membre du workspace
- **403** si l'opération requiert le rôle OWNER et que l'user est MEMBER
- `requireMembership(workspaceId, userId)` utilise la contrainte composite `userId_workspaceId` (index Prisma) — O(1)

Aucune fuite de données cross-workspace possible.

## Commits

| Tâche | Hash | Description |
|-------|------|-------------|
| 1 — proxy.ts | `7cea30a` | Protection des routes Next.js 16 |
| 2 — API routes | `7f74c1c` | CRUD workspaces + invitation membres |

## Deviations from Plan

None — plan exécuté exactement tel qu'écrit.

## Self-Check: PASSED

- `src/proxy.ts` : FOUND
- `src/app/api/workspaces/route.ts` : FOUND
- `src/app/api/workspaces/[id]/route.ts` : FOUND
- `src/app/api/workspaces/[id]/members/route.ts` : FOUND
- Commits `7cea30a` et `7f74c1c` : FOUND
- `npx tsc --noEmit` : no errors
- `npm run build` : success (toutes les routes visibles dans le build output)
