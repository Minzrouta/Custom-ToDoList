# Roadmap: Custom-ToDoList

## Overview

Application web de gestion de tâches multi-utilisateur auto-hébergée. Le projet part de zéro (repo vide) et aboutit à une app déployée sur tasks.bantou.me avec auth OAuth, gestion de tâches complète par workspace, intégrations Discord et GitLab.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Bootstrap & Infrastructure** - Next.js 15, Docker Compose, déploiement Coolify de base
- [x] **Phase 2: Auth & Workspaces** - OAuth Google/GitHub, workspaces multi-user
- [ ] **Phase 3: Core Task Management** - CRUD tâches, catégories, tags, Kanban, liste
- [ ] **Phase 4: Discord Integration** - Bot slash commands + notifications
- [ ] **Phase 5: GitLab Integration** - Webhooks entrants, import issues
- [ ] **Phase 6: Notifications & Polish** - Notifications in-app, dark mode, recherche, finition

## Phase Details

### Phase 1: Bootstrap & Infrastructure
**Goal**: Repo initialisé avec Next.js 15 App Router, Prisma + PostgreSQL configuré, Docker Compose prêt pour Coolify, app accessible sur tasks.bantou.me avec page placeholder.
**Depends on**: Nothing (first phase)
**Requirements**: NFR-01, NFR-03
**Success Criteria** (what must be TRUE):
  1. `npm run build` et `npm run dev` fonctionnent sans erreur
  2. Docker Compose démarre les services (next + postgres) sans erreur
  3. `tasks.bantou.me` répond HTTP 200 via Traefik/Coolify
  4. Prisma migrate déploie le schema initial sans erreur
  5. Health check `/api/health` répond JSON `{ status: "ok" }`
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Next.js 15 App Router, TypeScript strict, Tailwind dark mode, page placeholder
- [ ] 01-02-PLAN.md — Prisma setup, schema User/Workspace/WorkspaceMember, health check /api/health
- [ ] 01-03-PLAN.md — Dockerfile multi-stage, docker-compose.yml Coolify, labels Traefik tasks.bantou.me

### Phase 2: Auth & Workspaces
**Goal**: Utilisateurs se connectent via OAuth Google/GitHub, ont des workspaces (Boulot/Ecole/Perso par défaut), peuvent inviter d'autres users.
**Depends on**: Phase 1
**Requirements**: FR-01, FR-02, NFR-02
**Success Criteria** (what must be TRUE):
  1. Login OAuth Google fonctionne end-to-end (redirect, session, profil)
  2. Login OAuth GitHub fonctionne end-to-end
  3. Workspaces par défaut créés automatiquement au premier login
  4. User peut créer un workspace custom
  5. User peut inviter un autre user dans un workspace (par email)
  6. Routes protégées redirigent vers login si non authentifié
  7. Isolation workspace : user ne voit pas les données d'un autre workspace
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — NextAuth.js v5 config, OAuth Google + GitHub, schema Account/Session/VerificationToken (+ db push)
- [ ] 02-02-PLAN.md — src/proxy.ts (protection routes), API routes workspaces CRUD + invitation membres
- [ ] 02-03-PLAN.md — UI pages signin/dashboard/workspace/settings, composants Header/WorkspaceCard/modals

### Phase 3: Core Task Management
**Goal**: CRUD tâches complet avec statuts, priorités, catégories (Boulot/Ecole/Perso/custom), tags, sous-tâches, commentaires. Vues Kanban (drag & drop) et liste avec filtres.
**Depends on**: Phase 2
**Requirements**: FR-03, FR-04, FR-05, FR-06
**Success Criteria** (what must be TRUE):
  1. Tâche créée/éditée/supprimée avec tous les champs (titre, desc markdown, statut, priorité, catégorie, tags, assignee, due date)
  2. Vue Kanban affiche les colonnes par statut avec drag & drop fonctionnel
  3. Vue Liste filtre par statut, priorité, catégorie, tag, assignee
  4. Catégories par défaut présentes + création de catégorie custom possible
  5. Tags libres créables et assignables à plusieurs tâches
  6. Sous-tâches (checklist) fonctionnelles dans une tâche
  7. Commentaires sur une tâche fonctionnels
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Schema Prisma Task/Category/Tag/SubTask/Comment, src/lib/auth-helpers.ts, 9 routes API CRUD + [BLOCKING] db push
- [ ] 03-02-PLAN.md — TaskCard, FilterBar, ListView, page /workspace/[id]/list
- [ ] 03-03-PLAN.md — KanbanColumn, KanbanBoard (dnd-kit), page /workspace/[id]/kanban
- [ ] 03-04-PLAN.md — TaskModal complet (sous-tâches + commentaires), ListPageClient, KanbanPageClient, page workspace mise à jour + seed catégories

### Phase 4: Discord Integration
**Goal**: Bot Discord opérationnel avec slash commands (/task add, /task list, /task done) et notifications dans un channel configuré par workspace.
**Depends on**: Phase 2
**Requirements**: FR-07
**Success Criteria** (what must be TRUE):
  1. `/task add <titre>` crée une tâche dans le workspace lié au serveur Discord
  2. `/task list` affiche les tâches en cours sous forme d'embed Discord
  3. `/task done <id>` marque une tâche comme terminée
  4. Notification envoyée dans le channel configuré à la création d'une tâche
  5. Notification envoyée à la complétion d'une tâche
  6. UI settings : associer un channel Discord à un workspace
**Plans**: TBD

Plans:
- [ ] 04-01: Discord bot discord.js, service Docker, slash commands register
- [ ] 04-02: Implémentation commandes /task add, /task list, /task done
- [ ] 04-03: Système de notifications Discord, config channel par workspace

### Phase 5: GitLab Integration
**Goal**: Webhook GitLab fonctionnel — une issue GitLab créée génère automatiquement une tâche dans l'app, avec lien retour vers l'issue.
**Depends on**: Phase 2
**Requirements**: FR-08, NFR-02
**Success Criteria** (what must be TRUE):
  1. Endpoint `/api/webhooks/gitlab` valide le X-Gitlab-Token
  2. Issue GitLab créée → tâche créée automatiquement avec titre, labels→tags, assignee
  3. Tâche affiche un lien retour vers l'issue GitLab source
  4. UI settings : configurer repo GitLab + secret webhook par workspace
  5. Webhook invalide (mauvais token) → 401 rejeté
**Plans**: TBD

Plans:
- [ ] 05-01: Endpoint webhook GitLab avec validation token, mapping issue→tâche
- [ ] 05-02: UI settings GitLab par workspace, affichage lien retour sur tâche

### Phase 6: Notifications & Polish
**Goal**: Notifications in-app (badge + dropdown), dark mode, recherche globale, page profil, README. App production-ready.
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: FR-09, NFR-01, NFR-04
**Success Criteria** (what must be TRUE):
  1. Notifications in-app apparaissent pour : assignation, mention, due date J-1, complétion
  2. Badge de compteur de notifications non lues visible dans le header
  3. Dark mode fonctionne via toggle (Tailwind dark class)
  4. Recherche globale trouve des tâches par titre et description
  5. Page profil utilisateur affiche et permet de modifier nom/avatar
  6. README contient instructions déploiement Coolify complètes
**Plans**: TBD

Plans:
- [ ] 06-01: Système notifications in-app (schema, API, badge, dropdown)
- [ ] 06-02: Dark mode, recherche globale, page profil
- [ ] 06-03: README, documentation déploiement, polish final

## Progress

**Execution Order:**
Phases execute in order: 1 → 2 → 3 → 4 → 5 → 6
(Phases 4 and 5 can be parallelized after Phase 2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bootstrap & Infrastructure | 3/3 | ✅ Complete | 2026-05-09 |
| 2. Auth & Workspaces | 3/3 | ✅ Complete | 2026-05-09 |
| 3. Core Task Management | 1/4 | In progress | - |
| 4. Discord Integration | 0/3 | Not started | - |
| 5. GitLab Integration | 0/2 | Not started | - |
| 6. Notifications & Polish | 0/3 | Not started | - |
