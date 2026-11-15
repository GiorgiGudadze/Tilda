# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

Trace Investigator: a small React app where an on-call engineer finds slow or failing requests, sees which step is to blame, reviews an AI-suggested cause and records the outcome. There is no backend; a mock API runs in the browser.

The full agreed spec is in `.notes/PLAN.md` (local, not committed). Read it before changing anything. If it is missing, ask for it.

## Commands

```sh
nvm use            # Node 26, from .nvmrc
pnpm install
pnpm dev           # http://localhost:5173
pnpm check         # lint + format check + typecheck + unit tests
pnpm e2e           # Playwright against the production build
pnpm format        # Prettier
```

## Rules

- The author reviews every step and makes every commit. Never commit or push.
- Work one build step at a time (see the build order in the plan). Stop after each step for review.
- Do not add a dependency or a feature that is not in the plan. Any addition names what it replaces.
- Write everything from scratch. Do not copy code or design from other products.
- Keep code simple enough to explain and modify live.

## Conventions

- **State:** server data in TanStack Query, URL state in nuqs, short-lived UI state in `useState`/`useReducer`. No global store.
- **Data access:** components call feature hooks, never `fetch`. API responses are checked with zod; types come from `z.infer`.
- **Components:** library components take plain props and know nothing about the API.
- **Styling:** semantic tokens only. No raw colours and no `dark:` colour variants in components.
- **Status:** icon plus text, never colour alone. lucide icons, never emoji.
- **Accessibility:** target WCAG 2.1 AA. Lint includes the jsx-a11y rules; e2e runs axe.
- **Tests:** test behaviour, not internals. Pure logic gets unit tests.
- **Imports:** use the `@/` alias for `src/`.
