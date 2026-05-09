# Phase 3: Core Task Management - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` (existant) | exact — extension |
| `src/app/api/workspaces/[id]/tasks/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/members/route.ts` | exact |
| `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/route.ts` | exact |
| `src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/members/route.ts` | role-match |
| `src/app/api/workspaces/[id]/tasks/[taskId]/comments/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/members/route.ts` | role-match |
| `src/app/api/workspaces/[id]/categories/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/members/route.ts` | role-match |
| `src/app/api/workspaces/[id]/tags/route.ts` | route | CRUD | `src/app/api/workspaces/[id]/members/route.ts` | role-match |
| `src/app/workspace/[id]/page.tsx` | page (server) | request-response | `src/app/workspace/[id]/page.tsx` (existant) | exact — modification |
| `src/app/workspace/[id]/list/page.tsx` | page (server) | request-response | `src/app/workspace/[id]/page.tsx` | exact |
| `src/app/workspace/[id]/kanban/page.tsx` | page (server) | request-response | `src/app/workspace/[id]/page.tsx` | exact |
| `src/components/tasks/TaskModal.tsx` | component | request-response | `src/components/ui/CreateWorkspaceModal.tsx` | exact |
| `src/components/tasks/TaskCard.tsx` | component | request-response | `src/components/ui/WorkspaceCard.tsx` | exact |
| `src/components/tasks/KanbanBoard.tsx` | component | event-driven | `src/components/ui/WorkspaceActions.tsx` | role-match |
| `src/components/tasks/KanbanColumn.tsx` | component | event-driven | `src/components/ui/WorkspaceActions.tsx` | role-match |
| `src/components/tasks/ListView.tsx` | component | request-response | `src/components/ui/WorkspaceCard.tsx` | role-match |
| `src/components/tasks/FilterBar.tsx` | component | event-driven | `src/components/ui/DashboardActions.tsx` | role-match |

---

## Pattern Assignments

### `prisma/schema.prisma` (extension du schéma existant)

**Analog:** `prisma/schema.prisma` lignes 1-97

**Pattern enum existant** (lignes 54-57) — copier ce style pour les nouveaux enums :
```prisma
enum Role {
  OWNER
  MEMBER
}
```

**Pattern model avec relations** (lignes 39-52) — copier ce style (@@unique, @@map, onDelete: Cascade) :
```prisma
model WorkspaceMember {
  id       String   @id @default(cuid())
  role     Role     @default(MEMBER)
  joinedAt DateTime @default(now())

  userId      String
  workspaceId String

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@map("workspace_members")
}
```

**Pattern model simple** (lignes 27-37) — copier pour Category/Tag :
```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members WorkspaceMember[]

  @@map("workspaces")
}
```

**Nouveaux enums à ajouter** :
```prisma
enum TaskStatus {
  todo
  in_progress
  done
  cancelled
}

enum Priority {
  low
  medium
  high
  urgent
}
```

**Ajout de relations sur User et Workspace** — ajouter dans les modèles existants :
```prisma
// Dans model User — ajouter :
tasks        Task[]    @relation("AssignedTasks")
createdTasks Task[]    @relation("CreatedTasks")
comments     Comment[]

// Dans model Workspace — ajouter :
tasks      Task[]
categories Category[]
tags       Tag[]
```

---

### `src/app/api/workspaces/[id]/tasks/route.ts` (route, CRUD — GET liste + POST)

**Analog:** `src/app/api/workspaces/[id]/members/route.ts`

**Imports pattern** (lignes 1-3) :
```typescript
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
```

**Auth + requireMembership pattern** (lignes 6-24) — à appliquer en tête de chaque handler :
```typescript
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    });
    if (!self) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    // ... suite
  } catch (error) {
    console.error("[tasks:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

**Paramètres de filtre via URL** — lire depuis `request.nextUrl.searchParams` (nouveau pour cette route) :
```typescript
const { searchParams } = new URL(request.url);
const status = searchParams.get("status") ?? undefined;
const priority = searchParams.get("priority") ?? undefined;
const categoryId = searchParams.get("categoryId") ?? undefined;
const tagId = searchParams.get("tagId") ?? undefined;
const assigneeId = searchParams.get("assigneeId") ?? undefined;
```

**Pattern POST avec validation** (lignes 41-108 de members/route.ts) :
```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    // ... requireMembership ...
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const item = await prisma.someModel.create({ data: { ... } });
    return Response.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[tasks:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

---

### `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` (route, CRUD — GET/PATCH/DELETE)

**Analog:** `src/app/api/workspaces/[id]/route.ts`

**Pattern double param** (lignes 52-95 de workspace [id]/route.ts) — même structure mais avec deux params dynamiques :
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    // validation des champs modifiables...

    const task = await prisma.task.update({
      where: { id: taskId, workspaceId: id },
      data: { /* champs mis à jour */ },
    });

    return Response.json({ data: task });
  } catch (error) {
    console.error("[task:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

**Pattern DELETE** (lignes 97-123 de workspace [id]/route.ts) :
```typescript
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  // ... auth + requireMembership ...
  await prisma.task.delete({ where: { id: taskId, workspaceId: id } });
  return Response.json({ success: true });
}
```

---

### `src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/route.ts` (route, CRUD)

**Analog:** `src/app/api/workspaces/[id]/members/route.ts`

Même pattern que tasks/route.ts avec params `{ id, taskId }`. La route PATCH pour toggle `completed` d'une sous-tâche spécifique nécessitera un troisième segment `[subId]` :
```typescript
// Pattern params triple niveau
{ params }: { params: Promise<{ id: string; taskId: string; subId: string }> }
const { id, taskId, subId } = await params;
```

---

### `src/app/api/workspaces/[id]/tasks/[taskId]/comments/route.ts` (route, CRUD)

**Analog:** `src/app/api/workspaces/[id]/members/route.ts`

Même pattern GET/POST. Le GET inclut `include: { author: { select: { id, name, image } } }` pour afficher l'auteur. L'auteur est toujours `session.user.id` (pas de champ assignable).

---

### `src/app/api/workspaces/[id]/categories/route.ts` et `tags/route.ts` (routes, CRUD)

**Analog:** `src/app/api/workspaces/[id]/members/route.ts`

Structure identique : GET liste filtrée par `workspaceId`, POST création avec validation du `name`. Pas de restriction OWNER (tout membre peut créer des catégories/tags).

---

### `src/app/workspace/[id]/page.tsx` (page server — modification)

**Analog:** `src/app/workspace/[id]/page.tsx` (le fichier lui-même, lignes 1-120)

**Pattern auth + redirect** (lignes 1-18) :
```typescript
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: id },
    },
    include: { workspace: { include: { members: { include: { user: { select: { id: true, name: true, email: true, image: true } } }, orderBy: { joinedAt: "asc" } } } } },
  });

  if (!membership) notFound();
```

**Pattern layout page** (lignes 44-119) — structure div.min-h-screen + Header + main.max-w :
```typescript
return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
    <Header user={session.user} />
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* breadcrumb + title */}
      {/* sections cards */}
    </main>
  </div>
);
```

**Pattern section card** (lignes 71-109) :
```typescript
<section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
    Titre section
  </h2>
  {/* contenu */}
</section>
```

La page doit ajouter des liens vers `/workspace/[id]/list` et `/workspace/[id]/kanban`, remplacer le placeholder "Phase 3" par un résumé des tâches, et passer les données nécessaires aux composants client.

---

### `src/app/workspace/[id]/list/page.tsx` (page server)

**Analog:** `src/app/workspace/[id]/settings/page.tsx`

**Pattern page server avec fetch Prisma** (lignes 1-59 de settings/page.tsx) — même structure auth + await params + notFound + layout :
```typescript
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import Link from "next/link";

export default async function WorkspaceListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    include: { workspace: true },
  });

  if (!membership) notFound();
  // Fetch tasks, categories, tags, members
  // Pass to <ListView> client component
```

**Pattern breadcrumb nav** (lignes 32-47 de settings/page.tsx) :
```typescript
<nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
  <Link href="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">
    Mes workspaces
  </Link>
  {" / "}
  <Link href={`/workspace/${id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
    {membership.workspace.name}
  </Link>
  {" / "}
  <span>Liste</span>
</nav>
```

---

### `src/app/workspace/[id]/kanban/page.tsx` (page server)

**Analog:** `src/app/workspace/[id]/list/page.tsx` (même structure)

Identique à list/page.tsx — charge les tâches groupées par statut, passe `{ todo: Task[], in_progress: Task[], done: Task[], cancelled: Task[] }` au composant `<KanbanBoard>` client.

---

### `src/components/tasks/TaskModal.tsx` (component, request-response)

**Analog:** `src/components/ui/CreateWorkspaceModal.tsx`

**Imports + "use client"** (lignes 1-5 de CreateWorkspaceModal.tsx) :
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
```

**Pattern état du formulaire** (lignes 12-15) :
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const router = useRouter();
```

**Pattern fetch POST + gestion erreur** (lignes 17-44) :
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status, priority, /* ... */ }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la création");
      return;
    }

    router.refresh();
    onClose();
  } catch {
    setError("Erreur réseau");
  } finally {
    setLoading(false);
  }
}
```

**Pattern overlay modal** (lignes 46-99 de CreateWorkspaceModal.tsx) :
```typescript
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/50"
      onClick={onClose}
      aria-hidden="true"
    />
    <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {task ? "Modifier la tâche" : "Nouvelle tâche"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* champs */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  </div>
);
```

**Pattern input** (ligne 74 de CreateWorkspaceModal.tsx) — à réutiliser pour chaque champ :
```typescript
className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
```

---

### `src/components/tasks/TaskCard.tsx` (component, request-response)

**Analog:** `src/components/ui/WorkspaceCard.tsx`

**Imports + interface** (lignes 1-14 de WorkspaceCard.tsx) :
```typescript
"use client";

import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: Date | null;
    category?: { name: string; color: string } | null;
    assignee?: { name: string | null; image: string | null } | null;
  };
  onClick: () => void;
}
```

**Pattern cn() pour classes conditionnelles** (lignes 20-25 de WorkspaceCard.tsx) :
```typescript
className={cn(
  "block p-4 rounded-xl border transition-all duration-200",
  "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
  "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
  priority === "urgent" && "border-l-4 border-l-red-500"
)}
```

**Pattern badge rôle** (lignes 32-40 de WorkspaceCard.tsx) — à réutiliser pour priority et status :
```typescript
<span
  className={cn(
    "text-xs px-2 py-0.5 rounded-full font-medium",
    priority === "urgent"
      ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
      : priority === "high"
      ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
  )}
>
  {priority}
</span>
```

---

### `src/components/tasks/KanbanBoard.tsx` (component, event-driven)

**Analog:** `src/components/ui/WorkspaceActions.tsx` (gestion d'état local + callbacks)

**Imports "use client" + useState** (lignes 1-6 de WorkspaceActions.tsx) :
```typescript
"use client";

import { useState } from "react";
```

**Pattern état + callback vers API** — KanbanBoard gère le drag end et appelle PATCH :
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface KanbanBoardProps {
  workspaceId: string;
  initialTasks: Record<string, Task[]>;
}

export function KanbanBoard({ workspaceId, initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const router = useRouter();

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.status === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Optimistic update
    setTasks(prev => { /* ... déplacer tâche entre colonnes */ });

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // rollback optimistic update
      setTasks(initialTasks);
    }
  }
  // ...
}
```

---

### `src/components/tasks/KanbanColumn.tsx` (component, event-driven)

**Analog:** `src/components/ui/WorkspaceCard.tsx` (carte rendue dans une liste)

Composant simple qui reçoit `{ status, tasks, onTaskClick }`, utilise `useDroppable` de `@dnd-kit/core`, affiche une liste de `<TaskCard>`. Pattern Tailwind identique aux sections cards des pages server.

---

### `src/components/tasks/ListView.tsx` (component, request-response)

**Analog:** Dashboard memberships list dans `src/app/dashboard/page.tsx` (lignes 40-57)

**Pattern liste conditionnelle** (lignes 40-57 de dashboard/page.tsx) :
```typescript
{items.length === 0 ? (
  <div className="text-center py-16 text-gray-500 dark:text-gray-400">
    <p className="text-lg mb-2">Aucune tâche.</p>
  </div>
) : (
  <div className="space-y-2">
    {tasks.map((task) => (
      <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
    ))}
  </div>
)}
```

ListView est un composant client (`"use client"`) qui reçoit les tâches initiales comme props (passées depuis la page server) et maintient l'état du filtre localement.

---

### `src/components/tasks/FilterBar.tsx` (component, event-driven)

**Analog:** `src/components/ui/DashboardActions.tsx` (boutons d'action client)

Composant client léger avec `useState` pour chaque filtre actif. Expose des callbacks `onFilterChange`. Pattern select/button identique aux autres composants UI existants :
```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  onFilterChange: (filters: TaskFilters) => void;
  categories: { id: string; name: string; color: string }[];
  members: { id: string; name: string | null }[];
}
```

---

## Shared Patterns

### Auth check — toutes les routes API
**Source:** `src/app/api/workspaces/[id]/route.ts` lignes 13-19
```typescript
const session = await auth();
if (!session?.user?.id) {
  return Response.json({ error: "Non authentifié" }, { status: 401 });
}
```

### requireMembership — toutes les routes API sous `/[id]/`
**Source:** `src/app/api/workspaces/[id]/route.ts` lignes 6-10
```typescript
async function requireMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}
```
**Note :** Ce helper est actuellement dupliqué dans chaque fichier de route. Pour les routes tasks, le context suggère de l'extraire dans `src/lib/auth-helpers.ts` pour éviter la répétition sur 6+ fichiers.

### await params — toutes les routes dynamiques et pages server
**Source:** `src/app/api/workspaces/[id]/route.ts` ligne 23
```typescript
const { id } = await params;
```
Obligatoire dans Next.js App Router — params est une Promise.

### Response.json() — toutes les routes API (pas NextResponse)
**Source:** `src/app/api/workspaces/[id]/route.ts` lignes 19, 44, 47
```typescript
return Response.json({ data: result });
return Response.json({ error: "Message" }, { status: 400 });
return Response.json({ data: item }, { status: 201 });
```

### Error handling try/catch — toutes les routes API
**Source:** `src/app/api/workspaces/[id]/route.ts` lignes 22-48
```typescript
try {
  // ...
} catch (error) {
  console.error("[tag:POST]", error);
  return Response.json({ error: "Erreur interne" }, { status: 500 });
}
```
Convention nommage : `[entité:MÉTHODE]` dans le console.error.

### Tailwind dark mode — tous les composants UI
**Source:** `src/components/ui/CreateWorkspaceModal.tsx` lignes 53, 74
Pattern `bg-white dark:bg-gray-900`, `text-gray-900 dark:text-gray-100`, `border-gray-200 dark:border-gray-700`. Tailwind v4 CSS-first, pas de config `darkMode: 'class'` à ajouter.

### cn() pour classes conditionnelles — tous les composants
**Source:** `src/lib/utils.ts` + `src/components/ui/WorkspaceCard.tsx` lignes 20-25
```typescript
import { cn } from "@/lib/utils";
// usage : className={cn("base", condition && "conditional")}
```

### Fetch côté client + router.refresh()
**Source:** `src/components/ui/CreateWorkspaceModal.tsx` lignes 17-44
```typescript
const router = useRouter();
// Après succès :
router.refresh();
onClose();
```
`router.refresh()` revalide les données server sans navigation complète — pattern standard dans ce projet.

### Auth redirect dans pages server
**Source:** `src/app/workspace/[id]/page.tsx` lignes 15-16
```typescript
const session = await auth();
if (!session?.user?.id) redirect("/auth/signin");
```

### notFound() pour accès interdit dans pages server
**Source:** `src/app/workspace/[id]/page.tsx` ligne 40
```typescript
if (!membership) notFound();
```
Renvoie une 404 — utilisé quand l'utilisateur n'est pas membre (pas de 401 côté page, la redirection auth suffit).

---

## No Analog Found

Aucun fichier sans analog — tous les patterns sont couverts par les existants. Les seuls nouveaux patterns purs sont liés à `@dnd-kit` (KanbanBoard/Column), qui n'a pas d'analog dans le projet mais est documenté dans RESEARCH.md.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/tasks/KanbanBoard.tsx` (dnd-kit) | component | event-driven | Aucun drag & drop existant — utiliser la doc `@dnd-kit/core` + pattern fetch PATCH de WorkspaceSettingsForm |
| `src/components/tasks/KanbanColumn.tsx` (useDroppable) | component | event-driven | Idem |

---

## Metadata

**Analog search scope:** `src/app/api/`, `src/app/workspace/`, `src/components/ui/`, `prisma/`, `src/lib/`
**Files scanned:** 15
**Pattern extraction date:** 2026-05-09
