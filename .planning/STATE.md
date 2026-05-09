# Project State

## Current Status
- **Phase:** 4 — Discord Integration (Complete: 3/3 plans)
- **Current Plan:** 04-03 complete. Phase 4 terminée. Next: Phase 5 (GitLab Integration)
- **Milestone:** 1 — v1.0 Foundation to Launch
- **Last updated:** 2026-05-09

## Phase Progress
| Phase | Status |
|-------|--------|
| 1 — Bootstrap & Infra | ✅ Complete (3/3 plans verified) |
| 2 — Auth & Workspaces | ✅ Complete (3/3 plans verified) |
| 3 — Core Task Management | ✅ Complete (4/4 plans verified) |
| 4 — Discord Integration | ✅ Complete (3/3 plans verified) |
| 5 — GitLab Integration | 🔲 Not started |
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

## Stopped At
04-03-PLAN.md — Complete. Phase 4 (Discord Integration) terminée. Next: Phase 5 (GitLab Integration) — 05-01-PLAN.md à créer.

## Last session
2026-05-09 — Completed 04-03-PLAN.md: notify-server câblé vers discordChannelId, helper notifyDiscord fire-and-forget, branchement POST/PATCH tasks, API routes /api/workspaces/[id]/discord (OWNER) + /api/users/me/discord, UI WorkspaceDiscordSettings + UserDiscordSettings, page /profile, env vars docker-compose.
