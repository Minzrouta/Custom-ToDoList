---
phase: 02-auth-workspaces
verified: 2026-05-09T04:00:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "OAuth Google — flux complet end-to-end"
    expected: "Cliquer 'Continuer avec Google' redirige vers Google, puis retour sur /dashboard avec session active et workspaces Boulot/Ecole/Perso créés"
    why_human: "Nécessite des credentials OAuth réels et un navigateur — impossible à vérifier statiquement"
  - test: "OAuth GitHub — flux complet end-to-end"
    expected: "Cliquer 'Continuer avec GitHub' redirige vers GitHub, puis retour sur /dashboard avec session active et workspaces créés"
    why_human: "Nécessite des credentials OAuth réels et un navigateur"
  - test: "Création automatique des 3 workspaces par défaut"
    expected: "Au premier login, les workspaces Boulot, Ecole, Perso sont créés en base et listés sur /dashboard"
    why_human: "Nécessite un vrai login OAuth contre une vraie base de données"
  - test: "Redirection routes protégées"
    expected: "Accéder à /dashboard sans être connecté redirige vers /auth/signin"
    why_human: "La fonction proxy() est correcte dans le code mais la vérification du comportement runtime nécessite un navigateur ou une requête HTTP avec état de session"
---

# Phase 2 : Auth & Workspaces — Rapport de Vérification

**Phase Goal :** Login OAuth Google + GitHub, workspaces par défaut au premier login, CRUD workspaces, invitation par email, protection des routes, isolation workspace.
**Verified :** 2026-05-09T04:00:00Z
**Status :** human_needed
**Re-verification :** Non — vérification initiale

---

## Goal Achievement

### Build & TypeScript

| Check | Commande | Résultat | Status |
|-------|----------|----------|--------|
| Build production | `npm run build` | Exit 0, toutes les routes compilées | PASS |
| TypeScript | `npx tsc --noEmit` | "No errors found" | PASS |

### Observable Truths

| # | Critère | Status | Evidence |
|---|---------|--------|----------|
| 1 | Login OAuth Google configuré (provider + redirect) | VERIFIED | `src/auth.ts` l.11-15 : `Google({ clientId, clientSecret })` — route `/api/auth/[...nextauth]` expose les handlers |
| 2 | Login OAuth GitHub configuré | VERIFIED | `src/auth.ts` l.16-19 : `GitHub({ clientId, clientSecret })` — bouton GitHub dans `SignInButtons.tsx` appelle `signIn("github")` |
| 3 | Workspaces par défaut créés au premier login | VERIFIED | `src/auth.ts` l.22-43 : callback `signIn` vérifie `workspaceMember.findFirst`, puis crée Boulot/Ecole/Perso si aucun membership existant |
| 4 | POST /api/workspaces — créer workspace custom | VERIFIED | `src/app/api/workspaces/route.ts` l.33-70 : POST complet avec validation, création Prisma, user = OWNER |
| 5 | POST /api/workspaces/[id]/members — invitation par email | VERIFIED | `src/app/api/workspaces/[id]/members/route.ts` l.41-109 : OWNER uniquement, lookup par email, création WorkspaceMember |
| 6 | Routes protégées redirigent vers /auth/signin | VERIFIED | `src/proxy.ts` l.8-23 : fonction `proxy()` (convention Next.js 16), vérifie session, redirige si non authentifié. Config matcher l.26-33. Build confirme "ƒ Proxy (Middleware)" |
| 7 | Isolation workspace : requireMembership vérifié | VERIFIED | `src/app/api/workspaces/[id]/route.ts` l.6-9 : `requireMembership()` utilisé dans GET, PATCH, DELETE. Members route vérifie aussi l'appartenance avant d'exposer la liste |

**Score :** 7/7 truths vérifiées statiquement

---

### Required Artifacts

| Artifact | Status | Détails |
|----------|--------|---------|
| `src/auth.ts` | VERIFIED | Google + GitHub providers, session DB, callbacks signIn + session, pages custom |
| `src/proxy.ts` | VERIFIED | Export nommé `proxy()` (Next.js 16), config matcher, redirection vers /auth/signin |
| `src/app/api/workspaces/route.ts` | VERIFIED | GET (liste par membership) + POST (création avec OWNER) — 70 lignes, logique complète |
| `src/app/api/workspaces/[id]/route.ts` | VERIFIED | requireMembership() helper, GET + PATCH + DELETE, isolation vérifiée |
| `src/app/api/workspaces/[id]/members/route.ts` | VERIFIED | GET (membre requis) + POST (OWNER requis, lookup email, idempotence) |
| `src/app/api/auth/[...nextauth]/route.ts` | VERIFIED | Export des handlers NextAuth — wiring complet |
| `src/app/auth/signin/page.tsx` | VERIFIED | Redirige vers /dashboard si déjà connecté, affiche SignInButtons |
| `src/components/ui/SignInButtons.tsx` | VERIFIED | Boutons Google + GitHub appelant `signIn()` avec callbackUrl |
| `src/app/dashboard/page.tsx` | VERIFIED | Query Prisma réelle (memberships), rendu WorkspaceCard par membership |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `SignInButtons.tsx` | NextAuth | `signIn("google"/"github")` | WIRED |
| `src/auth.ts` | Prisma | `PrismaAdapter(prisma)` | WIRED |
| `src/auth.ts` signIn callback | `prisma.workspace.create` | Boucle sur ["Boulot","Ecole","Perso"] | WIRED |
| `src/proxy.ts` | `src/auth.ts` | `import { auth }`, `await auth()` | WIRED |
| `src/app/api/workspaces/[id]/route.ts` | requireMembership | Appelé dans GET, PATCH, DELETE | WIRED |
| `src/app/dashboard/page.tsx` | Prisma | `workspaceMember.findMany` → rendu memberships | WIRED — données réelles |
| `src/app/api/auth/[...nextauth]/route.ts` | `src/auth.ts` | `import { handlers }`, export GET/POST | WIRED |

---

### Data-Flow Trace (Level 4)

| Artifact | Variable | Source | Données réelles | Status |
|----------|----------|--------|-----------------|--------|
| `dashboard/page.tsx` | `memberships` | `prisma.workspaceMember.findMany` | Oui — requête DB filtrée par `userId` | FLOWING |
| `workspace/[id]/page.tsx` | `membership` | `prisma.workspaceMember.findUnique` avec include workspace+membres | Oui | FLOWING |
| `api/workspaces/route.ts` GET | `memberships` | `prisma.workspaceMember.findMany` | Oui | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Commande | Résultat | Status |
|----------|----------|----------|--------|
| Build Next.js 16 | `npm run build` | Exit 0, 11 routes compilées dont proxy | PASS |
| TypeScript strict | `npx tsc --noEmit` | "No errors found" | PASS |
| Proxy présent dans build | Output build | "ƒ Proxy (Middleware)" confirmé | PASS |
| Routes API compilées | Output build | `/api/workspaces`, `/api/workspaces/[id]`, `/api/workspaces/[id]/members` toutes en ƒ (dynamic) | PASS |

---

### Anti-Patterns Found

| Fichier | Ligne | Pattern | Sévérité | Impact |
|---------|-------|---------|----------|--------|
| `workspace/[id]/page.tsx` | 111-116 | Placeholder "Les tâches seront disponibles en Phase 3" | INFO | Intentionnel — section tâches hors scope Phase 2, pas un bloqueur |
| `.env.example` | — | Variables OAuth manquantes (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_ID, GITHUB_SECRET) | WARNING | Documentation incomplète, pas d'impact fonctionnel — les vars sont utilisées correctement dans auth.ts |

Aucun bloqueur détecté.

---

### Human Verification Required

#### 1. OAuth Google — flux complet

**Test :** Ouvrir `https://tasks.bantou.me/auth/signin`, cliquer "Continuer avec Google", s'authentifier, vérifier le retour sur `/dashboard`
**Expected :** Session active, nom/avatar affiché dans le Header, 3 workspaces (Boulot, Ecole, Perso) listés sur le dashboard
**Why human :** Nécessite credentials OAuth valides (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) configurés sur Coolify + base de données active

#### 2. OAuth GitHub — flux complet

**Test :** Même procédure avec "Continuer avec GitHub"
**Expected :** Même résultat — session + 3 workspaces créés
**Why human :** Même raison — credentials OAuth + DB runtime

#### 3. Création workspaces par défaut au premier login

**Test :** Se connecter avec un compte jamais vu, vérifier en base (`SELECT * FROM workspaces WHERE ...`) que Boulot, Ecole, Perso existent et que l'user est OWNER des 3
**Expected :** 3 lignes dans `workspace_members` avec `role = 'OWNER'` pour le nouvel user
**Why human :** Nécessite un login réel et accès base de données

#### 4. Protection routes — redirection runtime

**Test :** Sans être connecté, accéder à `/dashboard` — doit rediriger vers `/auth/signin`
**Test 2 :** Tenter `GET /api/workspaces` sans session — doit retourner 401
**Expected :** Redirection HTTP 302 vers `/auth/signin` pour les pages, 401 JSON pour les API routes
**Why human :** Le code est correct mais le comportement runtime du proxy Next.js 16 ne peut pas être testé sans serveur actif

---

### Gaps Summary

Aucun gap bloquant détecté. Les 7 critères de succès sont vérifiés statiquement (code présent, substantiel, câblé, données réelles). Le build et TypeScript passent sans erreur.

Les seules vérifications restantes sont des comportements OAuth end-to-end qui nécessitent une exécution réelle avec credentials et base de données.

---

_Verified : 2026-05-09T04:00:00Z_
_Verifier : Claude (gsd-verifier)_
