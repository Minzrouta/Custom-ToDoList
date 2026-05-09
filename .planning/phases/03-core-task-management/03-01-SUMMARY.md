---
phase: 03-core-task-management
plan: "01"
subsystem: data-layer
tags: [prisma, api-routes, task-management, auth]
dependency_graph:
  requires: [02-03]
  provides: [prisma-task-models, api-routes-tasks, auth-helpers]
  affects: [03-02, 03-03, 03-04]
tech_stack:
  added: []
  patterns: [Response.json, await-params, requireMembership-shared]
key_files:
  created:
    - prisma/schema.prisma (extended)
    - src/lib/auth-helpers.ts
    - src/app/api/workspaces/[id]/tasks/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/[subId]/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/comments/route.ts
    - src/app/api/workspaces/[id]/categories/route.ts
    - src/app/api/workspaces/[id]/tags/route.ts
  modified:
    - src/app/api/workspaces/[id]/route.ts
decisions:
  - "requireMembership extrait de [id]/route.ts vers src/lib/auth-helpers.ts — source unique"
  - "db push bloqué (localhost:5432 inaccessible) — prisma generate exécuté pour les types TypeScript"
  - "TaskStatus et Priority en minuscules (todo, in_progress) alignés sur les valeurs Kanban"
metrics:
  duration: "~15min"
  completed: "2026-05-09"
  tasks_completed: 2
  files_created: 9
  files_modified: 1
---

# Phase 3 Plan 01: Prisma Schema + Auth Helpers + 9 API Routes — Summary

**One-liner:** Extension Prisma avec Task/Category/Tag/SubTask/Comment + extraction requireMembership + 9 routes CRUD API vérifiées au build.

## What Was Built

### Schema Prisma (prisma/schema.prisma)

Nouveaux enums :
- `TaskStatus` : `todo`, `in_progress`, `done`, `cancelled`
- `Priority` : `low`, `medium`, `high`, `urgent`

Nouveaux modèles :
- `Category` : name, color (#6366f1 par défaut), workspaceId, @@unique([name, workspaceId])
- `Tag` : name, workspaceId, @@unique([name, workspaceId])
- `Task` : title, description (Text), status, priority, dueDate, workspaceId, categoryId, assigneeId, createdById
- `TaskTag` : table de jointure Task ↔ Tag (@@id composite)
- `SubTask` : title, completed, order, taskId
- `Comment` : content (Text), taskId, authorId

Relations ajoutées sur `User` : `tasks AssignedTasks`, `createdTasks CreatedTasks`, `comments`
Relations ajoutées sur `Workspace` : `tasks`, `categories`, `tags`

### src/lib/auth-helpers.ts

Exporte `requireMembership(workspaceId, userId)` — utilisé par toutes les routes API.
Remplace la définition locale qui existait dans `[id]/route.ts`.

### Routes API créées (7 fichiers)

| Méthodes | Endpoint |
|----------|----------|
| GET, POST | /api/workspaces/[id]/tasks |
| GET, PATCH, DELETE | /api/workspaces/[id]/tasks/[taskId] |
| POST | /api/workspaces/[id]/tasks/[taskId]/subtasks |
| PATCH, DELETE | /api/workspaces/[id]/tasks/[taskId]/subtasks/[subId] |
| GET, POST | /api/workspaces/[id]/tasks/[taskId]/comments |
| GET, POST | /api/workspaces/[id]/categories |
| GET, POST | /api/workspaces/[id]/tags |

Total : 9 endpoints + mise à jour de [id]/route.ts

### Patterns appliqués

- `Response.json()` (jamais NextResponse)
- `await params` sur tous les handlers dynamiques
- Auth check `session?.user?.id` → 401 en tête de chaque handler
- `requireMembership()` → 403 après auth check
- Isolation workspace : `where: { workspaceId: id }` sur toutes les requêtes Prisma

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Migration [id]/route.ts vers requireMembership partagé**
- **Found during:** Tâche 2 (vérification post-création des routes)
- **Issue:** [id]/route.ts avait encore sa définition locale de `requireMembership` — violation du critère "aucune duplication"
- **Fix:** Suppression de la définition locale, ajout de l'import depuis `@/lib/auth-helpers`
- **Files modified:** src/app/api/workspaces/[id]/route.ts
- **Commit:** 469a403

## Blockers Rencontrés

### db push — Base de données inaccessible

- **Commande :** `npx prisma db push --accept-data-loss`
- **Erreur :** `P1001: Can't reach database server at localhost:5432`
- **Impact :** Le schema n'a pas été appliqué en base. Les tables Task, Category, Tag, etc. n'existent pas encore en base de données.
- **Mitigation :** `prisma generate` exécuté avec succès — le client Prisma TypeScript est à jour avec tous les nouveaux modèles. Le code TypeScript compile sans erreur.
- **Resolution :** Lancer `npx prisma db push --accept-data-loss` ou `npx prisma migrate deploy` quand PostgreSQL sera accessible.

## Known Stubs

Aucun stub — toutes les routes retournent des données réelles depuis Prisma.

## Self-Check: PASSED

Fichiers vérifiés :
- prisma/schema.prisma : contient Task, Category, Tag, TaskTag, SubTask, Comment, TaskStatus, Priority
- src/lib/auth-helpers.ts : exporte requireMembership
- 7 fichiers de routes créés, tous présents
- npm run build : succès (toutes les routes listées dans la sortie)
- npx prisma validate : "The schema at prisma/schema.prisma is valid"
- Commits : 0624bd9 (schema), 469a403 (routes)
