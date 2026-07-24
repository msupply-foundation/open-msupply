# Clinicians — build report

**Target stack:** SolidJS + Vite; shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Built from [`spec/clinicians/`](../../../spec/clinicians/) — `rules.md`, `contract.md`, `ui-surface.md`, and the behaviour-anchored case [`cases/OMS-FUN-DIS-004`](../../../spec/clinicians/cases/OMS-FUN-DIS-004%20-%20Verify%20insert%2C%20update%20of%20Clinicians%20details.md). One screen: the read-only Dispensary Clinicians list. No detail, no search/filters, no mutations.

Files: `clinicians.graphql` (+ generated), `cliniciansListLogic.ts` (+ `.test.ts`), `list/CliniciansList.tsx`, `index.tsx`. Wiring: `dispensary/clinicians → cliniciansRoutes` in `src/App.tsx` (nav entry already present in `navConfig`).

## Anchor coverage

Behaviours are `OMS-FUN-DIS-004.*`. Logic-level tests are in `cliniciansListLogic.test.ts`. Rendered-UI (`.1`, `.12`, `.14`, `.22`–`.24`), pagination navigation (`.8`), and any behaviour needing the real backend or multiple stores (`.11`, `.18`, `.19`, `.25`) have **no CI test tooling in this stack yet** (C2 real-backend + C4 a11y/render legs) — covered at the logic level where possible and listed below, per IMPLEMENTING C1.

| Behaviour                                 | Test / disposition                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.1` list displays                        | `cliniciansListPath` builds the route; render itself is C4/e2e (DataTable)                                                                                                                                          |
| `.5` sort first name                      | `SORTABLE_KEYS` includes `firstName`                                                                                                                                                                                |
| `.6` sort last name                       | `SORTABLE_KEYS` includes `lastName`                                                                                                                                                                                 |
| `.7` sort initials                        | `SORTABLE_KEYS` includes `initials`                                                                                                                                                                                 |
| `.9` store scope                          | `buildVariables` sends `storeId` from the path                                                                                                                                                                      |
| `.10` active-only                         | `buildVariables` always sends `filter: { isActive: true }`                                                                                                                                                          |
| `.13` gender label + variant collapse     | `genderLabelKey` maps all 11 values; hormone/surgical → plain label                                                                                                                                                 |
| `.15` sort by code                        | `SORTABLE_KEYS` includes `code`                                                                                                                                                                                     |
| `.16` default last-name-asc               | `DEFAULT_STATE.sort` / `buildVariables`                                                                                                                                                                             |
| `.17` mobile & gender not sortable        | `SORTABLE_KEYS` excludes both                                                                                                                                                                                       |
| `.18` stable paging (tiebreaker)          | single-element sort sent (`buildVariables`); the stable `id` tiebreaker is server-side → **C2 gap**                                                                                                                 |
| `.20` page size 10/20/50/100, default 20  | `DEFAULT_PAGE_SIZE` / `PAGE_SIZE_OPTIONS` / `buildVariables.page`                                                                                                                                                   |
| `.21` no search/filters                   | `buildVariables.filter` has only `isActive`                                                                                                                                                                         |
| `.12` row content matches record          | column defs read fields verbatim (DataTable); render is **C4/e2e**                                                                                                                                                  |
| `.14` blank cells for missing optionals   | gender accessor returns `''` when null; `mobile`/`firstName` nulls rendered by DataTable — **C4/e2e**                                                                                                               |
| `.22` rows inert (no detail)              | screen omits `onRowClick` — structural; **C4/e2e**                                                                                                                                                                  |
| `.23` no create/edit/delete/select/export | screen renders no actions/selection — structural; **C4/e2e**                                                                                                                                                        |
| `.24` empty state                         | `emptyMessage = t('error.no-clinicians')`; render is **C4/e2e**                                                                                                                                                     |
| `.8` pagination to next page              | page state wired to DataTable; navigation is **C4/e2e**                                                                                                                                                             |
| `.11` re-scope on store change            | `storeId` drives `buildVariables`; live re-scope needs a running app + 2nd store — **C2 gap (multi-store)**                                                                                                         |
| `.19` full-total count                    | `totalCount` read from the connector; value correctness is server-side — **C2 gap**                                                                                                                                 |
| `.25` shared codes both display           | `rowKey` is `id` (not `code`), so equal codes don't collide; both-rows-present is server data — **C2 gap**                                                                                                          |
| `.2`, `.3`, `.4`                          | **Out of scope — cross-vertical.** Prescription-flow create/search/attach, owned by the prescriptions vertical (not yet specced). Anchored here only because the case spans verticals; not this vertical's surface. |

No `(pending: …)`, `manual-only`, or `needs: hardware` behaviours. `needs: multi-store` applies to `.9`/`.11`; `needs: sync` to `.10`'s inactive-exclusion — see the vertical README's unprobed note.

## Flags

- **Cross-vertical gender rendering inconsistency (candidate spec/shared-code refinement).** The shared [`src/domain/patient/gender.ts`](../../domain/patient/gender.ts) `genderLabel` derives keys mechanically and **humanises** unmapped values, so `TRANSGENDER_FEMALE_SURGICAL` renders "Transgender female surgical" — it does **not** collapse to the plain label. Clinicians `.13` requires the collapse (grounded on the real app's `getGenderTranslationKey`). I implemented a local total, compile-safe `genderLabelKey` (all 11 values → an existing catalog key) rather than reuse the diverging helper. A future refactor could unify them by adding the collapse to the shared helper, but that touches the patients vertical (out of scope here). Worth the spec owners deciding whether the two verticals should render the same enum identically.
- **No spec gaps, no ⛔ roles, no `⚠️ VERIFY` hit, no DIVERGENCES.** Contract, columns, sort, and pagination all resolved cleanly against the pinned schema and the registry (DataTable / Page / Header / Breadcrumb roles).
- **C2 (real backend) has no CI tooling in this stack** — the behaviours marked "C2 gap" above (server sort collation & tiebreaker, full-total count, shared-code both-present, live store re-scope) are covered at the query-shape level only. The spec's seeded-probe run already confirmed them live against the real backend (see the vertical README).

## Build-environment notes (not caused by this vertical)

- `pnpm codegen` regenerated **other** verticals' `.generated.ts` (customer-returns, outbound-shipments) with a new `dynamicFilter` field, which breaks `customer-returns/list/listFilters.tsx` type-checking — a latent codegen/schema-freshness drift already on `main`. Restored those files to their `origin/main` state so this scoped build touches only `clinicians`; the drift is a separate follow-up for the customer-returns owners.
- `node_modules` was missing `stylelint-no-unsupported-browser-features` / `eslint-plugin-compat` (both in `package.json`); ran `pnpm install` (lockfile already up to date) to sync before the gates.

## Gates

`pnpm check` ✓ (tsc/stylelint/theme/page-css/min-browser) · `pnpm test` ✓ (526 files pass incl. the 12 clinicians tests) · `pnpm build` ✓ (lazy chunk `CliniciansList-*.js`).

**Reactivity:** the list resource is read via `data.latest` (non-suspending) + `data.loading`, never the suspending `data()` — so sort/page changes re-fetch without remounting the table (no lost focus/scroll). Matches the merged `master-lists` reference; the screen has no live input state above the resource. ([`kdd/solid-reactivity-pitfalls`](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md) read-safety gate.)

## Follow-ups

- Live-backend (C2) and a11y/render (C4) coverage for the behaviours listed above, once the stack has the tooling / an e2e suite for clinicians (the exploratory workflow exists at `exploratory/workflows/clinicians.md`).
- Cross-vertical: unify gender-label rendering with the prescriptions/patients surface (see Flags) — a shared-helper decision for the spec owners.
