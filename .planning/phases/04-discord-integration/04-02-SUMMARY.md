---
phase: 04-discord-integration
plan: 02
subsystem: discord-bot
tags: [discord-bot, prisma, slash-commands, workspace-isolation]
requires:
  - 04-01 (Prisma fields + bot scaffold + docker-compose service)
provides:
  - "/task add: create Task scoped to guild's workspace"
  - "/task list: paginated 10-task embed listing"
  - "/task done: short-id (startsWith) completion"
  - "resolveContext helper: guild->workspace + Discord user->app user"
  - "embed builders with priority colors"
affects:
  - bot/src/commands/index.ts (dispatcher)
tech-stack:
  added: []
  patterns:
    - "ChatInputCommandInteraction.options.getString + getSubcommand routing"
    - "deferReply ephemeral before all DB calls (Discord 3s limit)"
    - "Prisma where: { workspaceId } on every task query (cross-workspace isolation)"
    - "EmbedBuilder with PRIORITY_COLORS map (urgent/high/medium/low)"
    - "Short-id prefix lookup via Prisma { id: { startsWith } }"
key-files:
  created:
    - bot/src/lib/resolve-context.ts
    - bot/src/lib/embeds.ts
    - bot/src/commands/task-add.ts
    - bot/src/commands/task-list.ts
    - bot/src/commands/task-done.ts
  modified:
    - bot/src/commands/index.ts
decisions:
  - "Resolution flow: guild_id (Discord) -> Workspace.discordGuildId then user_id (Discord) -> User.discordId. Both must succeed."
  - "All Prisma queries in handlers filter by workspaceId resolved from the guild — cross-workspace impossible by construction."
  - "/task done accepts a short prefix (4+ chars) via Prisma startsWith; ambiguous matches reject with explicit error asking for more chars."
  - "Default priority = medium when input is not in {low,medium,high,urgent}; default status filter for /task list = todo+in_progress."
  - "deferReply({ ephemeral: true }) is called BEFORE every DB op to stay under Discord's 3s reply window."
  - "Notification side-effects after mutations (channel push) are NOT triggered here — that lives in 04-03 via the Next.js side and the notify HTTP endpoint."
metrics:
  duration_seconds: 351
  completed: 2026-05-09
  tasks_completed: 3
  files_changed: 6
---

# Phase 4 Plan 02: Discord slash command handlers Summary

**One-liner:** Implémentation des 3 handlers `/task add | list | done` du bot Discord avec resolveContext (guild → workspace + Discord user → app user) et embed builders colorés par priorité.

## Ce qui a été livré

### `bot/src/lib/resolve-context.ts` (commit 829681e)
- `resolveContext(interaction)` : pipeline DM-check → workspace lookup (`Workspace.discordGuildId`) → user lookup (`User.discordId`).
- Retourne un union discriminé `{ ok: true, ctx } | { ok: false, error }` — pas d'exception, error-as-data.
- 3 cas d'erreur typés : `no-guild` (DM), `guild-not-linked`, `user-not-linked`.
- `formatResolveError(err)` : messages FR utilisateur, embarque le Discord ID dans le cas `user-not-linked` pour faciliter la liaison côté app.

### `bot/src/lib/embeds.ts` (commit 829681e)
- `PRIORITY_COLORS` : urgent=0xef4444 (rouge), high=0xf97316 (orange), medium=0x3b82f6 (bleu), low=0x9ca3af (gris).
- `buildTaskActionEmbed(...)` : embed pour create/done avec couleur basée sur priorité, footer = workspace name + short id, URL vers `/workspace/[id]/list`.
- `buildTaskListEmbed(...)` : embed listant max 10 tâches sous forme `\`<idShort>\` <titre> - _<priorité>_ [<cat>] - <échéance>`. Affiche un compteur "N tâche(s) de plus non affichée(s)" si totalCount > tasks.length. Couleur grise quand vide.
- `APP_URL` : `process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://tasks.bantou.me"` (déviation mineure du plan — voir Deviations).

### `bot/src/commands/task-add.ts` (commit 052d43b)
- `deferReply({ ephemeral: true })` puis `resolveContext`.
- Validation titre : trim + bornage 1-200 chars (rule 2 — input validation, déjà au plan).
- `priorité` : whitelist VALID_PRIORITIES, défaut `medium`.
- `categorie` : si fournie, lookup via `Category.@@unique([name, workspaceId])` composite key (`name_workspaceId`). Erreur claire si introuvable. Pas de catégorie si non fournie (cf. CONTEXT.md).
- `prisma.task.create` avec `workspaceId` resolu, `createdById` = user app, `assigneeId` non fourni (laissé null).
- Embed de confirmation (`buildTaskActionEmbed` "Tache creee").

### `bot/src/commands/task-list.ts` (commit 052d43b)
- `statut` optionnel ; si non fourni ou invalide : par défaut filtre `status: { in: ["todo", "in_progress"] }`.
- Requête parallèle : `findMany` (take 10) + `count` partagent le même `where`, garantit `totalCount ≥ tasks.length`.
- Tri : `[{ priority: "desc" }, { createdAt: "desc" }]` — urgents en haut.
- Embed via `buildTaskListEmbed` (même branche pour empty / partial / complete).

### `bot/src/commands/task-done.ts` (commit 052d43b)
- Validation `idInput` : minimum 4 chars (évite des prefixes trop ambigus).
- `findMany take: 2 where: { workspaceId, id: { startsWith: idInput } }` — la limite 2 suffit pour distinguer 0/1/N.
- 0 match → erreur "introuvable", >1 → erreur "ambigu, précisez 8+ chars".
- Idempotence : si `status === "done"`, message no-op ("déjà terminée").
- `prisma.task.update where: { id: target.id }` — ne re-vérifie pas `workspaceId` car `target` provient déjà du findMany scopé. Embed de confirmation "Tache terminee".

### `bot/src/commands/index.ts` (commit 777b741)
- Stub `[stub 04-01]` supprimé.
- `handleTaskInteraction` route via `switch (interaction.options.getSubcommand())` vers les 3 handlers.
- `taskCommand` (SlashCommandBuilder) inchangé : aucun re-register Discord nécessaire.
- Default case : reply ephemeral "Sous-commande inconnue".

## Pattern resolveContext — 3 cas d'échec

| Erreur | Déclencheur | Message FR utilisateur |
|--------|-------------|-----------------------|
| `no-guild` | `interaction.guildId === null` (DM) | "Cette commande doit etre utilisee dans un serveur Discord, pas en message prive." |
| `guild-not-linked` | Aucun `Workspace.discordGuildId` ne match | "Ce serveur Discord n'est lie a aucun workspace. Configurez-le depuis les parametres du workspace dans l'application." |
| `user-not-linked` | Aucun `User.discordId` ne match | "Votre compte Discord n'est pas lie a un compte de l'application. Renseignez votre Discord ID (`<id>`) dans les parametres de votre profil dans l'application." |

## Décisions d'isolation

- **Cross-workspace impossible par construction** : la résolution `resolveContext` extrait un `workspaceId` à partir du `guildId` Discord, et CHAQUE query Prisma des handlers (`category.findUnique`, `task.create`, `task.findMany`, `task.count`, `task.update` indirectement via le find-then-update) inclut ce `workspaceId` dans son filtre.
- **Audit grep** vérifié : `grep -rn "prisma\." bot/src/commands/` → toutes les opérations sur `Task` / `Category` passent par un `where` qui contient `workspaceId`.
- **Prisma vs SQL injection** : aucune query construite par concaténation ; tous les inputs (titre, idInput, categoryName) passent par les builders Prisma typés.

## Threat register status

| Threat ID | État |
|-----------|------|
| T-04-06 (Elevation cross-workspace) | mitigé — voir audit grep |
| T-04-07 (Spoofing user) | mitigé — `resolveContext` rejette si `discordId` absent |
| T-04-08 (Information disclosure list) | mitigé — `where: { workspaceId }` dans findMany + count |
| T-04-09 (Tampering input) | mitigé — bornage titre, longueur min idInput, lookup category strict |
| T-04-10 (Repudiation / audit log) | accept — déféré v2 |

## Deviations from Plan

**1. [Rule 2 - critical functionality] Fallback APP_URL pour `bot/src/lib/embeds.ts`**
- **Found during:** Task 1
- **Issue:** Le plan utilise `process.env.NEXT_PUBLIC_APP_URL` mais le compose de 04-01 expose `APP_URL` (pas `NEXT_PUBLIC_APP_URL`) au service `discord-bot`.
- **Fix:** Chaîne de fallback `NEXT_PUBLIC_APP_URL ?? APP_URL ?? "https://tasks.bantou.me"`. Le bot tournant en runtime Node, il n'y a pas de transform Next.js à craindre.
- **Files modified:** bot/src/lib/embeds.ts
- **Commit:** 829681e
- **Justification:** sans ce fallback, l'URL `setURL` des embeds deviendrait `undefined/workspace/.../list` et discord.js throw au runtime — Rule 2 (correctness).

Aucune autre déviation.

## Note pour 04-03

Les notifications post-mutation (push dans le channel Discord configuré du workspace) ne sont **pas** déclenchées ici :
- Création/completion via `/task ...` répond déjà à l'utilisateur Discord avec un embed éphémère, mais ne broadcast PAS dans le channel.
- Les mutations côté app Next.js (TaskModal, Kanban DnD) ne notifient pas encore le bot.
- 04-03 livrera : (a) l'UI settings de liaison `User.discordId` / `Workspace.discordGuildId` / `discordChannelId`, (b) le client HTTP côté Next.js qui appelle `bot:8080/notify` après mutations, (c) l'extension de `notify-server.ts` pour publier les embeds dans `discordChannelId`.

## Self-Check: PASSED

Files:
- FOUND: bot/src/lib/resolve-context.ts
- FOUND: bot/src/lib/embeds.ts
- FOUND: bot/src/commands/task-add.ts
- FOUND: bot/src/commands/task-list.ts
- FOUND: bot/src/commands/task-done.ts
- MODIFIED: bot/src/commands/index.ts (stub 04-01 retiré)

Commits:
- FOUND: 829681e (helpers)
- FOUND: 052d43b (handlers)
- FOUND: 777b741 (dispatcher)

Verifications:
- bot tsc --noEmit : OK
- root tsc --noEmit : OK
- npm run build : OK (8/8 pages générées)
- grep audit : toutes les queries Task/Category scopées par workspaceId
