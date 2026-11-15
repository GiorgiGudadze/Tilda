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

### Step 2: thin slice

One path through every layer, before any polish: schema, seeded data, mock API, query hook, a plain list and a basic waterfall.

- **Mock API in the browser (MSW).** There is no backend, so the service worker runs in the production build too. The app waits for `worker.start()` before it renders, so the first request is never missed. If the worker cannot be registered, a full-page message says so.
- **One schema per response (zod).** `getJson` checks every response against its schema, and the types come from `z.infer`. A response with the wrong shape ends in the same error state as a failed request.
- **Seeded data, written from scratch.** A small seeded random generator and a fixed clock (`SEED_NOW`) give the same 153 traces on every run. Requests are built from templates. A child span always starts after its parent starts and ends before its parent ends, by construction, and a unit test checks it.
- **What goes wrong in the data.** About 10% of generated traces fail, 6% have a failed step that the request survives, 14% have one slow query and 6% are slow everywhere.
- **Three hand-written traces**, always the newest three in the list:

  | Trace      | Path                       | What it shows                                   |
  | ---------- | -------------------------- | ----------------------------------------------- |
  | Slow query | `/traces/a1b2c3d4e5f60001` | One query takes 78% of a 2.9 s request          |
  | Error      | `/traces/a1b2c3d4e5f60002` | A checkout that fails at the card acquirer call |
  | Uncertain  | `/traces/a1b2c3d4e5f60003` | A slow request where no single step stands out  |

- **Span order is pure logic.** `flattenSpans` turns the flat span list into waterfall rows (parent first, children by start time) and has its own unit tests.
- **Times are shown in UTC**, so the seeded data reads the same for every viewer.
- **No automatic retries.** A failed request shows the error and a Retry button straight away.
- **Routing.** React Router's data router, used for the route error element (and later for the lazy route), not for loaders. TanStack Query fetches the data.
- **Left for later steps:** filters, pagination, the chart and loading skeletons (step 4), the complete waterfall and the phone layout (step 5).
- **Bundle size after this step:** 878 kB of JavaScript, 303 kB gzipped. About a third of it (290 kB before gzip) is cookie handling inside MSW (`tough-cookie` and its public suffix list), which this app never uses.

## Time spent

| Step | Time |
| ---- | ---- |
| 1    |      |
| 2    |      |
