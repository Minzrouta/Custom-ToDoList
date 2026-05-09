# Phase 3: Core Task Management - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous workflow)

<domain>
## Phase Boundary

Implémenter le CRUD complet des tâches avec tous leurs champs (titre, description markdown, statut, priorité, catégorie, tags, assignee, due date, sous-tâches, commentaires), les vues Kanban (drag & drop) et Liste (filtres/tri).

Ce que cette phase livre :
- Schema Prisma : Task, Category, Tag, SubTask, Comment (+ relations)
- Catégories par défaut (Boulot, Ecole, Perso) créées automatiquement par workspace
- Tags libres créables et assignables à plusieurs tâches
- CRUD tâches complet via API routes
- Vue Liste filtrée/triée (statut, priorité, catégorie, tag, assignee)
- Vue Kanban drag & drop par statut (todo/in_progress/done/cancelled)
- Modal création/édition tâche complète

</domain>

<decisions>
## Implementation Decisions

### Schema Prisma — nouveaux modèles
- **Task** : title, description (markdown), status (enum), priority (enum), dueDate, workspaceId, categoryId (nullable), assigneeId (nullable), createdById, createdAt, updatedAt
- **Category** : name, color, workspaceId (catégories par workspace)
- **Tag** : name, workspaceId (tags par workspace)
- **TaskTag** : table de jointure Task ↔ Tag (many-to-many)
- **SubTask** : title, completed, taskId, order
- **Comment** : content, taskId, authorId, createdAt

### Enums
- **TaskStatus** : `todo` | `in_progress` | `done` | `cancelled`
- **Priority** : `low` | `medium` | `high` | `urgent`

### Catégories par défaut
- Créées automatiquement au moment de la création d'un workspace (via callback NextAuth ou API)
- Noms : "Boulot" (bleu), "Ecole" (vert), "Perso" (violet) — couleurs en hex
- Ou créées en Phase 3 lors de la navigation vers un workspace

### API Routes
- `GET/POST /api/workspaces/[id]/tasks` — liste avec filtres + création
- `GET/PATCH/DELETE /api/workspaces/[id]/tasks/[taskId]` — détail/édition/suppression
- `GET/POST /api/workspaces/[id]/categories` — CRUD catégories
- `GET/POST /api/workspaces/[id]/tags` — CRUD tags
- `POST /api/workspaces/[id]/tasks/[taskId]/subtasks` — créer sous-tâche
- `PATCH /api/workspaces/[id]/tasks/[taskId]/subtasks/[subId]` — toggle sous-tâche
- `GET/POST /api/workspaces/[id]/tasks/[taskId]/comments` — commentaires

### Vue Liste
- Filtres : statut, priorité, catégorie, tag, assignee
- Tri : dueDate, priority, createdAt
- Composant client avec URL search params pour persistance

### Vue Kanban
- Bibliothèque : `@dnd-kit/core` + `@dnd-kit/sortable` (compatible React 18+, Next.js App Router)
- Colonnes : todo, in_progress, done, cancelled
- Drag & drop entre colonnes → PATCH statut via API
- Pas de tri au sein d'une colonne en v1

### Modal tâche
- Ouverture en overlay (pas de navigation)
- Formulaire : tous les champs Task
- Description en markdown (textarea simple en v1, pas d'éditeur riche)
- Sélection catégorie + tags multi-select
- Assignee parmi les membres du workspace

### Isolation
- Toutes les routes vérifient l'appartenance au workspace via `requireMembership`
- Pattern déjà en place depuis Phase 2

</decisions>

<code_context>
## Existing Code Insights

### Phase 2 deliverables (base)
- NextAuth v5, PrismaAdapter, `src/auth.ts`, `src/proxy.ts`
- API routes workspaces avec `requireMembership()` dans `[id]/route.ts`
- Workspaces, WorkspaceMember, User, Account, Session dans schema Prisma
- `src/lib/prisma.ts` : singleton PrismaClient
- Tailwind v4 CSS-first dark mode
- `Response.json()` pattern (pas NextResponse)
- `await params` dans routes dynamiques

### Integration Points
- `requireMembership()` existant dans `src/app/api/workspaces/[id]/route.ts` — à extraire dans `src/lib/auth-helpers.ts` si utilisé dans les routes tasks
- Auth check via `import { auth } from "@/auth"`

</code_context>

<specifics>
## Specific Ideas

- Couleurs des catégories en badges colorés sur les tâches dans la vue liste et kanban
- Priorité avec indicateur visuel (couleur/icône)
- Due date en rouge si dépassée
- Assignee avec avatar dans la tâche

</specifics>

<deferred>
## Deferred Ideas

- Éditeur markdown riche (MDX editor) — v2
- Tri au sein des colonnes Kanban — v2
- Récurrence de tâches — hors scope
- Attachements fichiers — hors scope
- Activité / historique d'une tâche — v2

</deferred>
