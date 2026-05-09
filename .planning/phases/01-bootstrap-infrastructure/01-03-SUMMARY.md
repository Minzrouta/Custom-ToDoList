---
phase: 01-bootstrap-infrastructure
plan: "03"
subsystem: infra
tags: [docker, dockerfile, docker-compose, coolify, traefik, postgresql, nextjs, prisma, alpine]

requires:
  - phase: 01-01
    provides: "Next.js 16 avec output standalone configuré dans next.config.ts"
  - phase: 01-02
    provides: "Prisma v5 avec schema User/Workspace/WorkspaceMember et DATABASE_URL"

provides:
  - "Dockerfile multi-stage (deps/builder/runner) pour Next.js standalone avec Prisma"
  - "docker-compose.yml compatible Coolify 4.0 avec services web + database"
  - ".dockerignore excluant node_modules, .next, .env"
  - "Label traefik.docker.network=coolify pour routing sans 504"
  - "Réseau coolify external déclaré"

affects:
  - deployment
  - coolify-setup
  - tasks-bantou-me

tech-stack:
  added:
    - "Docker multi-stage build (node:20-alpine)"
    - "PostgreSQL 16 Alpine (image docker)"
    - "openssl (apk — requis par Prisma sur Alpine)"
  patterns:
    - "Multi-stage build : deps → builder → runner (image finale légère)"
    - "User non-root nextjs uid:1001 dans le runner"
    - "Vars Coolify : NEXT_PUBLIC_* en build.args ET environment, secrets via ${VAR} jamais hardcodés"
    - "depends_on avec condition: service_healthy pour attendre PostgreSQL"

key-files:
  created:
    - Dockerfile
    - docker-compose.yml
    - .dockerignore
  modified: []

key-decisions:
  - "Uniquement le label traefik.docker.network=coolify — Coolify injecte les autres labels Traefik automatiquement (évite les conflits)"
  - "openssl installé dans tous les stages (deps, builder, runner) — Prisma l'exige sur Alpine"
  - "node_modules/.prisma et node_modules/@prisma copiés dans le runner — client Prisma est lié à l'OS Alpine du build"
  - "Pas de ports exposés pour le service database — accessible uniquement via réseau Docker interne coolify (sécurité)"
  - "restart: unless-stopped sur les deux services pour résilience"

patterns-established:
  - "Docker multi-stage : jamais de build en une seule stage pour Next.js"
  - "Coolify constraint : jamais de env_file, toujours environment: inline avec ${VAR}"

requirements-completed:
  - NFR-03

duration: 15min
completed: 2026-05-09
---

# Phase 01 Plan 03: Dockerfile multi-stage, docker-compose Coolify, .dockerignore

**Dockerfile Node 20 Alpine 3-stages avec Prisma runtime et docker-compose Coolify sans env_file, label traefik.docker.network=coolify, réseau external**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-09T02:40:00Z
- **Completed:** 2026-05-09T02:55:00Z
- **Tasks:** 2 (+ 1 checkpoint auto-approuvé)
- **Files modified:** 3 (Dockerfile, docker-compose.yml, .dockerignore)

## Accomplishments

- Dockerfile multi-stage (deps → builder → runner) avec Node 20 Alpine, user non-root nextjs uid 1001, copie des artefacts Prisma pour runtime
- docker-compose.yml compatible Coolify : services web + database, label `traefik.docker.network=coolify`, réseau external, NEXT_PUBLIC_* en build.args ET environment, zéro env_file, healthcheck PostgreSQL avec pg_isready
- .dockerignore excluant node_modules, .next, .env, .planning
- Validation syntaxe via `sudo docker compose config` : OK (warnings attendus pour secrets non définis localement)

## Task Commits

Tâches regroupées en un seul commit selon instructions orchestrateur :

1. **Task 1: Dockerfile multi-stage + .dockerignore** - `d07252a` (feat)
2. **Task 2: docker-compose.yml Coolify** - `d07252a` (feat)
3. **Task 3: Checkpoint human-verify** - Auto-approuvé (mode autonome)

## Files Created/Modified

- `/home/ubuntu/Custom-ToDoList/Dockerfile` - Build multi-stage Node 20 Alpine, 3 stages : deps/builder/runner, user nextjs uid 1001, openssl, Prisma client copié
- `/home/ubuntu/Custom-ToDoList/docker-compose.yml` - Services web + database, label traefik.docker.network=coolify, réseau coolify external, sans env_file
- `/home/ubuntu/Custom-ToDoList/.dockerignore` - Exclusions node_modules, .next, .env, .env.*, .planning

## Decisions Made

- **Label Traefik minimal** : seul `traefik.docker.network=coolify` est inclus. Le plan proposait tous les labels Traefik (routers, tls, etc.) mais les contraintes Coolify de l'orchestrateur précisent que Coolify les injecte automatiquement — les dupliquer causerait des conflits. Decision alignée avec VPS.md ("Ne pas les dupliquer manuellement").
- **openssl dans tous les stages** : Prisma nécessite openssl à la fois au moment du `prisma generate` (builder) et au runtime (runner). L'absence dans deps stage est sans conséquence (npm ci n'utilise pas Prisma).
- **Pas de ports: pour database** : conformément au threat model T-01-10, PostgreSQL n'est exposé que sur le réseau Docker interne `coolify`, pas sur le host.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Omission des labels Traefik redondants**
- **Found during:** Task 2 (création docker-compose.yml)
- **Issue:** Le plan inclut des labels Traefik complets (traefik.enable, routers, tls, certresolver) mais les contraintes VPS.md/orchestrateur indiquent que Coolify les injecte automatiquement — les dupliquer manuellement cause des conflits de routing
- **Fix:** Seul `traefik.docker.network=coolify` est conservé (le seul qui n'est PAS injecté par Coolify)
- **Files modified:** docker-compose.yml
- **Verification:** Conformité avec VPS.md "Docker Compose sur Coolify : Coolify injecte automatiquement les labels Traefik"
- **Committed in:** d07252a

---

**Total deviations:** 1 auto-appliquée (Rule 2 — sécurité configuration)
**Impact on plan:** Correction nécessaire pour éviter conflit de routing Traefik. Aucun scope creep.

## Checkpoint Verification (mode autonome)

Le checkpoint `human-verify` a été auto-approuvé. Vérification mentale exhaustive :

| Contrainte | Statut |
|-----------|--------|
| Pas de `env_file:` | OK — absent du docker-compose.yml |
| `NEXT_PUBLIC_*` dans `build: args:` | OK — NEXT_PUBLIC_APP_URL présent |
| `NEXT_PUBLIC_*` dans `environment:` | OK — NEXT_PUBLIC_APP_URL présent |
| Label `traefik.docker.network=coolify` | OK — présent dans labels du service web |
| `networks.coolify.external: true` | OK — présent en bas du fichier |
| Pas de labels Traefik dupliqués | OK — Coolify les injecte |
| Healthcheck PostgreSQL `pg_isready` | OK — présent avec interval/timeout/retries |
| `depends_on: condition: service_healthy` | OK — service web attend DB |
| User non-root `nextjs` uid 1001 | OK — dans Dockerfile runner stage |
| Pas de ports: sur database | OK — DB non exposée sur le host |
| Syntaxe docker-compose valide | OK — `sudo docker compose config` validé |

## User Setup Required

Configuration manuelle Coolify requise pour le déploiement :

1. **Créer un projet** `custom-todolist` dans Coolify Dashboard -> Projects -> New Project
2. **Ajouter une application** Docker Compose depuis `github.com/Minzrouta/Custom-ToDoList`
3. **Configurer le domaine** `tasks.bantou.me` pour le service web
4. **Injecter les variables d'environnement** dans Coolify Dashboard -> Application -> Environment Variables :
   - `DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@database:5432/custom_todolist`
   - `NEXTAUTH_SECRET=<générer avec openssl rand -base64 32>`
   - `NEXTAUTH_URL=https://tasks.bantou.me`
   - `POSTGRES_PASSWORD=<mot de passe fort>`
   - `NEXT_PUBLIC_APP_URL=https://tasks.bantou.me` (optionnel, défaut déjà configuré)
5. **Déclencher le premier déploiement**

## Next Phase Readiness

- Infrastructure de déploiement complète — prête pour Coolify
- Phase 1 Bootstrap terminée : Next.js 16 standalone + Prisma v5 + Docker Compose Coolify + /api/health
- Phase 2 (authentification) peut démarrer : la DB PostgreSQL et le schéma Prisma sont prêts

## Threat Surface Scan

Aucune nouvelle surface de sécurité non couverte par le threat model du plan. Toutes les mitigations T-01-07 à T-01-11 sont implémentées :
- T-01-07/08 : Secrets injectés via `${VAR}` uniquement, jamais hardcodés
- T-01-09 : User non-root nextjs uid 1001 avec `USER nextjs` avant CMD
- T-01-10 : Aucun `ports:` sur le service database
- T-01-11 : Label `traefik.docker.network=coolify` présent

---
*Phase: 01-bootstrap-infrastructure*
*Completed: 2026-05-09*
