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

### Step 3: tokens, themes, layout, base components

- **Semantic tokens only.** Every colour is a token in `src/index.css`, and components use token names (`bg-background`, `text-success`, `bg-service-3`). A theme changes the tokens and never the components. The `dark:` variants that came with the shadcn button are removed for the same reason.
- **Colour has two jobs.** The interface is neutral. Colour is kept for status (success, destructive) and for service identity (eight service colours and one neutral fallback).
- **Contrast is computed, not judged by eye.** Text tokens are at least 4.5:1 on every surface, and the lines and bars that carry meaning (`input`, `ring`, the service colours) are at least 3:1, in both themes.
- **Service colours.** A search picked eight colours that keep 3:1 on every surface, stay away from the red and green of the status colours, and are as far apart as possible for normal vision and for simulated red-green colour blindness. The light set clears both targets for every pair of colours. The dark set clears the colour-blind target and is just under the normal-vision one (14.3 against a target of 15). This is acceptable because colour is never the only signal: every bar has its service name beside it as text.
- **Status is an icon plus text** (`StatusBadge`), never colour alone. Icons are lucide.
- **Theme.** It follows the system setting until the user chooses, then the choice is saved and wins. A small inline script in `index.html` sets the theme before the first paint, so the page never flashes the wrong one. `useTheme` is the one hook that owns it.
- **`.light` and `.dark` work on any container.** That is how `/design` shows every component in both themes side by side, and why one axe run on that page checks the contrast of both.
- **Library components take plain props** and know nothing about the API: `StatusBadge`, `ServiceLabel`, `SpanBar`, `DurationBar`, `EmptyState`, `ErrorState`, `Skeleton`, `ThemeToggle`. The traces feature maps a service name to a colour slot; the components only know the slot.
- **Layout.** Skip link, header with navigation and the theme toggle, one `main` landmark. The current page is marked with `aria-current` and an underline, not colour alone.
- **`/design` is the only lazy route.** While its code downloads the page shows a loading line. If the download fails, the router's error page offers a reload and keeps the header. Its chunk is 6.8 kB.
- **Left for later steps:** the Demo controls and the Investigation link in the header (steps 4 and 6), the confidence badge and suggestion card (step 7).

## Time spent

| Step | Time |
| ---- | ---- |
| 1    |      |
| 2    |      |
| 3    |      |
