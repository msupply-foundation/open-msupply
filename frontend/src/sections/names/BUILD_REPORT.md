# names — build report

**Target stack:** SolidJS + Vite, composed from the shared component library in
[`src/ui/`](../../ui/) through the roles in
[`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

**Scope of this run.** A **scoped, additive** build of **slice 3 only** — the
central server's **facility register** (Manage › Stores, `spec/names` S5) and its
**bulk property import** (S6), added to an already-built vertical. Slices 1 and 2
(the customer/supplier lists and details) were **not** regenerated: they already
pass and were left byte-identical. New code lives entirely in
[`register/`](./register/); the only edits outside it are three additive wiring
lines (`src/App.tsx` route, `src/sections/names/index.tsx`, two locale keys) and
two additive props on the settings vertical's store editor (below).

Gates, re-run repo-wide after the last change: `pnpm check` ✅ · `pnpm test` ✅
(1442 tests, 144 files — 37 new) · `pnpm build` ✅. `pnpm lint` is **not** in the
done bar and was already red on this worktree before the run (5 pre-existing
`camelcase` errors in `names/detail/nameDetail.test.ts`,
`settings/configuration/propertySets.test.ts`,
`prescriptions/list/prescriptionsToCsv.test.ts`, plus one in `scripts/`); the
files this run authored carry **0 lint errors**.

## What was built

| File                                 | What                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `register/facilityRegister.graphql`  | the register's `names(filter: {isStore: true})` read + `updateNameProperties` (the import's per-row write) |
| `register/facilityRegisterLogic.ts`  | pure: membership filter, URL state, variables, the unpaginated template read, the save-and-move-on walk    |
| `register/registerFilters.tsx`       | the register's one filter (`codeOrName`), as an exhaustive expose-or-dismiss map over `NameFilterInput`    |
| `register/FacilityRegister.tsx`      | S5 — the list screen, its one page action, and the two modals it opens                                     |
| `register/propertyImport.ts`         | pure: CSV read/write, column→property matching, per-row validation, the merged document, outcome summary   |
| `register/ImportPropertiesModal.tsx` | S6 — the three-step import modal                                                                           |

## Anchor coverage

Behaviours from
[`spec/names/cases/OMS-REG-MNG-02`](../../../spec/names/cases/OMS-REG-MNG-02%20-%20Validate%20Facilities%20Management.md).
`L` = live-verified by driving this FE at `:3111` against the probe central
server (`:8890`, store _Tamaki Central Medical Store_) during the build.

| Behaviour                                          | Test / evidence                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `.1` lists all stores                              | `facilityRegisterLogic.test.ts` · **L** (8 of 8 rows)                         |
| `.2` total matches                                 | **L** ("1–8 of 8"); count is `NameConnector.totalCount`                       |
| `.3` search by name                                | `facilityRegisterLogic.test.ts` · **L** (`"waih"` → 1)                        |
| `.4` search by code                                | `facilityRegisterLogic.test.ts` · **L** (same field, both halves)             |
| `.5` clearing restores                             | `facilityRegisterLogic.test.ts` (empty chip is stripped)                      |
| `.6` row opens the editor                          | `facilityRegisterLogic.test.ts` (route) · **L**                               |
| `.7` save closes the window                        | settings' `storeEditorLogic.test.ts` + `StoreEditorModal` (owner)             |
| `.8` saved value reflected                         | **L** (editor reopened shows it) — see _moved-behaviour note_ below           |
| `.9` `.10` footer Edit path                        | **settings/** owns it (`OMS-REG-SET-05.17/.18`) — exempt here                 |
| `.11` import control opens the modal               | **L**                                                                         |
| `.12` template has a row per store                 | `facilityRegisterLogic.test.ts` (unpaginated read)                            |
| `.13` template has all columns                     | `propertyImport.test.ts`                                                      |
| `.14` a completed template applies cleanly         | `propertyImport.test.ts` · **L** (2/2 written, modal closed)                  |
| `.15` imported values reflected                    | **L** (verified at the contract: both facilities' `properties`)               |
| `.16` header reorders                              | `facilityRegisterLogic.test.ts` · **L**                                       |
| `.17` rows-per-page                                | `facilityRegisterLogic.test.ts` · **L** (control present, 10/20/50/100)       |
| `.18` `.19` next/previous page                     | `facilityRegisterLogic.test.ts` (offset paging)                               |
| `.20` not store-scoped                             | `facilityRegisterLogic.test.ts` · **L** (own store's name listed)             |
| `.21` a non-store never appears                    | `facilityRegisterLogic.test.ts` (`isStore` is the whole test)                 |
| `.22` a disabled store's facility is absent        | server-enforced; no client surface — see _gaps_                               |
| `.23` code/name plain, no store indicator          | **L** (accessibility tree: plain cells)                                       |
| `.24` marker when set, blank when not              | **L** (`img "Supplier"` where set, empty cell where not)                      |
| `.25` only Code/Name sortable                      | `facilityRegisterLogic.test.ts` (the generated union) · **L**                 |
| `.26` opens name-ascending, case-insensitive       | `facilityRegisterLogic.test.ts` · **L** (Waitakere before waitakere)          |
| `.27` search narrows, total follows                | `facilityRegisterLogic.test.ts` · **L**                                       |
| `.28` no create/delete/bulk/export                 | **L** (the only page action is Import properties)                             |
| `.29` empty state, no create                       | **L** ("No stores to display.", no action)                                    |
| `.30` editor opens on THAT facility                | **L** (row 1 → "Kopu Health Centre")                                          |
| `.31` save-and-move-on advances                    | `facilityRegisterLogic.test.ts` · **L** (Kopu → Opua, stays open)             |
| `.32` unavailable on the last row                  | `facilityRegisterLogic.test.ts` · **L** (disabled on waitakere Pharmacy)      |
| `.33` no definitions ⇒ refuses in place            | `FacilityRegister.tsx` logic only — **not exercised**, see _gaps_             |
| `.34` steps reachable only backwards               | `ImportPropertiesModal.tsx` · **L** (Import disabled until parsed)            |
| `.35` non-CSV refused before parsing               | `propertyImport.test.ts` · **L** ("Invalid file", stays on Upload)            |
| `.36` template carries current values              | `propertyImport.test.ts`                                                      |
| `.37` a column per property + Error message        | `ImportPropertiesModal.tsx` · **L** (16 property columns + Error message)     |
| `.38` all of a row's reasons together              | `propertyImport.test.ts` · **L** (blank code; disallowed value)               |
| `.39` unknown code passes review, refused on apply | `propertyImport.test.ts` · **L** ("Record does not exist")                    |
| `.40` rows applied independently                   | `propertyImport.test.ts` · **L** (1 written, 3 failed)                        |
| `.41` failed run re-shows exactly the failed rows  | `propertyImport.test.ts` · **L**                                              |
| `.42` a failed run reports failure (D97)           | `propertyImport.test.ts` · **L** ("Import failed: 3 of 4 rows…")              |
| `.43` all-succeed reports the count, closes        | `propertyImport.test.ts` · **L** (modal closed, "2 facilities were updated.") |

**C1 exemptions, listed:**

- `.9`, `.10` — the **footer** store-editor path, owned by `spec/settings`
  (`OMS-REG-SET-05`); kept in this case verbatim from its tmf-testing origin.
  Covered by the settings vertical's own build, not re-tested here.
- `.7` — the editor's own save semantics are settings' screen. This build only
  routes the save's success to the register's move-on callback.
- `.22` — a disabled store's exclusion is enforced entirely server-side and has
  no client expression to assert; the probe dataset has no disabled store and
  the schema exposes no operation to disable one (the spec carries the same
  limitation as a ⚠️ VERIFY).
- `.33` — implemented, but the probe server has 14 seeded property definitions
  and `configureNameProperties` has no delete counterpart, so the empty-catalogue
  branch could not be reached live. Logic-level only.

Slices 1 and 2's `AC-N*` anchors are unchanged by this run; see the vertical's
existing tests under `list/` and `detail/`.

## Flags

**Spec gaps hit**

- **`ui-surface` S6 cites `messages.import-generic` for the success outcome, but
  that string ("Import successful") carries no count** — and the spec's own `.43`
  requires the number of facilities written. It also names **no key at all** for
  the failure outcome, because the current app has none (that absence _is_ D97).
  Two keys were minted in `en/` only, in the catalogue's flat role-prefixed
  register: `messages.import-facilities-failed` and the plural pair
  `messages.import-facilities-updated_one`/`_other`. `messages.import-generic` is
  consequently **unused** by this build. → candidate spec refinement.
- **A blank property cell is unspecified.** `rules.md` makes a blank _code_ and a
  blank _name_ failures and says "a property with no column is left as it was",
  but says nothing about a column present with an empty cell. Decided: a blank
  cell **offers no value** and leaves the property as it was (consistent with
  blank property cells never being a failure reason). → candidate spec refinement.
- **`.43` says the successful run "reports how many facilities it wrote **and**
  closes".** A closed modal cannot report anything, so the count is reported by
  the **register**, as an in-place success notice
  (`controls § action feedback` — never a toast). → candidate spec refinement:
  say where the count is read.
- **The review table's in-place _filtering_** (ui-surface S6: "sortable and
  filterable in place") is **not built** — local **sorting** is (Code/Name).
  A review of the file just uploaded is short, and `DataTable` is manual-sorting
  with no local filter model; adding one is a library-level change. Flagged
  rather than improvised.

**Roles: none ⛔.** Every role S5/S6 names resolves to a built component —
boolean cell (`BooleanCell`/`getBooleanCell`), inline banner (`Alert`),
determinate progress list (`ProgressList`, from `ui/sync`), file upload zone
(`UploadZone`), data table (`DataTable`), modal dialog (`Dialog`), modal footer
buttons (`CancelButton` / `SaveAndNextButton` / `Button`).

**⚠️ VERIFY items carried by the spec, untouched by this build**

- The **disabled-store search escape** (contract § which names qualify) — derived
  from the repository's OR-then-AND filter construction, never exercised. The
  client sends exactly what the spec says, so nothing here changes the exposure.
- The **central-server gate being client-side only** — this build honours it as
  specified (the gate is the navigation registry's `central` capability on the
  Manage section; the route and the read carry none). Not observed on a
  non-central server: `:8000` was not exercised this run.
- **Permission denial on either write** — the register was driven as an
  all-permission user. `NamePropertiesMutate` gating is the server's; the editor
  already mirrors it (settings' `canEditAnything`), and the import surfaces a
  refusal per row.

**DIVERGENCES honoured**

- **D97** — a run with any failed row reports a **failure** naming how many rows
  could not be applied; only an all-succeed run reports success, with the count.
  Verified live: the same file that makes the current app say "Import successful"
  makes this FE say "Import failed: 3 of 4 rows could not be applied".
- **D81** — the search sits in the **table's** toolbar, not the page header.
- **D79** — inherited from the store editor: a failed save keeps the modal open
  with the draft intact. Save-and-next takes the same path — a failed save does
  **not** advance.
- **D8** — each set flag marker carries the state's accessible name
  ("Supplier"/"Customer"/"Donor"), never a silent glyph.

**C2 — real-backend coverage.** There is still no CI tooling for the
real-backend leg, so the colocated tests are logic-level. To compensate, every
behaviour marked **L** above was driven through this FE against the live probe
central server during the build, including both write paths. Probe writes were
**reverted**: `Kopu Health Centre` and `Opua Health Centre` were re-checked back
to `properties: "{}"` at the contract, and the register reports no facility with
a non-empty property set. The 14 seeded property definitions are the spec pass's
pre-existing residue, not this build's.

**Candidate spec refinements** (beyond the gaps above)

- `rules.md` says the review "is re-shown listing exactly the failed rows"; it
  does not say whether a row the **review** flagged (never submitted) appears in
  that list alongside the rows the **server** refused. Decided: yes — both are
  rows the user must fix, and each keeps its own reason.
- The template's filename is unspecified; this build uses the modal's own title
  (`Import facility properties.csv`).

**Follow-ups**

- **Shared component this vertical is blocked on:** none. The only library gap
  is the review table's local **filtering** (above), which would be a `DataTable`
  capability, not a new component.
- **`src/sections/settings/store-editor/StoreEditorModal.tsx` gained two
  optional props** (`onSaveAndNext`, `hasNext`) and its `save` now takes what to
  do on success. Purely additive: the footer path (`ShellLayout`) passes neither
  and renders no extra button. The spec says the register opens _settings'_
  editor, so extending it was the composition the spec asks for — duplicating it
  here would have been a bespoke look-alike (C3).
- **The editor's Preferences tab is still absent** — `spec/settings`'s open gap.
  The register's rows all carry a non-null `store`, so the tab's subject is
  available the moment settings builds it; nothing here blocks it.
- **`e2e/TESTIDS.md`** gained a Facility-register subsection. No deterministic
  suite drives the register yet — `specs/names-regression.spec.ts` covers the
  customer/supplier lists only.
- **Behaviour sub-IDs `.20`–`.43` are pending QA sign-off**, and the paired
  tmf-testing `status: moved` stub for `OMS-REG-MNG-02` has not been raised
  (both carried from the spec pass).
- **Modals are imported statically, not lazily** (see the file's comment): a
  `lazy()` component mounted on an interaction suspends the route boundary and
  tears down the open page. Verified with a `MutationObserver` around the row
  click: **0 removed nodes**, `<dialog open>` intact.
