# Build report

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](spec/ui-standards/components.md).

Scoped build: **customer-returns** only (new vertical — `src/sections/customer-returns/`, first implementation). Gates at completion: `pnpm check` ✓ · `pnpm test` ✓ (141, incl. 20 new AC-citing) · `pnpm build` ✓ (section chunks: list 9.4 kB / detail 32.9 kB / shared return logic 12.3 kB, gzip 3.3/9.4/3.6).

## customer-returns

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

---

## items (Catalogue)

Added by a later scoped run (`/spec-build items`, "build now, flag gaps"). Gates re-run green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (289, incl. 15 new items AC tests) · `pnpm build` ✓. Only `src/App.tsx` (one route registration) and `src/sections/items/` were touched. Built against a `:8890` (`fe-auth-contract`) introspection — the default `:8000` backend lacks the items schema (see the codegen flag below).

### What was built

| Area                | Status            | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure-logic core** | ✅ built + tested | `list/itemFilter.ts` (stock-status lens expansion, UI→wire filter builder, custom-field `dynamicFilter` AST) + `list/itemStats.ts` (MOS-blank-at-zero, doses gate, decimal truncation) — 15 AC-citing tests.                                                                                                                                                     |
| **S1 list**         | ✅ built          | Page/Header/Toolbar/FilterBar/DataTable/Pagination. Always-present code-or-name search; chip filters: lens, min/max MOS, master-list (gated), at-risk (gated). Columns Code/Name(sortable)/Master-lists(chip)/Unit/Stock-on-hand/AMC/MOS(blank-at-zero) + one per non-hidden custom-field definition (boolean → `BooleanCell`). Server pagination; row → detail. |
| **S2 detail**       | ✅ partial        | Stats band (`StatsPanel`/`Statistic`/`CardGrid`) + URL-driven deep-linkable tabs. Built: General/Store/Master-lists/Custom-fields/Log(`ActivityLogPanel`) + not-found→list. Flagged: Ledger, Ancillary, Variants (placeholders).                                                                                                                                 |

### AC coverage

| AC                                                    | Where                                                 | Status                                        |
| ----------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| AC-L1/L2/L3/L4/L5/L6                                  | `list/itemFilter.test.ts`                             | ✅ tested                                     |
| AC-P2 custom-field filter AST                         | `list/itemFilter.test.ts`                             | ✅ logic tested (UI controls partial — flags) |
| AC-S2 MOS blank at zero; AC-S3 doses                  | `list/itemStats.test.ts`                              | ✅ tested                                     |
| AC-L7/L8/L9, AC-P1, AC-D1/D2/D6                       | list + detail screens                                 | ⚠️ built, not unit-tested (UI-level)          |
| AC-D7 variant edits in log                            | Log tab built; variant events need Variants (unbuilt) | ⚠️ partial                                    |
| AC-S1 AMC window; AC-P3 unknown key; AC-C2            | —                                                     | ❌ server-side, no client logic to test       |
| AC-D3/D4/D5 ledger; AC-C1 central gating; AC-V*/B*/A* | —                                                     | ❌ not built (flagged below)                  |

### Flags — component gaps

1. **Detail-form scaffold** (`DetailContainer`/`DetailSection`/`DetailRow`/`RecordNameHeader`) — registry ✅ but **not in main** (unmerged `names` branch). General/Store/Custom-fields composed from `LabelledValue`+`Text` **single-column** (the `stock` precedent), not the spec's two-column scaffold. _Extract the scaffold (like the boolean cell) to build these as specified._
2. **Ledger tab** — not built; needs a **date-time-range FilterBar field** (only single-date `FilterDate` exists) + `itemLedger` wiring + row→source-doc nav (AC-D3/D4/D5).
3. **Custom-field filter UI** — the **option-typeahead** + **date-range** chip controls aren't built (the `dynamicFilter` logic is, and is tested — AC-P2). Custom-field columns are built.
4. **Variants tab + S3/S4 modals** — not built (central-only); need the **variant card** (no registry role) + **editable packaging grid** (no primitive; DataTable editable cells 🔶 deferred).
5. **Ancillary tab + S5 modal** — not built (central-only).
6. **Central gating (AC-C1/C2)** — not wired (would gate on `isCentralServer`); deferred with 4/5.

### Flags — environment

- **C2 / codegen backend mismatch.** The default `:8000` backend lacks the items schema **and** is behind the repo's auth contract; the matching schema is `:8890` (`fe-auth-contract`). `pnpm codegen` currently fails repo-wide on pre-existing `auth.graphql`/`initialisation.graphql` (ahead of `:8890`) — a pre-existing drift, not items. Items docs were generated via a scoped runner against `:8890`. Consequence: the running app (`:3005`→`:8000`) can't load items data, so **no live-backend/visual verification** (C2/C5) — compile-correctness only.

### DIVERGENCES honoured

- D21/D22 (no toast; in-surface feedback) — the built read-only surfaces raise nothing; the unbuilt S3–S5 saves are specced for busy-OK + inline error.
- D8 (boolean cell a11y) — custom-field boolean columns use `BooleanCell` (named dot marker).

### Candidate spec refinements

- `Statistic` mandates an `href`, but the AMC/MOS stat panels have no drill-down (they self-link) — make `href` optional or specify a target.
- Item detail tabs as a URL param (spec S2) vs the built `stock` detail's local-signal tabs — worth stating as the intended pattern (this build used `useSearchParams`).
