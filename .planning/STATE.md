# Project State

## Current Status
- **Phase:** 6 — Notifications & Polish (in progress)
- **Current Plan:** 06-02 complete, next is 06-03
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
| 6 — Notifications & Polish | 🟡 In progress (2/3 plans verified) |

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
- Notifications in-app : modèle Prisma Notification + enum NotificationType (task_assigned, task_due_soon, task_completed, task_mentioned), index composite (userId, readAt, createdAt DESC) pour servir badge + dropdown
- Helpers notifications fire-and-forget (src/lib/notifications.ts) : createNotification / notifyAssignment / notifyCompletion, jamais throw (try/catch + console.warn)
- Routes API notifications scopées par userId (pas requireMembership) : GET /api/notifications + PATCH [id] (idempotent) + POST mark-all-read
- task_due_soon non générée en DB par les routes : computed at fetch time (décision CONTEXT). task_mentioned déférée v2.
- Hooks notifs intégrés dans POST + PATCH tasks via `void notifyAssignment(...)` et `void notifyCompletion(...)` — jamais await
- NotificationsDropdown : polling 60s + onFocus revalidation (alternative bon marché à WebSocket/SSE pour MVP)
- ThemeToggle next-themes : mounted-check obligatoire pour éviter hydration mismatch + placeholder SVG vide pendant mount (pas de flash)
- Optimistic UI mark-as-read : state local mis à jour AVANT le PATCH, fire-and-forget (catch silencieux). Pour mark-all-read : rollback complet sur erreur.
- /search : page server avec scope membership strict (`workspaceId: { in: workspaceIds }`) — NFR-02 isolation par construction. `mode: "insensitive"` Prisma sur title+description, take: 50 (pagination v2)
- PATCH /api/users/me : patch partiel (name et image indépendamment optionnels), validation URL http(s) stricte avec `new URL(...)`, name trim ≤ 100 chars
- Header redesign 3 zones (brand / SearchInput centré flex-1 / actions) — API HeaderProps inchangée (zero breaking change pour les 5 pages consommatrices)
- SearchInput hidden md:block, username avatar hidden lg:inline (responsive NFR-04 mobile-first)

## Stopped At
06-02-PLAN.md — Complete. UI Header (dropdown notifs + dark toggle + search input), page /search server scopée membership, /profile étendue avec ProfileForm, route PATCH /api/users/me. Next: 06-03-PLAN.md (README Coolify + .env.example + audit a11y).

## Last session
2026-05-11 — Completed 06-02-PLAN.md: 4 nouveaux composants UI (NotificationsDropdown polling+optimistic, ThemeToggle mounted-check, SearchInput hidden md:block, ProfileForm name+image), Header.tsx refactor 3 zones, page server /search (membership-scoped Prisma findMany, ILIKE title|description, take 50), /profile étendue avec section Compte + Intégrations, route PATCH /api/users/me (validation name ≤100 + URL http(s) stricte). TS clean, build OK (14 pages générées).
