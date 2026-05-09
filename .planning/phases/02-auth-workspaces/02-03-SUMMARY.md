---
phase: 02-auth-workspaces
plan: 03
subsystem: ui
tags: [nextjs, react, tailwind, dark-mode, oauth, workspaces]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [signin-page, dashboard-page, workspace-page, settings-page, header, workspace-card, modals]
  affects: [03-tasks-ui]
tech_stack:
  added: []
  patterns: [server-components, client-components, next-image-remote-patterns]
key_files:
  created:
    - src/app/auth/signin/page.tsx
    - src/app/dashboard/page.tsx
    - src/app/workspace/[id]/page.tsx
    - src/app/workspace/[id]/settings/page.tsx
    - src/components/ui/Header.tsx
    - src/components/ui/WorkspaceCard.tsx
    - src/components/ui/CreateWorkspaceModal.tsx
    - src/components/ui/InviteModal.tsx
    - src/components/ui/SignInButtons.tsx
    - src/components/ui/DashboardActions.tsx
    - src/components/ui/WorkspaceActions.tsx
    - src/components/ui/WorkspaceSettingsForm.tsx
  modified:
    - src/app/layout.tsx
    - next.config.ts
decisions:
  - "SessionProvider ajouté dans layout.tsx pour que next-auth/react (signIn, signOut) fonctionne côté client"
  - "next.config.ts : remotePatterns ajouté pour lh3.googleusercontent.com et avatars.githubusercontent.com (avatars OAuth)"
  - "WorkspaceSettingsForm : window.confirm pour confirmation avant suppression — la vraie autorisation est côté API"
  - "DashboardActions/WorkspaceActions/SignInButtons isolés en Client Components minimaux — les Server Components parents restent purs"
metrics:
  duration: ~15 min
  completed: 2026-05-09
  tasks_completed: 2
  files_created: 12
  files_modified: 2
---

# Phase 2 Plan 3: UI signin/dashboard/workspace — Summary

Pages UI et composants complets de la phase Auth & Workspaces : login OAuth, dashboard des workspaces, page workspace avec membres, page settings (OWNER uniquement), Header global avec avatar/déconnexion, et modals création/invitation. Interface en français, dark mode Tailwind v4.

## Composants créés

### Server Components (pages)

| Fichier | Description |
|---------|-------------|
| `src/app/auth/signin/page.tsx` | Page login — redirige vers /dashboard si session active, sinon affiche SignInButtons |
| `src/app/dashboard/page.tsx` | Dashboard — liste les workspaces via Prisma + Header + DashboardActions |
| `src/app/workspace/[id]/page.tsx` | Page workspace — membres, avatar, rôles, boutons Inviter/Paramètres |
| `src/app/workspace/[id]/settings/page.tsx` | Paramètres workspace — renommer + supprimer, OWNER uniquement (`notFound()` sinon) |

### Client Components

| Fichier | Description |
|---------|-------------|
| `src/components/ui/Header.tsx` | Header global : avatar, nom user, bouton Se déconnecter (signOut) |
| `src/components/ui/WorkspaceCard.tsx` | Carte workspace cliquable avec badge Propriétaire/Membre |
| `src/components/ui/CreateWorkspaceModal.tsx` | Modal création workspace — POST /api/workspaces + router.refresh() |
| `src/components/ui/InviteModal.tsx` | Modal invitation — POST /api/workspaces/[id]/members par email |
| `src/components/ui/SignInButtons.tsx` | Boutons Google + GitHub utilisant signIn() de next-auth/react |
| `src/components/ui/DashboardActions.tsx` | Bouton "Nouveau workspace" + état showModal |
| `src/components/ui/WorkspaceActions.tsx` | Boutons Inviter + lien Paramètres (OWNER uniquement) |
| `src/components/ui/WorkspaceSettingsForm.tsx` | Formulaire renommage (PATCH) + bouton suppression (DELETE) |

## Flux utilisateur complet

1. `/dashboard` sans session → redirige automatiquement vers `/auth/signin`
2. Page signin : boutons "Continuer avec Google" / "Continuer avec GitHub"
3. Flow OAuth → callback NextAuth → workspaces par défaut créés (Boulot, Ecole, Perso) → redirect `/dashboard`
4. Dashboard : grille de WorkspaceCards avec badge de rôle
5. Bouton "+ Nouveau workspace" → CreateWorkspaceModal → POST API → router.refresh()
6. Clic sur une card → `/workspace/[id]` avec liste des membres et avatars
7. OWNER : bouton "Inviter" → InviteModal → POST membres par email
8. OWNER : lien "Paramètres" → `/workspace/[id]/settings` → renommer ou supprimer
9. Header : "Se déconnecter" → signOut → redirect `/auth/signin`

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing Config] Domaines images OAuth dans next.config.ts**
- **Found during:** Task 2 — Header et WorkspacePage utilisent `next/image` avec des URLs Google et GitHub
- **Issue:** Sans `remotePatterns`, Next.js bloque les images externes en production et lève une erreur au runtime
- **Fix:** Ajout de `remotePatterns` pour `lh3.googleusercontent.com` (Google) et `avatars.githubusercontent.com` (GitHub) dans `next.config.ts`
- **Files modified:** `next.config.ts`
- **Commit:** 19445d6

## Checkpoint human-verify — Critères de vérification

Ce plan contient un `checkpoint:human-verify` qui nécessite des credentials OAuth réels pour être testé. Exécution en mode autonome — vérification différée.

**Variables d'environnement requises pour le déploiement Coolify :**
```
GOOGLE_CLIENT_ID=<votre-client-id>
GOOGLE_CLIENT_SECRET=<votre-client-secret>
GITHUB_ID=<votre-github-id>
GITHUB_SECRET=<votre-github-secret>
AUTH_SECRET=<secret-aléatoire-32-chars>
NEXTAUTH_URL=https://tasks.bantou.me
DATABASE_URL=postgresql://...
```

**OAuth callback URLs à configurer :**
- Google Cloud Console : `https://tasks.bantou.me/api/auth/callback/google`
- GitHub OAuth App : `https://tasks.bantou.me/api/auth/callback/github`

**Checklist de vérification manuelle :**
1. `/dashboard` sans session → redirect `/auth/signin`
2. Page signin : boutons Google et GitHub visibles
3. Clic "Continuer avec Google" → flux OAuth → retour `/dashboard`
4. Dashboard : 3 workspaces (Boulot, Ecole, Perso) avec badge "Propriétaire"
5. "+ Nouveau workspace" → modal s'ouvre, saisie nom, validation → workspace apparaît
6. Clic workspace → liste membres avec avatars et rôles
7. "Paramètres" → formulaire renommage + zone de danger suppression
8. "Se déconnecter" → redirect `/auth/signin`
9. Dark mode : toutes les pages basculent correctement

## Known Stubs

| Stub | Fichier | Raison |
|------|---------|--------|
| Placeholder tâches | `src/app/workspace/[id]/page.tsx` | Section tâches à implémenter en Phase 3 — texte "Les tâches seront disponibles en Phase 3." intentionnel |

## Threat Surface

Toutes les menaces T-02-11 à T-02-15 du plan ont été mitigées :
- T-02-11 : Redirect si session active sur `/auth/signin` ✓
- T-02-12 : Vérification `role !== "OWNER"` + `notFound()` côté serveur sur settings ✓
- T-02-13 : Prisma filtre par `userId: session.user.id` sur le dashboard ✓
- T-02-14 : `window.confirm` avant suppression + validation API OWNER requise ✓
- T-02-15 : SessionProvider expose name/email/image seulement — user.id reste côté serveur ✓

## Self-Check: PASSED

Fichiers créés :
- src/app/auth/signin/page.tsx : FOUND
- src/app/dashboard/page.tsx : FOUND
- src/app/workspace/[id]/page.tsx : FOUND
- src/app/workspace/[id]/settings/page.tsx : FOUND
- src/components/ui/Header.tsx : FOUND
- src/components/ui/WorkspaceCard.tsx : FOUND
- src/components/ui/CreateWorkspaceModal.tsx : FOUND
- src/components/ui/InviteModal.tsx : FOUND
- src/components/ui/SignInButtons.tsx : FOUND
- src/components/ui/DashboardActions.tsx : FOUND
- src/components/ui/WorkspaceActions.tsx : FOUND
- src/components/ui/WorkspaceSettingsForm.tsx : FOUND

Commit 19445d6 : FOUND
`npm run build` : PASSED (8/8 pages générées sans erreur)
`npx tsc --noEmit` : PASSED (aucune erreur TypeScript)
