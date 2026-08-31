# Build report — prescription requests

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

First implementation of the **greenfield** prescription-requests vertical ([`spec/prescription-requests`](../../../spec/prescription-requests/README.md)) — the prescriber's side of prescribing, distinct from the dispensing vertical (`prescriptions/`), which this change relabels **Dispensing** in the nav (label only; its path, spec folder, and code are untouched). The backend is new too, built alongside on the open-msupply `prescription-requests` branch (tables `prescription_request`/`prescription_request_line`, the Ready-to-dispense conversion, the Dispensed-flip processor); types were generated against that server on `:8000` (scoped codegen run) and its schema surface merged additively into `spec/schema.graphql` (148 insertions, zero removals — the pinned file also carries other in-flight branches, so a wholesale refresh was deliberately avoided). All three gates pass — `pnpm check` · `pnpm test` (1895, incl. the new status tests) · `pnpm build` (the section code-splits to ~9.3 kB gzip: list 3.75 + detail 5.59).

### Built

- **S1 list** — standard scaffold: Patient / Status / Number / Prescription date / Created (hidden by default) / Comment; default sort **created desc** (AC-L1); past-New rows take the read-only row treatment but stay clickable; filters Patient + prescription-date (default-on) · Status (multi-select); **New prescription** (Alt+N); bulk **Delete** with the New-only selection pre-check (AC-D2) — per-request wire deletes, refused as a whole batch when any selected row is past New.
- **S2 create dialog** — patient (reusable `PatientSearch`, the one required field, with create-patient-on-no-match in place) · date (capped today; today = "send nothing", the server stamps the creation moment) · program; generic rejections shown in-dialog; success navigates to the detail (AC-C1..C3).
- **S3 detail** — toolbar (patient / date / program / **diagnosis** — a `Combobox` over `diagnosesActive`, the same consumed read dispensing's side panel uses / prominent custom fields); Details + Custom fields + Log tabs; the line table (code · name · quantity · unit · directions); side panel (Additional info incl. the debounced comment · live Patient details · **Related documents** linking the generated dispensation once past New (AC-R4) · actions Delete/Copy); status footer (crumbs New · Ready to dispense · Dispensed with recorded times, and the **Ready to dispense** action while New — Alt+V, no-lines pre-flight as a blocking notice (AC-R1), server rejection shown in the same dialog).
- **S4 line editor** — item lookup (locked when editing an existing line — replace by delete + add), **advisory stock on hand** beside the chosen item (`ItemOption.availableUnits`, also resolved live for an existing line's item; AC-N4 — informs, never blocks), quantity in units (positive to save, AC-N1), directions (abbreviation entry + the item's canned directions + the expanded text, expansion on blur too; AC-N3); the same dialog is the read-only face past New (AC-N5).
- **Custom fields** — the shared `src/domain/customFields/` domain at the new **`prescription_request`** scope: prominent fields in the toolbar (save-on-change), the Custom fields tab (buffered + explicit save). No list columns/filters in v1 (the dispensing precedent's `dynamicFilter` plumbing is a follow-up).
- **Shared additions:** `src/domain/directions/` — `expandAbbreviations` promoted out of the dispensing vertical (its modal repointed; the pure function + its AC-R1 tests moved verbatim) so both verticals share one expansion; `fetchItemById` exported from the `src/domain/item` surface (was internal). Nav: new entry `dispensary/prescription-request` labelled **Prescriptions**; the dispensing entry relabelled **Dispensing** (new `dispensing` locale key); route registered with the DispensaryOnly guard.
- **Test-id contract:** a Prescription-requests section added to [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md) (shared list/detail ids reused; new screen-specific ids listed there).

### AC coverage

| AC | Where | Status |
| --- | --- | --- |
| AC-N5/R3/D2 New-only editability gates; the safe narrowing default | `prescriptionRequestStatus.test.ts` | ✅ tested |
| Lifecycle crumbs + recorded times | `prescriptionRequestStatus.test.ts` | ✅ tested |
| AC-N3 abbreviation expansion | `src/domain/directions/directions.test.ts` (moved with the function) | ✅ tested |
| AC-C1..C3 creation; AC-L1..L3 list; AC-N1/N4 line editor; AC-R1 no-lines pre-flight; AC-F1 custom fields | screens | ⚠️ built, **not yet live-driven** (see gaps) |
| AC-R2 the generated dispensation's shape; AC-S1 the Dispensed flip; AC-G1 log entries | server-enforced — covered by the backend's service tests (`ready_to_dispense_generates_dispensation`, the processor tests incl. `verify_via_dispensing_service_flips_request_immediately` — the same-store flip is immediate, transfer-processor style) | ⚠️ server behaviour; UI reflects the returned node / re-read |
| AC-D1 delete removes lines | server-enforced (backend `delete_only_while_new` test) + side-panel delete | ⚠️ server-tested; UI built |

### Gaps / follow-ups

- **Not live-driven.** The dev server + a login could not be driven from this environment (the MCP bridge needed an interactive auth flow). Every AC marked "built" above needs a live pass — the FL1 end-to-end walk (create → lines → Ready to dispense → allocate + verify in Dispensing → the request reads Dispensed) is the one that matters.
- **A full `pnpm codegen` run currently requires a server carrying every in-flight branch.** This build used a scoped codegen over the four new documents; a full run against a `prescription-requests`-only server would fail on `campaigns.graphql` (`deleteCampaigns` lives on `campaigns-atomic-delete`). Once both backend branches merge, a full run also adds `prescriptionRequestId` to dispensing's generated `InvoiceFilterInput` — its exhaustive `listFilters` map will then need the one-line `prescriptionRequestId: null` entry.
- **No e2e suite yet** — the TESTIDS section is in place; a `prescription-requests-regression.spec.ts` needs the backend in the e2e datafile export first (the reference export predates the tables).
- **No list CSV export or printing** — deliberate v1 scope (spec § out of scope / README gaps). Custom-field list columns and filters were added later in the stack and are no longer a gap.
- **Behaviour-case conversion** pending a QA-signed `OMS-*` namespace (spec README status).
- **Dismissed-affordance note:** the list's status filter offers all three statuses unconditionally (no preference gates exist for this vertical).

## Amendment — clinician removed, prescriber mode added

Two later changes, specified in the same vertical:

- **The clinician picker is gone** from creation, the detail toolbar, the node and both mutation inputs; `prescription_request.clinician_link_id` was dropped by amending the original migration (the feature had not reached develop, so no second fragment). `created_by` is the request's only record of a person, shown in the side panel and toolbar as **Entered by** — a data-entry fact, never labelled prescriber — and the generated dispensation carries the same identity through `invoice.user_id` rather than a copied clinician. This overturns the vertical's original "the clinician is *picked*" decision and removes delegate entry — see rules § who is recorded.
- **Prescriber mode** — a second navigation registry (`prescriberNavConfig`) selected by the `PRESCRIBER_MODE` permission, offering Prescriptions, Patients, Items, Settings and Help. Client-only; it authorises nothing. Granted by mSupply permission 205, _Restrict to prescriptions_ — the only source of it.
