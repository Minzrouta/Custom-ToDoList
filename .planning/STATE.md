# Project State

## Current Status
- **Phase:** 3 — Core Task Management (in progress)
- **Current Plan:** 03-01 complete, next: 03-02
- **Milestone:** 1 — v1.0 Foundation to Launch
- **Last updated:** 2026-05-09

## Phase Progress
| Phase | Status |
|-------|--------|
| 1 — Bootstrap & Infra | ✅ Complete (3/3 plans verified) |
| 2 — Auth & Workspaces | ✅ Complete (3/3 plans verified) |
| 3 — Core Task Management | 🔄 In progress (1/4 plans complete) |
| 4 — Discord Integration | 🔲 Not started |
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

## Stopped At
03-01-PLAN.md — Complete. Next: 03-02-PLAN.md (TaskCard, FilterBar, ListView)

## Last session
2026-05-09 — Completed 03-01-PLAN.md: Prisma schema + auth-helpers + 9 API routes
