# Build report

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](spec/ui-standards/components.md).

## prescriptions

Scoped build of the prescriptions vertical (`spec/prescriptions`) — the dispensing workflow (list · detail · modal line editor · payment window · history), the **first** implementation of this vertical. Types generated against `:8000` via `pnpm codegen`. **All three gates green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (441, incl. 34 new AC-citing) · `pnpm build` ✓** (chunks `PrescriptionsList` ~ and `PrescriptionDetailView`, lazy per section). Live-verified against `:8000` (store Tamaki Pharmacy) via a dev server from this worktree.

### Built

- **S1 list** — standard scaffold: Name (+ colour swatch, editable on non-read-only rows only) / Status / Number / Prescription date / Reference / Comment; default sort **prescription date desc** (the backdated-or-created coalescence, server key `invoiceDatetime`); read-only rows (Verified/Cancelled) dimmed but clickable; filters Name + prescription-date (default-on) · Status · Reference · Invoice number; **New prescription** + **Export CSV/Excel** (shared filename rule, `filename.prescriptions`); bulk **Delete** with the AC-D3 selection pre-check.
- **S2 create modal** — patient (reusable `PatientSearch`, required) · date (capped today) · reference · clinician (new `ClinicianSelect`) · program; non-typed creation errors shown in-dialog; success navigates to detail.
- **S3 detail** — toolbar (patient / clinician / date / program, the date & program changes running the AC-B2 clear-lines-first flow); Details + Log tabs; flat line table (carriers never render); side panel (Prescription details · Additional info · Pricing incl. the insurance block · Patient details incl. gender via the patients label map + Diagnosis picker · record actions Delete / Cancel / Copy); status footer (crumbs, Confirm-‹next› split button hidden when read-only, the AC-S6 no-lines pre-flight, AC-S5 zero-qty warning, typed-rejection blocking notice); Add item / Print (labels + report selector) / History app-bar actions.
- **S4 line editor (D46 modal)** — item lookup (locked in edit, existing items excluded in add), the shared allocation surface with the **fractional-pack variant** (`distributeIssue({partialPacks})`), preference-gated prescribed quantity, directions (abbreviation expansion + item defaults), OK / OK & next.
- **S5 payment window** & **S6 history modal** — built; both gated as specced.
- **Custom fields (properties v2)** — `src/domain/invoiceCustomFields/` (new shared module: scope-keyed definitions resource, per-value-type `CustomFieldInput`, list `buildCustomFieldColumns`). Prescriptions wires: **prominent** fields inline in the detail toolbar saving on change (Category, Patient type on the reference store), a **Custom fields tab** for visible fields (buffered + Save; absent when none), and **list property columns**. Spec added first (`rules.md` § custom fields, `contract.md` § custom fields + list columns/filters, `ui-surface.md` S1/S3, AC-CF1–CF4).
- **Shared additions:** `src/domain/clinician/` (new domain module — resource + picker, the reasonOptions template); `distributeIssue` gained an opt-in `partialPacks` mode; `prescriptionPreferences()` + `editPrescribedQuantityOnPrescription` on the store-context query; `storeNameOf` accessor; a `/print` dev proxy for label printing. Route registered under `dispensary/prescription` (DispensaryOnly guard); nav entry pre-existed.
- **Post-live-review fixes:** (1) the **program picker** used the reports registry picker (`documentRegistries` → context id, empty on the reference store); replaced with a store-`programs` picker submitting `ProgramNode.id` (new `ProgramNameSelect` + store-scoped `programsResource`), matching the old app's `existsForStoreId`-scoped `useProgramList`. The reports registry picker was renamed **`ProgramDocumentSelect`** (its only consumer, the reports argument form, repointed). (2) A re-opened line's **item name** now shows immediately in the (locked) search box — the row's code/name is passed into the editor as an `initialItem` fallback ahead of the batch-grid fetch. (3) The **prescribed-quantity** field's unset default aligned to the old app's `?? true` (shown; explicit off hides — it's genuinely off on the reference store).
- **Create-a-patient mid-prescription (D47, AC-C5):** the create-prescription patient picker offers a **Create patient** affordance that opens the patients vertical's `CreatePatientModal` **in place** (modal-over-modal), returning the new patient selected. Additive changes: `PatientSearch` gained an opt-in `onCreatePatient`; `CreatePatientModal` gained an optional `onCreated` (returns the patient instead of navigating away); the modal is re-exported from `src/sections/patients`. Old app navigated to a full new-patient screen and back — recorded as [D47](spec/DIVERGENCES.md) (the new app has no such route).

### AC coverage

| AC                                                                | Where                                                               | Status                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC-S3 read-only freeze; AC-S4 skip; D40 forward-only; D39 hide    | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-S5 zero-qty count; AC-S6 carrier-only = no lines               | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-CF1 prominence places field; AC-CF4 list columns/value resolve | `invoiceCustomFields.test.ts`                                       | ✅ tested (+ live: Category/Patient type in the toolbar)                                                                              |
| AC-CF2 value-type control; AC-CF3 one-key patch                   | `CustomFieldInput` / toolbar / tab                                  | ⚠️ built, live-verified (TP fields are OPTION); patch is 1-key                                                                        |
| AC-N5 program is a store-program (id), not a registry             | `ProgramNameSelect` / toolbar / create modal                        | ⚠️ built, live-verified (Program A shows; matches old app scope)                                                                      |
| AC-C5 create a patient mid-flow (D47 modal-in-place)              | `CreatePrescriptionModal` + patients `CreatePatientModal.onCreated` | ⚠️ built, live-verified (create-patient modal opens in place); full create-and-return not driven (avoids undeletable patient residue) |
| AC-D1/D2 deletable-while-editable; AC-X1 cancel VERIFIED-only     | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-V2 crumbs incl. Cancelled only once cancelled                  | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-L1 prescription-date coalescence                               | `prescriptionStatus.test.ts` · `prescriptionsToCsv.test.ts`         | ✅ tested                                                                                                                             |
| AC-A1 partial-pack allocation (no over-alloc, shortfall reported) | `distributeIssue.test.ts` · `lineEditLogic.test.ts`                 | ✅ tested                                                                                                                             |
| AC-I5 client bounds negatives/overdraw; AC-I7 item set-save       | `lineEditLogic.test.ts`                                             | ✅ tested                                                                                                                             |
| AC-Q1 demand without stock saves; AC-Q3 preference gate           | `lineEditLogic.test.ts`                                             | ✅ tested                                                                                                                             |
| AC-R1 abbreviation expansion; AC-R2 item defaults                 | `directions.test.ts`                                                | ✅ tested                                                                                                                             |
| AC-H1 recently-prescribed item merge                              | `historyMerge.test.ts`                                              | ✅ tested                                                                                                                             |
| AC-L4 CSV columns                                                 | `prescriptionsToCsv.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-C1–C3 create; AC-N1–N4 header edits; AC-B1–B5 backdating       | screens                                                             | ⚠️ built, live-verified, not unit-tested                                                                                              |
| AC-S1/S2 auto-pick (first line → Picked, stamp refresh)           | server-enforced (probed in reverse spec)                            | ⚠️ server behaviour; UI reflects the returned status                                                                                  |
| AC-S3/D2 read-only surfaces; AC-V1 table-read-only                | screens                                                             | ⚠️ built, live-verified                                                                                                               |
| AC-Y1/Y2 payment window                                           | `PaymentsModal`                                                     | ⚠️ built; not exercisable (no insurance providers on the probe store)                                                                 |
| AC-X2/X3 cancel restores stock / reversal invisible               | server-enforced                                                     | ⚠️ server behaviour (probed in reverse spec)                                                                                          |
| AC-E1 report selector; AC-E2 label printing                       | screens                                                             | ⚠️ built; label print not exercised (no printer configured)                                                                           |

### Verification beyond unit tests

- **Live-driven** on `:8000` / Tamaki Pharmacy from a this-worktree dev server: list (4 seeded prescriptions, correct statuses/dimming/swatch-gating), detail (toolbar, flat line table with the 0.01-pack line, side panel, status footer), and the line editor (item pick → Available line → **fractional allocation** of 50 units into a 1000-pack batch → directions gate opening → OK enabling). Zero console errors.
- **Reactivity** reviewed via `/check-reactivity`: all resource reads state-gated (`ready`/`refreshing` → `.latest`, else fallback) so neither first-load nor post-save refetch remounts the open screen/modal; the status split button's selection is derived against the live offer so auto-pick (a refetch) can't strand a stale choice.
- **C2 real-backend gap:** the repo has no CI harness that drives AC tests against a live backend; behavioural ACs are covered at the pure-logic level (status/allocation/directions/CSV/history) and the screens were hand-driven live. Auto-pick, cancellation stock-restore, and the backdating gates are server-enforced and were probed during the reverse spec, not re-exercised by automated tests here.

### Flags

- **Spec gaps hit:** none — every operation/type/error the vertical needed resolved in `schema.graphql`.
- **New copy (D46 / new UI):** one minted key `messages.prescription-shortfall` (the fractional-allocation shortfall banner — no real-app equivalent). All other labels reuse existing catalogue keys cited in `ui-surface.md`.
- **⛔ registry / deferred:** the S4 line editor's item **note/comment cell** and column show-hide use the shared table as-is; no bespoke components introduced. The `e2e/TESTIDS.md` has **no prescriptions section yet** — screen-specific ids placed follow existing conventions (`new-prescription-button`, `add-item-modal`/`add-item-button`, `status-change-button-*`, `delete-lines-button`, `payments-modal`, `prescription-history-modal`); the shared contract should gain a Prescriptions section (register item).
- **DIVERGENCES honoured:** D46 (modal line editor), D39 (dead affordances hidden), D40 (forward-only status options), D21 (inline notices, never toasts), D12 (filtered export), D38 (permission via affordance gate — cancel).
- **Custom-field follow-ups:** (1) **list property filters** — spec'd (AC-CF4, via `InvoiceFilterInput.dynamicFilter`), but the code ships columns only; the dynamic-filter AST builder is a shared cross-vertical utility deferred to its own pass. (2) OPTION fields render their options **flat**; the `parentOptionId` hierarchy is not yet a cascading control (the reference store's two fields have empty option lists, so unexercised). (3) The shared `src/domain/invoiceCustomFields/` module is prescription-wired only; the other invoice verticals (inbound/outbound/returns) still lack their custom-field surfaces — a future adopt-the-module pass.
- **Source-verified only (not live-exercisable on the probe store):** insurance/payments (no providers), label printing (no printer), diagnosis picker (empty `diagnosesActive`), prescribed-quantity UI (store pref off) — all built to the spec/contract, matching the reverse-spec's own source-verified set.
- **Candidate spec refinement:** the reference app shows the raw gender value in the prescription side panel while localising it on patient screens; this build adopts the patients label map (noted as-is in `ui-surface.md`). If that inconsistency should be preserved rather than fixed, it wants a DIVERGENCES row; otherwise the spec is right as written.

---

## customer-returns

Scoped build: **customer-returns** only (new vertical — `src/sections/customer-returns/`, first implementation). Gates at completion: `pnpm check` ✓ · `pnpm test` ✓ (141, incl. 20 new AC-citing) · `pnpm build` ✓ (section chunks: list 9.4 kB / detail 32.9 kB / shared return logic 12.3 kB, gzip 3.3/9.4/3.6).

Spec: [`spec/customer-returns/`](spec/customer-returns/) — itself a fresh reverse spec whose live-mutation probes are still pending (every unfired wire assertion carries `⚠️ VERIFY` in the spec; see its [README verification log](spec/customer-returns/README.md#known-gaps--verification-log)). The implementation is grounded in the same sources; the C2 real-backend legs below inherit that pending state.

### AC coverage

| AC                                       | Coverage                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-C1 manual create, empty NEW           | implemented (`list/NewReturnModal.tsx`); C2 backend leg pending                                                                                                                                                                                                                |
| AC-C2 customer visible/valid             | typed rejections surfaced inline (`NewReturnModal`, toolbar customer change); C2 pending                                                                                                                                                                                       |
| AC-C3 manual-pref gate is UI-only        | implemented (`list/CustomerReturnsList.tsx` notice via `preferences.graphql`); C2 pending                                                                                                                                                                                      |
| AC-C4–C7 create from shipment            | **not reachable** — the entry point belongs to the outbound-shipments vertical, which has no implementation in this repo yet. The wire path is built (insert carries `outboundShipmentId`; the S4 modal renders `packsIssued` for from-shipment drafts) but nothing invokes it |
| AC-E1 upsert-by-quantity batch set       | `detail/edit-modal/returnLineLogic.test.ts` (client mirror of the server semantics); server leg pending                                                                                                                                                                        |
| AC-E2 zero-quantity warns, then deletes  | `returnLineLogic.test.ts` + the S4 warn-then-confirm flow                                                                                                                                                                                                                      |
| AC-E3 pack size ≥ 1, quantity ≥ 0        | `returnLineLogic.test.ts` (UI gate); server rejection leg pending                                                                                                                                                                                                              |
| AC-E4 reason optional but valid          | `ReasonSelect kind="return"` offers active return reasons only; rejection legs pending (dev datafile has zero return reasons)                                                                                                                                                  |
| AC-E5 quantity uncapped on the wire      | `returnLineLogic.test.ts` (`clampQuantity` = the UI cap, applied via `NumberField max`); wire leg pending                                                                                                                                                                      |
| AC-E6 header edits persist               | implemented (shared debounced buffer; colour settable from list row + side panel); C2 pending                                                                                                                                                                                  |
| AC-E7 immutable once VERIFIED            | `detail/returnStatus.test.ts`                                                                                                                                                                                                                                                  |
| AC-S1–S3 stock effects of receive/verify | backend-only effects — C2 pending (same probes as the spec's own VERIFY list)                                                                                                                                                                                                  |
| AC-S4 no lines, no advance               | UI gate implemented (explainer dialog); `returnStatus.test.ts` covers target derivation; server leg pending                                                                                                                                                                    |
| AC-S5 hold blocks status only            | UI gate + confirm flows implemented; server leg pending                                                                                                                                                                                                                        |
| AC-S6 release-and-advance in one step    | wire capability in `returnUpdate.advanceReturnStatus(onHold)`; unused by the UI (it blocks and explains instead); server leg pending                                                                                                                                           |
| AC-S7 forward only                       | `returnStatus.test.ts` (+ structurally: the wire input offers only RECEIVED/VERIFIED)                                                                                                                                                                                          |
| AC-D1/D2 delete semantics                | implemented (`DeleteReturnsAction`, side panel); server legs pending                                                                                                                                                                                                           |
| AC-D3 detail delete only while NEW       | implemented (side panel gate)                                                                                                                                                                                                                                                  |
| AC-L1 name/status filters, URL-backed    | implemented (`list/listFilters.tsx`, exhaustive over `InvoiceFilterInput`)                                                                                                                                                                                                     |
| AC-L2 default sort created-desc          | implemented (list default state)                                                                                                                                                                                                                                               |
| AC-L3 deep link by number                | **gap + spec question** — routes here (and the running app's own URLs, per the reverse-spec probe) key on the invoice **id**, not the number. The AC as written wants the number; flagging for spec refinement rather than inventing a number-resolving route                  |
| AC-L4 CSV export                         | **gap** — no export component in the shared library yet (the reference stocktakes list has the same gap)                                                                                                                                                                       |
| AC-G1 lifecycle logged                   | implemented (`detail/LogTab.tsx`); the dev datafile's legacy returns have no log rows (query validated live, 0 entries)                                                                                                                                                        |
| AC-T1 transfer read-only until received  | `returnStatus.test.ts` (kind/editability/targets); live transfer fixture pending                                                                                                                                                                                               |

### Verification beyond unit tests

- **Read-only wire validation against the live dev server**: the generated `customerReturns`, `customerReturnDetail`, `customerReturnLog`, and `generateCustomerReturnLines` documents were executed as-is against `localhost:8000` — all resolve; detail returns the line set and both link fields; generate-lines existing-mode returns `numberOfPacksIssued: null` exactly as [`contract.md`](spec/customer-returns/contract.md) records.
- **Reactivity review** (`/check-reactivity` against `kdd/solid-reactivity-pitfalls`): one REAL finding — §13 (clamped/coalesced controlled numeric cells leaving the DOM dirty) — fixed by switching the S4 numeric cells to `NumberField`. Drafts live in a `createStore` seeded via `reconcile`, updated field-by-field by id; resources read via `.latest`/local `Suspense`; the detail `<Show>` is non-keyed.
- **In-browser drive: blocked by the environment, not the section.** This dev datafile's `check` user fails the server's user-details lookup ("Can't find user account data"), which blocks the rewrite at startup for _every_ section. The deterministic `e2e/` suites (hermetic datafile) are the intended vehicle; the section renders the TESTIDS.md contract ids (`new-return-button`, `customer-search-modal`/`-input`, `status-change-button-*`, `on-hold-button`, `close-button`, `add-item-button`/`-modal`, `add-batch-button`, list column ids `otherPartyName`/`status`/`invoiceNumber`/`createdDatetime`/`comment`/`theirReference`).

### Flags

- **C2 tooling**: no CI harness for real-backend AC legs yet — behavioural ACs are covered at logic level and marked pending above.
- **⛔ / registry gaps**: CSV export (AC-L4); read-only rows are not de-emphasised (`DataTable` has no per-row tone hook — S1's de-emphasis note is unimplementable without a library addition); no user-permissions plumbing exists app-wide, so the `CUSTOMER_RETURN_MUTATE` affordance gate is not mirrored client-side (the server still enforces it); the S4 Item-variant column (gated by the `itemVariantsConfigured` store config) is not rendered — no item-variant lookup exists in `src/domain/` yet, and the wire fields (`itemVariantId`/`volumePerPack`) pass through untouched from the drafts.
- **Spec refinement candidates**: AC-L3's deep-link-by-number vs the observed id-based URLs; whether the S3 side panel's "copy to clipboard" payload should be specified. _(Resolved: S4's step indicator now uses the shared determinate progress list — the registry row records the wizard usage; OK & next is present on both steps, disabled until the reason step, matching the running app.)_
- **Cross-vertical dependency**: the from-shipment creation flow (AC-C4–C7) activates only when the outbound-shipments vertical is implemented and wires its "Return selected lines" action to this section's S4 modal.
- **DIVERGENCES.md**: D39 honoured — dead edit affordances (Add item, Hold) are hidden on a non-editable return rather than shown disabled; actionable blocks stay visible-disabled or explain on click.

## dashboard

Built fresh into `src/sections/dashboard/` (no prior implementation existed). One screen (S1) mounted at both the store root `/` (the landing screen) and the `dashboard` nav destination. Wire surface: the six split count queries in `dashboardCounts.graphql`; the display-gate preferences ride on the shared guard-3 `storeContext` query (five `PreferencesNode` fields added, additively). Gates green: `pnpm check`, `pnpm test` (282), `pnpm build` (dashboard page = its own lazy chunk, ~4.3 kB gzip).

### AC coverage

| AC           | Test                                                | Notes                                                                                                                                                  |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-D1        | `dashboardCounts.test.ts`                           | wire surface is queries only, all `storeId`-scoped; store-switch refetch is resource keying (code-level)                                               |
| AC-D2        | `panelState.test.ts`                                | forbidden → in-panel permission error, unexpected → in-panel generic error; per-panel isolation is one resource per family (`DashboardPage.tsx`)       |
| AC-D3        | —                                                   | three widgets with gated panels/stats composed in `DashboardPage.tsx`; no component-test env — verify against the running app                          |
| AC-D4        | —                                                   | **not covered** — plugin contribution mechanism is the plugins vertical's (greenfield, unbuilt)                                                        |
| AC-D5        | —                                                   | **not covered** — as AC-D4                                                                                                                             |
| AC-D6        | — (partial)                                         | gated-off external panel never fetches (resource source pauses); plugin error isolation not covered (as AC-D4)                                         |
| AC-R1        | `dashboardCounts.test.ts`, `statLinks.test.ts`      | count values are server-computed (C2 gap below); window/status link filters tested                                                                     |
| AC-R2        | `dashboardGates.test.ts`                            | procurement gate both states; partition is server-side                                                                                                 |
| AC-R3        | —                                                   | server-computed count wired verbatim (`request.draft`); C2 gap                                                                                         |
| AC-T1        | `statLinks.test.ts`                                 | link restates New/Allocated/Picked; count server-computed                                                                                              |
| AC-T2        | —                                                   | server-computed count wired verbatim (`response.new`); C2 gap                                                                                          |
| AC-T3        | `dashboardGates.test.ts`                            | program-module gate both states; alert emphasis at > 0 in `DashboardPage.tsx`                                                                          |
| AC-E1        | `statLinks.test.ts`                                 | expired link ≤ today; count server-computed                                                                                                            |
| AC-E2        | `statLinks.test.ts`, `dashboardCounts.test.ts`      | D = 30 sent explicitly; subtraction is server-side (validated live per spec)                                                                           |
| AC-E3        | `statLinks.test.ts`                                 | 30–89-day link window, 90th day excluded; count server-side                                                                                            |
| AC-E4        | `dashboardGates.test.ts`, `statLinks.test.ts`       | gate both states + threshold-day link window                                                                                                           |
| AC-S1, AC-S2 | —                                                   | server-computed counts wired verbatim (`total`, `noStock`); C2 gap                                                                                     |
| AC-S3        | `dashboardGates.test.ts`                            | look-back gate both states                                                                                                                             |
| AC-S4, AC-S5 | —                                                   | server-computed (`lowStock`/`highStock`); thresholds sent explicitly (AC-S8)                                                                           |
| AC-S6        | `dashboardGates.test.ts`                            | alert-threshold gate both states                                                                                                                       |
| AC-S7        | `dashboardGates.test.ts`                            | gate both states; the threshold-0 degenerate count is never rendered                                                                                   |
| AC-S8        | `dashboardGates.test.ts`, `dashboardCounts.test.ts` | explicit low/high from store prefs; fetch pauses until prefs resolve; `daysTillExpired` always 30                                                      |
| AC-N1        | `statLinks.test.ts`                                 | every built list's link filter restates its count; unbuilt lists land on registered placeholders unfiltered (per the AC's own carve-out)               |
| AC-X1        | —                                                   | permission check (`hasPermission` → `reportPermissionDenied`) + handoff in `DashboardPage.tsx`; no component-test env — verify against the running app |

### Flags

- **C2 (real backend):** no CI tooling exists for the real-backend leg. Every count value is server-computed and wired verbatim; the client-side logic (gates, links, thresholds, panel states) is covered at the logic level. The spec's own validation notes record live verification of the counts.
- **Plugins extension surface (AC-D3–D6):** the plugins vertical is greenfield/unbuilt. The built-in widgets/panels/stats are composed explicitly (kdd/explicit-composition) with their S3 published ids recorded as structural comments in `DashboardPage.tsx`; the merge/suppress mechanism awaits the plugins vertical. No id registry was invented.
- **Internal vs external inbound links (contract › navigation correspondence):** the inbound-shipments list encodes `type` as a permission-scope query variable, not a URL filter, so the internal/external kind is not currently expressible in a stat link — the internal and external panels' window/status links are otherwise correct but open the same (scope-union) list. Needs the inbound list to expose the kind in its URL contract; until then this is the placeholder-style degradation.
- **Order more (AC-X1):** the internal-order create flow is the requisitions vertical's, which is unbuilt — the shortcut is permission-gated and then degrades to the registered `replenishment/internal-order` placeholder (the AC-N1 rule applied to the create handoff). Revisit when internal orders ship.
- **Cross-section create-flow imports:** the New inbound / New outbound shortcuts lazily import `CreateInboundShipmentModal` and `CustomerSearchModal` from their owning sections (self-contained modals; loaded on first use). If more consumers appear, hoist them to `src/domain/` like the reports selector.
- **Schema drift in other verticals (C7):** running `pnpm codegen` regenerates `outbound-shipments` and `stock` generated files against the newer pinned schema (`InvoiceFilterInput.dynamicFilter`, `StockLineFilterInput.campaignId`), which breaks those verticals' exhaustive filter maps. Those regenerations were reverted (out of scope); those verticals need a regen + filter-map pass on their next build.
- **Expiring-soon link boundary:** per the captured contract table the link spans today…today+30 while the count excludes lines already expired (≤ today) — a line expiring exactly today appears in the opened list but is counted under _expired_. Candidate spec refinement: start the soon link at today+1.
- **Locale keys:** all labels resolved to existing catalog keys verbatim (incl. `label.inbound-not-delivered`, confirmed against the reference app's dashboard); no new keys minted.
- **Test hooks (C8):** `e2e/TESTIDS.md` defines no dashboard-specific ids; nothing to place.

### Candidate spec refinements

- Decide the inbound list's URL contract for the internal/external kind so the dashboard's panel links can differ (the contract's `type` note assumes a filterable input).
- The expiring-soon link's lower bound (today vs today+1) — see flag above.
- State what the create shortcut should do while its owning vertical is unbuilt (this build applied AC-N1's placeholder rule by analogy).

## master-lists

Scoped build of the master-lists vertical (`spec/master-lists`) — a read-only Catalogue list + detail, **no mutations**. Types generated against `:8890` (`develop`) via the scoped codegen runner. **master-lists is compile-clean (`tsc`: 0 errors) and `pnpm test` is green (373 tests, incl. 4 new master-lists AC tests).** `pnpm check`/`pnpm build` (the `tsc -b` gates) are blocked **only** by a pre-existing `internal-orders` breakage on `main` — see the repo blocker in the register below; master-lists itself contributes zero errors.

### Built

- **S1 list** — standard scaffold with **no filter controls** (captured as-is), Name (sortable) / Description columns, server pagination, row → detail. Store scoping is the client sending `existsForStoreId` (the `storeId` arg is auth/context only). Default sort name-ascending; only Name sortable.
- **Export split button** — Export CSV (primary) · Excel (menu), over the **currently-loaded page only** (AC-E1); empty page → "No data available" instead of a download (AC-E3). CSV downloads directly; Excel round-trips the CSV through the shared server converter (`domain/reportFiles`). Silent (no toast — D21).
- **S2 detail** — description field shown only when non-empty (AC-D4); item-lines table Code / Name (sortable) / Unit; not-found → blocking alert → back to list (AC-L5); server pagination. Lines selected by the `masterListId` **argument** (never a filter field — contract wire trap); sort last-entry-wins.
- Route registered under `catalogue/master-lists` (list `/`, detail `/:masterListId`); the Catalogue › Master Lists nav entry already existed. Pure-logic export core + 4 AC tests colocated.

### AC coverage

| AC                                                                      | Where                      | Status                                                        |
| ----------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| AC-E1 export = loaded page; AC-E3 empty → no-data                       | `masterListExport.test.ts` | ✅ tested                                                     |
| AC-L1 store-joined population (`existsForStoreId`)                      | `MasterListsList.tsx`      | ⚠️ built, not unit-tested                                     |
| AC-L2 no filter controls; AC-L3 name-asc sort                           | list                       | ⚠️ built                                                      |
| AC-L5 not-found → list                                                  | detail                     | ⚠️ built                                                      |
| AC-L6 non-joined list reachable by id (header omits `existsForStoreId`) | detail                     | ⚠️ built                                                      |
| AC-D2 lines item-name sort; AC-D4 description present-only              | detail                     | ⚠️ built                                                      |
| AC-L7 inactive lists unreachable                                        | —                          | server-enforced (repo forces `isActive`); not client-testable |

### Flags

- **Store CODE in the CSV filename** — the spec wants `<iso>_<store code>_master-lists.csv`, but only `currentStoreId()` is exported (no active-store-**code** accessor), so the filename currently uses the store **id**. Needs an exported active-store-code accessor — see the register.
- **Plugin columns (list)** — the plugin-column seam isn't wired; no plugin system is built. Flagged, not improvised.
- No live/visual verification — the app proxies `:8000` (remote, PRE_INITIALISATION). The read-only queries were exercised live on `:8890` during the reverse spec.

---

## Follow-up register — Catalogue verticals (items · help · master-lists)

Consolidated to-do across the three catalogue spec builds, each shipped as a scoped PR: **items #430**, **help #441** (on spec PR #440), **master-lists** (this PR). Grouped by what unblocks the most work first.

### 🚧 Repo blockers (affect the `tsc` gates for every build)

- **`internal-orders` dangling import breaks `pnpm check`/`pnpm build`.** `src/sections/internal-orders/detail/printing.ts` does `import type … from './internalOrderDetail.generated'`, but that generated file is **not committed and has no source `.graphql`** anywhere in the repo, and the dir isn't wired in `App.tsx` (only `printing.ts` + `printing.test.ts` exist). Pre-existing on `main`, unrelated to any catalogue build. `pnpm test` still passes — the `import type` is erased at runtime, so only the `tsc -b` gates fail. **Fix:** restore the `internal-orders` `.graphql` (+ regenerate), or remove the leftover `printing.ts`/`.test.ts`. Until then no build can show a fully green `check`/`build` locally.
- **Codegen backend.** The repo's `pnpm codegen` fails on the pre-existing `auth.graphql` mismatch (repo ahead of backend), so all three builds generated types via a **scoped runner against `:8890`** (`develop`). `:8000` is the remote (PRE_INITIALISATION) — no live/visual verification of any of the three yet.

### 🧩 Shared components to build / extract (each unblocks multiple verticals)

- **Read-only detail-form scaffold** (`DetailContainer` / `DetailSection` / `DetailRow` / `RecordNameHeader`) — registry ✅ but **not in main** (unmerged `names` branch). **items** detail (General / Store / Custom-fields) is composed single-column from `LabelledValue` as a stopgap; proper two-column needs the scaffold.
- **Date-time range FilterBar field** — **items** Ledger From/To + items custom-field date-range filter. Only single-date `FilterDate` exists.
- **Option-typeahead (parent → descendants) filter control** — **items** custom-field option filter (logic built + tested; UI control missing).
- **Central-presence nav gating** — **help** S2 management ("Manage › Help documents", absent on non-central servers) and **items** central management. `NavItem` has no central flag; `MenuBar` doesn't filter. Chrome/nav infra.
- **Variant card + editable packaging grid** — **items** Variants tab + S3/S4 modals (central-only).
- **Active-store-code accessor** — **master-lists** CSV filename (store code); only `currentStoreId` is exported today.

### 📋 Per-vertical unbuilt slices

- **items:** Ledger tab (needs the date-time-range filter + `itemLedger` wiring — AC-D3/D4/D5); custom-field option/date filter UI (AC-P2 UI leg); Variants + Ancillary tabs + S3/S4/S5 central modals + central gating (AC-C1/C2, V*, B*, A*); two-column detail once the scaffold lands.
- **help:** S2 management + S3 upload (central-only) — needs central-nav gating **and** the file-upload HTTP route (`POST /sync_files/help_document/{id}`, session-cookie auth vs this app's bearer auth — integration risk); AC-A1–A8, S1–S3.
- **master-lists:** plugin-column seam; store-**code** in the CSV filename; live verification.

### 🔧 Candidate spec refinements (surfaced across the builds)

- **items:** `Statistic` mandates an `href` but the AMC / MOS panels have no drill-down (self-link stopgap) — make `href` optional or specify a target. Detail-tab URL-param pattern (built via `useSearchParams`) — state it in the spec.
- **help:** AC-V2 lists es/fr, but the real client also localises **pt** (implemented) — the AC undercounts. AC-A1 central-presence nav gating has no home in the chrome nav model yet.
- **master-lists:** the store-code-in-filename requirement needs an exported accessor to be satisfiable; note that dependency in the spec.

### ✅ Real-backend re-verifications done (on `:8890` / develop)

- **help** wire traps re-confirmed live: `EmptyTitle` non-typed; contact-form single-member union / `EmailIsInvalid`; `RecordAlreadyExist` / `RecordNotFound` typed; server title-trim; publish → delete round-trip; **new:** id-uniqueness spans soft-deleted rows (see #440).
- **master-lists** read-only queries exercised live during the reverse spec.
- **items** behavioural ACs covered at the logic level (tests); real-backend legs (AMC, unknown custom-field key, central gate) pending a working codegen/probe env.
