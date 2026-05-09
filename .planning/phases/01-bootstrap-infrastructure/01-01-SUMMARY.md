---
phase: 01-bootstrap-infrastructure
plan: 01
subsystem: frontend-foundation
tags: [nextjs, typescript, tailwind, dark-mode, next-themes]
dependency_graph:
  requires: []
  provides: [next-app-foundation, tailwind-dark-mode, theme-provider]
  affects: [all-future-plans]
tech_stack:
  added:
    - Next.js 16.2.6 (App Router)
    - React 19.2.4
    - TypeScript 5 (strict)
    - Tailwind CSS 4.3.0
    - next-themes 0.4.6
    - clsx + tailwind-merge
  patterns:
    - App Router (src/app/)
    - ThemeProvider wrapper pattern
    - Tailwind v4 @custom-variant for dark mode
key_files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - src/components/providers/ThemeProvider.tsx
    - src/lib/utils.ts
    - next.config.ts
    - package.json
    - tsconfig.json
    - eslint.config.mjs
    - postcss.config.mjs
  modified: []
decisions:
  - Next.js 16.2.6 installé (create-next-app@latest) au lieu de 15 — version plus récente, même API App Router
  - Tailwind v4 utilise @custom-variant au lieu de tailwind.config.ts darkMode:class — approche CSS-first de v4
  - Dossier temporaire custom-todolist-temp utilisé car create-next-app rejette les noms avec majuscules
metrics:
  duration: 15min
  completed: "2026-05-09T02:42:00Z"
  tasks_completed: 2
  files_created: 9
---

# Phase 01 Plan 01: Bootstrap Next.js Foundation Summary

**One-liner:** Next.js 16.2.6 App Router avec TypeScript strict, Tailwind v4 dark mode par classe via @custom-variant, et ThemeProvider next-themes.

## What Was Built

Fondation technique complète du projet Custom-ToDoList :

- **Next.js 16.2.6** App Router (src/app/) avec TypeScript strict
- **Tailwind CSS v4.3.0** avec dark mode configuré par classe (`@custom-variant dark`)
- **ThemeProvider** wrappant next-themes pour gérer le thème dark/light/system
- **Root layout** en français (`lang="fr"`) avec `suppressHydrationWarning`
- **Page d'accueil placeholder** en français "Gestionnaire de tâches"
- **`src/lib/utils.ts`** avec fonction `cn()` (clsx + tailwind-merge)
- **`output: "standalone"`** dans next.config.ts pour Docker

## Files Created / Modified

### Created
- `src/app/layout.tsx` — Root layout avec ThemeProvider, lang=fr, suppressHydrationWarning
- `src/app/page.tsx` — Page placeholder française "Gestionnaire de tâches"
- `src/app/globals.css` — Tailwind v4 import + @custom-variant dark + variables CSS
- `src/components/providers/ThemeProvider.tsx` — Wrapper next-themes exportant ThemeProvider
- `src/lib/utils.ts` — Fonction cn() avec clsx + tailwind-merge
- `next.config.ts` — Config minimale avec output: standalone
- `package.json` — Dépendances: next, react, next-themes, clsx, tailwind-merge
- `tsconfig.json` — TypeScript strict: true
- `eslint.config.mjs` — ESLint next/core-web-vitals + typescript
- `postcss.config.mjs` — PostCSS avec @tailwindcss/postcss

### Modified
- `.planning/STATE.md` — Mise à jour par l'orchestrateur

## Build Result

**PASS** — `npm run build` exit code 0

```
✓ Compiled successfully in 5.0s
✓ TypeScript: No errors found
✓ Generating static pages (4/4)
✓ .next/standalone/ créé
```

- `npx tsc --noEmit` : aucune erreur
- `npm run lint` (via ./node_modules/.bin/eslint) : aucune erreur

## Deviations from Plan

### Auto-adaptations (non-blocquantes)

**1. [Deviation - Version] Next.js 16.2.6 au lieu de 15**
- **Raison :** `create-next-app@latest` installe la dernière version (16.2.6 au moment de l'exécution)
- **Impact :** Aucun — API App Router identique, fonctionnalités requises intactes
- **Décision :** Conserver v16 (plus récente, mêmes APIs)

**2. [Deviation - Config] Tailwind v4 — pas de tailwind.config.ts**
- **Raison :** Tailwind v4 a abandonné le fichier de config JS/TS pour une approche CSS-first
- **Fix :** Utilisation de `@custom-variant dark (&:where(.dark, .dark *))` dans globals.css au lieu de `darkMode: "class"` dans tailwind.config.ts
- **Impact :** Dark mode fonctionnel, comportement identique à l'attendu
- **Note plan :** Le plan vérifiait `grep "darkMode.*class" tailwind.config.ts` — remplacé par `@custom-variant dark` dans globals.css

**3. [Deviation - Workaround] Dossier temporaire pour create-next-app**
- **Raison :** `create-next-app` rejette les noms de dossier avec majuscules (`Custom-ToDoList`)
- **Fix :** Création dans `custom-todolist-temp`, puis rsync vers `Custom-ToDoList/`
- **Impact :** Aucun — tous les fichiers correctement positionnés

## Self-Check

- [x] `src/app/layout.tsx` existe et contient ThemeProvider + suppressHydrationWarning
- [x] `src/components/providers/ThemeProvider.tsx` existe et exporte ThemeProvider
- [x] `src/lib/utils.ts` existe et exporte cn()
- [x] `src/app/page.tsx` contient "Gestionnaire de tâches"
- [x] `next.config.ts` contient `output: "standalone"`
- [x] `tsconfig.json` contient `"strict": true`
- [x] `.next/standalone/` créé après build
- [x] Commits 32f9b95 et d2aa518 existent

## Self-Check: PASSED
