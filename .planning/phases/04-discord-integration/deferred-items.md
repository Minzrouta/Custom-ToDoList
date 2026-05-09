# Deferred Items — Phase 04

## Hors scope (à traiter en Phase 6 - Polish)

### Lint pre-existing errors (Phase 2 files)
Découverts pendant exécution 04-03. NON corrigés (out of scope — les fichiers ne sont pas modifiés par ce plan).

- `src/components/ui/InviteModal.tsx:62:12` — `'` non échappé dans JSX (`react/no-unescaped-entities`)
- `src/components/ui/WorkspaceSettingsForm.tsx:124:27` — `'` non échappé dans JSX (`react/no-unescaped-entities`)

Fix simple : remplacer `'` littéral par `&apos;` dans le JSX. À traiter dans une passe de polish lint globale en Phase 6.

### Worktree artefact
- `.claude/worktrees/agent-a61d70f362d400605/` — copie d'un worktree IDE qui contient une duplication de `src/`. Génère 2 erreurs lint dupliquées. À nettoyer hors plan.
