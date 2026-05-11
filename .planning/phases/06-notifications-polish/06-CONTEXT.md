# Phase 6: Notifications & Polish - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous workflow — phase finale)

<domain>
## Phase Boundary

Dernière phase v1 : notifications in-app, dark mode toggle, recherche globale, page profil, README. Polish final pour rendre l'app production-ready.

Ce que cette phase livre :
- Notifications in-app : modèle Prisma Notification + API + badge + dropdown header
- Événements notifiés : assignation, mention, due date J-1, complétion d'une tâche assignée
- Dark mode toggle dans le header (next-themes useTheme)
- Recherche globale : input dans le header → trouve tâches par titre/description
- Page profil utilisateur : afficher + modifier nom et avatar
- README.md complet : instructions déploiement Coolify
- Polish final : nettoyage code, vérifications a11y de base

</domain>

<decisions>
## Implementation Decisions

### Schema Prisma — modèle Notification
- `id`, `userId` (destinataire), `type` (enum), `title`, `body` (text), `taskId` (FK?), `workspaceId` (FK?), `readAt` (DateTime?), `createdAt`
- Enum NotificationType : `task_assigned` | `task_due_soon` | `task_completed` | `task_mentioned`
- Index `(userId, readAt, createdAt DESC)` pour requêtes badge + dropdown

### Génération de notifications
- `task_assigned` : déclenchée dans POST/PATCH tasks quand `assigneeId` change ET nouveau != currentUser
- `task_completed` : déclenchée quand status passe à "done" sur tâche assignée à un user qui n'est pas le finisseur
- `task_due_soon` : computed at fetch time OR job nightly — choix : computed à l'ouverture du dropdown (`dueDate < now + 24h && status != done && !sent_yet`)
- `task_mentioned` : pas de mention système en v1 — déféré

### Helper notif
- `src/lib/notifications.ts` : `createNotification(userId, type, payload)` + `notifyAssignment(task, oldAssignee, newAssignee)`
- Appelé fire-and-forget depuis les routes API tasks (comme notifyDiscord)

### API routes notifications
- `GET /api/notifications` — liste paginée, défaut 20, filtre `unread=true`
- `PATCH /api/notifications/[id]` — marquer comme lu
- `POST /api/notifications/mark-all-read` — tout marquer lu

### UI header — badge + dropdown
- Update `Header.tsx` :
  - Bouton notifications avec pastille rouge si unread > 0
  - Dropdown au clic → liste des 10 dernières notifs (lu/non lu visuellement)
  - Lien vers la tâche
  - Bouton "Tout marquer comme lu"
- Polling toutes les 60s OU revalidation onFocus (choix : revalidation onFocus + interval léger)

### Dark mode toggle
- Bouton soleil/lune dans Header
- `useTheme()` de next-themes (déjà installé Phase 1)
- Persistance localStorage automatique via next-themes
- Icônes inline SVG

### Recherche globale
- Input avec icône loupe dans Header
- Au submit → page `/search?q=...`
- Page `/search` : server component, requête Prisma avec `OR: [{title: contains}, {description: contains}]` mode insensitive, scopé aux workspaces où l'user est membre
- Affichage : TaskCard avec link vers workspace + édition

### Page profil
- `/profile` (existe en Phase 4 pour Discord ID)
- Étendre avec : nom (input modifiable), email (read-only), avatar (URL ou upload upload déféré v2 — pour v1, juste champ URL)
- API `PATCH /api/users/me` : update name + image
- Section "Compte" + section "Intégrations" (Discord déjà là)

### README.md
- Description projet
- Tech stack
- Variables d'environnement (.env.example)
- Local dev : npm install, prisma generate, db push, dev
- Déploiement Coolify : créer app, connecter repo, configurer env vars, déployer
- Architecture brève (Next.js + Prisma + Postgres + Discord bot)
- Lien vers .planning/ pour le contexte GSD

### A11y / polish
- Labels sur tous les inputs (déjà OK)
- Aria-labels sur boutons icon-only (header)
- Focus visible (Tailwind default)
- Aucun warning console en dev mode

</decisions>

<code_context>
## Existing Code Insights

### Phases 1-5 deliverables (base)
- Full task management : Task, Category, Tag, SubTask, Comment, Workspace, User
- Auth NextAuth v5 + workspaces avec invitation
- Vue Liste + Kanban + TaskModal complet
- Discord bot + notifications
- GitLab webhook + import
- `src/lib/discord-notify.ts` (pattern fire-and-forget)
- `src/lib/auth-helpers.ts` (requireMembership)
- Header existant (Header.tsx) — sera modifié
- next-themes installé, ThemeProvider en place
- `/profile` page existe (Phase 4) — sera étendue

### Integration Points
- Hooks dans routes tasks/[taskId] PATCH + tasks POST pour générer notifs
- TaskModal — pas de changements
- workspace pages — pas de changements

</code_context>

<specifics>
## Specific Ideas

- Badge rouge avec compteur (≤ 99) ou "99+" sinon
- Dropdown notifications de 80 max en largeur (ne pas dominer le header)
- Toast de notification temps réel : déféré v2 (nécessite WebSocket/SSE)
- Recherche : icône loupe, placeholder "Rechercher des tâches…"
- Profil avatar : preview image si URL valide

</specifics>

<deferred>
## Deferred Ideas

- WebSocket / SSE pour notifications temps réel — v2
- Upload avatar via UploadThing/S3 — v2
- Mentions @user dans description/commentaires — v2
- Email notifications — v2
- Settings utilisateur : opt-in/out par type de notif — v2
- Onboarding/tour produit première connexion — v2

</deferred>
