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

## help (spec build)

Scoped build of the help vertical (`spec/help`), stacked on the help reverse-spec (PR #440). Gates green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (341, incl. 5 new help AC tests) · `pnpm build` ✓. GraphQL generated against `:8890` (`develop`, central) via the scoped codegen runner (`:8000` is the remote / `PRE_INITIALISATION`).

### Built — S1 Help page (universal)

- User-guide **external link** (localised es/fr(+fr-DJ)/pt, else default — AC-V2); keyboard-shortcuts static text; **help-documents** list (showable-only, newest-first, external file links — AC-V3/V4); **contact form** (Feedback/Support · email · message; async Send gated by `canSendContactForm`; inline email note; outcome `Alert`; `insertContactForm` via `returnGraphqlErrors`; reset on success — AC-CF1/CF2/CF4/CF5). The `help` route already existed — the stub component was swapped, no `App.tsx` change.
- Pure-logic core (`helpLogic.ts`) + 5 AC-citing tests.

### AC coverage

| AC                                                            | Where               | Status                                                                                                |
| ------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| AC-V2 user-guide localised URL                                | `helpLogic.test.ts` | ✅ tested                                                                                             |
| AC-V3 documents block skips fileless / hides empty            | `helpLogic.test.ts` | ✅ tested                                                                                             |
| AC-V4 file-view URL                                           | `helpLogic.test.ts` | ✅ tested                                                                                             |
| AC-CF1 send-gating; AC-CF2 email format                       | `helpLogic.test.ts` | ✅ tested                                                                                             |
| AC-V1 universal ordered page; AC-CF4/CF5 outcome+reset        | `HelpPage.tsx`      | ⚠️ built, not unit-tested (UI-level)                                                                  |
| AC-CF3 server guard; AC-V5 view-session; AC-V6 not-synced 404 | —                   | ❌ server/HTTP — re-verified live on `develop` during the reverse spec (#440), not unit-testable here |
| AC-A1–A8 management; AC-S1–S3 distribution                    | —                   | ❌ not built (flagged)                                                                                |

### Flags — not built (S2 management + S3 upload, central-only)

- **Central-presence nav gating is unsupported by the current chrome nav** — `NavItem` has no central flag and `MenuBar` doesn't filter, so the spec's "Manage › Help documents entry **absent** on non-central" (AC-A1) can't be expressed yet. Needs a chrome/nav addition (candidate spec/infra refinement).
- **File-upload HTTP route** (`POST /sync_files/help_document/{id}`, multipart, **session-cookie** auth) — this app authenticates by **bearer token**, so whether the login cookie that route requires is present is **unverified** (integration risk). Same for the inline file **view** (`GET`), which the built S1 links to.
- The record-level ops are ready (`insertHelpDocument`/`deleteHelpDocument` generated) and the components exist (`DocumentUploadPanel` + `UploadZone` — the registry rows the spec PR added), so S2/S3 is a bounded follow-up once the two gaps above are resolved.

### Environment / verification

- **No live/visual verification** — the running app (`:3005` → `:8000`) can't reach the help schema (`:8000` is the remote, `PRE_INITIALISATION`); the central schema is on `:8890`. Compile-correct only (`pnpm build`). The contact-form + help-document **wire traps** were, however, re-verified live on `develop` during the reverse spec (#440), so S1's error handling is grounded.

### Candidate spec refinements

- **AC-V2** says the user guide localises for es/fr; the real client also localises **pt** (implemented from the client source) — the AC undercounts.
- **Central-presence nav gating** (AC-A1) has no home in the current chrome nav model — worth a chrome/`ui-standards` note on how a central-only destination is expressed.
