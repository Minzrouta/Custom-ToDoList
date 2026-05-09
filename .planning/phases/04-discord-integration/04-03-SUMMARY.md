---
phase: 04-discord-integration
plan: 03
subsystem: discord-integration
tags: [discord-bot, notifications, settings, workspace, user-profile]
requires:
  - 04-01 (Prisma fields + bot scaffold + docker-compose service)
  - 04-02 (slash command handlers + embed builders)
provides:
  - "POST /notify (bot) → Discord channel via Workspace.discordChannelId"
  - "notifyDiscord() helper fire-and-forget côté Next.js"
  - "PUT/DELETE /api/workspaces/[id]/discord (OWNER only) — guildId+channelId"
  - "PUT/DELETE /api/users/me/discord — discordId du user courant"
  - "/profile page (server) hébergeant UserDiscordSettings"
  - "Section Discord intégrée dans /workspace/[id]/settings"
affects:
  - src/app/api/workspaces/[id]/tasks/route.ts (POST → notifyDiscord task.created)
  - src/app/api/workspaces/[id]/tasks/[taskId]/route.ts (PATCH → notifyDiscord task.completed sur transition)
  - src/app/workspace/[id]/settings/page.tsx (intègre WorkspaceDiscordSettings)
  - bot/src/notify-server.ts (stub remplacé par dispatcher réel)
  - docker-compose.yml (env DISCORD_BOT_NOTIFY_URL + NEXT_PUBLIC_APP_URL)
tech-stack:
  added: []
  patterns:
    - "fire-and-forget via void notifyDiscord(...) — JAMAIS await"
    - "AbortController + timeout 3s pour ne pas bloquer la mutation"
    - "SNOWFLAKE_REGEX /^\\d{17,20}$/ validé serveur ET client (HTML pattern)"
    - "OWNER-only check via requireMembership + role check explicite"
    - "Response.json() partout (jamais NextResponse)"
    - "await params pour les routes dynamiques"
    - "bot ESM avec extension .js dans imports relatifs (NodeNext)"
    - "Best-effort logging : console.warn côté app, log/error côté bot"
key-files:
  created:
    - src/lib/discord-notify.ts
    - src/app/api/workspaces/[id]/discord/route.ts
    - src/app/api/users/me/discord/route.ts
    - src/components/ui/WorkspaceDiscordSettings.tsx
    - src/components/ui/UserDiscordSettings.tsx
    - src/app/profile/page.tsx
  modified:
    - bot/src/notify-server.ts
    - src/app/api/workspaces/[id]/tasks/route.ts
    - src/app/api/workspaces/[id]/tasks/[taskId]/route.ts
    - src/app/workspace/[id]/settings/page.tsx
    - docker-compose.yml
decisions:
  - "Fire-and-forget : notifyDiscord est appelé sans await (void). Une notification ratée ne bloque jamais la réponse API."
  - "Timeout 3s avec AbortController : si le bot est down, l'app n'est pas bloquée plus de 3s."
  - "Validation snowflake côté serveur (SNOWFLAKE_REGEX) + côté client (HTML pattern) — défense en profondeur."
  - "Détection transition vers done : findUnique(select: { status }) AVANT update, comparaison existing.status !== 'done' && task.status === 'done'."
  - "Pas de POST sur /api/users/me/discord ni /api/workspaces/[id]/discord — uniquement PUT (idempotent : un user/workspace a 0 ou 1 valeur)."
  - "Pas d'auth sur /notify v1 — mitigation réseau (port 8080 non mappé publiquement, voir T-04-01)."
  - "Channel inaccessible/non-textuel → 502/422 côté bot, mais l'app warn et continue (best-effort)."
  - "Workspace.discordChannelId NULL → 204 (no content) — pas une erreur, c'est juste 'pas de channel configuré'."
  - "guildId unique par workspace (Prisma @unique) + check 409 explicite côté API si tentative de double liaison."
metrics:
  duration_seconds: 1100
  completed: 2026-05-09
  tasks_completed: 5
  files_changed: 11
---

# Phase 4 Plan 03: Discord notifications + UI settings Summary

**One-liner:** Câblage end-to-end des notifications Discord (app → bot via HTTP interne → channel via discord.js) + UI settings OWNER pour la liaison guildId/channelId d'un workspace + page profil user pour saisir le discordId.

## Ce qui a été livré

### `bot/src/notify-server.ts` (commit d94460d) — task 1
Stub 04-01 remplacé par implémentation réelle :
- Validation typée `isValidPayload` (type "task.created"|"task.completed", workspaceId, task{id,title,...}).
- Lookup `Workspace.discordChannelId` via Prisma.
- Si NULL → 204 No Content (skip silencieux, log info).
- `client.channels.fetch(channelId)` ; si ko → 502, si non-textuel → 422.
- Construit l'embed via `buildTaskActionEmbed` (déjà livré 04-02), avec titre selon type ("Nouvelle tache" / "Tache terminee").
- `actor.name` injecté en `content` du message ("Par : <name>").
- Health endpoint `/health` retourne `{ status, botReady }`.
- Erreur 503 si bot pas encore ready (avant Discord login).

### `src/lib/discord-notify.ts` (commit 827bb6e) — task 2
Helper Next.js fire-and-forget :
- Lit `DISCORD_BOT_NOTIFY_URL` (default `http://discord-bot:8080/notify`).
- `AbortController` avec timeout 3s.
- Convertit `Date | string | null` en ISO string pour le wire format.
- `try/catch` swallow : log warn et continue. **Ne throw jamais.**

### Branchement mutations tasks (commit 827bb6e) — task 2
- `POST /api/workspaces/[id]/tasks` : `void notifyDiscord({ type: "task.created", ... })` après `prisma.task.create` réussi.
- `PATCH /api/workspaces/[id]/tasks/[taskId]` : `findUnique({ select: { status } })` AVANT update pour récupérer l'ancien statut, puis si `existing.status !== "done" && task.status === "done"` → `void notifyDiscord({ type: "task.completed", ... })`.
- `select` du `existing` minimisé (id, status uniquement) — efficacité.
- `category` extrait via `task.category ? { name: task.category.name } : null` — shape minimal pour le wire.

### API routes config Discord (commit 50f402a) — task 3

**`PUT/DELETE /api/workspaces/[id]/discord`** (OWNER only)
- Auth + `requireMembership` + check `member.role !== "OWNER"` → 403.
- Validation snowflake `/^\d{17,20}$/` côté serveur.
- Conflit guildId : findUnique → 409 si lié à un autre workspace.
- DELETE met `discordGuildId` ET `discordChannelId` à null (un seul "unlink").

**`PUT/DELETE /api/users/me/discord`**
- Auth uniquement (pas de membership — c'est le user courant).
- Validation snowflake serveur.
- Conflit discordId : findUnique → 409 si lié à un autre user.
- Pas de POST — PUT idempotent.

### UI client (commit 5609384) — task 4

**`WorkspaceDiscordSettings.tsx`** — section client dans `/workspace/[id]/settings`
- 2 inputs (guildId + channelId) avec `pattern="\d{17,20}"` HTML.
- Boutons "Enregistrer" + "Délier" (visible seulement si déjà lié).
- States loading / error / success séparés.
- `router.refresh()` après mutation pour recharger la page server.

**`UserDiscordSettings.tsx`** — section client dans `/profile`
- 1 input discordId avec pattern HTML.
- Boutons "Enregistrer" + "Délier".
- Même pattern UX que WorkspaceDiscordSettings.

**`src/app/workspace/[id]/settings/page.tsx`** — étendu
- Import `WorkspaceDiscordSettings`.
- Le `include: { workspace: true }` ramenait déjà `discordGuildId`/`discordChannelId` (pas de modif Prisma nécessaire).
- Wrapping dans `<div className="space-y-8">` pour aligner les sections.

**`src/app/profile/page.tsx`** — page server créée
- `auth()` + redirect signin si pas connecté.
- `prisma.user.findUnique({ select: { id, name, email, discordId }})`.
- Header + breadcrumb + UserDiscordSettings.

### `docker-compose.yml` (commit 900df07) — task 5
- Service `web` : ajout `DISCORD_BOT_NOTIFY_URL: ${DISCORD_BOT_NOTIFY_URL:-http://discord-bot:8080/notify}`.
- Service `discord-bot` : ajout `NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-https://tasks.bantou.me}` (en plus de `APP_URL` déjà présent — fallback chain dans bot/src/lib/embeds.ts).
- `docker compose config` : exit 0, YAML valide. Warnings env vars expected en dev local.

## Contrat NotifyPayload (app ↔ bot)

```typescript
type NotifyPayload =
  | {
      type: "task.created";
      workspaceId: string;
      task: {
        id: string;
        title: string;
        priority: "low" | "medium" | "high" | "urgent";
        status: "todo" | "in_progress" | "done" | "cancelled";
        category: { name: string } | null;
        dueDate: string | null; // ISO string
      };
      actor: { name: string | null };
    }
  | {
      type: "task.completed";
      workspaceId: string;
      task: { /* idem */ status: "done" };
      actor: { name: string | null };
    };
```

## Flux complet — exemple "user clique Done"

1. Browser : DnD Kanban → `PATCH /api/workspaces/<id>/tasks/<taskId>` `{ status: "done" }`
2. Next.js handler : `auth()` → `requireMembership` → `findUnique({ select: { status }})` → `prisma.task.update`
3. `existing.status === "in_progress" && updated.status === "done"` → `void notifyDiscord(...)`
4. `notifyDiscord` : `fetch http://discord-bot:8080/notify` avec timeout 3s
5. Bot `notify-server.ts` reçoit POST, valide payload, `prisma.workspace.findUnique` → `discordChannelId`
6. `client.channels.fetch(discordChannelId)` → channel textuel
7. `buildTaskActionEmbed(...)` (titre "Tache terminee", couleur priorité)
8. `channel.send({ content: "Par : <name>", embeds: [embed] })`
9. Bot répond 200, app reçoit la réponse (ou ne la lit pas — fire-and-forget)
10. **Parallèlement** Next.js a déjà retourné `Response.json({ data: task })` au browser (le `void` n'attend pas le bot).

## Variables d'environnement ajoutées

| Variable | Service | Default | Usage |
|---------|---------|---------|-------|
| `DISCORD_BOT_NOTIFY_URL` | web | `http://discord-bot:8080/notify` | URL HTTP interne du bot. Surchargeable en dev local (ex: `http://localhost:8080/notify`). |
| `NEXT_PUBLIC_APP_URL` | discord-bot | `https://tasks.bantou.me` | URL de l'app pour les liens dans les embeds (footer/setURL). Déjà existait côté `web`. |

## Threat register status

| Threat ID | État | Mitigation appliquée |
|-----------|------|---------------------|
| T-04-11 (Elevation OWNER) | mitigé | `auth()` + `requireMembership` + `member.role !== "OWNER"` → 403 dans PUT et DELETE. |
| T-04-12 (Tampering discordId) | mitigé | `findUnique({ where: { discordId }})` + check de conflit → 409. Un user ne peut jamais "voler" un Discord ID déjà pris. |
| T-04-13 (No auth /notify) | accept (mitigation réseau) | Port 8080 non mappé publiquement (voir 04-01). v1 acceptable. v2 : ajouter `BOT_NOTIFY_SECRET` partagé. |
| T-04-14 (DoS bot lent) | mitigé | `AbortController` timeout 3s + `void` (fire-and-forget). Une notification ne peut JAMAIS bloquer une mutation tâche. |
| T-04-15 (Snowflake invalide) | mitigé | `SNOWFLAKE_REGEX = /^\d{17,20}$/` côté serveur dans les 2 routes API. Pattern HTML côté UI = défense en profondeur. |
| T-04-16 (Mauvais channel) | mitigé | Le bot fetch le channelId du WORKSPACE (pas d'un autre). Si l'OWNER configure un channel à problème, c'est sa responsabilité — pas de fuite cross-workspace. |
| T-04-17 (MEMBER lie un guild) | mitigé | API renvoie 403, et la page `/workspace/[id]/settings` est déjà OWNER-only depuis Phase 2. |

## Vérifications automatiques (passées)

- `cd bot && npx tsc --noEmit` : aucune erreur
- `npx tsc --noEmit` (root Next.js) : aucune erreur
- `npm run build` : succès (10/10 pages générées, routes `/api/workspaces/[id]/discord`, `/api/users/me/discord`, `/profile` listées)
- `docker compose config` : exit 0, YAML valide (warnings env-vars expected en dev)
- Audit grep `await\s+notifyDiscord` dans `src/app/api/` : aucun match (fire-and-forget respecté partout)
- Audit grep `NextResponse` dans nouvelles routes API : aucun match (pattern Response.json respecté)

## Vérification manuelle (checkpoint Task 6) — auto-approuvée en mode autonomous

Le plan inclut un checkpoint `human-verify` pour tester end-to-end avec un vrai bot Discord. Ce test ne peut pas être automatisé sans :
- Bot Discord créé sur https://discord.com/developers/applications
- Bot invité sur un serveur Discord avec scope `bot applications.commands` + permission "Envoyer des messages"
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` configurés dans Coolify ou `.env`
- `npx prisma db push` exécuté sur la prod

**Checklist de vérification à effectuer lors du déploiement Coolify :**

1. `docker compose exec web wget -qO- http://discord-bot:8080/health` → `{"status":"ok","botReady":true}`
2. **Liaison user (UI)** : `/profile` → saisir Discord ID → "Discord ID enregistré."
3. **Liaison workspace (UI)** : `/workspace/<id>/settings` (OWNER) → saisir guildId + channelId → "Configuration mise à jour."
4. **Slash command Discord** : `/task add titre:Test priorite:urgent` → embed éphémère "Tache creee".
5. **Notification task.created** : créer une tâche via l'app → embed dans le channel Discord configuré.
6. **Notification task.completed** : passer une tâche à "done" via l'app → embed "Tache terminee" dans le channel.
7. **Resilience channel mal configuré** : channelId invalide → tâche créée OK, log warn dans web, app NE PLANTE PAS.
8. **Resilience bot down** : `docker compose stop discord-bot` → créer une tâche → tâche créée OK, log warn, app continue. Redémarrer le bot.

**Status checkpoint :** auto-approuvé en mode autonomous (configuration `autonomous: true` du plan). Vérification manuelle déférée au déploiement Coolify.

## Deviations from Plan

Aucune déviation. Plan exécuté exactement comme rédigé, à 2 nuances mineures de mise en forme TypeScript (pas de changement de comportement) :

- Dans `notify-server.ts`, le typage de la variable locale `channel` utilise `Awaited<ReturnType<Client["channels"]["fetch"]>>` au lieu de `TextBasedChannel` (le narrowing via `isTextBased()` + `"send" in channel` se fait après le fetch — typage discord.js v14 plus strict que ne l'évoquait le pseudocode du plan).
- Dans `tasks/[taskId]/route.ts`, la transition vers "done" est détectée sur la variable `existing` (déjà fetched par le code initial) plutôt que d'introduire une nouvelle variable `before` — réutilise le findUnique existant en y ajoutant `select: { id, status }`.

## Auto-approve checkpoint

Le plan est `autonomous: true`. Conformément au protocole executor, le checkpoint `human-verify` (Task 6) est auto-approuvé : le code est complet, les vérifications automatiques passent, mais la vérification fonctionnelle nécessite un environnement Discord live (token bot, serveur de test, channel). Cette vérification sera effectuée lors du déploiement Coolify.

## Note pour Phase 6 (Polish)

- Ajouter un lien "Profil" dans `Header.tsx` (actuellement `/profile` accessible uniquement par URL directe).
- Lint pre-existing à corriger : 2 erreurs `react/no-unescaped-entities` dans `InviteModal.tsx` et `WorkspaceSettingsForm.tsx` (Phase 2). Voir `deferred-items.md`.
- OAuth Discord pour éviter saisie manuelle du discordId (déjà noté deferred dans CONTEXT.md, v2).
- Boutons d'action Discord (Marquer terminée, Voir détails) sur les embeds (v2).

## Self-Check: PASSED

Files created (FOUND):
- src/lib/discord-notify.ts
- src/app/api/workspaces/[id]/discord/route.ts
- src/app/api/users/me/discord/route.ts
- src/components/ui/WorkspaceDiscordSettings.tsx
- src/components/ui/UserDiscordSettings.tsx
- src/app/profile/page.tsx

Files modified (FOUND):
- bot/src/notify-server.ts
- src/app/api/workspaces/[id]/tasks/route.ts
- src/app/api/workspaces/[id]/tasks/[taskId]/route.ts
- src/app/workspace/[id]/settings/page.tsx
- docker-compose.yml

Commits (FOUND):
- d94460d feat(04-03): cable notify-server bot vers le bon channel via discordChannelId
- 827bb6e feat(04-03): helper notifyDiscord + branchement fire-and-forget sur create/done
- 50f402a feat(04-03): API routes config Discord workspace (OWNER) + user me
- 5609384 feat(04-03): UI Discord settings (workspace + profil user)
- 900df07 feat(04-03): docker-compose env vars DISCORD_BOT_NOTIFY_URL + NEXT_PUBLIC_APP_URL bot

Verifications:
- bot tsc --noEmit : OK
- root tsc --noEmit : OK
- npm run build : OK (10/10 pages, nouvelles routes listées)
- docker compose config : exit 0
- Audit fire-and-forget : `grep "await notifyDiscord"` → 0 match
- Audit pattern Response.json : `grep "NextResponse"` dans nouvelles routes → 0 match
