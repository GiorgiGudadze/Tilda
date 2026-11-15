# Trace Investigator

A small React app where an on-call engineer finds slow or failing requests, sees which step is to blame, reviews an AI-suggested cause and records the outcome.

> Work in progress. This README grows with each build step.

## Setup

Requires Node 26 (see `.nvmrc`) and pnpm.

```sh
nvm use
pnpm install
pnpm dev
```

## Scripts

| Script        | What it does                                  |
| ------------- | --------------------------------------------- |
| `pnpm dev`    | Start the dev server                          |
| `pnpm build`  | Typecheck and build for production            |
| `pnpm check`  | Lint, format check, typecheck and unit tests  |
| `pnpm e2e`    | Playwright tests against the production build |
| `pnpm format` | Format with Prettier                          |

## Build notes

### Step 1: setup

- **Node 26, pinned** in `.nvmrc` and `engines`. It is the current LTS and the default on Vercel.
- **pnpm**, pinned with `packageManager`, so local, CI and Vercel use the same version.
- **TypeScript strict** with `noUncheckedIndexedAccess`, so reading `items[0]` forces a check for `undefined`.
- **oxlint** for linting. It is what the Vite template ships, and its jsx-a11y rules catch accessibility mistakes while coding.
- **Vitest and Testing Library** for unit and component tests. **Playwright with axe** for end-to-end and accessibility checks, run against the production build because that is what the live link serves.
- **CI** runs lint, format check, typecheck, unit tests and build on every push.
- **Vercel** serves the app. `vercel.json` rewrites every path to `index.html` so deep links work.

## Time spent

| Step | Time |
| ---- | ---- |
| 1    |      |
