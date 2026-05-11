# Project State

## Current Status
- **Phase:** 6 — Notifications & Polish (next, final phase)
- **Current Plan:** Phase 5 complete (2/2 plans verified)
- **Milestone:** 1 — v1.0 Foundation to Launch
- **Last updated:** 2026-05-11

## Phase Progress
| Phase | Status |
|-------|--------|
| 1 — Bootstrap & Infra | ✅ Complete (3/3 plans verified) |
| 2 — Auth & Workspaces | ✅ Complete (3/3 plans verified) |
| 3 — Core Task Management | ✅ Complete (4/4 plans verified) |
| 4 — Discord Integration | ✅ Complete (3/3 plans verified) |
| 5 — GitLab Integration | ✅ Complete (2/2 plans verified) |
| 6 — Notifications & Polish | 🔲 Not started |

## Key Decisions
- OAuth uniquement (Google + GitHub) — pas d'email/password
- Discord bot via discord.js (service Docker séparé)
- GitLab uniquement (pas GitHub) pour les webhooks
- Interface en français
- Dark mode dès le départ (Tailwind)
- Next.js 16.2.6 (create-next-app@latest), Tailwind v4 CSS-first, Prisma v5

## Key Decisions (added)
- requireMembership extrait vers src/lib/auth-helpers.ts (source unique)
- db push bloqué localhost:5432 inaccessible — prisma generate suffit pour TypeScript
- TaskStatus enums en minuscules (todo, in_progress) alignés sur Kanban
- ListPageClient créé comme wrapper client — point d'injection du TaskModal en plan 04
- hasActiveFilters() remplace la comparaison par référence d'objet dans ListView
- KanbanPageClient créé comme wrapper client — point d'injection du TaskModal en plan 04
- TaskCard stub créé pour compatibilité TypeScript (plan 03-02 livre l'implémentation complète)
- Sérialisation explicite des dates Prisma en ISO strings dans les pages server
- resolveContext (bot/src/lib) — pipeline guild→workspace + Discord user→app user, error-as-data avec union typé
- Discord embeds : couleurs par priorité (urgent=rouge, high=orange, medium=bleu, low=gris)
- /task done accepte un préfixe court (4+ chars) via Prisma startsWith ; ambigu si N≥2 matches
- Toutes les queries Prisma des handlers Discord scoped par workspaceId — cross-workspace impossible par construction
- bot/src/lib/embeds.ts utilise un fallback APP_URL chain (NEXT_PUBLIC_APP_URL ?? APP_URL ?? default)
- notifyDiscord helper fire-and-forget (void + AbortController 3s) — une notification Discord ratée ne bloque jamais une mutation tâche
- Détection transition vers done : findUnique({ select: { id, status }}) AVANT update, comparaison existing.status !== "done" && task.status === "done"
- API config Discord OWNER-only : auth + requireMembership + check role !== "OWNER" → 403 (T-04-11 mitigé)
- Validation snowflake serveur (/^\d{17,20}$/) ET client (HTML pattern) — défense en profondeur
- /api/users/me/discord et /api/workspaces/[id]/discord : PUT idempotent uniquement (pas de POST — un user/workspace a 0 ou 1 valeur)
- Channel discordChannelId NULL → 204 No Content côté bot (pas une erreur)
- DISCORD_BOT_NOTIFY_URL côté web (default http://discord-bot:8080/notify), NEXT_PUBLIC_APP_URL côté discord-bot (déjà APP_URL existait)
- Webhook GitLab : auth via X-Gitlab-Token uniquement (pas de session NextAuth) avec `crypto.timingSafeEqual` constant-time
- Idempotence webhook GitLab : findFirst({ workspaceId, gitlabIssueIid }) avant create — pas d'@unique global sur gitlabIssueIid (même IID possible dans 2 projets distincts)
- createdById des tâches webhook = OWNER du workspace (user "système" pour les tâches créées via webhook GitLab)
- Assignee webhook GitLab : best-effort par email + must already be member (sinon assigneeId = null, pas d'élévation T-05-07)
- Logs serveur webhook : workspaceId only, jamais le secret ni le token reçu (T-05-03)

## Stopped At
05-01-PLAN.md — Complete. Schema Prisma étendu (Workspace + Task), endpoint webhook GitLab livré. Next: 05-02-PLAN.md (UI settings GitLab + API config + lien retour TaskCard).

## Last session
2026-05-09 — Completed 05-01-PLAN.md: schema Prisma étendu (gitlabProjectId/gitlabBaseUrl/gitlabWebhookSecret sur Workspace + gitlabIssueIid/gitlabIssueUrl sur Task), endpoint POST /api/webhooks/gitlab/[workspaceId] avec validation X-Gitlab-Token (timingSafeEqual), idempotence par findFirst, mapping issue → tâche (open/close/reopen), priority dérivée des labels, tags upsertés, assignee best-effort par email, notifyDiscord("task.created") fire-and-forget. db push déféré Coolify (DB locale inaccessible).
