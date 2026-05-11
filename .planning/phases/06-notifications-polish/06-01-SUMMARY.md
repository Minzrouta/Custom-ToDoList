---
phase: 06-notifications-polish
plan: 01
subsystem: notifications

tags: [prisma, notifications, api, nextjs, fire-and-forget]

requires:
  - phase: 01-foundation
    provides: User model, auth NextAuth v5, prisma client
  - phase: 02-task-management
    provides: Task model, /api/workspaces/[id]/tasks routes
  - phase: 04-discord
    provides: fire-and-forget pattern (discord-notify.ts) repris pour les helpers in-app

provides:
  - Modèle Prisma Notification + enum NotificationType
  - Helpers fire-and-forget createNotification / notifyAssignment / notifyCompletion
  - GET /api/notifications (liste + unreadCount)
  - PATCH /api/notifications/[id] (mark as read, idempotent)
  - POST /api/notifications/mark-all-read
  - Émission automatique des notifs depuis POST + PATCH tasks (assignment + completion)

affects: [06-02-notifications-ui, 06-polish]

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget DB writes (try/catch + console.warn, jamais throw)"
    - "Notifications scopées par userId === session.user.id (pas de requireMembership)"
    - "Response.json() (jamais NextResponse)"
    - "await params pour routes dynamiques Next.js 16"

key-files:
  created:
    - src/lib/notifications.ts
    - src/app/api/notifications/route.ts
    - src/app/api/notifications/[id]/route.ts
    - src/app/api/notifications/mark-all-read/route.ts
  modified:
    - prisma/schema.prisma
    - src/app/api/workspaces/[id]/tasks/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/route.ts

key-decisions:
  - "db push différé au déploiement Coolify : DATABASE_URL local inaccessible (P1001 sur localhost:5432). Même décision que phase 05-01. prisma generate suffit pour le typage TS."
  - "task_due_soon non créée en DB : computed at fetch time (décision CONTEXT phase). Seuls task_assigned et task_completed sont émises par cette plan ; task_mentioned est déférée v2."
  - "Routes notifications scopées par userId (pas par workspace) : pas de requireMembership, juste auth() check + filtre Prisma where: { userId: session.user.id }."
  - "PATCH mark-as-read idempotent : si readAt déjà set, retourne le record existant sans update (évite update inutile + bruit dans les logs)."
  - "Helpers no-op intégrés : notifyAssignment skip si newAssigneeId est null OU === oldAssigneeId OU === actorId. Les routes appellent toujours le helper, qui décide."

patterns-established:
  - "Fire-and-forget notif DB : helper exporte async function, route appelle void helper(), le helper catch tout en interne"
  - "Helpers no-op-friendly : la logique de skip vit dans le helper, pas dans la route — la route ne fait qu'appeler"

requirements-completed: [FR-09]

duration: ~5min
completed: 2026-05-11
---

# Phase 06 Plan 01: Notifications Backend Summary

**Modèle Prisma Notification + helpers fire-and-forget + 3 routes API (list / mark-read / mark-all-read) + hooks dans POST/PATCH tasks pour émettre task_assigned & task_completed.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-11T00:12:16Z
- **Completed:** 2026-05-11T00:17:29Z
- **Tasks:** 5 (Task 6 = checkpoint optionnel, satisfait par "DB locale KO + TS clean + build OK")
- **Files modified/created:** 6 (1 schema, 1 helper lib, 3 API routes, 2 task routes)

## Accomplishments

- Modèle Prisma `Notification` ajouté avec enum `NotificationType` (task_assigned, task_due_soon, task_completed, task_mentioned) et index composite `(userId, readAt, createdAt DESC)` pour servir efficacement badge + dropdown.
- Relations inverses ajoutées sur User, Workspace, Task (toutes en `onDelete: Cascade`).
- Helpers `createNotification`, `notifyAssignment`, `notifyCompletion` dans `src/lib/notifications.ts` — pattern strict fire-and-forget (try/catch + console.warn, jamais `throw`).
- 3 routes API créées sous `/api/notifications/` (GET list paginée + unreadCount, PATCH mark read, POST mark-all-read), toutes scopées via `session.user.id`.
- Émission automatique branchée dans POST `/api/workspaces/[id]/tasks` (assignation à la création) et PATCH `/api/workspaces/[id]/tasks/[taskId]` (changement d'assignee + transition vers `done`).

## Task Commits

1. **Task 1: schema Prisma Notification + enum + relations** — `29a2da5` (feat)
2. **Task 2: prisma generate** — pas de commit (régénération `node_modules/.prisma`, `db push` différé Coolify)
3. **Task 3: src/lib/notifications.ts (helpers)** — `d4d36a9` (feat)
4. **Task 4: 3 routes API notifications** — `d38f578` (feat)
5. **Task 5: hooks dans POST + PATCH tasks** — `ad63e96` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — ajout enum `NotificationType`, model `Notification`, relation `notifications Notification[]` sur User/Workspace/Task. Index `@@index([userId, readAt, createdAt(sort: Desc)])`.
- `src/lib/notifications.ts` — **créé**. 3 fonctions exportées, toutes async, aucune ne propage d'erreur. `createNotification` wrap le `prisma.notification.create` dans un try/catch. `notifyAssignment` et `notifyCompletion` ont chacune leur logique no-op (skip si self-assign, skip si pas de changement, skip si pas d'assignee).
- `src/app/api/notifications/route.ts` — **créé**. GET liste : filtre `unread=true` optionnel, `limit` clampé 1..100 (défaut 20), tri `createdAt desc`, include task (id/title/workspaceId) + workspace (id/name). Renvoie `{ data: { items, unreadCount } }`.
- `src/app/api/notifications/[id]/route.ts` — **créé**. PATCH idempotent : 404 si introuvable, 403 si pas la bonne userId, 200 avec record existant si déjà lue, sinon update `readAt = new Date()`.
- `src/app/api/notifications/mark-all-read/route.ts` — **créé**. POST `updateMany` sur les notifs non-lues de l'user, retourne `{ success: true, count }`.
- `src/app/api/workspaces/[id]/tasks/route.ts` — modifié. Import `notifyAssignment`. Après `void notifyDiscord(...)` et avant le return, ajout d'un `void notifyAssignment(...)` avec `oldAssigneeId: null`.
- `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` — modifié. Import `notifyAssignment, notifyCompletion`. `select` de l'existing étendu avec `assigneeId`. Après le bloc Discord transitionedToDone, deux nouveaux blocs `void notifyAssignment(...)` (si assigneeId change) et `void notifyCompletion(...)` (si transition done).

## Schema appliqué

```prisma
enum NotificationType {
  task_assigned
  task_due_soon
  task_completed
  task_mentioned
}

model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  title       String
  body        String?          @db.Text
  taskId      String?
  workspaceId String?
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  task      Task?      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt(sort: Desc)])
  @@map("notifications")
}
```

L'index composite est conçu pour deux requêtes critiques :
- **Badge unread** : `WHERE userId = ? AND readAt IS NULL` → préfixe d'index `(userId, readAt)`.
- **Dropdown trié** : `WHERE userId = ? ORDER BY createdAt DESC` → préfixe `(userId, ..., createdAt DESC)`.

## Format des réponses API

- `GET /api/notifications` → `{ data: { items: Notification[], unreadCount: number } }` (200) ou `{ error }` (401/500).
- `GET /api/notifications?unread=true&limit=10` → idem, items filtrés sur `readAt IS NULL`.
- `PATCH /api/notifications/[id]` → `{ data: Notification }` (200) ou `{ error }` (401/403/404/500). Idempotent.
- `POST /api/notifications/mark-all-read` → `{ success: true, count: number }` (200) ou `{ error }` (401/500).

## Décisions Made

- **db push différé Coolify** : `npx prisma db push` échoue avec P1001 (DB locale `localhost:5432` non démarrée). Cohérent avec la pratique des phases précédentes. `npx prisma generate` a réussi, donc TypeScript a tous les types nécessaires. La table physique sera créée au prochain déploiement Coolify (variable `DATABASE_URL` de production pointe vers la DB managée).
- **Pas de DELETE notification** : pas demandé en v1. Si nécessité plus tard, on retiendra le pattern : auth check + ownership check + `prisma.notification.delete`.
- **Pas de DTO scrub sur la réponse** : `userId` est renvoyé, mais c'est forcément l'user authentifié (filtré côté `where`). Pas de fuite cross-user possible.

## Deviations from Plan

None — plan exécuté exactement comme écrit. Le seul "écart" est documenté dans le plan lui-même (DB locale KO ⇒ `db push` différé), donc ce n'est pas vraiment une déviation, c'est un cas prévu.

## Issues Encountered

- `npx prisma db push` impossible (DB locale non démarrée, P1001 sur localhost:5432). Comportement attendu dans cet environnement de dev. `prisma generate` exécuté en remplacement → suffit pour compiler le TypeScript. La table sera matérialisée en prod via Coolify.

## User Setup Required

Lors du prochain déploiement Coolify, vérifier que `npx prisma db push` est bien exécuté au démarrage du conteneur (déjà dans le `Dockerfile` selon le pattern phase 05). Si nécessaire, déclencher manuellement `prisma db push --accept-data-loss` une fois pour matérialiser la table `notifications` et son index.

## Next Phase Readiness

- Backend notifications complet. Plan 06-02 (UI badge + dropdown) peut consommer `GET /api/notifications?unread=true&limit=10` et `POST /api/notifications/mark-all-read` directement.
- Aucun bloquant : TypeScript compile sans erreur (`npx tsc --noEmit` clean), build Next.js OK, les 3 routes sont enregistrées et visibles dans le listing build.

## Self-Check

Vérifications post-implémentation :
- `npx prisma validate` → "The schema at prisma/schema.prisma is valid"
- `npx prisma generate` → "✔ Generated Prisma Client (v5.22.0)"
- `npx tsc --noEmit` → "TypeScript: No errors found"
- `npm run build` → "✓ Compiled successfully" + routes `/api/notifications`, `/api/notifications/[id]`, `/api/notifications/mark-all-read` visibles dans la sortie
- 5 commits atomiques : 29a2da5, d4d36a9, d38f578, ad63e96 (Task 2 = generate only, pas de commit)

---
*Phase: 06-notifications-polish*
*Completed: 2026-05-11*

## Self-Check: PASSED
- FOUND: prisma/schema.prisma (model Notification + enum)
- FOUND: src/lib/notifications.ts
- FOUND: src/app/api/notifications/route.ts
- FOUND: src/app/api/notifications/[id]/route.ts
- FOUND: src/app/api/notifications/mark-all-read/route.ts
- FOUND: src/app/api/workspaces/[id]/tasks/route.ts (modifié)
- FOUND: src/app/api/workspaces/[id]/tasks/[taskId]/route.ts (modifié)
- FOUND commits: 29a2da5, d4d36a9, d38f578, ad63e96
