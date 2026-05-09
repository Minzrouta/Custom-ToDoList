---
phase: 05-gitlab-integration
plan: 02
subsystem: gitlab-ui
tags: [gitlab, settings, ui, taskcard, taskmodal, owner-only]
requires:
  - 05-01 (schema Prisma : Workspace.gitlab*, Task.gitlabIssueIid/Url)
  - WorkspaceDiscordSettings (pattern source)
  - requireMembership (auth-helpers)
provides:
  - PUT/DELETE /api/workspaces/[id]/gitlab (OWNER-only)
  - WorkspaceGitlabSettings (composant client)
  - Badge "🦊 GitLab #N" dans TaskCard
  - Bandeau "Issue GitLab" dans TaskModal (mode édition)
affects:
  - src/app/workspace/[id]/settings/page.tsx (rend WorkspaceGitlabSettings)
  - src/app/workspace/[id]/list/page.tsx (commentaire propagation)
  - src/app/workspace/[id]/kanban/page.tsx (mappe gitlab fields)
  - src/components/tasks/ListPageClient.tsx (fallback inclut gitlab fields)
  - src/components/tasks/KanbanPageClient.tsx (fallback inclut gitlab fields)
tech-stack:
  added: []
  patterns:
    - Response.json (jamais NextResponse)
    - await params (Next.js 16)
    - requireMembership + member.role !== "OWNER" → 403
    - randomBytes(32).toString("hex") pour secret webhook
    - target=_blank + rel=noopener noreferrer (anti tabnabbing)
    - stopPropagation sur badge enfant d'un button
key-files:
  created:
    - src/app/api/workspaces/[id]/gitlab/route.ts
    - src/components/ui/WorkspaceGitlabSettings.tsx
  modified:
    - src/app/workspace/[id]/settings/page.tsx
    - src/app/workspace/[id]/list/page.tsx
    - src/app/workspace/[id]/kanban/page.tsx
    - src/app/api/workspaces/[id]/tasks/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/route.ts
    - src/components/tasks/TaskCard.tsx
    - src/components/tasks/TaskModal.tsx
    - src/components/tasks/ListPageClient.tsx
    - src/components/tasks/KanbanPageClient.tsx
decisions:
  - secret webhook rendu côté client (OWNER-only via la page) — acceptable v1
  - endpoint URL calculé via window.location.origin (pas d'env var côté client)
  - stopPropagation sur le badge GitLab pour ne pas ouvrir le modal au clic
  - Bouton "Délier" visible seulement si une config existe déjà
  - PUT renvoie systématiquement le secret courant (généré si absent ou regenerateSecret=true)
metrics:
  duration_minutes: ~25
  tasks: 3
  files_created: 2
  files_modified: 9
  completed: 2026-05-09
---

# Phase 5 Plan 2: UI GitLab Settings + lien retour issues — Summary

UI de configuration GitLab par workspace (OWNER-only) avec génération/régénération de secret webhook côté serveur, et affichage du lien retour vers l'issue GitLab source dans TaskCard (badge cliquable) et TaskModal (bandeau orange en mode édition).

## What was built

### Task 1 — API route /api/workspaces/[id]/gitlab + propagation Prisma
- **Nouveau** : `src/app/api/workspaces/[id]/gitlab/route.ts`
  - `PUT` : auth + requireMembership + check `role !== "OWNER"` → 403. Validation `gitlabBaseUrl` via regex `/^https?:\/\/.+/`. Génère le secret via `randomBytes(32).toString("hex")` si absent OU si `regenerateSecret=true`. Met à jour `gitlabProjectId`/`gitlabBaseUrl`/`gitlabWebhookSecret` (chaîne vide → null).
  - `DELETE` : remet les 3 champs à null.
  - Pattern `Response.json` partout, jamais `NextResponse`. Logs préfixés `[gitlab-config:PUT]` / `[gitlab-config:DELETE]`.
- **Modifié** : `src/app/api/workspaces/[id]/tasks/route.ts` et `tasks/[taskId]/route.ts` : ajout d'un commentaire `// gitlabIssueIid + gitlabIssueUrl renvoyés implicitement (scalaires Task)` au-dessus des `include`. Pas de changement structurel — Prisma renvoie déjà les scalaires implicitement.
- **Commit** : `e7cab1c`.

### Task 2 — WorkspaceGitlabSettings + intégration page settings
- **Nouveau** : `src/components/ui/WorkspaceGitlabSettings.tsx` (~320 lignes).
  - Inputs Base URL + Project ID (placeholders explicites).
  - Section "URL du webhook" : `<code>` + bouton "Copier" (feedback "Copié !" 2s).
  - Section "Secret webhook" : `<code>` + bouton "Copier" + bouton "Régénérer" (orange, avec `window.confirm`).
  - Boutons : "Enregistrer" (PUT) + "Délier" (DELETE, visible si config existe).
  - States : `loading`, `unlinkLoading`, `regenerateLoading`, `error`, `success`, `copiedSecret`, `copiedEndpoint`.
  - Endpoint URL calculé via `window.location.origin` dans `useEffect` (pas d'env var côté client requise).
  - Bloc d'aide bleu en bas (étapes côté GitLab : Settings → Webhooks → URL/Secret/Issues events).
- **Modifié** : `src/app/workspace/[id]/settings/page.tsx` — import + render `<WorkspaceGitlabSettings>` après `<WorkspaceDiscordSettings>`. La page est déjà OWNER-only via `notFound()` si `membership.role !== "OWNER"`.
- **Commit** : `dc4a59f`.

### Task 3 — Lien retour issue GitLab + propagation
- **Modifié** : `src/components/tasks/TaskCard.tsx`
  - `TaskCardData` étendu : `gitlabIssueIid: number | null` + `gitlabIssueUrl: string | null`.
  - Badge "🦊 GitLab #N" ajouté dans la ligne 2 (catégorie + tags + badge), conditionné par `task.gitlabIssueUrl`.
  - `<a target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>` — le clic ouvre l'issue dans un nouvel onglet sans déclencher le `onClick` du `<button>` parent (qui ouvrirait le modal).
  - Style : `bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300`.
- **Modifié** : `src/components/tasks/TaskModal.tsx`
  - `TaskModalTask` étendu : `gitlabIssueIid` + `gitlabIssueUrl`.
  - Bandeau orange inséré entre le header sticky et le `<form>`, rendu seulement si `isEditing && task?.gitlabIssueUrl` : "🦊 Issue GitLab : #N" avec lien `target=_blank` + `rel=noopener noreferrer`.
- **Modifié** : `src/app/workspace/[id]/kanban/page.tsx` — ajout de `gitlabIssueIid` + `gitlabIssueUrl` dans le `.map()` qui sérialise `rawTasks → TaskCardData[]`. Commentaire de garde au-dessus du `findMany`.
- **Modifié** : `src/app/workspace/[id]/list/page.tsx` — commentaire de garde (la page passe `tasks` brut depuis Prisma, le typage suit via `Prisma.TaskGetPayload<...>`).
- **Modifié** : `ListPageClient.tsx` + `KanbanPageClient.tsx` — fallbacks (utilisés si le fetch détail échoue) incluent désormais `gitlabIssueIid` + `gitlabIssueUrl`.
- **Commit** : `d6bfa2a`.

## Verification

- `npx tsc --noEmit` : aucune erreur.
- `npm run build` : succès, route `ƒ /api/workspaces/[id]/gitlab` listée parmi les 25 routes.
- Patterns validés via grep :
  - `randomBytes(32).toString` présent dans `gitlab/route.ts`.
  - `role !== "OWNER"` présent dans `gitlab/route.ts` (PUT + DELETE).
  - Aucun `NextResponse` dans `gitlab/route.ts`.
  - `stopPropagation` présent dans `TaskCard.tsx`.
  - `rel="noopener noreferrer"` présent dans `TaskCard.tsx` et `TaskModal.tsx`.
  - `WorkspaceGitlabSettings` rendu dans `settings/page.tsx`.
  - `gitlabIssueIid: number | null` présent dans `TaskCard.tsx` et `TaskModal.tsx`.

## Threat register status (rappel Plan 05-02)

| Threat ID | Status | Note |
|-----------|--------|------|
| T-05-08 (Elevation of Privilege via PUT/DELETE) | mitigated | `auth()` + `requireMembership` + `member.role !== "OWNER"` → 403 |
| T-05-09 (Information Disclosure secret) | accepted | Page settings OWNER-only via `notFound()`. Stockage en clair v1. |
| T-05-10 (Tampering / SSRF via gitlabBaseUrl) | mitigated | Pas d'appel sortant serveur vers `gitlabBaseUrl`. Validation regex `^https?://.+`. |
| T-05-11 (Tabnabbing) | mitigated | `rel="noopener noreferrer"` systématique sur tous les `<a target="_blank">` |
| T-05-12 (XSS via gitlabIssueUrl) | accepted | React échappe automatiquement. Validation amont par le webhook. |
| T-05-13 (Régénération sans avertir GitLab) | accepted | UX confirm dialog explicite + bloc d'aide affiche les étapes côté GitLab |

## Deviations from Plan

None — plan exécuté exactement comme écrit. Aucune Rule 1/2/3 déclenchée pendant l'exécution.

## Smoke test à effectuer post-déploiement Coolify

1. Login OWNER → `/workspace/<id>/settings` → section "Intégration GitLab" visible.
2. Saisir `Base URL = https://gitlab.com`, `Project ID = mygroup/myrepo`, "Enregistrer" → secret généré et affiché.
3. "Régénérer" → confirm → nouveau secret affiché.
4. Côté GitLab : Settings → Webhooks → coller URL + Secret token + cocher "Issues events" → Save.
5. Créer une issue GitLab → tâche apparaît dans `/workspace/<id>/list` avec badge "🦊 GitLab #N".
6. Clic sur le badge → ouvre l'issue dans un nouvel onglet (NE déclenche PAS le modal).
7. Clic sur le titre de la tâche → modal affiche le bandeau orange "Issue GitLab : #N".
8. Fermer l'issue côté GitLab → tâche passe à `done` automatiquement (logique Plan 05-01).
9. Login MEMBER (non-OWNER) → `/workspace/<id>/settings` retourne 404 (déjà le cas Phase 2).
10. `curl -X PUT /api/workspaces/<id>/gitlab` avec session MEMBER → 403.

## Notes pour Phase 6+

- Onboarding wizard : ajouter étape "Liaison GitLab" facultative.
- OAuth GitLab : déféré v2 (actuellement webhook entrant uniquement, pas d'API call sortant).
- Hash du secret en base : déféré v2 (cohérent avec discordWebhookSecret stocké en clair).
- Tests E2E Playwright pour la flow complète (issue créée → tâche créée → close → done) — déféré (besoin d'un mock GitLab webhook).

## Self-Check: PASSED

Files created (verified via test -f):
- `src/app/api/workspaces/[id]/gitlab/route.ts` FOUND
- `src/components/ui/WorkspaceGitlabSettings.tsx` FOUND

Commits (verified via git log):
- `e7cab1c` FOUND (Task 1)
- `dc4a59f` FOUND (Task 2)
- `d6bfa2a` FOUND (Task 3)
