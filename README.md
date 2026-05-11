# Custom-ToDoList

Application web de gestion de tâches multi-utilisateur, auto-hébergée. Auth OAuth, workspaces partagés, vues Kanban/Liste, intégrations Discord et GitLab, notifications in-app.

Déployée en production sur [tasks.bantou.me](https://tasks.bantou.me) via Coolify.

## Fonctionnalités

- **Auth OAuth** : connexion via Google ou GitHub (NextAuth.js v5)
- **Workspaces multi-user** : Boulot / École / Perso par défaut + workspaces custom, invitation par email
- **Gestion de tâches complète** : titre, description (markdown), statut (todo / in_progress / done / cancelled), priorité (low / medium / high / urgent), catégorie, tags, sous-tâches, commentaires, assignee, due date
- **Vues** : Kanban (drag & drop) + Liste (filtres par statut, priorité, catégorie, tag, assignee)
- **Intégration Discord** : bot avec slash commands (`/task add`, `/task list`, `/task done`), notifications dans un channel par workspace
- **Intégration GitLab** : webhook entrant — une issue GitLab créée déclenche une tâche dans l'app
- **Notifications in-app** : badge + dropdown header, marquer comme lu, déclenchées par assignation et complétion
- **Recherche globale** : titre + description, scopée aux workspaces de l'utilisateur
- **Dark mode** : toggle dans le header, persisté via next-themes
- **Page profil** : éditer nom et avatar, lier un compte Discord

## Stack technique

- **Front + API** : Next.js 16 (App Router, React 19, TypeScript strict)
- **Styles** : Tailwind CSS v4 (CSS-first, dark mode via class)
- **ORM** : Prisma 5 + PostgreSQL 16
- **Auth** : NextAuth.js v5 (beta) avec Prisma adapter
- **Drag & drop** : @dnd-kit/core + @dnd-kit/sortable
- **Bot Discord** : discord.js v14 (service Docker séparé)
- **Reverse proxy / SSL** : Traefik (via Coolify)
- **Conteneurisation** : Docker Compose (web + database + discord-bot)

## Variables d'environnement

Voir `.env.example` pour le template complet. Variables critiques :

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | web + bot | Connexion PostgreSQL Prisma |
| `NEXTAUTH_URL` | web | URL publique pour NextAuth (callback OAuth) |
| `NEXTAUTH_SECRET` | web | Secret NextAuth (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | web | OAuth Google (Google Cloud Console) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | web | OAuth GitHub (GitHub Developer Settings) |
| `NEXT_PUBLIC_APP_URL` | web (build) | URL publique baked au build (ex: `https://tasks.bantou.me`) |
| `DISCORD_TOKEN` | bot | Token du bot Discord (Discord Developer Portal) |
| `DISCORD_CLIENT_ID` | bot | Application ID Discord (pour `register-commands`) |
| `DISCORD_BOT_NOTIFY_URL` | web | URL interne du bot (défaut `http://discord-bot:8080/notify`) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | database | Credentials PostgreSQL |

> **Important Coolify** : `NEXT_PUBLIC_*` sont baked au build — passer en `build.args` ET en `environment` dans `docker-compose.yml` (déjà fait). Ne JAMAIS committer un `.env` réel (le `.gitignore` l'exclut).

## Développement local

Prérequis : Node.js 20+, PostgreSQL 16 local ou Docker.

```bash
# 1. Cloner et installer
git clone <repo>
cd Custom-ToDoList
npm install

# 2. Configurer .env
cp .env.example .env
# → renseigne DATABASE_URL, NEXTAUTH_SECRET, AUTH_GOOGLE_*, etc.

# 3. Pousser le schéma en DB locale
npx prisma generate
npx prisma db push

# 4. Démarrer le serveur dev
npm run dev
# → http://localhost:3000
```

Pour tester le bot Discord en local : voir `bot/README.md` (si présent) ou `docker compose up discord-bot`.

## Déploiement Coolify

Le projet est déployé sur un VPS via [Coolify](https://coolify.io) qui orchestre Traefik (SSL Let's Encrypt automatique) et Docker Compose.

### Étapes

1. **Créer un projet Coolify** dans le dashboard (`https://coolify.bantou.me`).
2. **Ajouter une application** de type "Docker Compose" :
   - Source : repo Git (GitHub / GitLab)
   - Compose file : `docker-compose.yml` (à la racine du repo)
3. **Configurer le domaine** :
   - Service `web` → `https://tasks.bantou.me` (ou autre subdomain)
   - Coolify injecte automatiquement les labels Traefik et génère le certificat SSL.
4. **Configurer les variables d'environnement** dans Coolify (UI Settings → Environment) :
   - Toutes les variables listées dans `.env.example` (et le tableau ci-dessus)
   - Marquer comme "Build-time variable" celles préfixées `NEXT_PUBLIC_*`
5. **Configurer les OAuth callbacks** dans Google Cloud Console + GitHub Developer Settings :
   - Google : `https://tasks.bantou.me/api/auth/callback/google`
   - GitHub : `https://tasks.bantou.me/api/auth/callback/github`
6. **Déployer** depuis Coolify (ou via webhook GitHub push).
7. **Pousser le schéma en prod** la première fois : SSH sur le container web et lancer `npx prisma db push --accept-data-loss`, OU exécuter via Coolify console.
8. **Enregistrer les slash commands Discord** : SSH sur le container `discord-bot` et lancer `npm run register` (ou commande équivalente dans `bot/package.json`).

### Gotchas Coolify

- **`env_file: .env` interdit** : le fichier n'existe pas sur le VPS, ça casse le démarrage du compose. Passer les variables uniquement via `environment:` (déjà fait).
- **`NEXT_PUBLIC_*` baked au build** : si tu modifies `NEXT_PUBLIC_APP_URL` après le premier déploiement, redéployer pour reconstruire l'image.
- **Réseau Traefik** : le label `traefik.docker.network=coolify` est indispensable sur le service `web` (déjà présent dans `docker-compose.yml`).
- **`ubuntu` pas dans groupe docker** : pour les opérations locales sur le VPS, utiliser `sudo docker` ou l'API Coolify.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                     Traefik (Coolify)                  │
│            tasks.bantou.me → :3000 (web)               │
└────────────────────┬───────────────────────────────────┘
                     │
            ┌────────▼─────────┐         ┌──────────────────┐
            │   web (Next.js)  │◄────────│  discord-bot     │
            │                  │  HTTP   │  (discord.js)    │
            │  - App Router    │ :8080   │  - slash cmds    │
            │  - API routes    │         │  - notify HTTP   │
            │  - Server Compo. │         └──────────────────┘
            └────────┬─────────┘                    │
                     │                              │
                     │      Prisma     ┌────────────▼───────┐
                     └────────────────►│  PostgreSQL 16     │
                                       │  (volume Docker)   │
                                       └────────────────────┘
```

- Le service `web` rend l'UI et expose toutes les routes API (`/api/...`).
- Le service `discord-bot` est un client Discord persistent + serveur HTTP interne (port 8080) qui reçoit les notifications fire-and-forget depuis `web` (`POST /notify`).
- Les deux services partagent la même base PostgreSQL via `DATABASE_URL`.
- Le bot connaît la même schema Prisma (mêmes `Workspace`, `Task`, etc.) — pas d'API REST entre les deux, accès DB direct (KISS).

## Méthodologie : Get Shit Done (GSD)

Ce projet a été développé avec la méthodologie GSD :
- Le contexte produit, les décisions et la roadmap vivent dans `.planning/`
- Chaque phase a un dossier `.planning/phases/XX-name/` avec son `PLAN.md` (instructions exécutables pour Claude Code) et son `SUMMARY.md` (récap après livraison)
- `.planning/STATE.md` tient l'état d'avancement
- `.planning/ROADMAP.md` liste les phases et leurs requirements

Lire `.planning/PROJECT.md` pour la vision produit complète.

## Scripts npm

```bash
npm run dev      # serveur dev Next.js (Turbopack)
npm run build    # build production
npm start        # démarre le build production
npm run lint     # ESLint
```

## Roadmap

v1.0 (livré) :
- Phase 1 : Bootstrap & infra
- Phase 2 : Auth & workspaces
- Phase 3 : Core task management
- Phase 4 : Intégration Discord
- Phase 5 : Intégration GitLab
- Phase 6 : Notifications & polish

Déféré v2 (cf `.planning/phases/06-notifications-polish/06-CONTEXT.md`) :
- Notifications temps réel (WebSocket / SSE)
- Upload avatar direct (UploadThing / S3)
- Mentions @user dans description/commentaires
- Email notifications
- Récurrence de tâches
- App mobile

## Licence

Privé — projet perso de [Baptiste](https://github.com/<your-handle>).
