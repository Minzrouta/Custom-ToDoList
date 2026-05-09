---
phase: "03"
plan: "04"
subsystem: tasks
tags: [taskmodal, ui, crud, subtasks, comments, inline-creation, seed]
dependency_graph:
  requires:
    - "03-01"
    - "03-02"
    - "03-03"
  provides:
    - "TaskModal complet (création/édition/suppression + sous-tâches + commentaires)"
    - "Création inline catégories et tags depuis le modal"
    - "Page workspace avec compteurs de tâches et seed catégories par défaut"
  affects:
    - src/app/workspace/[id]/list/page.tsx
    - src/app/workspace/[id]/kanban/page.tsx
    - src/app/workspace/[id]/page.tsx
tech-stack:
  added: []
  patterns:
    - "Modal overlay (fixed inset-0 + bg-black/50)"
    - "router.refresh() après mutations"
    - "Local state pour inline creation (categories/tags)"
    - "Fetch détails complets de la tâche avant édition (description, sous-tâches)"
    - "Server-side seed via prisma.upsert()"
key-files:
  created:
    - src/components/tasks/TaskModal.tsx
  modified:
    - src/components/tasks/ListPageClient.tsx
    - src/components/tasks/KanbanPageClient.tsx
    - src/app/workspace/[id]/kanban/page.tsx
    - src/app/workspace/[id]/page.tsx
decisions:
  - "Inline creation utilise des <div>+button onClick au lieu de <form nested>: éviter forms imbriqués (HTML invalide + submit conflict avec form principal)"
  - "openTask fait un GET /tasks/[id] pour récupérer description complète + sous-tâches, fallback sur données partielles si erreur réseau"
  - "Seed des catégories par défaut au chargement de /workspace/[id] via prisma.category.upsert (idempotent, exécuté côté serveur après requireMembership)"
metrics:
  duration_seconds: 326
  completed_date: 2026-05-09
---

# Phase 03 Plan 04: TaskModal complet + connexion pages + seed catégories

Plan final qui assemble la phase 3 : TaskModal complet avec création/édition/suppression, sous-tâches, commentaires et inline creation tag/catégorie ; connexion aux vues liste et kanban via wrappers client ; page workspace mise à jour avec compteurs et seed catégories par défaut.

## Résumé

Ce plan ferme la phase 3 en injectant le TaskModal dans les pages existantes et en transformant la page workspace en hub fonctionnel.

### Composants créés

- **`src/components/tasks/TaskModal.tsx`** — Modal complet avec :
  - Mode création (POST /api/workspaces/[id]/tasks)
  - Mode édition (PATCH /api/workspaces/[id]/tasks/[taskId])
  - Suppression (DELETE) avec confirmation
  - Champs : titre, description (textarea), statut, priorité, catégorie, date d'échéance, assigné, tags (multi-select toggle)
  - Section sous-tâches (ajout, toggle completed, suppression)
  - Section commentaires (chargement au mount, ajout)
  - **Création inline catégorie** (`handleCreateCategory` → POST /api/workspaces/[id]/categories) avec sélecteur de couleur — SC4 ✅
  - **Création inline tag** (`handleCreateTag` → POST /api/workspaces/[id]/tags) — SC5 ✅

### Composants mis à jour

- **`src/components/tasks/ListPageClient.tsx`** — Ajoute selectedTask state + fetch détails tâche + render conditionnel TaskModal
- **`src/components/tasks/KanbanPageClient.tsx`** — Idem, accepte maintenant categories/tags/members
- **`src/app/workspace/[id]/kanban/page.tsx`** — Charge categories/tags/members en parallèle et les passe à KanbanPageClient
- **`src/app/workspace/[id]/page.tsx`** :
  - Seed automatique des 3 catégories par défaut au chargement (Boulot #3b82f6, Ecole #22c55e, Perso #a855f7) via `prisma.category.upsert`
  - Compteurs de tâches par statut (groupBy)
  - Liens vers les vues "Liste" et "Kanban"
  - Suppression du placeholder "Phase 3"

## Catégories par défaut seedées

| Nom    | Couleur   |
| ------ | --------- |
| Boulot | `#3b82f6` |
| Ecole  | `#22c55e` |
| Perso  | `#a855f7` |

L'upsert utilise la contrainte unique `name_workspaceId` ; si une catégorie existe déjà avec ce nom dans le workspace, rien n'est modifié (update: {}).

## Success Criteria Phase 3 — État final

| ID | Critère | Statut |
| -- | ------- | ------ |
| SC1 | Création/édition de tâches via TaskModal avec tous les champs | ✅ |
| SC2 | Vue liste avec filtres + tri | ✅ (plan 02) |
| SC3 | Vue Kanban avec drag & drop entre colonnes | ✅ (plan 03) |
| SC4 | Catégories par défaut + création inline | ✅ (seed + handleCreateCategory) |
| SC5 | Tags avec création inline | ✅ (handleCreateTag) |
| SC6 | Sous-tâches (ajout, toggle, suppression) | ✅ (modal section) |
| SC7 | Commentaires (lecture, ajout) | ✅ (modal section) |

## Vérifications effectuées

- `npx tsc --noEmit` → Aucune erreur TypeScript
- `npm run build` → Succès, 8 routes statiques générées, toutes les routes API listées
- Routes vérifiées : `/workspace/[id]`, `/workspace/[id]/list`, `/workspace/[id]/kanban`, `/api/workspaces/[id]/categories`, `/api/workspaces/[id]/tags`, `/api/workspaces/[id]/tasks/[taskId]/comments`, `/api/workspaces/[id]/tasks/[taskId]/subtasks`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline creation forms ne peuvent pas être imbriqués dans le form principal du modal**

- **Found during:** Tâche 1 (création TaskModal)
- **Issue:** Le plan utilisait `<form onSubmit={handleCreateCategory}>` et `<form onSubmit={handleCreateTag}>` à l'intérieur du `<form onSubmit={handleSubmit}>` principal. Les forms imbriqués sont du HTML invalide ; React les "déballe" et le clic sur le bouton "+" déclencherait le `handleSubmit` du form principal au lieu de `handleCreateCategory`/`handleCreateTag`. Conséquence : la création inline ne fonctionnerait pas et la touche Entrée dans les champs inline soumettrait toute la tâche.
- **Fix:** Remplacé les `<form>` inline par des `<div class="flex gap-1">` + `<button type="button" onClick={handleCreateCategory|Tag}>`. Les handlers ont été conservés tels quels ; ils prennent toujours `e: React.FormEvent` mais sont maintenant déclenchés via `onClick` (TypeScript accepte FormEvent comme superset compatible avec le click event ; on appelle `e.preventDefault()` qui est valide sur tous les SyntheticEvents).
- **Files modified:** `src/components/tasks/TaskModal.tsx`
- **Commit:** (inclus dans le commit 03-04 final)

### Architectural / Out of scope

Aucun.

### Auth gates

Aucun.

## Notes techniques

- **TaskCardData → TaskModalTask** : la conversion utilise un GET /api/workspaces/[id]/tasks/[taskId] pour récupérer description, sous-tâches complètes (id/title/order), et categoryId/assigneeId. En cas d'échec réseau, on bascule sur un fallback construit à partir des données partielles disponibles dans la TaskCardData.
- **`router.refresh()`** : appelé après chaque mutation de tâche (create/update/delete) pour resynchroniser les données du server component (compteurs, listes).
- **Sécurité** : toutes les routes API utilisées vérifient `requireMembership` avant toute opération ; le seed des catégories est exécuté côté serveur après vérification du membership de l'utilisateur courant.

## Build final

```
✓ Compiled successfully in 10.8s
✓ Finished TypeScript in 13.6s
✓ Generating static pages using 7 workers (8/8) in 987ms
```

## Self-Check: PASSED

- src/components/tasks/TaskModal.tsx → FOUND
- src/components/tasks/ListPageClient.tsx → FOUND (modifié)
- src/components/tasks/KanbanPageClient.tsx → FOUND (modifié)
- src/app/workspace/[id]/kanban/page.tsx → FOUND (modifié)
- src/app/workspace/[id]/page.tsx → FOUND (modifié)
- npx tsc --noEmit → no errors
- npm run build → success
