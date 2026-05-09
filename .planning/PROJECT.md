# Custom-ToDoList

## Vision
Application web de gestion de tâches multi-utilisateur, auto-hébergée sur VPS, connectée à Discord et GitLab. Contrôle total sur les données et les fonctionnalités.

## Problem Statement
Gérer des tâches dispersées entre la freelance, les cours, et la vie perso sans dépendre d'outils tiers fermés. Centraliser GitLab issues, notifications Discord, et todo quotidien dans une seule interface.

## Target Users
- Baptiste (owner, freelance dev)
- Collaborateurs ponctuels (projets freelance)
- Équipe MTI (projets école)

## Stack
- **Frontend/Backend**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js — OAuth Google/GitHub
- **Discord**: Bot avec slash commands (discord.js)
- **GitLab**: Webhooks entrants + API sortante
- **Deploy**: Docker Compose sur Coolify VPS
- **Domain**: tasks.bantou.me

## Repo
- GitHub: `Minzrouta/Custom-ToDoList`
- Local VPS: `/home/ubuntu/Custom-ToDoList`

## Key Constraints
- Auto-hébergé sur OVH VPS (Ubuntu 25.04, Coolify 4.0)
- Traefik gère le SSL (Let's Encrypt automatique)
- `ubuntu` pas dans le groupe docker → sudo docker ou API Coolify
- Pas de dépendance à des services payants externes

## Success Criteria (v1)
- [ ] Auth multi-user OAuth fonctionnelle
- [ ] CRUD tâches complet avec statuts, priorités, catégories, tags
- [ ] Vue Kanban + vue liste
- [ ] Workspaces (Boulot / Ecole / Perso)
- [ ] Bot Discord slash commands opérationnel
- [ ] GitLab webhook → import issues
- [ ] Déployé sur tasks.bantou.me
