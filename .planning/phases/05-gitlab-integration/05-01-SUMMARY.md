---
phase: 05-gitlab-integration
plan: 01
subsystem: gitlab-webhook
tags: [gitlab, webhook, prisma, security, idempotence]
requirements: [FR-08, NFR-02]
dependency_graph:
  requires:
    - "prisma/schema.prisma (Workspace, Task)"
    - "src/lib/discord-notify.ts (notifyDiscord helper)"
    - "src/lib/prisma.ts (singleton)"
  provides:
    - "Workspace.gitlabProjectId / gitlabBaseUrl / gitlabWebhookSecret"
    - "Task.gitlabIssueIid / gitlabIssueUrl"
    - "POST /api/webhooks/gitlab/[workspaceId]"
  affects:
    - "Tâches : créées/closes/réouvertes via webhook GitLab"
    - "Discord : notifyDiscord('task.created') déclenché en fire-and-forget"
tech_stack:
  added: []
  patterns:
    - "timingSafeEqual constant-time pour validation X-Gitlab-Token"
    - "Idempotence via findFirst({ workspaceId, gitlabIssueIid }) avant create"
    - "Tags upsertés depuis labels GitLab"
    - "Fire-and-forget Discord (void notifyDiscord — jamais await)"
key_files:
  created:
    - "src/app/api/webhooks/gitlab/[workspaceId]/route.ts"
  modified:
    - "prisma/schema.prisma"
decisions:
  - "timingSafeEqual avec fallback même-buffer si longueurs différentes (coût constant + return false)"
  - "createdById = OWNER du workspace (user système pour les tâches webhook)"
  - "Assignee best-effort : email match + must already be member (sinon null)"
  - "Pas de @unique global sur gitlabIssueIid — unicité fonctionnelle (IID + workspaceId) dans le handler"
  - "Logs serveur ne contiennent JAMAIS le secret (workspaceId only)"
  - "object_kind != 'issue' → 200 + skip (best-effort, pas une erreur)"
  - "action 'update' → 200 + skip (déféré v2)"
metrics:
  duration: "5 minutes"
  completed: "2026-05-09"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Phase 5 Plan 01: Prisma GitLab fields + Webhook endpoint — Summary

**One-liner :** Schema Prisma étendu avec champs GitLab (Workspace + Task) et webhook entrant `POST /api/webhooks/gitlab/[workspaceId]` avec validation X-Gitlab-Token constant-time, idempotence, mapping issue → tâche (open/close/reopen), et notification Discord en fire-and-forget.

## What Was Built

### 1. Prisma schema extensions (`prisma/schema.prisma`)

**Workspace** (3 nouveaux champs optionnels, après `discordChannelId`) :
- `gitlabProjectId  String?` — ID numérique GitLab ou path (`mygroup/myrepo`)
- `gitlabBaseUrl    String?` — pour self-hosted (default app : `https://gitlab.com`)
- `gitlabWebhookSecret String?` — secret partagé pour valider X-Gitlab-Token

**Task** (2 nouveaux champs optionnels, après `dueDate`) :
- `gitlabIssueIid Int?` — IID issue GitLab (numéro court par projet)
- `gitlabIssueUrl String?` — URL complète vers l'issue source

Aucun index ajouté, aucun `@unique` global sur `gitlabIssueIid` (la même IID peut exister dans deux projets GitLab différents → workspaces différents). L'unicité fonctionnelle est gérée par `findFirst({ workspaceId, gitlabIssueIid })` dans le handler.

### 2. État `prisma db push`

**Déféré au déploiement Coolify** — la DB locale (`localhost:5432`) est inaccessible (P1001), comme noté dans STATE.md (cohérent avec les phases précédentes). `npx prisma generate` a réussi (Task 1) → le client TypeScript reflète bien les nouveaux champs et le code compile (`tsc --noEmit` + `npm run build` OK). Coolify exécutera la migration au prochain déploiement.

### 3. Endpoint webhook (`src/app/api/webhooks/gitlab/[workspaceId]/route.ts`)

Exporte uniquement `POST`. Pipeline :

1. **Charge le workspace** (`prisma.workspace.findUnique`) + son `gitlabWebhookSecret`. Si workspace absent ou secret null → **401**.
2. **Valide le token** : header `x-gitlab-token` comparé à `gitlabWebhookSecret` via `timingSafeEqual` (helper `tokensEqual` qui gère les longueurs différentes en coût constant). Token absent ou invalide → **401**.
3. **Parse le body** (`request.text()` puis `JSON.parse`). Body malformé → **400**.
4. **Filtre** : `object_kind !== "issue"` → 200 + skip (merge_request, pipeline, etc. ignorés v1).
5. **Route selon `object_attributes.action`** :
   - `open` :
     - **Idempotence** : `findFirst({ workspaceId, gitlabIssueIid })` → si existe, **200 + skip**.
     - Sinon : récupère l'OWNER du workspace pour `createdById`, dérive la `priority` depuis les labels (`urgent`/`high`/`medium`/`low`), upsert les tags depuis les autres labels, match l'`assignee` par email (best-effort + must be member), crée la tâche, déclenche `void notifyDiscord("task.created")`. **201**.
   - `close` : `findFirst` → marque `status = "done"`. **200**.
   - `reopen` : `findFirst` → marque `status = "todo"`. **200**.
   - `update` ou autre : 200 + skip (déféré v2).
6. **Erreur interne** → **500** + `console.error`.

**Sécurité (NFR-02)** :
- `timingSafeEqual` (constant-time) — pas de `===` qui leak via timing.
- Logs ne contiennent JAMAIS `receivedToken` ni `gitlabWebhookSecret`. Seulement `workspaceId` + message générique.
- Aucun `requireMembership`, aucun `auth()` — webhook public protégé par token uniquement.

## Deviations from Plan

**None — plan executed exactly as written.**

Le seul écart "attendu" est Task 2 (`prisma db push`) qui n'a pas pu accéder à la DB locale. Le plan le prévoit explicitement (clause `blocked-deferred-to-coolify`) et le code TypeScript compile grâce au client Prisma régénéré en Task 1. La migration sera appliquée au déploiement Coolify.

## Threat Register Status

| Threat ID | Component | Disposition | Status |
|-----------|-----------|-------------|--------|
| T-05-01 | webhook X-Gitlab-Token | mitigate | ✅ `timingSafeEqual` + workspace sans secret → 401 |
| T-05-02 | payload JSON arbitraire | mitigate | ✅ `object_kind === "issue"`, `typeof iid === "number"`, types stricts, JSON malformé → 400 |
| T-05-03 | Information Disclosure (logs) | mitigate | ✅ Logs `workspaceId` only, jamais le secret ou le token reçu |
| T-05-04 | DoS flood webhook | accept | (rate limiting déféré v2 — peu de webhooks attendus) |
| T-05-05 | Cross-workspace pollution | mitigate | ✅ Toutes les queries Prisma scopées par `workspaceId` du path. Token unique par workspace. |
| T-05-06 | Doublons via webhook ré-émis | mitigate | ✅ `findFirst({ workspaceId, gitlabIssueIid })` avant create → 200 + skip |
| T-05-07 | Assignee email spoofing | accept | ✅ Match email best-effort + vérif membership → si pas membre, `assigneeId = null` (pas d'élévation) |

## Verifications Passed

- `grep -c "gitlabProjectId\|gitlabBaseUrl\|gitlabWebhookSecret\|gitlabIssueIid\|gitlabIssueUrl" prisma/schema.prisma` → **5** ✅
- `npx prisma generate` → **Generated Prisma Client (v5.22.0)** ✅
- `npx tsc --noEmit` → **0 erreur** ✅
- `npm run build` → **succès**, route `/api/webhooks/gitlab/[workspaceId]` listée comme `ƒ` (server-rendered on demand) ✅
- `grep -q "timingSafeEqual"` route.ts → ✅
- `grep -q "void notifyDiscord"` route.ts → ✅
- `grep -q "x-gitlab-token"` route.ts → ✅
- `! grep -q "requireMembership\|auth()"` route.ts → ✅ (aucune occurrence)
- `grep -c "await\s\+notifyDiscord"` route.ts → **0** ✅ (fire-and-forget respecté)

## Authentication Gates

Aucune. Webhook public protégé par token uniquement (par design — pas de session NextAuth).

## Notes for Plan 05-02

Le plan suivant (UI settings + lien retour) doit livrer :
- **Section "Intégration GitLab" sur `/workspace/[id]/settings`** : champs `gitlabBaseUrl`, `gitlabProjectId`, et bouton "Régénérer le secret" qui appelle un endpoint (à créer) qui set `gitlabWebhookSecret = randomBytes(32).toString("hex")`.
- **Affichage de l'URL webhook** à coller dans GitLab : `${APP_URL}/api/webhooks/gitlab/${workspaceId}` + bouton "copier le secret".
- **API config** : nouvelle route `PUT /api/workspaces/[id]/gitlab` (OWNER-only, `requireMembership` + check role, sur le pattern 04-03 pour Discord).
- **Lien retour sur la tâche** : si `task.gitlabIssueUrl` présent → badge GitLab `#{iid}` cliquable sur TaskCard et dans TaskModal (target="_blank").
- **Important** : la migration `prisma db push` reste déférée — elle s'exécutera côté Coolify quand l'env de prod sera prêt. Le code 05-02 doit malgré tout compiler localement grâce au client déjà généré.

## Self-Check: PASSED

**Files verified existing:**
- `prisma/schema.prisma` — FOUND (modifié)
- `src/app/api/webhooks/gitlab/[workspaceId]/route.ts` — FOUND (créé)
- `.planning/phases/05-gitlab-integration/05-01-SUMMARY.md` — FOUND (ce fichier)

**Commits verified in git log:**
- `e92e300` — feat(05-01): Prisma schema — gitlab fields on Workspace + Task
- `859aea5` — feat(05-01): webhook GitLab /api/webhooks/gitlab/[workspaceId] avec validation token timing-safe + idempotence
