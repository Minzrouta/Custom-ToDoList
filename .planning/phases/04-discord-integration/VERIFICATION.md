---
phase: 04-discord-integration
verified: 2026-05-09T00:00:00Z
status: human_needed
score: 6/6 must-haves vérifiés statiquement (vérification live Discord requise pour 1-5)
overrides_applied: 0
human_verification:
  - test: "/task add <titre> en live dans un serveur Discord lié"
    expected: "Tâche créée en DB avec workspaceId du Workspace lié au guildId, embed coloré renvoyé en éphémère"
    why_human: "Nécessite un bot token Discord valide, un serveur Discord configuré avec les slash commands enregistrés, et un Workspace+User préalablement liés en DB"
  - test: "/task list en live"
    expected: "Embed Discord listant jusqu'à 10 tâches todo/in_progress du workspace lié"
    why_human: "Nécessite Discord live + DB peuplée + binding workspace"
  - test: "/task done <id> en live"
    expected: "La tâche passe à status=done, embed 'Tache terminee' renvoyé"
    why_human: "Nécessite Discord live + tâche existante dont l'ID est connu"
  - test: "Création de tâche via UI app → notification dans channel Discord"
    expected: "Embed 'Nouvelle tache' apparaît dans le channel configuré (Workspace.discordChannelId)"
    why_human: "Nécessite Discord live + bot avec permission 'Envoyer messages' + channel configuré + healthcheck bot OK"
  - test: "Passage tâche à done via UI → notification 'Tache terminee'"
    expected: "Embed apparaît dans le channel configuré, app ne plante pas si bot down"
    why_human: "Nécessite Discord live + scenario end-to-end avec mutation PATCH"
  - test: "UI workspace settings : saisie guildId+channelId puis enregistrement"
    expected: "Workspace en DB a les nouveaux champs, message succès affiché"
    why_human: "Nécessite navigateur + session OAuth active + état OWNER sur un workspace"
---

# Phase 4: Discord Integration — Rapport de vérification

**Phase Goal (ROADMAP):** Bot Discord opérationnel avec slash commands (/task add, /task list, /task done) et notifications dans un channel configuré par workspace.

**Vérifié:** 2026-05-09
**Status:** human_needed (toute la fondation statique est verified ; la validation live Discord nécessite un bot token et un serveur de test)
**Re-vérification:** Non — vérification initiale

## Atteinte du goal

### Vérités observables (Success Criteria FR-07 du ROADMAP)

| # | Critère | Status | Évidence |
|---|---------|--------|----------|
| 1 | `/task add <titre>` crée une tâche dans le workspace lié au serveur Discord | VERIFIED (statique) — needs live | `bot/src/commands/task-add.ts:58-75` appelle `prisma.task.create({ workspaceId: ctx.ctx.workspace.id, createdById: ctx.ctx.user.id, title, priority, status: "todo", categoryId })`. Le workspaceId provient de `resolveContext()` qui résout `Workspace.findUnique({ where: { discordGuildId: interaction.guildId }})`. Embed renvoyé via `editReply` |
| 2 | `/task list` affiche les tâches en cours sous forme d'embed Discord | VERIFIED (statique) — needs live | `bot/src/commands/task-list.ts:38-63` exécute `prisma.task.findMany` avec filtre `workspaceId` + `status in [todo, in_progress]`, renvoie via `buildTaskListEmbed` (couleur 0x3b82f6, footer total) |
| 3 | `/task done <id>` marque une tâche comme terminée | VERIFIED (statique) — needs live | `bot/src/commands/task-done.ts:33-82` : findMany avec `id: { startsWith: idInput }` scope au workspaceId, gestion ambiguïté (>1 match → 400, 0 → 404), update status=done si transition valide |
| 4 | Notification envoyée dans le channel configuré à la création d'une tâche | VERIFIED (statique) — needs live | `src/app/api/workspaces/[id]/tasks/route.ts:112-124` après `prisma.task.create` réussi : `void notifyDiscord({ type: "task.created", ... })`. Le bot route via `Workspace.discordChannelId` puis `client.channels.fetch().send({ embeds })` |
| 5 | Notification envoyée à la complétion d'une tâche | VERIFIED (statique) — needs live | `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts:71-122` : findUnique récupère `existing.status` AVANT update, puis si `existing.status !== "done" && task.status === "done"` → `void notifyDiscord({ type: "task.completed", ... })` |
| 6 | UI settings : associer un channel Discord à un workspace | VERIFIED | `src/app/workspace/[id]/settings/page.tsx:58-62` rend `<WorkspaceDiscordSettings>` (OWNER only via `notFound()` si role !== OWNER). Le composant POST en PUT vers `/api/workspaces/${workspaceId}/discord` avec validation snowflake côté client (pattern HTML) ET serveur (`SNOWFLAKE_REGEX`) |

**Score:** 6/6 vérités câblées et substantives statiquement. Les vérités 1-5 nécessitent une validation live Discord (token + serveur de test) — c'est par construction et documenté dans le checkpoint Task 6 du plan 04-03.

### Artefacts requis

| Artefact | Attendu | Status | Détails |
|----------|---------|--------|---------|
| `prisma/schema.prisma` | `discordId @unique` (User), `discordGuildId @unique` + `discordChannelId` (Workspace) | VERIFIED | L11-29 : `discordId String? @unique`. L31-46 : `discordGuildId String? @unique`, `discordChannelId String?` |
| `bot/src/index.ts` | Client + InteractionCreate handler + startNotifyServer | VERIFIED | L1-43 : Client `intents: [GatewayIntentBits.Guilds]`, `client.on(Events.InteractionCreate, ...)`, dispatch `handleTaskInteraction`, `startNotifyServer(client)` AVANT `client.login` |
| `bot/src/commands/index.ts` | Dispatcher vers task-add/list/done | VERIFIED | L72-89 : switch sur `getSubcommand()` route vers `handleTaskAdd`, `handleTaskList`, `handleTaskDone`. Stub "[stub 04-01]" supprimé |
| `bot/src/commands/task-add.ts` | Création réelle via Prisma | VERIFIED | 89 lignes ≥ min_lines 40. `prisma.task.create` avec workspaceId+createdById, embed via buildTaskActionEmbed |
| `bot/src/commands/task-list.ts` | Embed des tâches en cours | VERIFIED | 68 lignes ≥ 40. findMany + count en parallèle, filtre workspace+status, embed via buildTaskListEmbed |
| `bot/src/commands/task-done.ts` | Update status=done sur préfixe ID | VERIFIED | 96 lignes ≥ 30. findMany avec startsWith, ambiguïté gérée, update workspaceId-scoped |
| `bot/src/lib/resolve-context.ts` | Guild→workspace + Discord user→app user | VERIFIED | 81 lignes. `prisma.workspace.findUnique({ where: { discordGuildId }})` puis `prisma.user.findUnique({ where: { discordId }})` |
| `bot/src/lib/embeds.ts` | Builders avec couleur priorité | VERIFIED | PRIORITY_COLORS map (urgent=rouge 0xef4444, high=orange, medium=bleu, low=gris). buildTaskActionEmbed + buildTaskListEmbed exports |
| `bot/src/notify-server.ts` | POST /notify routant vers discordChannelId | VERIFIED | L60-113 : findUnique workspace→discordChannelId, channels.fetch, isTextBased check, channel.send({ embeds }). Health endpoint sur `/health` |
| `src/lib/discord-notify.ts` | Helper fire-and-forget HTTP | VERIFIED | 70 lignes. `DISCORD_BOT_NOTIFY_URL ?? "http://discord-bot:8080/notify"`, AbortController timeout 3s, log warn sans throw |
| `src/app/api/workspaces/[id]/tasks/route.ts` | POST appelle notifyDiscord | VERIFIED | L5 import, L112 `void notifyDiscord({ type: "task.created", ... })` après `prisma.task.create` réussi |
| `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` | PATCH appelle notifyDiscord sur transition done | VERIFIED | L71-77 findUnique status, L108-122 detection `existing.status !== "done" && task.status === "done"` puis `void notifyDiscord({ type: "task.completed" })` |
| `src/app/api/workspaces/[id]/discord/route.ts` | PUT/DELETE OWNER only | VERIFIED | 109 lignes ≥ 40. PUT et DELETE checkent `member.role !== "OWNER"` → 403. Validation `SNOWFLAKE_REGEX = /^\d{17,20}$/`, conflit guildId → 409 |
| `src/app/api/users/me/discord/route.ts` | PUT/DELETE auth user me | VERIFIED | 66 lignes ≥ 30. Auth check, validation snowflake, conflit discordId→409 |
| `src/components/ui/WorkspaceDiscordSettings.tsx` | Form guildId+channelId | VERIFIED | 150 lignes. 2 inputs avec `pattern="\d{17,20}"`, fetch PUT/DELETE vers `/api/workspaces/${workspaceId}/discord`, router.refresh |
| `src/components/ui/UserDiscordSettings.tsx` | Form discordId | VERIFIED | 114 lignes. Input pattern HTML, fetch vers `/api/users/me/discord` PUT/DELETE |
| `src/app/profile/page.tsx` | Page profil hébergeant UserDiscordSettings | VERIFIED | 44 lignes. auth() + redirect, prisma.user findUnique + render `<UserDiscordSettings initialDiscordId={user.discordId} />` |
| `docker-compose.yml` | Service discord-bot + DISCORD_BOT_NOTIFY_URL | VERIFIED | L26 `DISCORD_BOT_NOTIFY_URL: ${DISCORD_BOT_NOTIFY_URL:-http://discord-bot:8080/notify}` côté `web`. L55-73 service `discord-bot` avec build context root + `bot/Dockerfile`, env DISCORD_TOKEN/CLIENT_ID, NOTIFY_PORT, NEXT_PUBLIC_APP_URL, depends_on database healthy, pas de port mapping public |

### Vérification des liens clés (wiring)

| From | To | Via | Status | Détails |
|------|-----|-----|--------|---------|
| `bot/src/index.ts` | `bot/src/commands/index.ts` | `Client.on(InteractionCreate)` + `handleTaskInteraction` | WIRED | L20-34 : `client.on(Events.InteractionCreate, ...)` filtre `commandName === "task"` puis `await handleTaskInteraction(interaction)` |
| `bot/src/commands/index.ts` | `task-add.ts/task-list.ts/task-done.ts` | switch dispatch | WIRED | L6-8 imports, L76-87 switch case routant chaque sous-commande |
| `bot/src/commands/task-add.ts` | `bot/src/lib/resolve-context.ts` | `resolveContext(interaction)` | WIRED | L4 import, L19 appel `await resolveContext(interaction)` |
| `bot/src/commands/task-add.ts` | `bot/src/prisma.ts` | `prisma.task.create` | WIRED | L3 import, L42, L58 |
| `bot/src/commands/task-list.ts` | `bot/src/lib/embeds.ts` | `buildTaskListEmbed` | WIRED | L5 import, L56 appel |
| `bot/src/notify-server.ts` | Discord channel | `client.channels.fetch(discordChannelId).send(embed)` | WIRED | L76 fetch, L108 send avec embeds[] |
| `src/app/api/workspaces/[id]/tasks/route.ts` | `src/lib/discord-notify.ts` | `void notifyDiscord` après create | WIRED | L5 import, L112 appel fire-and-forget |
| `src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` | `src/lib/discord-notify.ts` | `void notifyDiscord` sur transition | WIRED | L5 import, L110 dans bloc `if (transitionedToDone)` |
| `src/lib/discord-notify.ts` | `bot/src/notify-server.ts` | `fetch http://discord-bot:8080/notify` | WIRED | L7 NOTIFY_URL avec default `http://discord-bot:8080/notify`, L50 fetch |
| `src/app/workspace/[id]/settings/page.tsx` | `WorkspaceDiscordSettings.tsx` | import + render OWNER only | WIRED | L7 import, L27 check OWNER, L58-62 render avec props |
| `src/app/profile/page.tsx` | `UserDiscordSettings.tsx` | import + render | WIRED | L6 import, L40 render avec discordId initial |

### Trace data-flow (Level 4)

| Artefact | Variable | Source | Données réelles | Status |
|----------|----------|--------|-----------------|--------|
| WorkspaceDiscordSettings | `initialGuildId/initialChannelId` | `membership.workspace.discordGuildId/discordChannelId` (DB Prisma via `include: { workspace: true }`) | OUI — vrai DB query | FLOWING |
| UserDiscordSettings | `initialDiscordId` | `prisma.user.findUnique({ select: { discordId } })` | OUI — vrai DB query | FLOWING |
| notify-server (channel) | `workspace.discordChannelId` | `prisma.workspace.findUnique({ where: { id: payload.workspaceId } })` | OUI — résolu à la requête | FLOWING |
| task-add embed | `created` (Task) | `prisma.task.create({ data: ... })` | OUI — création réelle puis affichage | FLOWING |
| task-list embed | `tasks` | `prisma.task.findMany({ where: { workspaceId, status }})` | OUI — query filtrée par workspace | FLOWING |

### Couverture des exigences

| Requirement | Source | Description | Status | Évidence |
|-------------|--------|-------------|--------|----------|
| FR-07 | 04-01-PLAN, 04-02-PLAN, 04-03-PLAN | Intégration Discord (slash commands + notifications + UI config) | SATISFIED (statique) — needs live | Voir tableau Vérités observables ci-dessus, tous les chemins de code sont câblés |

### Vérifications comportementales (Spot-checks)

| Vérification | Commande | Résultat | Status |
|--------------|----------|----------|--------|
| Build Next.js | `npm run build` | Compilé en 10.3s, 23 routes y compris `/api/users/me/discord`, `/api/workspaces/[id]/discord`, `/profile` | PASS |
| Type-check Next.js | `npx tsc --noEmit` | "TypeScript: No errors found" | PASS |
| Type-check bot | `cd bot && npx tsc --noEmit` | "TypeScript: No errors found" | PASS |
| Wiring notifyDiscord (POST) | `grep notifyDiscord src/app/api/workspaces/[id]/tasks/route.ts` | Import + appel `void notifyDiscord({ type: "task.created" })` | PASS |
| Wiring notifyDiscord (PATCH) | `grep notifyDiscord src/app/api/workspaces/[id]/tasks/[taskId]/route.ts` | Import + appel sur transition done | PASS |
| Audit fire-and-forget | `grep "await\s*notifyDiscord" src/app/api/` | 0 match (toujours `void`, jamais await) | PASS |
| Service discord-bot dans compose | `grep discord-bot docker-compose.yml` | Service déclaré L55, env DISCORD_BOT_NOTIFY_URL côté web L26 | PASS |
| Composants UI wired | `grep -rn 'WorkspaceDiscordSettings\|UserDiscordSettings' src/` | Imports présents dans settings/page.tsx + profile/page.tsx + composants définis | PASS |
| Slash command live | (curl ou Discord API) | NON TESTÉ | SKIP (besoin de token + serveur Discord) |
| Notification end-to-end | (POST /notify avec payload réel) | NON TESTÉ | SKIP (besoin de bot ready + channel valide) |

### Anti-patterns détectés

| Fichier | Ligne | Pattern | Sévérité | Impact |
|---------|-------|---------|----------|--------|
| `.env.example` | (absence) | DISCORD_TOKEN/DISCORD_CLIENT_ID/DISCORD_GUILD_ID non documentés malgré la spec du plan 04-01 task 4 | Info | Mineur — Coolify injecte les vars en prod, mais la spec du plan attendait ces lignes dans `.env.example` pour le dev local. N'empêche pas le goal. |
| `bot/src/notify-server.ts` | 108 | Pas de check de permission Discord avant `channel.send` | Info | Si le bot n'a pas la permission "Envoyer des messages" sur le channel, l'envoi throw — mais le catch dans `dispatchNotification` est en haut niveau (try du serveur), donc une erreur non capturée pourrait faire un 500. À surveiller en live. Non blocker pour le goal v1. |
| Tous les fichiers | — | Aucun TODO/FIXME/PLACEHOLDER trouvé | — | Code propre |

### Vérification humaine requise

Le goal de la phase est conceptuellement atteint, mais les success criteria 1-5 nécessitent une vérification end-to-end avec un bot Discord live (token, serveur Discord, slash commands enregistrées via `npm run register`). C'est par construction d'un bot Discord — aucun outil automatique ne peut simuler un guild Discord réel. Le checkpoint Task 6 du plan 04-03 documente la procédure (8 étapes : health, liaison user, liaison workspace, slash commands, notif task.created, notif task.completed, résilience channel mal configuré, résilience bot down).

Voir frontmatter `human_verification` ci-dessus pour la liste détaillée.

### Résumé des écarts

**Aucun écart bloquant.** L'implémentation est complète et substantielle :
- Schema Prisma étendu correctement
- Bot autonome compilable avec discord.js v14
- 3 handlers réels (pas de stub)
- Notifications fire-and-forget câblées sur les 2 mutations critiques
- UI OWNER-only pour le workspace et UI auth pour le user
- Service Docker prêt pour Coolify

**Écart mineur (non bloquant) :** `.env.example` ne contient pas `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`. Le plan 04-01 task 4 spécifiait de les ajouter. Conformément à VPS.md (Coolify injecte les env vars en prod), c'est acceptable mais à corriger pour le dev local. Ne bloque pas le goal du phase.

**Cohérence avec les patterns Phase 2/3 :** `Response.json()` utilisé partout (jamais `NextResponse`), `await params`, `requireMembership`, format log `[contexte:METHODE]`, alias `@/`. Le bot utilise ESM avec extension `.js` dans les imports relatifs (NodeNext).

---

_Vérifié: 2026-05-09_
_Vérificateur: Claude (gsd-verifier)_
