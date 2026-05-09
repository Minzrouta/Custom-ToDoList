# Phase 2: Auth & Workspaces - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous workflow — decisions from REQUIREMENTS.md + project decisions)

<domain>
## Phase Boundary

Implémenter l'authentification OAuth (Google + GitHub) via NextAuth.js v5, la gestion des workspaces avec membres et rôles, et la protection des routes. Cette phase fournit la base d'identité et d'isolation sur laquelle toutes les phases suivantes s'appuient.

Ce que cette phase livre :
- Login OAuth Google + GitHub fonctionnel (session, profil)
- Workspaces par défaut créés automatiquement au premier login (Boulot, Ecole, Perso)
- CRUD workspaces : créer, renommer, supprimer
- Invitation d'autres users dans un workspace par email
- Rôles Owner / Member dans un workspace
- Routes protégées via `src/proxy.ts` (Next.js 16)
- Isolation workspace : un user ne voit pas les données d'un autre workspace

</domain>

<decisions>
## Implementation Decisions

### Authentification
- **NextAuth.js v5** (auth.js) — OAuth uniquement, pas d'email/password
- **Providers** : Google OAuth + GitHub OAuth
- **Sessions** : Database sessions (stockées en base via Prisma adapter) — plus sûr que JWT pour une app multi-user
- **Adapter** : `@auth/prisma-adapter` pour la persistance des sessions/comptes

### Schema Prisma (extension de Phase 1)
- Les modèles User, Workspace, WorkspaceMember sont déjà définis en Phase 1
- Ajouter les modèles NextAuth requis : Session, Account, VerificationToken (si manquants)
- Relation User ↔ Workspace via WorkspaceMember avec enum Role (OWNER | MEMBER)

### Workspaces par défaut
- Créés automatiquement via le callback `signIn` ou `session` de NextAuth
- Noms : "Boulot", "Ecole", "Perso" (en français)
- User créateur = OWNER automatiquement

### Invitation
- Invitation par email (l'invité doit avoir un compte ou créer un compte via OAuth)
- Table WorkspaceMember avec statut PENDING → ACCEPTED
- Pas d'email réel envoyé en v1 — invitation par lien ou code (simplification)

### Protection des routes (Next.js 16)
- **`src/proxy.ts`** — convention Next.js 16 (middleware.ts est déprécié)
- La fonction s'appelle `proxy()` (pas `middleware`)
- Routes protégées : tout sauf `/`, `/auth/signin`, `/api/auth/*`
- Redirection vers `/auth/signin` si non authentifié

### UI
- Interface en français
- Dark mode supporté (Tailwind dark: class, déjà configuré en Phase 1)
- Pages : `/auth/signin`, `/dashboard` (liste des workspaces), `/workspace/[id]` (placeholder)
- Composants : Header avec avatar/logout, WorkspaceCard, CreateWorkspaceModal, InviteModal

### Sécurité
- Isolation workspace : toutes les API routes vérifient que l'user est membre du workspace
- NEXTAUTH_SECRET stocké en variable d'environnement Coolify
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_ID, GITHUB_SECRET en env vars

</decisions>

<code_context>
## Existing Code Insights

### Phase 1 deliverables (base)
- Next.js 16.2.6 App Router, TypeScript strict, Tailwind v4, next-themes
- `prisma/schema.prisma` : modèles User, Workspace, WorkspaceMember (Role enum)
- `src/lib/prisma.ts` : singleton PrismaClient
- `src/app/api/health/route.ts` : health check
- `output: "standalone"` dans next.config.ts
- Tailwind dark mode via `@custom-variant dark` (CSS-first v4)

### Integration Points
- `DATABASE_URL` : PostgreSQL sur Coolify
- `NEXTAUTH_URL` : `https://tasks.bantou.me`
- OAuth callbacks : `https://tasks.bantou.me/api/auth/callback/google` et `/github`

</code_context>

<specifics>
## Specific Ideas

- Workspaces avec couleur/icône (optionnel, peut être ajouté en v1.5)
- Dashboard `/dashboard` : liste des workspaces avec card, bouton "Créer un workspace"
- Header global avec switcher de workspace
- Avatar depuis OAuth (image URL)

</specifics>

<deferred>
## Deferred Ideas

- Email réel pour les invitations (intégration SMTP/Resend) — v2
- Workspace avec avatar/cover image — v2
- Gestion des rôles granulaires (Admin/Viewer) — v2
- 2FA — hors scope

</deferred>
