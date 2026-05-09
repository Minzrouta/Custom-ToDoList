# Project State

## Current Status
- **Phase:** 4 — Discord Integration (in progress: 2/3 plans complete)
- **Current Plan:** 04-02 complete. Next: 04-03 (settings UI + notify wiring + Discord ID binding)
- **Milestone:** 1 — v1.0 Foundation to Launch
- **Last updated:** 2026-05-09

## Phase Progress
| Phase | Status |
|-------|--------|
| 1 — Bootstrap & Infra | ✅ Complete (3/3 plans verified) |
| 2 — Auth & Workspaces | ✅ Complete (3/3 plans verified) |
| 3 — Core Task Management | ✅ Complete (4/4 plans verified) |
| 4 — Discord Integration | 🟡 In progress (2/3 plans verified) |
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

## Stopped At
04-02-PLAN.md — Complete. Next: 04-03-PLAN.md (settings UI Discord + notify wiring app→bot)

## Last session
2026-05-09 — Completed 04-02-PLAN.md: resolveContext + embeds helpers, 3 handlers (/task add, /task list, /task done), dispatcher wired to real handlers
