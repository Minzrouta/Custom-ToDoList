---
phase: 03-core-task-management
plan: "03"
subsystem: ui
tags: [dnd-kit, react, nextjs, kanban, drag-and-drop, optimistic-update]

requires:
  - phase: 03-01
    provides: API PATCH /api/workspaces/[id]/tasks/[taskId] pour mise à jour du statut

provides:
  - KanbanColumn (useDroppable + DraggableTaskCard wrapper)
  - KanbanBoard (DndContext + handleDragEnd + optimistic update + rollback)
  - Page server /workspace/[id]/kanban (auth + membership + Prisma tasks grouped by status)
  - KanbanPageClient (wrapper client pour injection TaskModal en plan 04)
  - TaskCard stub avec interface TaskCardData (compatible plan 03-02)

affects:
  - plan-03-04 (TaskModal injection dans KanbanPageClient)
  - plan-03-02 (TaskCard.tsx doit exporter TaskCardData avec la même interface)

tech-stack:
  added:
    - "@dnd-kit/core ^6.3.1"
    - "@dnd-kit/sortable ^10.0.0"
  patterns:
    - "Optimistic update + rollback : setTasks(optimistic) → fetch PATCH → rollback si erreur"
    - "useDroppable dans KanbanColumn, useDraggable dans DraggableTaskCard wrapper"
    - "KanbanPageClient : wrapper client séparant état modal de la page server"
    - "Sérialisation Prisma → TaskCardData : dates .toISOString() pour serialization"

key-files:
  created:
    - src/components/tasks/KanbanColumn.tsx
    - src/components/tasks/KanbanBoard.tsx
    - src/components/tasks/KanbanPageClient.tsx
    - src/components/tasks/TaskCard.tsx
    - src/app/workspace/[id]/kanban/page.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "TaskCard stub créé dans ce worktree pour permettre la validation TypeScript — le plan 03-02 livrera l'implémentation complète, le merge final convergera"
  - "KanbanPageClient créé comme wrapper client pour préparer l'injection du TaskModal en plan 04 — évite la restriction 'functions cannot be passed from Server to Client Components'"
  - "Sérialisation explicite des dates Prisma en ISO strings dans la page server — évite les erreurs de serialization avec les objets Date côté client"

patterns-established:
  - "KanbanPageClient pattern: wrapper client entre Server Component et composants interactifs nécessitant état modal"

requirements-completed:
  - FR-06

duration: 18min
completed: 2026-05-09
---

# Phase 03 Plan 03: KanbanBoard + KanbanColumn Summary

**Vue Kanban drag & drop avec @dnd-kit/core, 4 colonnes par statut, mise à jour optimiste via PATCH API, et page server protégée /workspace/[id]/kanban**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-09T00:00:00Z
- **Completed:** 2026-05-09T00:18:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Installation de `@dnd-kit/core` et `@dnd-kit/sortable` dans le projet
- KanbanColumn : zone droppable (`useDroppable`) avec DraggableTaskCard wrapper (`useDraggable`), highlighting visuel au survol
- KanbanBoard : `DndContext` avec `PointerSensor` (activation distance 8px), handleDragEnd avec mise à jour optimiste + rollback sur erreur réseau, bouton "+ Nouvelle tâche"
- Page server `/workspace/[id]/kanban` : auth + membership check + fetch Prisma tâches groupées par statut, breadcrumb, lien "Vue liste"
- KanbanPageClient : wrapper client pour préparer l'injection du TaskModal (plan 04)
- `npm run build` et `npx tsc --noEmit` passent sans erreur

## Task Commits

1. **Tâche 1 : dnd-kit + KanbanColumn + KanbanBoard** - `24c0ebd` (feat)
2. **Tâche 2 : Page /workspace/[id]/kanban** - `6a8f544` (feat)

**Plan metadata :** (docs commit à venir)

## Files Created/Modified

- `src/components/tasks/KanbanColumn.tsx` — colonne droppable avec DraggableTaskCard wrapper, header avec badge count, zone drop highlighting
- `src/components/tasks/KanbanBoard.tsx` — DndContext avec PointerSensor, 4 colonnes COLUMNS, handleDragEnd optimistic update + rollback, barre d'actions
- `src/components/tasks/KanbanPageClient.tsx` — wrapper client entre page server et KanbanBoard, point d'injection pour TaskModal plan 04
- `src/components/tasks/TaskCard.tsx` — stub avec interface `TaskCardData` complète (id, title, status, priority, dueDate, category, assignee, tags, subtasksCount, commentsCount), composant basique fonctionnel
- `src/app/workspace/[id]/kanban/page.tsx` — page server protégée, fetch Prisma avec relations, sérialisation dates ISO, groupage par statut
- `package.json` + `package-lock.json` — ajout @dnd-kit/core + @dnd-kit/sortable

## Decisions Made

- **TaskCard stub** : TaskCard.tsx n'étant pas encore livré (plan 03-02 en parallèle), un stub avec l'interface `TaskCardData` complète a été créé pour permettre la validation TypeScript. Le merge final fusionnera les deux implémentations. L'interface est conçue pour être compatible avec le plan 03-02.
- **KanbanPageClient** : Créé pour contourner la restriction Next.js qui empêche de passer des fonctions depuis un Server Component vers un Client Component. Ce wrapper recevra le TaskModal en plan 04.
- **Sérialisation dates** : Les dates Prisma sont converties en ISO strings dans la page server avant d'être passées au client, évitant les erreurs de serialization avec les objets Date.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Création du KanbanPageClient wrapper**
- **Found during :** Tâche 2 (page kanban)
- **Issue :** Passer `onOpenTask` comme prop fonction directement dans un Server Component vers `KanbanBoard` (Client Component) aurait causé une erreur TypeScript/Next.js de serialization
- **Fix :** Créé `KanbanPageClient.tsx` comme wrapper client — la page server passe des données sérialisables, le client gère l'état
- **Files modified :** src/components/tasks/KanbanPageClient.tsx, src/app/workspace/[id]/kanban/page.tsx
- **Verification :** Build passe sans erreur
- **Committed in :** 6a8f544 (Task 2 commit)

**2. [Rule 3 - Blocking] Création du stub TaskCard.tsx**
- **Found during :** Tâche 1 (KanbanColumn/KanbanBoard)
- **Issue :** `@/components/tasks/TaskCard` n'existe pas encore (plan 03-02 en parallèle) — TypeScript échoue à la compilation
- **Fix :** Stub minimal créé avec interface `TaskCardData` complète et composant fonctionnel basique
- **Files modified :** src/components/tasks/TaskCard.tsx
- **Verification :** `npx tsc --noEmit` passe sans erreur
- **Committed in :** 24c0ebd (Task 1 commit)

---

**Total deviations :** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan :** Les deux auto-fixes sont nécessaires pour la compilation. Pas de scope creep — l'interface TaskCardData est conçue pour être identique à celle du plan 03-02.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `TaskCard` (composant basique) | `src/components/tasks/TaskCard.tsx` | entier | Plan 03-02 livre l'implémentation complète — ce stub a l'interface correcte mais le rendu visuel minimal. Le merge du plan 03-02 remplacera ce fichier. |

## Issues Encountered

Aucun problème bloquant. Le build a passé du premier coup après création du stub TaskCard.

## User Setup Required

Aucun — pas de configuration externe requise pour ce plan.

## Next Phase Readiness

- Architecture prête pour plan 04 (TaskModal) : `KanbanPageClient` a le point d'injection `{/* TaskModal sera ajouté ici en plan 04 */}`
- Le fichier `TaskCard.tsx` dans ce worktree sera remplacé lors du merge par l'implémentation complète du plan 03-02
- La page `/workspace/[id]/kanban` est fonctionnelle et protégée

---
*Phase: 03-core-task-management*
*Completed: 2026-05-09*
