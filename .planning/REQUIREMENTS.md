# Requirements — Custom-ToDoList v1

## Functional Requirements

### FR-01 — Authentification
- OAuth via Google et/ou GitHub (NextAuth.js)
- Session persistante (JWT ou database sessions)
- Inscription automatique au premier login OAuth
- Profil utilisateur (nom, avatar depuis OAuth)

### FR-02 — Workspaces
- Chaque user a accès à des workspaces
- Workspaces par défaut à la création : Boulot, Ecole, Perso
- Possibilité de créer des workspaces personnalisés
- Invitation d'autres users dans un workspace (multi-user)
- Rôles dans un workspace : Owner / Member

### FR-03 — Catégories
- Catégories prédéfinies : Boulot, Ecole, Perso
- Catégories créables par l'utilisateur
- Couleur associée à chaque catégorie
- Une tâche appartient à une catégorie (optionnel)

### FR-04 — Tags
- Tags libres créés par les users
- Une tâche peut avoir plusieurs tags
- Filtre par tag dans les vues

### FR-05 — Tâches (CRUD complet) ✅ (partiel — UI 03-02)
- Champs : titre, description (markdown), statut, priorité, catégorie, tags, assignee, due date, workspace
- Statuts : `todo` | `in_progress` | `done` | `cancelled`
- Priorités : `low` | `medium` | `high` | `urgent`
- Sous-tâches (checklist simple)
- Commentaires sur une tâche

### FR-06 — Vues ✅ (partiel — liste 03-02, kanban 03-03)
- **Vue Liste** : tâches filtrables/triables par statut, priorité, catégorie, tag, assignee
- **Vue Kanban** : colonnes par statut, drag & drop
- Filtres persistants par workspace
- Recherche globale (titre / description)

### FR-07 — Intégration Discord ✅ (v1 livré — 04-03)
- Bot Discord avec slash commands :
  - `/task add <titre> [priorité] [catégorie]` — crée une tâche
  - `/task list [filtre]` — affiche les tâches en cours
  - `/task done <id>` — marque une tâche comme terminée
- Notifications dans un channel Discord configuré :
  - Tâche créée
  - Tâche complétée
  - Tâche assignée à un user (déféré v2)
- Config par workspace : channel Discord associé

### FR-08 — Intégration GitLab
- Webhook entrant : issue GitLab créée → tâche créée automatiquement
- Mapping : titre issue → titre tâche, labels → tags, assignee → assignee
- Lien retour vers l'issue GitLab sur la tâche
- Config par workspace : repo GitLab associé + secret webhook

### FR-09 — Notifications
- Notifications in-app (badge, dropdown)
- Événements notifiés : assignation, mention, due date proche, tâche complétée

## Non-Functional Requirements

### NFR-01 — Performance
- First Contentful Paint < 1.5s
- API responses < 200ms (opérations CRUD)

### NFR-02 — Sécurité
- Isolation stricte des workspaces (un user ne peut pas voir les tâches d'un autre workspace sans invitation)
- Secrets Discord/GitLab stockés en variables d'environnement
- Validation des webhooks GitLab (X-Gitlab-Token)

### NFR-03 — Déploiement
- Docker Compose compatible Coolify
- Variables d'environnement via Coolify (pas de .env committé)
- Health check endpoint `/api/health`

### NFR-04 — UX
- Responsive (mobile-first pour la vue liste)
- Dark mode supporté
- Interface en français

## Out of Scope (v1)
- App mobile native
- Récurrence de tâches
- Gantt / timeline view
- Facturation / time tracking
- Intégration GitHub (seulement GitLab)
- Export PDF/CSV
