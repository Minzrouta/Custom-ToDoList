# Phase 2: Auth & Workspaces - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 12 new/modified files
**Analogs found:** 5 / 12 (codebase minimal — Phase 1 seulement)

---

## ALERTE CRITIQUE : Next.js 16 Breaking Change

`middleware.ts` est **déprecié** dans Next.js 16. Le fichier s'appelle maintenant `proxy.ts` et la fonction exportée doit s'appeler `proxy` (pas `middleware`).

Source : `/home/ubuntu/Custom-ToDoList/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` lignes 11-38 et lignes 756-764.

Migration automatique disponible :
```bash
npx @next/codemod@canary middleware-to-proxy .
```

**Impact direct** : Le fichier à créer est `src/proxy.ts` (pas `src/middleware.ts`), et la fonction exportée est `proxy()`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/auth.ts` | config | request-response | aucun dans le codebase | no-analog |
| `src/proxy.ts` (ex-middleware.ts) | middleware | request-response | aucun dans le codebase | no-analog |
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` (existant) | exact (extension) |
| `src/lib/prisma.ts` | utility | CRUD | `src/lib/prisma.ts` (existant) | exact (inchangé) |
| `src/app/auth/signin/page.tsx` | component | request-response | `src/app/page.tsx` | partial |
| `src/app/dashboard/page.tsx` | component | CRUD | `src/app/page.tsx` | partial |
| `src/app/workspace/[id]/page.tsx` | component | CRUD | `src/app/page.tsx` | partial |
| `src/app/api/auth/[...nextauth]/route.ts` | route | request-response | `src/app/api/health/route.ts` | role-match |
| `src/app/api/workspaces/route.ts` | route | CRUD | `src/app/api/health/route.ts` | role-match |
| `src/app/api/workspaces/[id]/route.ts` | route | CRUD | `src/app/api/health/route.ts` | role-match |
| `src/app/api/workspaces/[id]/members/route.ts` | route | CRUD | `src/app/api/health/route.ts` | role-match |
| `src/components/ui/` (Header, WorkspaceCard, etc.) | component | request-response | `src/components/providers/ThemeProvider.tsx` | partial |

---

## Pattern Assignments

### `prisma/schema.prisma` (model, CRUD — extension)

**Analog:** `prisma/schema.prisma` (lignes 1-55, fichier complet)

**Pattern existant à conserver** :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Modèles existants** (ne pas modifier, juste ajouter après) :
- `User` (lignes 11-23) — déjà compatible NextAuth (emailVerified, image)
- `Workspace` (lignes 25-35)
- `WorkspaceMember` (lignes 37-50) avec enum `Role` (OWNER | MEMBER)

**Modèles NextAuth à ajouter** (pattern officiel @auth/prisma-adapter) :
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

**Relation à ajouter dans User** :
```prisma
// Ajouter dans model User :
accounts Account[]
sessions Session[]
```

**Convention de nommage** : snake_case pour `@@map`, cuid() pour les IDs, `@updatedAt` sur les modèles applicatifs (pas sur les modèles NextAuth).

---

### `src/lib/prisma.ts` (utility — inchangé)

**Analog:** `src/lib/prisma.ts` (lignes 1-17, fichier complet)

Ce fichier n'a pas besoin d'être modifié. Le singleton PrismaClient existant est déjà correct.

**Pattern à copier pour tout nouveau fichier lib** (lignes 1-17) :
```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### `src/auth.ts` (config, request-response)

**Analog:** aucun dans le codebase — utiliser la documentation Next.js bundlée.

**Pattern d'import** (copier depuis `src/lib/prisma.ts` ligne 2) :
```typescript
// Alias @/ pour src/ — toujours utiliser cet alias
import { prisma } from "@/lib/prisma";
```

**Pattern NextAuth.js v5 (auth.js) avec Prisma adapter** :
```typescript
// src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user }) {
      // Créer les workspaces par défaut si premier login
      // Vérifier si l'user a déjà des workspaces
      if (user.id) {
        const existing = await prisma.workspaceMember.findFirst({
          where: { userId: user.id },
        });
        if (!existing) {
          const defaults = ["Boulot", "Ecole", "Perso"];
          for (const name of defaults) {
            const workspace = await prisma.workspace.create({
              data: { name },
            });
            await prisma.workspaceMember.create({
              data: {
                userId: user.id,
                workspaceId: workspace.id,
                role: "OWNER",
              },
            });
          }
        }
      }
      return true;
    },
    async session({ session, user }) {
      // Enrichir la session avec l'ID user
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
```

**Convention** : exporter `{ handlers, signIn, signOut, auth }` depuis `src/auth.ts` — c'est le point d'entrée unique pour l'authentification dans toute l'app.

---

### `src/proxy.ts` (middleware → proxy, request-response)

**IMPORTANT : Next.js 16 renomme `middleware.ts` en `proxy.ts`.**

Source officielle : `/home/ubuntu/Custom-ToDoList/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

**Analog:** aucun dans le codebase — pattern tiré de la doc Next.js 16.

**Pattern proxy.ts avec auth** (lignes 27-38 et 283-291 de la doc proxy.md) :
```typescript
// src/proxy.ts  (PAS middleware.ts — déprecié en Next.js 16)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Routes publiques — laisser passer
  const publicPaths = ["/", "/auth/signin", "/api/auth"];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Exclure : _next/static, _next/image, favicon.ico, fichiers statiques
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
```

**Règle critique** : la fonction s'appelle `proxy` (pas `middleware`) dans Next.js 16. Le fichier est `src/proxy.ts` à la racine du dossier `src/`.

---

### `src/app/api/auth/[...nextauth]/route.ts` (route, request-response)

**Analog:** `src/app/api/health/route.ts` (lignes 1-30)

**Pattern d'import** (copier depuis `src/app/api/health/route.ts` ligne 2) :
```typescript
import { prisma } from "@/lib/prisma";
```

**Pattern route handler NextAuth** (simple re-export des handlers) :
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

Note : ce fichier est délibérément minimal. Les handlers NextAuth gèrent eux-mêmes les callbacks OAuth.

---

### `src/app/api/workspaces/route.ts` (route, CRUD)

**Analog:** `src/app/api/health/route.ts` (lignes 1-30)

**Pattern imports** (copier depuis `src/app/api/health/route.ts`) :
```typescript
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
```

**Pattern error handling** (analog exact : `src/app/api/health/route.ts` lignes 16-29) :
```typescript
// Pattern try/catch + Response.json() avec status codes — TOUJOURS cette structure
try {
  // logique métier
  return Response.json({ data: result }, { status: 200 });
} catch (error) {
  console.error("[workspaces] Erreur:", error);  // log serveur uniquement
  return Response.json(
    { error: "Erreur interne" },
    { status: 500 }
  );
}
```

**Pattern vérification auth** (à placer en premier dans chaque handler) :
```typescript
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }
  // ... logique métier
}
```

**Pattern CRUD complet** :
```typescript
// src/app/api/workspaces/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/workspaces — lister les workspaces de l'user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: true },
    });
    return Response.json({ data: memberships.map((m) => m.workspace) });
  } catch (error) {
    console.error("[workspaces:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST /api/workspaces — créer un workspace
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Nom requis" }, { status: 400 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });
    return Response.json({ data: workspace }, { status: 201 });
  } catch (error) {
    console.error("[workspaces:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

---

### `src/app/api/workspaces/[id]/route.ts` (route, CRUD)

**Analog:** `src/app/api/health/route.ts` (lignes 1-30)

**Pattern params dynamiques** (Next.js 16 App Router) :
```typescript
// src/app/api/workspaces/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Helper : vérifier membership (sécurité isolation workspace)
async function requireMembership(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!member) return null;
  return member;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;  // params est une Promise en Next.js 15+
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      return Response.json({ error: "Non trouvé" }, { status: 404 });
    }

    return Response.json({ data: workspace });
  } catch (error) {
    console.error("[workspace:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name: body.name?.trim() },
    });

    return Response.json({ data: workspace });
  } catch (error) {
    console.error("[workspace:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await prisma.workspace.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[workspace:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

**Règle critique** : `params` est une `Promise` en Next.js 15+ — toujours `await params` avant d'en extraire les valeurs.

---

### `src/app/api/workspaces/[id]/members/route.ts` (route, CRUD)

**Analog:** `src/app/api/health/route.ts` (lignes 1-30) + pattern `[id]/route.ts` ci-dessus

**Pattern invitation** :
```typescript
// src/app/api/workspaces/[id]/members/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
    // Vérifier que l'user est membre du workspace
    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    });
    if (!self) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    return Response.json({ data: members });
  } catch (error) {
    console.error("[members:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

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
    // Seul l'OWNER peut inviter
    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    });
    if (!self || self.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { email } = await request.json();
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return Response.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const member = await prisma.workspaceMember.create({
      data: { userId: targetUser.id, workspaceId: id, role: "MEMBER" },
    });
    return Response.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("[members:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
```

---

### Pages (`src/app/auth/signin/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/workspace/[id]/page.tsx`)

**Analog:** `src/app/page.tsx` (lignes 1-16) + `src/app/layout.tsx` (lignes 1-42)

**Pattern structure page** (copier depuis `src/app/page.tsx` lignes 1-16) :
```typescript
// Convention : Server Component par défaut (pas de "use client")
// Ajouter "use client" UNIQUEMENT si besoin d'interactivité
export default function PageName() {
  return (
    <main className="flex min-h-screen flex-col ...">
      {/* contenu */}
    </main>
  );
}
```

**Pattern dark mode Tailwind v4** (copier depuis `src/app/layout.tsx` ligne 29 et `src/app/globals.css` lignes 3) :
```typescript
// Classes dark mode : préfixe "dark:" — configurable via next-themes (classe sur <html>)
// Exemple :
className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"

// CSS global globals.css utilise @custom-variant dark (&:where(.dark, .dark *))
// — ne pas utiliser media-query dark mode, utiliser class strategy
```

**Pattern page signin** (Server Component avec redirect si déjà connecté) :
```typescript
// src/app/auth/signin/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* Boutons OAuth — "use client" uniquement pour le composant bouton */}
    </main>
  );
}
```

**Pattern page dashboard** (Server Component avec fetch Prisma directement) :
```typescript
// src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
  });

  return (
    <main className="min-h-screen p-8">
      {/* liste des workspaces */}
    </main>
  );
}
```

---

### `src/components/ui/` (Header, WorkspaceCard, etc.)

**Analog:** `src/components/providers/ThemeProvider.tsx` (lignes 1-8)

**Pattern Client Component** (copier depuis `src/components/providers/ThemeProvider.tsx` ligne 1) :
```typescript
"use client";
// Directive obligatoire pour les composants avec onClick, useState, useRouter, etc.
```

**Pattern import cn** (copier depuis `src/lib/utils.ts`) :
```typescript
import { cn } from "@/lib/utils";
// Utility pour merger des classes Tailwind conditionnellement
// Usage : className={cn("base-classes", condition && "conditional-class")}
```

**Pattern composant UI** :
```typescript
// src/components/ui/Header.tsx
"use client";

import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: { name?: string | null; image?: string | null };
  className?: string;
}

export function Header({ user, className }: HeaderProps) {
  return (
    <header className={cn(
      "flex items-center justify-between px-6 py-4",
      "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800",
      className
    )}>
      {/* contenu */}
      <button
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      >
        Se déconnecter
      </button>
    </header>
  );
}
```

**Pattern WorkspaceCard** :
```typescript
// src/components/ui/WorkspaceCard.tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Workspace } from "@prisma/client";

interface WorkspaceCardProps {
  workspace: Workspace;
  role: "OWNER" | "MEMBER";
}

export function WorkspaceCard({ workspace, role }: WorkspaceCardProps) {
  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className={cn(
        "block p-6 rounded-lg border",
        "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
        "hover:shadow-md transition-shadow"
      )}
    >
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        {workspace.name}
      </h3>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {role === "OWNER" ? "Propriétaire" : "Membre"}
      </span>
    </Link>
  );
}
```

---

## Shared Patterns

### Pattern auth check universel
**Source:** `src/app/api/health/route.ts` (structure try/catch) + Next.js 16 auth docs
**Appliquer à:** Toutes les API routes et pages protégées

```typescript
// Dans les API routes (Server-side)
const session = await auth();
if (!session?.user?.id) {
  return Response.json({ error: "Non authentifié" }, { status: 401 });
}

// Dans les pages (Server Component)
const session = await auth();
if (!session?.user?.id) redirect("/auth/signin");
```

### Pattern error handling
**Source:** `src/app/api/health/route.ts` (lignes 17-29)
**Appliquer à:** Toutes les API routes

```typescript
try {
  // logique
  return Response.json({ data: result }, { status: 200 });
} catch (error) {
  console.error("[context:method]", error);  // log côté serveur uniquement
  return Response.json({ error: "Erreur interne" }, { status: 500 });
}
```

**Règle** (commentaire dans health/route.ts ligne 18) : ne jamais exposer les détails de l'erreur au client.

### Pattern workspace isolation
**Source:** décision CONTEXT.md + pattern requireMembership
**Appliquer à:** Toutes les API routes `/api/workspaces/[id]/**`

```typescript
// Vérifier membership AVANT toute opération sur un workspace
const member = await prisma.workspaceMember.findUnique({
  where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
});
if (!member) return Response.json({ error: "Accès refusé" }, { status: 403 });
```

### Pattern Response.json (Next.js App Router)
**Source:** `src/app/api/health/route.ts` (lignes 8-27)
**Appliquer à:** Toutes les API routes

```typescript
// TOUJOURS utiliser Response.json() (Web API native), pas NextResponse.json()
// Sauf si besoin de NextResponse spécifique (cookies, headers, redirect)
return Response.json({ data: result }, { status: 200 });
return Response.json({ error: "message" }, { status: 4XX });
```

### Pattern import alias
**Source:** `src/app/api/health/route.ts` (ligne 2), `src/app/layout.tsx` (ligne 4)
**Appliquer à:** Tous les fichiers

```typescript
// Toujours utiliser @/ (alias vers src/)
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { auth } from "@/auth";
// Jamais de chemins relatifs "../../../"
```

### Pattern params dynamiques Next.js 15+
**Source:** doc Next.js bundlée (route-handlers)
**Appliquer à:** Toutes les routes avec `[id]` dans le chemin

```typescript
// params est une Promise en Next.js 15+ — toujours await
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/auth.ts` | config | request-response | Aucune config NextAuth dans le codebase — utiliser pattern officiel next-auth v5 |
| `src/proxy.ts` | middleware | request-response | Aucun middleware/proxy existant — utiliser pattern doc Next.js 16 bundlée |

---

## Packages à installer (absents de package.json)

```bash
npm install next-auth@beta @auth/prisma-adapter
```

Vérifier la version beta compatible avec Next.js 16 avant installation.

---

## Metadata

**Analog search scope:** `/home/ubuntu/Custom-ToDoList/src/`, `/home/ubuntu/Custom-ToDoList/prisma/`, `/home/ubuntu/Custom-ToDoList/node_modules/next/dist/docs/`
**Files scanned:** 7 fichiers source + docs Next.js 16 (proxy.md, authentication.md, route-handlers.md, version-16.md)
**Pattern extraction date:** 2026-05-09
