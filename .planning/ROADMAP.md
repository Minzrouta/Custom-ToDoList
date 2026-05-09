# Roadmap — Custom-ToDoList v1

## Milestone 1 — v1.0 Foundation to Launch

---

### Phase 1 — Project Bootstrap & Infrastructure
**Goal:** Repo initialisé, stack configurée, déploiement de base fonctionnel sur Coolify.

**Deliverables:**
- Next.js 15 App Router initialisé avec TypeScript
- Prisma + PostgreSQL configuré (schema de base)
- Docker Compose prêt pour Coolify (frontend + postgres)
- `tasks.bantou.me` accessible (page placeholder)
- CI : lint + type-check sur push

**Requirements:** NFR-01, NFR-03

---

### Phase 2 — Auth & Workspaces
**Goal:** Utilisateurs peuvent se connecter via OAuth et accéder à leurs workspaces.

**Deliverables:**
- NextAuth.js configuré (Google + GitHub OAuth)
- Schema Prisma : User, Workspace, WorkspaceMember
- Workspaces par défaut à la création (Boulot, Ecole, Perso)
- Pages : login, dashboard (liste workspaces), settings workspace
- Invitation d'un user dans un workspace (par email)
- Middleware de protection des routes

**Requirements:** FR-01, FR-02, NFR-02

---

### Phase 3 — Core Task Management
**Goal:** CRUD tâches complet avec catégories et tags, vues liste et kanban.

**Deliverables:**
- Schema Prisma : Task, Category, Tag, Comment, SubTask
- API routes : CRUD tâches, catégories, tags
- Vue Liste avec filtres (statut, priorité, catégorie, tag)
- Vue Kanban avec drag & drop (statuts)
- Modal de création/édition de tâche (tous les champs FR-05)
- Catégories par défaut + custom
- Tags libres

**Requirements:** FR-03, FR-04, FR-05, FR-06

---

### Phase 4 — Discord Integration
**Goal:** Bot Discord opérationnel avec slash commands et notifications.

**Deliverables:**
- Bot Discord.js déployé (service séparé dans Docker Compose)
- Slash commands : `/task add`, `/task list`, `/task done`
- Notifications : création, complétion, assignation
- UI settings : configurer channel Discord par workspace
- OAuth Discord optionnel pour lier compte

**Requirements:** FR-07

---

### Phase 5 — GitLab Integration
**Goal:** Webhook GitLab fonctionnel, import automatique des issues.

**Deliverables:**
- Endpoint POST `/api/webhooks/gitlab` avec validation X-Gitlab-Token
- Mapping issue → tâche (titre, labels→tags, assignee)
- Lien retour vers l'issue sur la tâche
- UI settings : configurer repo GitLab + secret par workspace

**Requirements:** FR-08, NFR-02

---

### Phase 6 — Notifications & Polish
**Goal:** Notifications in-app, finition UX, dark mode, déploiement production stable.

**Deliverables:**
- Système de notifications in-app (badge + dropdown)
- Notifications : assignation, mention, due date J-1, complétion
- Dark mode (Tailwind dark class)
- Recherche globale
- Page profil utilisateur
- README complet + documentation déploiement

**Requirements:** FR-09, NFR-01, NFR-04

---

## Phase Summary

| # | Nom | Complexité | Dépend de |
|---|-----|-----------|-----------|
| 1 | Bootstrap & Infra | Faible | — |
| 2 | Auth & Workspaces | Moyenne | 1 |
| 3 | Core Task Management | Haute | 2 |
| 4 | Discord Integration | Moyenne | 2 |
| 5 | GitLab Integration | Faible | 2 |
| 6 | Notifications & Polish | Moyenne | 3, 4, 5 |

**Phases 4 et 5 peuvent être parallélisées après la Phase 2.**
