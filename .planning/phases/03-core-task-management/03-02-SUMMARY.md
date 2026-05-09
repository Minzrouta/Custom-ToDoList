---
phase: 03-core-task-management
plan: "02"
subsystem: task-ui-list
tags: [react, nextjs, tailwind, task-management, server-component, client-component]
dependency_graph:
  requires: [03-01]
  provides: [TaskCard, FilterBar, ListView, ListPageClient, page-list]
  affects: [03-03, 03-04]
tech_stack:
  added: []
  patterns: [use-client, await-params, auth-redirect, cn-utils, dark-mode-tailwind, server-component-data-fetch]
key_files:
  created:
    - src/components/tasks/TaskCard.tsx
    - src/components/tasks/FilterBar.tsx
    - src/components/tasks/ListView.tsx
    - src/components/tasks/ListPageClient.tsx
    - src/app/workspace/[id]/list/page.tsx
  modified: []
decisions:
  - "ListPageClient créé comme wrapper client intermédiaire — évite les callbacks inline dans Server Component, prêt pour injection TaskModal en plan 04"
  - "Correction de la comparaison de filtre par référence — remplacée par hasActiveFilters() qui compare les valeurs"
  - "TaskCardData expose category.id comme optionnel pour compatibilité Kanban (plan 03)"
metrics:
  duration: "~10min"
  completed: "2026-05-09"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 3 Plan 02: Vue Liste — TaskCard, FilterBar, ListView, page /workspace/[id]/list — Summary

**One-liner:** Vue liste complète avec filtres client-side, TaskCard réutilisable (badges couleur priorité/statut/catégorie/tags/assignee), page server protégée chargeant tâches+catégories+tags+membres en parallèle.

## What Was Built

### src/components/tasks/TaskCard.tsx

Composant `"use client"` exportant `TaskCard` et l'interface `TaskCardData`.

Affiche :
- Titre (barré + opacité 60% si annulé)
- Badge priorité coloré (gris/bleu/orange/rouge) + badge statut
- Bordure gauche rouge si `urgent`
- Badge catégorie en couleur hex via `style.backgroundColor`
- Tags sous forme de `#nom` (badges gris)
- Due date en rouge si dépassée et non terminée
- Compteur sous-tâches `X/Y`
- Compteur commentaires
- Avatar assignee (image ou initiale sur fond bleu)

L'interface `TaskCardData` est compatible avec les données Prisma de l'API tasks (plan 03-01) et sera réutilisée directement par le KanbanBoard (plan 03-03).

### src/components/tasks/FilterBar.tsx

Composant `"use client"` exportant `FilterBar` et l'interface `TaskFilters`.

Sélecteurs :
- Statut (4 valeurs)
- Priorité (4 valeurs, ordre urgence décroissante)
- Catégorie (conditionnel si categories.length > 0)
- Tag (conditionnel si tags.length > 0)
- Assignee (conditionnel si members.length > 1)
- Bouton "Réinitialiser" (visible seulement si filtres actifs)
- Bouton "+ Nouvelle tâche" (poussé à droite via flex-1)

### src/components/tasks/ListView.tsx

Composant `"use client"` exportant `ListView`.

Gère le state des filtres en interne (`useState<TaskFilters>`). Filtre les tâches côté client sur les 5 dimensions. Affiche un état vide adaptatif (liste vide vs filtres actifs). Compteur de tâches en bas à droite.

### src/components/tasks/ListPageClient.tsx

Wrapper `"use client"` créé pour éviter le problème de callback `onOpenTask` dans un Server Component. Gère le `selectedTask` state (undefined = fermé, null = nouvelle tâche, TaskCardData = édition). Le TaskModal sera ajouté ici en plan 04.

### src/app/workspace/[id]/list/page.tsx

Page server (`async function`). Protection auth + `notFound()` si non-membre. Charge en parallèle via `Promise.all` :
- tâches avec toutes les relations (category, assignee, tags, subtasks.completed, _count.comments)
- catégories du workspace
- tags du workspace
- membres du workspace

Utilise `ListPageClient` pour rendre la partie interactive. Breadcrumb avec liens workspace. Lien "Vue Kanban" vers `/workspace/[id]/kanban`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comparaison de référence dans l'état vide de ListView**
- **Found during:** Tâche 2, écriture de ListView
- **Issue:** Le plan comparait `filters !== INITIAL_FILTERS` (comparaison de référence objet, toujours `true` après setState)
- **Fix:** Remplacement par `hasActiveFilters(filters)` qui compare les valeurs de chaque champ
- **Files modified:** src/components/tasks/ListView.tsx
- **Commit:** 721f3c1

**2. [Rule 2 - Architecture] Création de ListPageClient**
- **Found during:** Tâche 2, tentative d'inliner un callback dans la Server Page
- **Issue:** La page server ne peut pas passer un callback `onOpenTask` qui gère du state React
- **Fix:** Création de `ListPageClient.tsx` comme préconisé dans la note "alternative propre" du plan
- **Files modified:** src/components/tasks/ListPageClient.tsx (nouveau), page.tsx utilise ListPageClient
- **Commit:** 721f3c1

## Known Stubs

**ListPageClient — modal state non câblé**
- Fichier : `src/components/tasks/ListPageClient.tsx`
- State `selectedTask` défini mais pas utilisé pour ouvrir un modal (intentionnel — plan 04 injecte le TaskModal)
- Le bouton "+ Nouvelle tâche" et le click sur une carte sont fonctionnels côté state mais n'ouvrent rien visuellement

Ce stub est intentionnel et documenté. Plan 04 (TaskModal) câblera ce state.

## Threat Surface

T-03-07 mitigé : vérification membership avant tout fetch Prisma dans la page server. Isolation workspace garantie par `where: { workspaceId: id }` sur toutes les requêtes.

## Build Status

`npm run build` : succès. Page `/workspace/[id]/list` listée comme `ƒ (Dynamic)` dans la sortie.

## Self-Check: PASSED

Fichiers vérifiés :
- src/components/tasks/TaskCard.tsx : présent, exporte TaskCard + TaskCardData
- src/components/tasks/FilterBar.tsx : présent, exporte FilterBar + TaskFilters
- src/components/tasks/ListView.tsx : présent, exporte ListView
- src/components/tasks/ListPageClient.tsx : présent, exporte ListPageClient
- src/app/workspace/[id]/list/page.tsx : présent, default export WorkspaceListPage
- Commit 87ec3a0 : TaskCard
- Commit 721f3c1 : FilterBar + ListView + ListPageClient + page list
- `npx tsc --noEmit` : aucune erreur
- `npm run build` : succès
