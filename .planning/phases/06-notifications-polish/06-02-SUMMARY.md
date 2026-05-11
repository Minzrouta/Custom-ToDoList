---
phase: 06-notifications-polish
plan: 02
subsystem: ui-polish
tags: [ui, header, notifications, dark-mode, search, profile, a11y]
requirements: [FR-09, NFR-04]
dependency_graph:
  requires:
    - "06-01 (Notification model + /api/notifications routes + lib/notifications)"
    - "next-themes (already wired in src/app/layout.tsx via ThemeProvider)"
    - "next-auth session (auth())"
  provides:
    - "NotificationsDropdown: bell + badge + 10 last notifs + mark-all-read"
    - "ThemeToggle: dark/light switch (next-themes mounted-check)"
    - "SearchInput: header form → /search?q=..."
    - "/search page (server, scoped by membership)"
    - "ProfileForm: edit name + image"
    - "PATCH /api/users/me: update name + image with validation"
  affects:
    - "src/components/ui/Header.tsx (now uses 3 new sub-components)"
    - "src/app/profile/page.tsx (extended with ProfileForm section)"
tech_stack:
  added: []
  patterns:
    - "next-themes mounted-check to avoid SSR hydration mismatch"
    - "Optimistic UI: mark-as-read locally + fire-and-forget PATCH"
    - "Click-outside hook inline (useRef + mousedown listener)"
    - "Polling 60s + onFocus revalidation (no SSE, lightweight)"
    - "Server page with prisma membership scoping (NFR-02)"
key_files:
  created:
    - "src/components/ui/NotificationsDropdown.tsx"
    - "src/components/ui/ThemeToggle.tsx"
    - "src/components/ui/SearchInput.tsx"
    - "src/components/ui/ProfileForm.tsx"
    - "src/app/search/page.tsx"
    - "src/app/api/users/me/route.ts"
  modified:
    - "src/components/ui/Header.tsx"
    - "src/app/profile/page.tsx"
decisions:
  - "Polling 60s + onFocus refresh (no WebSocket/SSE — overkill pour MVP)"
  - "Search scopée par membership côté server (NFR-02 strict isolation)"
  - "take: 50 sur findMany (perf NFR-01, pagination déférée v2)"
  - "Image avatar via URL externe (upload direct v2)"
  - "ThemeToggle: placeholder SVG vide pendant le mount pour éviter le flash"
metrics:
  completed: "2026-05-11"
  tasks: 2
  files_changed: 8
  commits: 2
---

# Phase 06 Plan 02: Notifications UI + Dark Mode + Search + Profile Summary

Toute la couche UI de la phase 6 a été livrée: dropdown notifications avec badge dans le Header, toggle dark mode via next-themes, recherche globale (header input + page /search server scopée par membership), et extension de /profile avec édition du nom et de l'URL d'avatar (via nouvelle route PATCH /api/users/me).

## Composants livrés

### NotificationsDropdown (`src/components/ui/NotificationsDropdown.tsx`)

- Client component. Icône cloche + badge rouge avec compteur (`unreadCount` ou `"99+"`).
- Au mount : `GET /api/notifications?limit=10`. Stocke `items` + `unreadCount`.
- Revalidation : interval 60 s + `window.onFocus`.
- Clic sur la cloche → ouvre un dropdown (max-h 96, scrollable).
- Click outside → ferme (listener `mousedown` sur document).
- Clic sur une notif :
  - Optimistic UI: ajoute `readAt` côté client et décrémente le badge.
  - Fire-and-forget `PATCH /api/notifications/{id}` (catch silencieux — fail-safe).
  - Navigation: `router.push(\`/workspace/{workspaceId}/list\`)` si `notif.task`, sinon `/workspace/{workspaceId}` si `notif.workspace`.
- Bouton « Tout marquer comme lu » :
  - Visible uniquement si `unreadCount > 0`.
  - Optimistic: reset local + `POST /api/notifications/mark-all-read`.
  - Rollback complet si erreur réseau (restaure items + refetch).
- Format relatif des dates: « à l'instant » / « il y a N min/h/j ».
- Icônes par type: 👤 task_assigned, ⏰ task_due_soon, ✅ task_completed, 💬 task_mentioned.
- a11y: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`.

### ThemeToggle (`src/components/ui/ThemeToggle.tsx`)

- Client component. `useTheme()` de next-themes.
- `mounted` state pour éviter le hydration mismatch (next-themes ne résout pas côté SSR).
- Pendant mount: SVG vide (placeholder neutre, pas de flash d'icône).
- Une fois monté: icône soleil (mode dark actif) ou lune (mode light actif).
- Clic → `setTheme(isDark ? "light" : "dark")`. next-themes persiste en `localStorage`.

### SearchInput (`src/components/ui/SearchInput.tsx`)

- Client component. Formulaire avec icône loupe inline.
- Submit → `router.push(\`/search?q=\${encodeURIComponent(q)}\`)`.
- Trim + ignore si vide.
- `hidden md:block` — masqué en mobile pour économiser de la place.
- a11y: `role="search"`, label `sr-only`.

### ProfileForm (`src/components/ui/ProfileForm.tsx`)

- Client component. Props: `initialName`, `initialImage`, `email`.
- Champs:
  - Email (disabled / readOnly — géré par OAuth)
  - Nom (required, maxLength 100)
  - URL avatar (optionnel, `type="url"`)
- Preview avatar si URL `^https?://` (img + onError fallback).
- Submit → `PATCH /api/users/me` avec `{ name, image }`.
- Gestion: états `loading`, `error`, `success`. `router.refresh()` au succès pour rafraîchir le SSR.

## API livrée

### `PATCH /api/users/me` (`src/app/api/users/me/route.ts`)

- Auth required (401 sinon).
- Validations:
  - `name`: si fourni, doit être string non-vide ≤ 100 chars (400 sinon).
  - `image`: si fourni non-vide, doit être URL `http(s)` valide (400 sinon). Si vide → null.
  - Tous deux optionnels — patch partiel autorisé.
- Update Prisma + retour `{ data: { id, name, email, image } }`.
- 500 + `console.error` en cas d'erreur Prisma.

## Pages livrées / modifiées

### `/search` (`src/app/search/page.tsx`) — **nouvelle page server**

- Auth required (redirect `/auth/signin` sinon).
- `searchParams` est une `Promise<{ q?: string }>` (Next.js 16 async dynamic API) — `await searchParams`.
- Récupère les `workspaceIds` du user via `prisma.workspaceMember.findMany`.
- Si `query` vide OU `workspaceIds` vide → `tasks = []` (court-circuit).
- Sinon: `prisma.task.findMany({ workspaceId: { in: workspaceIds }, OR: [title contains, description contains] }, mode: "insensitive")`.
- `take: 50`, `orderBy: [priority desc, createdAt desc]`.
- Inclut workspace/category/assignee pour l'affichage.
- Liens vers `/workspace/{id}/list` (la sélection précise de la tâche serait pour v2).
- **NFR-02 isolation** : la requête est scopée par `workspaceId: { in: workspaceIds }` — aucun accès cross-workspace possible.

### `/profile` (`src/app/profile/page.tsx`) — étendu

- Lit `image` en plus dans le `findUnique`.
- Section « Compte » via `<ProfileForm />` AVANT la section « Intégrations ».
- Section « Intégrations » contient toujours `<UserDiscordSettings />` inchangé.

### `Header.tsx` — étendu

- Layout en 3 zones: brand (gauche), SearchInput (centre, flex-1 justify-center), actions (droite).
- Actions: `ThemeToggle` + `NotificationsDropdown` + lien `/profile` (avatar) + bouton signOut.
- L'avatar + nom est désormais un `Link href="/profile"` (cliquable, hover state).
- Username `hidden lg:inline` (responsive).
- API `HeaderProps { user, className }` strictement préservée — aucun breaking change pour les 5 pages qui utilisent Header (`/dashboard`, `/profile`, `/search`, `/workspace/[id]/*`).
- Aucun `useState`/`useEffect` direct dans Header.tsx (toute la logique est encapsulée dans les sous-composants).

## A11y appliquée

- `aria-label` sur tous les boutons icon-only (cloche, soleil/lune, profil).
- `aria-haspopup` + `aria-expanded` sur le bouton cloche.
- `role="menu"` sur le dropdown notifications.
- `role="search"` + label `sr-only` sur le SearchInput.
- `alt` sur tous les `<Image>` et `<img>`.
- `aria-hidden="true"` sur les icônes décoratives.

## Patterns réutilisables introduits

1. **next-themes mounted-check** — pattern standard pour éviter le hydration mismatch avec `useTheme()`. À réutiliser pour tout composant qui dépend du thème résolu.
2. **Click-outside hook inline** — `useRef` + `mousedown` listener conditionné sur `open`. Réutilisable pour tout dropdown/popover sans dépendance externe.
3. **Optimistic update fire-and-forget** — pattern utilisé pour `markAsRead` : modifie le state local, déclenche le PATCH sans `await`, ne rollback que sur `markAllRead` (où le coût d'un échec est plus visible).
4. **Polling léger 60 s + onFocus** — alternative bon-marché à WebSocket/SSE pour la fraîcheur des notifs. Convient pour MVP.

## Vérifications

- `npx tsc --noEmit` : **clean** (0 erreur)
- `npm run build` : **success** (compilation 10.6 s, 14 pages générées)
- Header.tsx contient 3 imports + 3 usages JSX (grep = 6 matches)
- `/search/page.tsx` contient 2 matches `mode: "insensitive"` (title + description)
- `/api/users/me` apparaît dans le manifest de build (route `ƒ /api/users/me`)
- `/search` apparaît dans le manifest de build (route `ƒ /search`)

## Déviations du plan

Aucune. Plan exécuté exactement comme spécifié.

Note mineure: ajout d'un fallback `email={user.email ?? ""}` dans `/profile/page.tsx` pour défense — le schéma garantit `email` non-null mais cela évite un warning TS si le shape de la requête évolue.

## Commits

- `8154668` feat(06-02): Header dropdown notifs + ThemeToggle + SearchInput
- `b9485e3` feat(06-02): /search page + ProfileForm + PATCH /api/users/me

## Self-Check: PASSED

Fichiers créés (vérifiés):
- FOUND: src/components/ui/NotificationsDropdown.tsx
- FOUND: src/components/ui/ThemeToggle.tsx
- FOUND: src/components/ui/SearchInput.tsx
- FOUND: src/components/ui/ProfileForm.tsx
- FOUND: src/app/search/page.tsx
- FOUND: src/app/api/users/me/route.ts

Fichiers modifiés (vérifiés):
- MODIFIED: src/components/ui/Header.tsx
- MODIFIED: src/app/profile/page.tsx

Commits (vérifiés):
- FOUND: 8154668
- FOUND: b9485e3
