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

### Step 4: the traces page

- **Filters live in the URL** (nuqs): search, service, status, sort, page and the duration range. A filtered list is a link that can be shared. Values in the URL that make no sense are ignored.
- **One rule for page 1.** `useTraceFilters` gives the page one `setFilters` function, and it always clears `page`. No filter can forget to return to page 1.
- **A page beyond the last.** The API answers with the last page, and the page shows `min(page in the URL, last page)`. There is no effect that rewrites the URL and no second request.
- **Search is debounced on the request, not on the input.** The search box updates the URL on every key, so it never lags and "Clear filters" just works. `useDebouncedValue` holds the request back until typing stops for 300 ms.
- **The current rows stay while the next ones load** (`placeholderData: keepPreviousData`). The count line says "Updating…" meanwhile. I first dimmed the rows instead, and axe caught it: the dimmed text fell below the contrast minimum.
- **The service filter matches any service in the trace**, not only the entry point. Every trace enters at `api-gateway`, so a filter on the entry point would be useless. The entry service is shown beside the request, not as its own column.
- **The duration chart is six buttons.** The ranges are fixed and their counts come with the list response. The counts ignore the selected range, so the other bars stay and another range can be picked. A selected bar is marked by a frame and bold text, not by colour alone, and a second click clears it. Each button is named like "2 to 3 s, 14 traces".
- **States.** Skeleton rows on the first load, an empty state with "Clear filters", an error state with Retry.
- **Table on wide screens, cards on phones.** `useMediaQuery` renders one or the other, so the content is in the page once.
- **Native `<select>`** for service, status and sort. The browser already handles the keyboard, screen readers and phones. Radix is used where the edge cases are the hard part: the "New to traces?" popover.
- **Demo control** (header). It switches the mock API to slow responses, server errors or no data, then resets every query, so each state can be seen on demand. The mode belongs to the mock layer, not to React state or the URL.
- **The mock validates the query** with the same zod schema the feature exports, and answers 400 to a bad one. `queryTraces` is a pure function with its own unit tests.
- **Left for later steps:** the pinned marker on rows (step 6).

### Step 5: the waterfall and span details

- **Self time is pure logic with its own tests** (`self-time.ts`). A span's self time is its duration minus the union of its children's intervals, each clipped to the parent. The union matters when two calls run at once: a sum would count the overlap twice. The tests cover overlapping children, a child inside another, a child that runs past its parent and one completely outside it.
- **The slowest span is the one with the largest self time**, not the longest one. The root span is always the longest, but it mostly waits. On equal self time the span that started earlier wins.
- **A row is a plain button** in the normal tab order, with `aria-expanded`. Its name says everything the row shows: "postgres, SELECT orders WHERE user_id = ?, 2.26 s, OK, slowest span". The full tree keyboard pattern (arrow keys, levels) is left out on purpose; half of it would be worse than none.
- **Details open under the row**, not in a side panel. It works the same on a phone, the details stay next to the bar they describe, and the space beside the waterfall stays free for the suggestion panel in step 7. One span is open at a time.
- **The open span is in the URL** (`?span=s5`), so a link can point at one step. A span ID that is not in the trace opens nothing.
- **The slowest span and failed spans are marked with an icon and a word**, never by colour alone.
- **Timeline ruler.** Five labels at the quarters of the trace duration. It is hidden from screen readers, because every row states its duration as text. On a phone it shows three labels.
- **Phone layout with one set of elements.** A row is two lines on a phone (name and markers, then bar and duration) and one line on a wide screen. The two line wrappers become `display: contents` on wide screens, so the same four elements drop into one grid. Every bar has the same width on a phone, so the bars stay comparable.
- **Span details show what the data has:** status, duration, self time and its share of the trace, start offset, parent, number of children. Spans carry no attributes (query text, error message), so none are invented.

### Step 6: pins and the Investigation page

- **A pin is the record of one trace:** its status (open or resolved), a note, and the decision about its cause. The decision is part of the schema now; step 7 adds the flow that creates one.
- **One endpoint writes a pin.** `PUT /api/investigation/:traceId` creates the pin, or changes only the fields it is sent. `DELETE` removes it. The mock keeps pins in localStorage, so they survive a reload, and joins the trace summary when it lists them.
- **Pin, Resolve, Reopen and Unpin are optimistic.** The change shows at once. If the request fails, the cached list is put back as it was and a toast says what was undone. One small helper (`changePinsNow`) does the cancel, snapshot and write for all of them. TanStack Query owns this, so `useOptimistic` is not used.
- **Two races, found by tests and fixed.** The mock answers after a random delay, so requests can arrive out of order, as on a real network.
  - _A slow save overwrote a later one._ Pinning a trace and then saving its note sent two full copies of the pin; when the first arrived last, the note was gone. Now a save sends only the fields it changes, and every write to pins shares one queue (`scope` in TanStack Query), so writes reach the server one at a time, in the order they were made.
  - _A refetch hid a change that was still on its way._ Opening the Investigation page loaded the pins while the pin's own save was in flight, and the older answer removed it from the screen. Pins change only through this app's writes, and each write loads them again when the last one finishes, so the pins query no longer refetches by itself (`staleTime: Infinity`). The cost: a change made in another tab shows only after a write or a reload.
- **The note is not optimistic, on purpose.** It has a Save button and its own states: "Saving…", "Saved", or an inline error with Retry that keeps the text. A person who typed a note needs to know it reached the server, not to be told so early.
- **An open form is never reset by a refetch.** The note's text is local state that starts from the saved note and is never copied from the server again. A test changes the pin's status while a note is half typed and checks the text is still there.
- **Note validation.** A note is optional, so an empty one can be saved to clear it. The limit is 500 characters. Past it, the field is marked invalid and its error text is tied to it with `aria-describedby`; Save moves focus to the field instead of sending.
- **Unpin asks first only when there is something to lose:** a note or a recorded cause. The dialog names what will be deleted. An empty pin is removed straight away.
- **The pinned marker on the list is derived on the client** from the pins query. The list endpoint knows nothing about pins.
- **Buttons that repeat on a page name their trace** ("Unpin POST /checkout"), so a screen reader user can tell them apart.
- **No primary button on the Investigation page.** With several cards, no single action is the main one. The primary button of the trace page is "Pin trace".
- **A known limit of optimistic updates:** a reload within a second of a change can lose it, because the request has not reached the server yet.
- **Left out:** the Open/Resolved filter, which the plan lists as a stretch.

## Time spent

| Step | Time |
| ---- | ---- |
| 1    |      |
| 2    |      |
| 3    |      |
| 4    |      |
| 5    |      |
| 6    |      |
