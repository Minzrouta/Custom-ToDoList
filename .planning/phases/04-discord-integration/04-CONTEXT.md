# Phase 4: Discord Integration - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous workflow)

<domain>
## Phase Boundary

Implémenter un bot Discord (service Docker séparé) qui se connecte à l'API Custom-ToDoList. Slash commands `/task add`, `/task list`, `/task done` + notifications dans un channel configuré par workspace.

Ce que cette phase livre :
- Service Docker `discord-bot` séparé (Node.js + discord.js v14)
- Slash commands enregistrées globalement ou par guild
- Liaison entre serveur Discord (guild) et workspace de l'app
- Liaison entre user Discord et user de l'app (via Discord ID stocké dans User)
- API endpoint pour envoyer des notifications depuis l'app vers le bot
- UI settings : config channel Discord par workspace

</domain>

<decisions>
## Implementation Decisions

### Architecture
- **Service Docker séparé** dans `docker-compose.yml` : `discord-bot` (image Node.js Alpine)
- **Code dans `bot/` à la racine** du repo (séparé de `src/` Next.js)
- **discord.js v14** (latest stable)
- Le bot interroge directement la base de données via Prisma — partage le même `prisma/schema.prisma`
- Alternative considérée : bot appelle l'API HTTP. Rejeté car nécessite un token API interne, plus complexe pour un bot interne

### Schema Prisma — extensions
- Ajouter `discordId` (String? @unique) sur User — lié lors d'une commande Discord d'un user inconnu (par message OAuth ou /link)
- Ajouter `discordGuildId` (String? @unique) sur Workspace — un workspace peut être lié à un serveur Discord
- Ajouter `discordChannelId` (String?) sur Workspace — channel pour les notifications

### Slash Commands
- `/task add <titre> [priorité] [catégorie]`
  - Crée une tâche dans le workspace lié au guild Discord
  - Si user Discord non lié à un user app, créer message d'erreur avec instruction
  - Si guild non lié à un workspace, message d'erreur "Configurez ce serveur via /workspace/[id]/settings"
- `/task list [statut]`
  - Affiche les tâches en cours (status != done && != cancelled) du workspace lié, en embed Discord
  - Limite : 10 tâches max par message
- `/task done <id>`
  - Marque une tâche comme `done` (vérifie que la tâche est dans le workspace du guild)
  - L'id peut être un préfixe court (8 premiers caractères) — recherche par `startsWith`

### Notifications
- L'app Next.js notifie le bot via un endpoint interne ou via un job
- Approche choisie : un endpoint API `/api/discord/notify` POST appelé depuis l'app après création/complétion
- Le bot lit la base via Prisma et écoute un signal de notification — pas de file d'attente complexe en v1
- Alternative simple : tâches programmées en background (interval check) — déféré
- En v1 : appel HTTP direct du bot via un endpoint interne `bot:8080/notify` (réseau Docker interne)

### Bot ↔ App Communication
- Le bot expose un mini-serveur HTTP interne (port 8080, non exposé) avec endpoint `POST /notify`
- L'app (Next.js) appelle ce serveur après les events tâches
- Le bot reçoit `{ type, workspaceId, taskId, content }` et envoie le message dans le channel configuré

### Sécurité
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` dans variables d'environnement Coolify
- Bot ne répond qu'aux guilds configurés (whitelist via Workspace.discordGuildId)
- Validation : commande envoyée depuis un guild lié à un workspace ; user Discord lié à un user app

### UI settings
- Page `/workspace/[id]/settings` (existante) ajoute :
  - Section "Intégration Discord"
  - Affichage du guild lié (read-only) ou bouton "Lier un serveur"
  - Champ pour le channel ID de notifications
  - Bouton "Délier" pour retirer la liaison

### Liaison Discord User
- Au premier `/task ...`, si user Discord non lié → message éphémère avec lien vers l'app
- L'app a une page `/integrations/discord` où le user voit son Discord ID stocké
- Ou : commande `/link <code>` où le code est généré depuis l'app
- Approche v1 simplifiée : user lie via la page settings de l'app en saisissant son Discord ID manuellement

### Catégorie auto pour Discord
- Pas de catégorie par défaut pour les tâches créées via Discord — utilisateur choisit en option

</decisions>

<code_context>
## Existing Code Insights

### Phase 3 deliverables (base)
- `prisma/schema.prisma` : Task, Category, Tag, SubTask, Comment + enums
- API CRUD tâches : POST /api/workspaces/[id]/tasks, GET /tasks, PATCH /tasks/[taskId]
- `src/lib/prisma.ts` singleton

### Integration Points
- Le bot Discord lit la base via Prisma (importe le client généré)
- Workspace.discordGuildId : nouvelle colonne pour lier guild → workspace
- Workspace.discordChannelId : nouvelle colonne pour notifications

</code_context>

<specifics>
## Specific Ideas

- Embeds Discord avec couleurs selon priorité (urgent=rouge, high=orange, medium=bleu, low=gris)
- Footer embed avec lien retour vers la tâche dans l'app

</specifics>

<deferred>
## Deferred Ideas

- Lien OAuth Discord pour authentifier les users sans saisie manuelle — v2
- Boutons d'action Discord (Marquer terminée, Voir détails) — v2
- Mention d'utilisateur dans les notifications — v2
- File d'attente Redis pour notifications — déféré (overkill v1)

</deferred>
