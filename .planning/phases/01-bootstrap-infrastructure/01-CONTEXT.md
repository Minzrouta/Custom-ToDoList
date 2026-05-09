# Phase 1: Bootstrap & Infrastructure - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Initialiser le repo Custom-ToDoList de zéro : Next.js 15 App Router avec TypeScript et Tailwind, Prisma + PostgreSQL avec schema de base, Docker Compose compatible Coolify, déploiement sur tasks.bantou.me avec health check.

Ce que cette phase livre : une base technique fonctionnelle sur laquelle toutes les phases suivantes s'appuient. Pas encore de fonctionnalités utilisateur — juste l'infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Contraintes connues du projet :
- Next.js 15 App Router (pas Pages Router)
- TypeScript strict
- Tailwind CSS pour le styling
- Prisma ORM + PostgreSQL
- Docker Compose doit être compatible Coolify (pas de env_file, vars en environment:)
- Traefik label `traefik.docker.network=coolify` requis pour éviter le bug de routing réseau
- `NEXT_PUBLIC_*` vars baked au build — passer en build.args dans docker-compose
- Health check endpoint `/api/health` requis
- Domain : tasks.bantou.me

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Repo vide — aucun code existant

### Established Patterns
- Pas de patterns établis — greenfield

### Integration Points
- GitHub remote: `git@github.com:Minzrouta/Custom-ToDoList.git`
- Coolify VPS: 51.210.246.139, domain tasks.bantou.me
- Docker network: coolify (external)

</code_context>

<specifics>
## Specific Ideas

- Interface en français
- Dark mode dès le départ (Tailwind dark: class)
- Schema Prisma initial : User, Workspace, WorkspaceMember (pour phase 2)

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase, scope limité au bootstrap technique.

</deferred>
