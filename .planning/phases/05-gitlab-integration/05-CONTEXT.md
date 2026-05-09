# Phase 5: GitLab Integration - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous workflow)

<domain>
## Phase Boundary

Implémenter un webhook GitLab entrant : une issue GitLab créée déclenche la création automatique d'une tâche dans l'app, avec lien retour vers l'issue source. Configuration par workspace (repo GitLab + secret webhook).

Ce que cette phase livre :
- Schema Prisma : champs `gitlabProjectId`, `gitlabWebhookSecret`, `gitlabBaseUrl` sur Workspace
- Champ `gitlabIssueIid` (Int?) + `gitlabIssueUrl` (String?) sur Task — pour lier une tâche à son issue source
- Endpoint `POST /api/webhooks/gitlab/[workspaceId]` — valide token, crée la tâche
- Mapping issue GitLab → tâche : titre, description, labels → tags, assignee (best-effort)
- UI settings workspace : section GitLab (project ID, base URL, secret webhook)
- Affichage du lien retour vers l'issue GitLab sur la TaskCard et dans TaskModal

</domain>

<decisions>
## Implementation Decisions

### Schema Prisma extensions
- **Workspace** :
  - `gitlabProjectId` (String?) — ID numérique GitLab ou path encoded (ex: `mygroup/myrepo`)
  - `gitlabBaseUrl` (String?) — par défaut `https://gitlab.com`, customisable pour self-hosted
  - `gitlabWebhookSecret` (String?) — secret partagé avec GitLab pour valider X-Gitlab-Token
- **Task** :
  - `gitlabIssueIid` (Int?) — IID de l'issue GitLab (numéro court)
  - `gitlabIssueUrl` (String?) — URL complète de l'issue

### Endpoint webhook
- **Route** : `POST /api/webhooks/gitlab/[workspaceId]` — workspace ciblé via path param
- **Validation** :
  - Header `X-Gitlab-Token` doit matcher `workspace.gitlabWebhookSecret`
  - Si invalide → HTTP 401
  - Body parsing : `event_name === "issue"` ou `object_kind === "issue"` (selon webhook type)
  - Action `open` → créer la tâche
  - Action `close` → marquer la tâche existante comme `done`
  - Action `reopen` → marquer la tâche existante comme `todo`
  - Action `update` → mise à jour titre/description (optionnel v1)
- **Idempotence** : si tâche existe déjà avec ce `gitlabIssueIid`, ne pas créer (éviter doublons)

### Mapping issue → tâche
- `title` ← `object_attributes.title`
- `description` ← `object_attributes.description` (markdown GitLab supporté)
- `priority` ← derivée des labels (`urgent`, `high`, `medium`, `low`) si présents, sinon `medium`
- `tags` ← labels GitLab (sauf priority labels) — créés à la volée si manquants
- `assigneeId` ← user app dont l'email matche `assignee.email` GitLab (best-effort)
- `gitlabIssueIid` ← `object_attributes.iid`
- `gitlabIssueUrl` ← `object_attributes.url`

### UI settings GitLab (sur la page existante /workspace/[id]/settings)
- Section "Intégration GitLab"
- Champs : Base URL, Project ID/path, Secret webhook (avec bouton "Régénérer")
- Affichage du URL d'endpoint à configurer dans GitLab : `${APP_URL}/api/webhooks/gitlab/${workspaceId}`
- Affichage du token à coller dans GitLab (= gitlabWebhookSecret)
- Bouton "Délier" pour effacer la config

### Lien retour sur la tâche
- Si `task.gitlabIssueUrl` présent → afficher icône GitLab + numéro `#42` cliquable dans TaskCard
- Dans TaskModal en mode édition → afficher "Issue GitLab : <link>"

### Sécurité (NFR-02)
- Validation X-Gitlab-Token systématique
- Logs serveur des webhooks rejetés (sans logger le secret)
- Rate limiting : déféré v2 (peu de webhooks attendus)
- Workspace.gitlabWebhookSecret généré via `crypto.randomBytes(32).toString("hex")` lors de la liaison

</decisions>

<code_context>
## Existing Code Insights

### Phase 3 deliverables (base)
- Schema : Task, Category, Tag, TaskTag, Workspace
- API CRUD tasks via /api/workspaces/[id]/tasks/...
- `src/lib/prisma.ts` singleton

### Integration Points
- Le webhook crée des tâches sans passer par l'API REST (direct Prisma)
- Doit déclencher notifyDiscord("task.created") si workspace.discordChannelId set
- Tag creation : utiliser upsert pour éviter les doublons

</code_context>

<specifics>
## Specific Ideas

- Badge "GitLab #42" en orange/foncé sur les TaskCards
- Lien target="_blank" pour ouvrir l'issue dans un nouvel onglet
- Icône GitLab inline (SVG embedded ou emoji 🦊)

</specifics>

<deferred>
## Deferred Ideas

- Sync bidirectionnel (commenter une tâche → commenter l'issue) — v2
- Sync labels modifiés dans GitLab → tags dans l'app — partiellement v1 (labels initiaux only, pas update)
- Merge requests events — hors scope v1
- Self-hosted GitLab avec path encodé spécial — supporté de base via gitlabBaseUrl
- Rate limiting du webhook — déféré v2

</deferred>
