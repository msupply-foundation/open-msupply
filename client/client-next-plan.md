# client-next — Rewrite Plan

> Status: **planning / pre-spike**. This is a transition document with a lifecycle: it
> evolves as the spike runs and is retired once `client-next` is the only client.
> Durable decisions (commands, conventions, structure) graduate into `AGENT.md` as they
> become true — this doc is **not** a replacement for `AGENT.md`.

## 1. Why

The current client (`client/`) is painful in five concrete ways: slow development speed,
a highly complex build, a complex codebase, frequent stateful bugs + inconsistent UI, and
poor runtime performance. The org's position is that the existing code is too far gone to
salvage incrementally — we go back to basics.

**Thesis under test:** the root cause is *engineering discipline and architecture*, **not**
the key dependency choices (React, MUI, JS). We deliberately keep React + MUI and rebuild
clean to prove (or disprove) this.

## 2. Diagnosis (evidence)

A survey of the current client found the thesis is well supported:

**The dependencies are already lean and modern — they are not the problem.**
React 19, MUI v6 + Emotion, TanStack Query v5, Zustand 4, react-router 6,
`graphql-request` + graphql-codegen, date-fns 4, i18next, TS 5 strict. No redundancy (one
date lib, one UI-state lib, one server-cache lib). The deps we want to keep are the deps
already in use.

**The pain is architecture + code quality:**

- **Build:** Lerna 8 + Webpack **Module Federation** across **13 packages**, ~2,509
  `.ts/.tsx` files, 13 tsconfigs, 49 `.graphql` files in a 2-stage codegen, federated-module
  HMR, plus separate Electron-Forge and Capacitor pipelines. Slow, hard to navigate, hard to
  trace dependencies.
- **Bundle bloat is not MUI:** Module-Federation duplication risk + heavy feature libs
  (`recharts`, `material-react-table`, `@jsonforms`, `kbar`), full `lodash` imported for ~3
  functions, Emotion runtime, and no custom chunking strategy.
- **Perf + "stateful bugs" are code-quality bugs, with receipts:**
  - Bare `queryClient.invalidateQueries()` after every sync → nukes ~50 caches → thundering
    herd (`packages/host/src/components/Sync/SyncModal.tsx:79`).
  - `gcTime: 0` cargo-culted across 20+ query hooks → nothing is ever cached.
  - `staleTime: Infinity` on preferences → stale UI after store switch.
  - ~1,029 runtime `sx={}` props re-evaluated by Emotion every render.
  - 500–800-line monolithic detail components, full-object spreads in `useMemo` that defeat
    memoization, no table virtualization.

None of these are framework faults — which is exactly why rebuilding on the *same*
dependencies is a fair test.

## 3. Goals & non-goals

**Goals**
- Simple, traceable code structure; no superfluous dependencies.
- Single Vite app — no Lerna, no workspaces, no Module Federation.
- Keep React + MUI (and the proven data/state/i18n libs).
- Bake engineering guardrails in from day one (see §6) so the hypothesis is actually tested.
- Measure before committing: spike, then decide the migration strategy with real data.

**Non-goals (v1)**
- Plugin system (the other reason Module Federation exists today) — deferred.
- Electron / Android packaging wired in — deferred, but the build stays wrap-compatible.
- Feature parity in the spike phase — the spike proves the architecture, not the whole app.

## 4. Stack decisions

| Concern        | Decision                              | Rationale |
|----------------|---------------------------------------|-----------|
| Build/dev      | **Vite** (single app)                 | Replace Webpack + Module Federation; fast HMR, simple config. |
| Monorepo       | **Drop Lerna / workspaces**           | One `package.json`, one `tsconfig`, one build graph. |
| UI             | **React 19 + MUI v6** (keep)          | Hypothesis: these are fine; discipline is the variable. |
| Shared UI      | **Rebuild lean from scratch**         | Use MUI directly; abstract only what earns its place. |
| Tables         | **TanStack Table (headless) + MUI**   | Drop `material-react-table` (heavy dep, already wrapped in a custom layer). Own a lean grid; rebuild only features in use. |
| Forms          | **React Hook Form + Zod**             | Retire the bespoke error store; uncontrolled inputs (perf); Zod = single validation source. |
| Editing UX     | **Inline cell editing** (no edit modals) | Editable grid = TanStack Table rows as RHF `useFieldArray`; per-row Zod validation. |
| Server state   | **TanStack Query v5** (keep)          | Polling/live data, search, autocompletes, mutations. Misuse (not the lib) caused the old cache bugs. |
| UI state       | **Zustand** (keep, with selectors)    | Lean; enforce selector-based subscriptions. |
| Data layer     | **graphql-request + graphql-codegen** (keep) | The contract with the Rust server; unchanged. |
| Routing        | **TanStack Router v1** (switch from react-router) | Typed/file-based routes; loaders fetch route data at navigation start; preload-on-intent. |
| List/URL state | **Typed search params** (TanStack Router) | Filters/sort/pagination as validated URL state, not ad-hoc component state — kills filter-state desync bugs. |
| i18n / dates   | **i18next / date-fns** (keep)         | No redundancy; not the problem. |
| Platforms      | **Web-first**, Vite `dist/` kept Capacitor/Electron-ready | Wire wrappers later. |

## 5. Project structure (proposed)

```
client-next/
  index.html
  vite.config.ts          # Vite + TanStack Router plugin (file-based routes)
  package.json            # single package, no workspaces
  tsconfig.json           # single config
  codegen.ts              # graphql-codegen, near-operation-file (colocated)
  src/
    main.tsx
    routeTree.gen.ts      # generated by the TanStack Router plugin — do not edit
    routes/               # thin route defs: loaders (prefetch) + typed search params; pages live in features/
    app/                  # shell: router setup, providers, layout, nav, auth, route context (queryClient)
    api/                  # gql client, generated schema types, query-key factories, shared hooks
    components/           # lean shared UI — add only when reuse is real
    features/
      <domain>/
        <Domain>ListPage.tsx
        <Domain>DetailPage.tsx
        api/              # *.graphql + *.generated.ts + hooks (query-key factory per domain)
        components/
    lib/                  # utils, formatters
    intl/                 # i18next setup + locales
```

Principles: feature-folder vertical slices, shallow nesting, no barrel-file mega-exports,
dependencies traceable by reading imports.

## 6. Engineering charter (this *is* the hypothesis test)

Derived directly from the root causes above. These are guardrails, ideally enforced by lint
rules / CI where possible:

- **Cache:** per-domain query-key factories; invalidate by key. **Never** call bare
  `queryClient.invalidateQueries()`. Sensible `staleTime`/`gcTime` defaults — no reflexive
  `gcTime: 0` or `staleTime: Infinity`.
- **State:** server state in TanStack Query, UI state in Zustand with selector subscriptions.
  Minimise React Context for frequently-changing state.
- **Editing:** draft state is immutable and owned by React Hook Form; save by diff
  (`dirtyFields`), not hand-maintained change flags; derived logic in pure functions, never in
  a state setter (see §8).
- **Styling:** prefer the theme + static `styled()` for anything in a hot render path; reserve
  `sx` for genuinely one-off, low-frequency styling. No thousand-prop runtime style churn.
- **Components:** size/complexity budget (split before ~200–300 lines); compose; memo
  deliberately; don't spread whole server objects through props/`useMemo`.
- **Lists:** virtualize anything that can grow unbounded.
- **Imports:** no full-namespace imports of large libs (`lodash` → `lodash-es`/native; named
  MUI icon imports only).
- **Bundle budget:** CI check on initial route payload; fail the build if it regresses.

## 7. Data & loading strategy

Two complementary tools with one enforced rule of thumb: **if data is tied to a route, a
TanStack Router loader fetches it; if it isn't, react-query owns it.**

**Route data → TanStack Router loaders (refetch on navigation).**

- A route's primary data loads in its `loader`, which fires at navigation start (in parallel
  across nested routes) — no render-then-fetch waterfall.
- Refetch-on-navigation is *wanted* here: this is a CRUD app where lists (invoices, stock,
  requisitions…) must reflect the latest state, including post-sync changes. Fresh-on-every-
  visit is a feature, not a cost.
- List state — filters, sort, pagination — lives in **typed, validated search params**, not
  component state. The URL is the source of truth; this deletes the filter/pagination
  state-desync class of "stateful bugs".

**Everything not route-shaped → react-query.**

- Polling / live data: cold chain sensors, sync status, dashboard widgets (`refetchInterval`).
- Interactive fetches: item/name search, autocompletes, dropdowns, data a modal loads on open.
- Mutations: `useMutation` with optimistic updates and **scoped, key-based invalidation**
  (never a bare `invalidateQueries()`).

**The one integration rule.** When a loader needs cached or shared data, it prefetches into
react-query via `queryClient.ensureQueryData(...)` and the component reads it with `useQuery`;
loaders **never store data themselves** — react-query stays the single source of truth for
anything cached. Plain refetch-on-nav list data that isn't shared can skip the cache and fetch
directly in the loader. `queryClient` is injected via the router's route context so loaders can
reach it.

## 8. Component & editing architecture

**Tables — TanStack Table (headless) + MUI.** No `material-react-table` (drops a heavy
dependency; the old app already wrapped it in a ~3,400-LOC custom layer, so its batteries were
half-wasted). We own the grid and render with MUI, rebuilding only what's actually used:
server-side pagination/sort/filter driven by TanStack Router **typed search params** (not
localStorage), row selection + bulk actions, virtualization (`@tanstack/react-virtual`),
sticky header/footer, column visibility/pinning, and custom cell renderers. Old gold-plating
(global admin table defaults, dual paginated/non-paginated hooks) is dropped until proven
needed. Lighter bundle is an explicit goal here.

**Forms & validation — React Hook Form + Zod.** Retires the bespoke Zustand error store. Zod
schemas are the single source of validation truth; RHF's uncontrolled inputs cut re-renders.
`useFieldArray` models editable collections.

**UX shift — inline cell editing, not edit modals.** The old app made table cells read-only and
edited each line in a modal. client-next edits **inline in the grid**, which unifies tables and
forms: an editable list is a TanStack Table whose rows are an RHF `useFieldArray` and whose
editable cells are RHF-bound MUI inputs, validated by a per-row Zod schema.

**Draft-state discipline (kills the old "stateful bug" class).** RHF owns the draft as immutable
state — no in-place array mutation. Saving uses RHF `dirtyFields` (an explicit diff), not
hand-maintained `isCreated/isUpdated/isDeleted` flags. Derived business logic (FEFO allocation,
pack/dose/unit conversion) lives in **pure functions** fed by `watch`, never inside a state
setter. Background refetches must not clobber an in-progress edit.

**Save semantics:** explicit save of the dirty row-set (maps to the existing batch GraphQL
mutations), not per-cell autosave — to confirm in the spike.

**Responsive design (mobile + tablet) — one codebase, layout adapts.** open-mSupply ships to
desktop (web/Electron) and Android **tablets**, with phone as a lighter target.

- **Adapt layout, don't fork features.** One component tree driven by MUI breakpoints — no
  parallel mobile/desktop trees (the old `Toolbar`/`MobileToolbar` duplication is a smell to
  avoid). Same data and logic, different presentation.
- **The table is the responsive pivot, from a single column definition:** desktop = dense
  inline-editable grid (all columns); tablet = comfortable grid, low-priority columns hidden,
  touch-sized inputs (primary data-entry device); phone = grid collapses to a **card list**, and
  tapping a card **expands it inline into an editable panel** (accordion within the list flow —
  never a modal).
- **Column-priority metadata** on each column def drives what shows/collapses per breakpoint (a
  lean version of the old `defaultHideOnMobile`/`cardSummary`).
- **Responsive shell:** persistent drawer nav on desktop/tablet, collapsible on phone.
- **Touch-first data entry:** numeric input modes, large hit targets, fast keyboard flow. A
  5,000-line stocktake on a phone is realistically a search/scan-then-count flow, not a full grid
  — the same RHF + column model serves both presentations.
- **Validate on a real tablet during the spike** (Phase 1 is data entry; tablet is primary).

**Open UX questions the spike must answer:**

- **Card-expand editing interaction details** — the exact tap → expand → commit gesture flow for
  the phone card layout (the high-level approach is set above; the interaction specifics aren't).
- **Cell keyboard navigation** (tab/enter/arrow between editable cells, paste) — Excel-like
  editing is genuinely hard and was previously sidestepped by modals; now in scope.
- **Virtualization + form state** — RHF state for rows virtualized out of the DOM must persist;
  this combination needs care and is a key spike risk.

## 9. Auth, session & sync

The web client is a thin client to a local Rust server that itself syncs to a central server.
Auth, active-store context, and sync are the shell the feature verticals sit on.

### Auth & session

Server contract is unchanged — `authToken` (login) → `me` (user + stores) → `permissions(storeId)`,
a Bearer JWT refreshed via `refreshToken`. client-next changes the *plumbing*, not the contract:

- **Declarative route guards via TanStack Router.** Router context carries `{ queryClient,
  session }`. Root `beforeLoad` gates: server not initialised → `/initialise`; no token →
  `/login`. The authenticated layout enforces auth in `beforeLoad`; permissioned routes check
  their required permission there. Replaces `RequireAuthentication` + the imperative
  `usePermissionCheck`/`useCallbackWithPermission` guards.
- **Session = a small Zustand store** (token, user, activeStore, permissions) with selectors;
  drops `react-singleton-context`. Fed into router context so loaders read `context.session.storeId`.
- **Store-scoped query keys by construction:** the key factory roots all server-data keys under
  `storeId`, so switching store auto-segments the cache — no per-hook injection, no stale
  cross-store reads.
- **Refresh:** drop the 60s interval + activity hook. Schedule one timer at `expiry − buffer`,
  plus a request wrapper that refreshes once and retries on a 401.
- **Login / sync-settings** are RHF + Zod forms.
- Token stays a Bearer JWT in storage (server unchanged) — JS-readable, so XSS-exposed; a proper
  HttpOnly-cookie session is a *server-side* hardening, noted and out of scope.

### Sync

- **Status transport: polling-only for v1** (poll `syncStatus` ~2s). graphql-ws subscriptions
  (`syncInfoUpdated`, `initialisationStatusUpdated`) are a later add — sync is low-frequency and
  barely exercised by the spike.
- **Sync versions: V7-first.** Model the stage display off the API union so a legacy V5/V6
  server still renders; don't hardcode V7 stages.
- **Post-sync refresh = the headline charter fix.** Replace bare `queryClient.invalidateQueries()`
  with `router.invalidate()` (re-runs the active route's loaders) + invalidate active server-data
  observers (`refetchType: 'active'`), so only on-screen data refetches — no thundering herd.
  Refresh session/translations only when actually changed. *Opportunity:* if the server can report
  changed record-types from the last sync, invalidate exactly those key roots — a small API
  enhancement worth requesting.
- **Site initialisation/onboarding** is gated by the same root `beforeLoad`.
- **Native server discovery + hardware ID** stays deferred (web is same-origin), but "resolve
  server endpoint" is isolated to one config seam so native can plug in later.

### Coexistence (if strangler)

client-next reads/writes the **same `auth` cookie + origin** as the old client, so sessions hand
off both ways and routes can be served by either client mid-migration.

## 10. Approach — spike → measure → decide

The spike's job is to produce **data** for the strangler-vs-big-bang decision, not to start
the migration.

### Phase 0 — Foundation / walking skeleton
Stand up the full loop end-to-end on a simple, read-mostly vertical:
- Vite app scaffold, single tsconfig, ESLint/Prettier, codegen wired to the existing schema.
- App shell: providers, router, responsive layout/nav, auth, store context, i18n, theme.
- **Stock vertical:** the Stock list (server-side pagination/sort/filter via typed search
  params, headless table read-only) → navigate to an item's detail (route param + loader
  prefetch). Proves routing, loaders, search-param state, the table, and the data layer without
  any draft-state complexity.
- Web build producing a static `dist/`.

### Phase 1 — Reference vertical (the hard case)
**Stocktake** — the canonical data-entry screen and a deliberate worst case: a store's stocktake
can run to **~5,000 lines**, making it the real render + virtualization challenge, and its
inline-editing pattern is the template for virtually all other data entry. Build the full
inline-editable grid: virtualized rows, each an RHF `useFieldArray` item with per-row Zod
validation (counted quantity, batch, expiry), batch-saved by `dirtyFields`.

The central bet to validate: **a virtualized editable grid that stays fast and correct at ~5,000
RHF-bound rows.** Likely approach — virtualize the DOM (`@tanstack/react-virtual`, only tens of
rows mounted), RHF uncontrolled `register` with `shouldUnregister: false` so values persist as
rows scroll out, per-row memoized components subscribing only to their own fields, and validation
on blur/save rather than whole-form on every keystroke. Outbound Shipment's FEFO allocation is a
good *later* stress test (derived recalculation) once stocktake proves the core. If stocktake is
fast and bug-free, the architecture is proven for everything else.

### Decision gate — metrics
Baseline the **old** client first, then compare. Targets to calibrate, not gospel:

| Dimension        | Metric                                              | Direction |
|------------------|-----------------------------------------------------|-----------|
| Dev startup      | Cold `vite dev` ready time                          | ≪ old |
| Iteration        | HMR time on a component edit                        | ≪ old |
| CI               | Production build time; full type-check time         | ≪ old |
| Bundle           | Initial route JS (gzipped); total                   | ≪ old |
| Runtime          | Edit latency + re-render count on the ~5,000-line stocktake grid (React Profiler / perf trace) | ≪ old |
| Velocity         | Effort to build the reference feature vs its old-client size; subjective traceability | better |

**Gate question:** did clean code on the same deps materially beat the old client? If yes,
proceed and choose the migration path below. If no, we've learned the deps/architecture
assumptions need revisiting before spending more.

### Phase 2+ — migration (decided at the gate, not now)
Likely **incremental strangler**: `client-next` becomes the shell, domains migrate one at a
time, both clients coexist until the old one is empty. Big-bang-to-parity stays on the table
only if the spike shows the surface is smaller/faster to rebuild than expected.

## 11. Risks & open questions

- **Dual maintenance** during coexistence (if strangler) — needs a routing/cutover strategy.
- **Auth/session/sync sharing** during coexistence — addressed by sharing the `auth` cookie/origin
  (see §9); still needs end-to-end testing across both clients.
- **Plugin system** re-architecture (deferred, but eventually needs a Vite-native answer).
- **Electron/Android** wrap-up work, deferred but must not be designed out.
- **TanStack Router ramp-up** (new API for the team) — budget for it in Phase 0 (file-based
  routing decided).
- **Inline-editing UX** (mobile/tablet, cell keyboard nav, virtualization + form state) — see
  §8; the primary spike risk.

## 12. Coexistence & AGENT.md

While both clients exist, `AGENT.md` should honestly describe **both** (legacy `client/` +
new `client-next/`, with each one's commands). That section gets added to `AGENT.md` **when
`client-next` is scaffolded** — not before, so `AGENT.md` keeps describing current truth.
This plan feeds `AGENT.md` over time; it does not become it.
