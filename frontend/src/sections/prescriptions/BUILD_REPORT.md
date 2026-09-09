# Build report — prescriptions

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build of the prescriptions vertical (`spec/prescriptions`) — the dispensing workflow (list · detail · modal line editor · payment window · history), the **first** implementation of this vertical. Types generated against `:8000` via `pnpm codegen`. After merging `main`, **all three gates pass** — `pnpm check` · `pnpm test` (444, incl. new AC-citing tests) · `pnpm build`. Live-verified against `:8000` (store Tamaki Pharmacy) via a dev server from this worktree.

### Built

- **S1 list** — standard scaffold: Name (+ colour swatch, editable on non-read-only rows only) / Status / Number / Prescription date / Reference / Comment; default sort **prescription date desc** (the backdated-or-created coalescence, server key `invoiceDatetime`); read-only rows (Verified/Cancelled) dimmed but clickable; filters Name + prescription-date (default-on) · Status · Reference · Invoice number; **New prescription** + **Export CSV/Excel** (shared filename rule, `filename.prescriptions`); bulk **Delete** with the AC-D3 selection pre-check.
- **S2 create modal** — patient (reusable `PatientSearch`, required) · date (capped today) · reference · clinician (new `ClinicianSelect`) · program; non-typed creation errors shown in-dialog; success navigates to detail.
- **S3 detail** — toolbar (patient / clinician / date / program, the date & program changes running the AC-B2 clear-lines-first flow); Details + Log tabs; flat line table (a prescribed-quantity placeholder renders as a row awaiting an action); side panel (Prescription details · Additional info · Pricing incl. the insurance block · Patient details incl. gender via the patients label map + Diagnosis picker · record actions Delete / Cancel / Copy); status footer (crumbs, Confirm-‹next› split button hidden when read-only, the AC-S6 no-lines pre-flight, AC-S5 zero-qty warning, typed-rejection blocking notice); Add item / Print (labels + report selector) / History app-bar actions.
- **S4 line editor (D53 modal)** — item lookup (locked in edit, existing items excluded in add), the shared allocation surface with the **fractional-pack variant** (`distributeIssue({partialPacks})`), preference-gated prescribed quantity, directions (abbreviation expansion + item defaults), OK / OK & next.
- **S5 payment window** & **S6 history modal** — built; both gated as specced.
- **Custom fields** — the shared `src/domain/customFields/` domain (the bounded-interpreter module; see [`spec/ui-standards/custom-fields.md`](../../../spec/ui-standards/custom-fields.md)). Prescriptions wires it at the `prescription` scope: **prominent** fields inline in the detail toolbar saving on change (Category, Patient type on the reference store, via `CustomFieldsToolbar`), the **Custom fields tab** for the remaining shown fields (`CustomFieldsEditTab`, buffered + explicit Save), and **list columns + custom-field filtering** (`customFieldColumns` + the FilterBar custom-field group → `dynamicFilter`). Spec added first (`rules.md` § custom fields, `contract.md` § custom fields + list columns/filters, `ui-surface.md` S1/S3, AC-CF1–CF4).
- **Shared additions:** `src/domain/clinician/` (new domain module — resource + picker, the reasonOptions template); `distributeIssue` gained an opt-in `partialPacks` mode; `prescriptionPreferences()` + `editPrescribedQuantityOnPrescription` on the store-context query; `storeNameOf` accessor; a `/print` dev proxy for label printing. Route registered under `dispensary/prescription` (DispensaryOnly guard); nav entry pre-existed.
- **Post-live-review fixes:** (1) the **program picker** used the reports registry picker (`documentRegistries` → context id, empty on the reference store); replaced with a store-`programs` picker submitting `ProgramNode.id` (new `ProgramNameSelect` + store-scoped `programsResource`), matching the old app's `existsForStoreId`-scoped `useProgramList`. The reports registry picker was renamed **`ProgramDocumentSelect`** (its only consumer, the reports argument form, repointed). (2) A re-opened line's **item name** now shows immediately in the (locked) search box — the row's code/name is passed into the editor as an `initialItem` fallback ahead of the batch-grid fetch. (3) The **prescribed-quantity** field's unset default aligned to the old app's `?? true` (shown; explicit off hides — it's genuinely off on the reference store).
- **Create-a-patient mid-prescription (D54, AC-C5):** the create-prescription patient picker offers a **Create patient** affordance that opens the patients vertical's `CreatePatientModal` **in place** (modal-over-modal), returning the new patient selected. Additive changes: `PatientSearch` gained an opt-in `onCreatePatient`; `CreatePatientModal` gained an optional `onCreated` (returns the patient instead of navigating away); the modal is re-exported from `src/sections/patients`. Old app navigated to a full new-patient screen and back — recorded as [D54](../../../spec/DIVERGENCES.md) (the new app has no such route).

### AC coverage

| AC                                                                | Where                                                               | Status                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC-S3 read-only freeze; AC-S4 skip; D40 forward-only; D39 hide    | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-S5 zero-qty count; AC-S6 placeholder-only = no lines           | `prescriptionStatus.test.ts`                                        | ✅ tested                                                                                                                             |
| AC-CF1 prominence places field; AC-CF4 list columns/value resolve | `invoiceCustomFields.test.ts`                                       | ✅ tested (+ live: Category/Patient type in the toolbar)                                                                              |
| AC-CF2 value-type control; AC-CF3 one-key patch                   | `CustomFieldInput` / toolbar / tab                                  | ⚠️ built, live-verified (TP fields are OPTION); patch is 1-key                                                                        |
| AC-N5 program is a store-program (id), not a registry             | `ProgramNameSelect` / toolbar / create modal                        | ⚠️ built, live-verified (Program A shows; matches old app scope)                                                                      |
| AC-C5 create a patient mid-flow (D54 modal-in-place)              | `CreatePrescriptionModal` + patients `CreatePatientModal.onCreated` | ⚠️ built, live-verified (create-patient modal opens in place); full create-and-return not driven (avoids undeletable patient residue) |
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
| AC-E1 report selector                                             | screens                                                             | ⚠️ built, live-verified                                                                                                               |
| AC-E2 label printing (`.47`, `.71`)                               | `labels.test.ts` · `printLabels.test.ts` · e2e (see follow-up)      | ✅ tested — delivery and both failure reports; see the USB follow-up below                                                            |

### Verification beyond unit tests

- **Live-driven** on `:8000` / Tamaki Pharmacy from a this-worktree dev server: list (4 seeded prescriptions, correct statuses/dimming/swatch-gating), detail (toolbar, flat line table with the 0.01-pack line, side panel, status footer), the line editor (item pick → Available line → **fractional allocation** of 50 units into a 1000-pack batch → directions gate opening → OK enabling), custom fields (Category/Patient type prominent in the toolbar), the store-program picker, and the create-patient-in-place flow (create-patient modal opening over the create-prescription dialog). Zero console errors.
- **Reactivity** reviewed via `/check-reactivity`: all resource reads state-gated (`ready`/`refreshing` → `.latest`, else fallback) so neither first-load nor post-save refetch remounts the open screen/modal; the status split button's selection is derived against the live offer so auto-pick (a refetch) can't strand a stale choice.
- **C2 real-backend gap:** the repo has no CI harness that drives AC tests against a live backend; behavioural ACs are covered at the pure-logic level (status/allocation/directions/CSV/history) and the screens were hand-driven live. Auto-pick, cancellation stock-restore, and the backdating gates are server-enforced and were probed during the reverse spec, not re-exercised by automated tests here.

### Flags

- **Spec gaps hit:** none — every operation/type/error the vertical needed resolved in `schema.graphql`.
- **New copy (D53 / new UI):** one minted key `messages.prescription-shortfall` (the fractional-allocation shortfall banner — no real-app equivalent). All other labels reuse existing catalogue keys cited in `ui-surface.md`.
- **⛔ registry / deferred:** the S4 line editor's item **note/comment cell** and column show-hide use the shared table as-is; no bespoke components introduced. The `e2e/TESTIDS.md` has **no prescriptions section yet** — screen-specific ids placed follow existing conventions (`new-prescription-button`, `add-item-modal`/`add-item-button`, `status-change-button-*`, `delete-lines-button`, `payments-modal`, `prescription-history-modal`, `create-patient-button`); the shared contract should gain a Prescriptions section (register item).
- **DIVERGENCES honoured:** D53 (modal line editor), D54 (create-patient in place), D39 (dead affordances hidden), D40 (forward-only status options), D21 (inline notices, never toasts), D12 (filtered export), D38 (permission via affordance gate — cancel), D34 (flat detail line table).
- **Custom-field follow-ups:** (1) **list property filters** — spec'd (AC-CF4, via `InvoiceFilterInput.dynamicFilter`), but the code ships columns only; the dynamic-filter AST builder is a shared cross-vertical utility deferred to its own pass. (2) OPTION fields render their options **flat**; the `parentOptionId` hierarchy is not yet a cascading control (the reference store's two fields have empty option lists, so unexercised). (3) The shared `src/domain/invoiceCustomFields/` module is prescription-wired only; the other invoice verticals (inbound/outbound/returns) still lack their custom-field surfaces — a future adopt-the-module pass.
- **Parked — no-stock batch:** a batch the old app shows in the issue line editor can be absent in the new one; suspected to live in the **shared allocation / `draftStockOutLines`** path (not prescriptions-specific), to revisit. `draftStockOutLines` excludes 0-available batches; open question is whether the old app's issue editor shows them via another source.
- **Source-verified only (not live-exercisable on the probe store):** insurance/payments (no providers), diagnosis picker (empty `diagnosesActive`), prescribed-quantity UI (store pref off) — all built to the spec/contract, matching the reverse-spec's own source-verified set. (Label printing has since left this list — see the USB follow-up below.)
- **Candidate spec refinement:** the reference app shows the raw gender value in the prescription side panel while localising it on patient screens; this build adopts the patients label map (noted as-is in `ui-surface.md`). If that inconsistency should be preserved rather than fixed, it wants a DIVERGENCES row; otherwise the spec is right as written.

### Follow-up build — labels over the USB route (issue #257)

Label printing was previously gated on a configured **network** printer, so a
device set to print via USB could not print at all. Delivery now belongs to the
device (`src/domain/labelPrinter/`, owned by the settings vertical — see its
build report); this vertical keeps only what a label **says** and when one is
printed.

- `labels.ts` keeps `buildLabels`; its own `printLabels` fetch is gone, replaced
  by a call to the shared route selector with this vertical's endpoint.
- `PrescriptionDetailView` drops the printer-settings gate — the route decides
  whether settings matter — and switches on the returned outcome. All three
  entry points (app-bar split button, bulk-action bar, Alt+L) already funnelled
  through `runPrintLabels`, so none needed changing; the screen decides only
  **where** the report lands (in place on the control that started it, plus the
  shared dialog).

| Behaviour                                                | Where                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `.47` labels reach the printer over the device's route   | e2e `prescriptions-regression` (USB delivery: device selected, ZPL sent) |
| `.47` nothing configured → told to configure one         | e2e (pre-existing) · settings `.43` for the nothing-sent half            |
| `.71` a refused print is never silent, from the bulk bar | e2e `prescriptions-regression` · `LabelPrintOutcomeDialog.test.ts`       |
| `.47` all three entry points reach the same action       | e2e — app bar (above), bulk bar (`.71`), and **Alt+L**                   |

**Alt+L had no test of any kind.** `ALT_L` appeared in exactly two files —
`src/ui/utils/shortcuts.ts` and `PrescriptionDetailView.tsx` — and in no unit or
e2e test; there is no keyboard e2e suite. It is one of three entry points into
`runPrintLabels` and was the only untested one. The new test pins the **binding**
(rebinding `ALT_L` to another key turns it red), not the printing, which the
other rows cover.

**`.71` was a duplicate ID on `develop`** — the add-mode item-selector behaviour
had been minted as a second `.71` two days after label-print failure took that
number, so `.71` resolved (for `pnpm brief` and `check_anchor_refs`, which check
that an ID exists, not that it is unique) to the selector's test while the
label-print behaviour had **no test at all**. The selector is renumbered `.74`;
see the case file's ID history. Worth noting the same case had already been
renumbered once for the same collision, against `.64`.

**Cross-FE:** all three rows pass against both this FE and the current app. The
current app's bulk Print-labels action carried no test id, so
`print-labels-button` — already in `TESTIDS.md` and already here — never
resolved there; instrumented in `client/…/Prescriptions/DetailView/Footer/Footer.tsx`
(a test id only, no behaviour change). Two ids were added there in total — the
second, `notification-detail-toggle`, is on the notification's info-icon
disclosure in `useNotification.tsx`.

**The outcome MESSAGE is asserted cross-FE**, and that corrected an earlier
reading. Both front ends say the same thing, word for word ("There is no label
printer configured. Please see the Settings > Devices section…"); the current
app puts it behind the notification's info icon while this FE shows it outright.
That is presentation, not behaviour, so `expectPrintMessage`
(`e2e/helpers/labelPrinter.ts`) opens the disclosure where there is one and
asserts the text on both. It had looked un-assertable because the pre-existing
`.47` test hunted that icon by accessible name, which it does not have — hence
the id, rather than an exclusion. Greening it also retires the
"CURRENT-APP RESIDUAL" note that had carried `.47` as undiagnosed.
