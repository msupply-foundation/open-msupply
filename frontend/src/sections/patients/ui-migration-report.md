# Patients — UI migration report

**Scope:** the whole `patients` vertical — the S1 list (+ its filters and export action), the S2 create wizard and S2b fetch-from-central modal, the S3 detail screen and every tab this vertical owns (Details form, Programs / Encounters / Vaccinations, Insurance + its add/edit modal, Custom fields), and the routes/gate. Run under [`migrate-ui`](../../../../.claude/skills/migrate-ui/SKILL.md) against the eleven dimensions of [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md).

**Status: MIGRATED.** All ten findings applied (F5 as its own reviewed step), all three spec edits and the doc edit made, plus one **library addition** the wizard's width called for (`Dialog width="prose|form|wide"`). `pnpm check` and `pnpm test` green, and the reactivity pass over the diff came back clean. **The visual pass is yours to complete** — the list is at the end, and it matters more than usual here because the custom-fields change is app-wide and the `Dialog` prop is shared.

The vertical was already well composed — `Page`/`Header`/`Breadcrumb`/`HeaderToolbar`/`DataTable`/`FilterBar`/`Dialog`/`FormColumns` all in use, the header field cluster exactly the house shape, and no colour or px literal anywhere in the section. The findings were concentrated in four places: the filter bar's **location**, the tables' **column widths**, three **inline `style`** blocks, and the detail view's **resource reads**.

## What changed

| ID        | Change                                                                                                                                                                                | Dims     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **F1**    | The list's `FilterBar` moved from the page header's `<Toolbar>` into the `DataTable`'s own `filters` slot; the header is `Breadcrumb` + `HeaderButtons` only                          | 2/3/11   |
| **F2**    | All five tables now take their cell-type presets — `getCellDefinition` where a `CELL_DEF` key exists, an explicit helper + call-site `size` where none does                           | 3        |
| **F3**    | The four config-backed tables pass `configIsDefault`, so Reset is inert on an untouched table                                                                                         | 3        |
| **F4**    | The Details tab's inline-`style` padding wrapper is gone — `ContentContainer size="form" padded`                                                                                      | 1/6      |
| **F6**    | S2b's four candidate facts are `LabelledValue variant="field"` in a `Stack gap="md"`, not `FieldRow` + `Text`                                                                         | 4/5      |
| **F7**    | All four secondary detail resources read through a `state` gate; the comment that claimed `.latest` avoided suspending is corrected                                                   | 7        |
| **F8**    | The shared custom-fields **edit** tab is now the two-column `FormColumns` split at the `form` measure, its inline `style` gone; the split is one shared helper with the read-only tab | 1/5/6/11 |
| **F9**    | That tab's Save is the pre-composed `SaveButton` in an `HStack`, not a hand-rolled `Button` in a bare `<div>`                                                                         | 1/5      |
| **F10**   | `e2e/TESTIDS.md` § Patients documents the eleven ids the detail, wizard and modals actually stamp                                                                                     | 10       |
| **F5** | The wizard step rail is the shared `ProgressList` (the registry's determinate progress list) — inline styles gone, `aria-current` + hidden per-step status gained; the modal also sits at ONE width for every step instead of jumping to 96rem on the results step | 1/6/9/11 |
| **LIB-3** | **Library addition** (signed off): `Dialog` takes `width="prose\|form\|wide"` — the shared content measures — so a form-width dialog names the measure instead of repeating `58`, **and a measure-sized dialog now honours the app's full-screen-below-the-narrow-line standard** (which had been gated on `size="large"` alone) | 1/6 |
| **extra** | The two remaining `'—'` literals in the vertical now use the app-wide `EMPTY_FIELD_VALUE`, so every read-only empty field in patients has one source                                  | 1        |

## Coverage — greened

Rows = every screen/piece in scope; columns = the eleven dimensions. A cell names the finding that touched it.

| Screen / piece                                                       | 1 Registry | 2 Composition | 3 Tables | 4 Inputs | 5 Detail/panel | 6 Styling | 7 Reactivity | 8 Types | 9 A11y | 10 Test hooks | 11 Spec |
| -------------------------------------------------------------------- | ---------- | ------------- | -------- | -------- | -------------- | --------- | ------------ | ------- | ------ | ------------- | ------- |
| `index.tsx` (routes + dispensary gate)                               | ✅         | ✅            | —        | —        | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| S1 `list/PatientsList.tsx`                                           | ✅         | ✅ F1         | ✅ F1–F3 | ✅       | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅ F1   |
| `list/listFilters.tsx`                                               | ✅         | —             | ✅       | ✅       | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| `list/actions/ExportPatientsAction.tsx`                              | ✅         | ✅            | —        | —        | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| S2 `list/CreatePatientModal.tsx`                                     | ✅ F5      | ✅            | ✅ F2    | ✅       | ✅             | ✅ F5     | ✅           | ⚠️ N2   | ✅ F5  | ✅ F10        | ✅ F5   |
| S2b `list/FetchFromCentralModal.tsx`                                 | ✅ F6      | ✅            | —        | ✅ F6    | ✅ F6          | ✅        | ✅           | ✅      | ✅     | ✅ F10        | ✅      |
| S3 `detail/PatientDetailView.tsx`                                    | ✅ F4      | ✅            | —        | ✅       | ✅             | ✅ F4     | ✅ F7        | ✅      | ✅     | ✅ F10        | ✅      |
| Details form `detail/PatientDetailsForm.tsx`                         | ✅         | ✅            | —        | ✅       | ✅             | ⚠️ N1     | ✅           | ✅      | ✅     | ✅            | ✅      |
| Insurance `detail/insurance/InsurancePanel.tsx`                      | ✅         | ✅            | ✅ F2–F3 | —        | ✅             | ✅        | ✅           | ✅      | ✅     | ✅ F10        | ✅      |
| Insurance modal `detail/insurance/InsuranceModal.tsx`                | ✅         | ✅            | —        | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅ F10        | ✅      |
| Programs / Vaccinations `detail/programs/ProgramEnrolmentsPanel.tsx` | ✅         | ✅            | ✅ F2–F3 | —        | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Encounters `detail/programs/EncountersPanel.tsx`                     | ✅         | ✅            | ✅ F2–F3 | —        | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Custom fields tab (`domain/customFields`)                            | ✅ F8·F9   | ✅            | —        | ✅       | ✅ F8·F9       | ✅ F8     | ✅           | ✅      | ✅     | ✅            | ✅ F8   |
| Log tab (`domain/activityLog`)                                       | ✅         | ✅            | ⚠️ N5    | —        | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |

## The findings

### F1 — The filter bar rendered in the page header's `<Toolbar>`, not the table's own toolbar (dims 2, 3, 11) · **applied**

[PatientsList.tsx:260-274](list/PatientsList.tsx#L260) wraps `FilterBar` (default filters + the custom-field `extra` group) in a `<Toolbar>` inside the page `Header`. The `DataTable` at [:278](list/PatientsList.tsx#L278) is handed no `filters` prop.

- **Rule (binding):** [`tables.md` § Toolbar](../../../spec/ui-standards/tables.md) — "The filter bar MUST render in this table toolbar — never in the page header / app bar, and never in a separate page-level toolbar band above the table. This binds every table, list or detail, and **overrides any vertical spec** that places filters elsewhere."
- **Reference to copy:** [`StocktakesList.tsx:345`](../stocktakes/list/StocktakesList.tsx#L345) passes `filters={<FilterBar …/>}`; the names migration made exactly this change (its R2).
- **Fix:** move the `FilterBar` (unchanged, `extra` and all) into `DataTable`'s `filters` prop; drop the `Toolbar` import and element so the header is `Breadcrumb` + `HeaderButtons` only.
- **Test hooks:** unaffected — `FilterBar` emits `filters-menu` / `filter-input-<key>` wherever it is mounted, so `specs/patients-regression.spec.ts` is untouched.
- **Spec edit S1** (below) removes the `ui-surface` sentence that put the chips in the app bar.

### F2 — No table carried its cell-type width presets (dim 3) · **applied**

Every patients table hand-builds plain text columns and calls the **bare** `getDateCell()`, which sets rendering but **no `size`/`maxSize`** — so each column renders at a wrong default width and cannot be dragged to resize ([`CELL_TYPES.md` § Width model](../../ui/docs/CELL_TYPES.md)). Patients is one of the last verticals without the presets: ten verticals already use `getCellDefinition`.

| Table                                                                     | Columns → fix                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [S1 list](list/PatientsList.tsx#L165)                                     | `code` (keep `headerPosition: 'primary'` as the preset's `meta` arg) · `code2` · `createdDatetime` · `firstName` · `lastName` · `gender` (preset spread **before** the label `cell` override) · `dateOfBirth` · `nextOfKinName` → `getCellDefinition`; `programEnrolments` → `getChipListCell()` + `size: remToPx(12)`; `isDeceased` → `getFlagCell()` + `size: remToPx(5.5)` — the header word, not the marker, is the binding width (no `CELL_DEF` key for either) |
| [S2 results](list/CreatePatientModal.tsx#L299)                            | `code` · `code2` · `firstName` · `lastName` · `dateOfBirth` · `gender` → `getCellDefinition`; `isDeceased` → keep `getBooleanCell({display:'yesNo'})` (see **N3**) + `size`; the trailing `action` column → `size: remToPx(3)`                                                                                                                                                                                                                                       |
| [Insurance](detail/insurance/InsurancePanel.tsx#L38)                      | `policyNumber` / `providerName` / `policyType` / `status` → `getTextCell()` + call-site `size`; `discountRate` → `c: { key: 'discountPercentage' }` + `getPercentageCell()` (locale-formatted, replacing the hand-built `${n}%` accessor) + `size`; `expiryDate` → `getDateCell()` + `size` (see **N4**)                                                                                                                                                             |
| [Programs / Vaccinations](detail/programs/ProgramEnrolmentsPanel.tsx#L32) | `enrolmentDatetime` → `getCellDefinition`; `program` / `programEnrolmentId` / `status` → `getTextCell()` + `size`                                                                                                                                                                                                                                                                                                                                                    |
| [Encounters](detail/programs/EncountersPanel.tsx#L38)                     | `startDatetime` → `getCellDefinition`; `type` / `program` / `status` → `getTextCell()` + `size`                                                                                                                                                                                                                                                                                                                                                                      |

- **Reference to copy:** the names migration's R4 table (`getCellDefinition` where a `CELL_DEF` key exists, explicit helper + call-site `size` where none does).
- **Column ids are unchanged** everywhere the e2e suite locates by them, except the insurance discount column (`cell-discountRate` → `cell-discountPercentage`), which no suite or testid contract references.

### F3 — Tables didn't pass `configIsDefault` (dim 3) · **applied**

The four tables built on `createTableConfig` pass `config` / `setConfig` / `onSaveGlobalDefault` but not `configIsDefault`, so the toolbar's **Reset** stays enabled on an untouched table. Sixteen files across the app already pass it (names R6). **Fix:** `configIsDefault={tableConfig.isConfigDefault()}` at [PatientsList.tsx:298](list/PatientsList.tsx#L298), [InsurancePanel.tsx:92](detail/insurance/InsurancePanel.tsx#L92), [ProgramEnrolmentsPanel.tsx:65](detail/programs/ProgramEnrolmentsPanel.tsx#L65), [EncountersPanel.tsx:73](detail/programs/EncountersPanel.tsx#L73).

### F4 — An inline `style` padded the Details tab (dims 1, 6) · **applied**

[PatientDetailView.tsx:425](detail/PatientDetailView.tsx#L425) — `<div style={{ padding: 'var(--space-5)' }}>` wraps the `ContentContainer`, because the page is `fillBody` for the table tabs. An inline `style` is always a finding (reach-for order step 5), and the library already answers this exact need one step up the ladder: `ContentContainer`'s **`padded`** prop ("For form content inside a `fillBody` body — a mixed table+form detail view whose Page is full-bleed for the tables").

**Fix:** delete the `<div>`; `<ContentContainer size="form" padded>`. Same as `CustomFieldsEditTab` and `CustomFieldsView` already do.

### F5 — The create wizard hand-rolled its step rail with inline styles (dims 1, 6, 9, 11) · **applied**

[CreatePatientModal.tsx:434-465](list/CreatePatientModal.tsx#L434) builds the three-step rail as a `<div style={{display:'flex', gap:'1.5rem', 'margin-block-end':'1rem'}}>` of `<span style={{'font-weight':…, opacity:…}}>`. Three separate violations: layout by inline `style` (a C3 registry break — `HStack` exists), raw `1.5rem`/`1rem`/`0.6` values, and step state carried by weight + opacity on a generic `<div aria-label>` that exposes no name.

The in-file comment and `spec/patients/ui-surface.md` both call the wizard stepper **a registry-gap role**. That is no longer true: the registry has a ✅ **[determinate progress list](../../../spec/ui-standards/components.md)** — "an ordered row of labelled steps, each pending / in-progress / done" — and a sibling vertical already uses it as a modal wizard's step rail in **both** its wizard dialogs: [`ReturnFromShipmentModal.tsx:276-292`](../customer-returns/detail/edit-modal/ReturnFromShipmentModal.tsx#L276) and the per-item `ReturnItemsModal`. `ProgressList` also brings the a11y this hand-roll lacks: `aria-current="step"` on the in-flight step plus visually-hidden pending / in-progress / done text, so the state is never weight-and-opacity alone.

**Fix:** replace the block with the sibling's shape —

```tsx
<ContentContainer size="form">
  <ProgressList variant="secondary" steps={[…three steps…]} />
</ContentContainer>
```

each step `{ label, started: step() >= n, finished: step() > n }`, and **spec edit S2** retires the
registry-gap claim.

**Done as its own reviewed step (2026-07-31).** Confirmed against the reference app as well: its `WizardStepper` is a thin wrapper over the same `HorizontalStepper` that its sync stepper uses, and our `ProgressList` is a deliberate port of that component — so this is the composition OMS ships, with the same three step labels. `stepTitle()` went with the hand-roll (it existed only for an `aria-label` on a `<div>`, which exposes no accessible name); the dialog keeps its fixed **Create patient** title. **No inline `style` now remains anywhere in the vertical.**

**And the dialog's width (Carl, 2026-07-31).** The modal was `widthRem={step() === 2 ? 96 : step() === 3 ? 56 : 44}`, sprawling to 96rem on the results step. It is now **one** width for the whole flow — the shared `form` measure — so the box stays steady as the flow moves through it. Two notes on the mechanism: a `ContentContainer` inside the dialog could **not** have done this (the frame owns its width, so the title and actions rows would have stayed wide around a floating body), and the first cut passed `widthRem={58}` — a bare number duplicating `--measure-form`, which became library addition **LIB-3**. The rail needs no measure wrapper of its own now (the customer-return wizards still cap theirs — their dialog is a `size="large"` workbench). The results table fits the narrower box: its column presets total ~51rem.

### F6 — S2b rendered read-only facts as `FieldRow` + `Text` (dims 4, 5) · **applied**

[FetchFromCentralModal.tsx:126-146](list/FetchFromCentralModal.tsx#L126) shows the candidate's Patient ID / First name / Last name / Date of birth as four `<FieldRow label={…}><Text variant="body">…</Text></FieldRow>` pairs.

- **Registry:** `FieldRow` is the "inline `label: control` pair … the wrapped control hides its own visible label" — a **control** row. The role here is **read-only labelled value**, which maps to `LabelledValue` (`variant="field"`).
- **Precedent:** the sibling modal context row uses `LabelledValue variant="field" size="small"` ([`ReturnFromShipmentModal.tsx:299`](../customer-returns/detail/edit-modal/ReturnFromShipmentModal.tsx#L299)); `CustomFieldsView` and the names R1 read-only form do the same. The stocktakes J1 deferral does **not** cover this: it was about a panel **mixing** read-only facts with editable inputs, and this dialog has no editable siblings.
- **Fix:** four `LabelledValue variant="field"` inside a `<Stack gap="md">` (the dialog body's own `--space-4` gap is the between-blocks rhythm, so the facts need their own tighter stack — dim 5 vertical rhythm). The existing `—` for an absent date of birth is correct for a labelled field and stays.

### F7 — Interaction-mounted resources were read with `.latest` alone (dim 7) · **applied**

[PatientDetailView.tsx](detail/PatientDetailView.tsx) reads four resources through `.latest`: `providers` ([:169](detail/PatientDetailView.tsx#L169)), `policies` ([:182](detail/PatientDetailView.tsx#L182)), `enrolments` ([:201](detail/PatientDetailView.tsx#L201)), `encounters` ([:216](detail/PatientDetailView.tsx#L216)). The comment at [:163](detail/PatientDetailView.tsx#L163) states these "`.latest` reads keep these off the Suspense boundary the patient resource owns" — that is **factually wrong**, and the root `CLAUDE.md` anti-default says so in as many words: "**`.latest` alone is NOT safe** (it suspends on the first pending read)."

It matters here because `Tabs` **unmounts inactive panels** (`Tabs.tsx` doc comment), so each panel's first read happens when the user _clicks its tab_: if that resource is still in flight, the read suspends the detail screen's `<Suspense>` boundary and tears down the whole page — including the `InsuranceModal`'s open `<dialog>`, which is mounted inside it. The fetches do start at page load, so this is a race rather than a certainty, which is exactly the kind of intermittent focus/backdrop loss the KDD exists to remove.

**Fix:** the house gate, used at sixteen sites (`names`, `inbound-shipments`, `settings`, …): a `loaded()`-style accessor on `state === 'ready' || state === 'refreshing'`, returning the empty value otherwise. `loading` stays as the spinner boolean for each panel. Correct the comment.

The patient resource itself ([:111](detail/PatientDetailView.tsx#L111)) stays a suspending read — it is the screen's first load with no live user state to lose, which is the sanctioned case.

### F8 — The Custom fields tab was one narrow column, capped by an inline `style` (dims 1, 5, 6, 11) · **applied globally**

[`domain/customFields/CustomFieldsEditTab.tsx`](../../domain/customFields/CustomFieldsEditTab.tsx) renders `<ContentContainer padded style={{ 'max-inline-size': 'var(--input-max-short)' }}>` around a single `FormSection` of fields. Two problems: the inline `style` (always a finding), and the single narrow column — while the **read-only twin in the same module**, `CustomFieldsView`, already renders the identical field set as the two-column `FormColumns` split. One record's two custom-field surfaces therefore contradict each other, and **you have asked for the two-column layout here.**

**Fix** (mirroring `CustomFieldsView`, whose split comment explains the runtime-data ordering):

```
ContentContainer size="form" padded
  └ FormSection title="Custom fields"
      ├ FormColumns
      │   ├ FormColumn → Stack gap="md" → first ⌈n/2⌉ fields
      │   └ FormColumn (only when non-empty) → Stack gap="md" → the rest
      └ HStack → SaveButton            ← see F9
```

The `Math.ceil(n/2)` split becomes one shared helper in the module rather than a second copy.

**Blast radius — this is a shared component.** `CustomFieldsEditTab` is the editable custom-fields tab for **six** verticals: patients, inbound-shipments, outbound-shipments, customer-returns, supplier-returns, prescriptions. See **decision D1**.

### F9 — The Custom fields Save was a hand-rolled `Button` in a bare `<div>` (dims 1, 5) · **applied**

Same file: `<div><Button variant="primary" …>{t('button.save')}</Button></div>` — the `<div>` exists only to stop the button stretching in the flex column. Reach-for order step 1 has both answers: the pre-composed **`SaveButton`** (fixes variant, label, save icon, collapse) inside an **`HStack`** instead of a bare `div`. **Fix:** `<HStack><SaveButton disabled={!dirty()} loading={saving()} onClick={…} /></HStack>`.

### F10 — The vertical stamped test ids the contract didn't document (dim 10) · **applied**

[`e2e/TESTIDS.md` § Patients](../../../e2e/TESTIDS.md) states the detail "rides entirely on ids the shared components already emit", but the detail and its modals place seven of their own: `save-button`, `cancel-button`, `add-insurance-header-button`, `add-insurance-button`, `insurance-modal`, `patient-detail-error-summary`, `insurance-error-summary` (plus `create-patient-error-summary`, `create-patient-modal`, `create-new-patient-button`, `patient-retrieval-modal`, `dob-estimated-info`). None is referenced by a suite today, so nothing is broken — but the contract doc is the place a suite author looks. **Fix:** a short table in the Patients section listing them. Doc edit, flagged for sign-off with the spec edits.

## Judged BENIGN — no change

- **N1 — `PatientDetailsForm.module.css`** ([:11-16](detail/PatientDetailsForm.module.css#L11)) drops the Generate button by one field-label line so it sits level with the Code input inside a `FormRow`. Token-only, scoped, and the rationale is in the file. No component or prop covers "align to the control line, not the label line", so this is a legitimate reach-for step 4. **Surfaced as a possible future library capability** (a `FormRow` control-line alignment prop) in the end report — not built under this migration.
- **N2 — `MatchRow`** ([CreatePatientModal.tsx:79-90](list/CreatePatientModal.tsx#L79)) unifies a local `PatientOption` and a central `CentralPatient` into one row type. It restates GraphQL-derived fields, but no single generated type covers both sources and the alternative (a discriminated union with per-column accessors) is worse to read. Left as is.
- **N3 — Deceased renders as a flag on the list and Yes/No in the wizard results.** `ui-surface` specifies "centred flag" for the **list column only** and leaves the results column's type open; a small dialog table reads better with the word. Deliberate, and now recorded here.
- **N4 — Insurance Expiry date keeps the plain date cell**, not the expiry preset (which tints ≤3 months red). `ui-surface` types that column `date`; the near-expiry tone is a stock concept and adopting it here would be a visual behaviour change the spec doesn't ask for.
- **N5 — The Log tab** is `domain/activityLog/ActivityLogPanel`, shared by eight verticals; its bare `getDateCell()` is the same F2 defect but belongs to whichever migration owns that shared panel, not this one. Noted, not touched.
- **No side panel** in this vertical, so [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) has nothing to grade.
- **Relative deep imports** (`../../../ui/...`) are the house pattern in every migrated vertical (names, items, inbound-shipments all use them); not converted.
- **Out of scope — behaviour, not composition:** `ui-surface` S3's footer names a **History** action and the header a **split button** of record-create actions; both belong to the unbuilt document-path / program verticals the file header already flags. Migration changes composition only.

## Spec + doc edits — signed off and made (except S2)

| ID                          | File                                                                                                        | Edit                                                                                                                                                                                                                           | Why                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **S1**                      | [`spec/patients/ui-surface.md`](../../../spec/patients/ui-surface.md) § S1 Layout                           | drop "The filter menu and default filter chips sit in the app-bar page-content region"                                                                                                                                         | binding `tables.md` § Toolbar overrides a vertical's filter **location**; a vertical states only the filter set (F1) |
| **S2** | `spec/patients/ui-surface.md` header + § S2 + § S2 Layout (+ [`README.md`](../../../spec/patients/README.md) known gaps) | the **wizard stepper** is no longer a registry gap — the three steps are named by the determinate progress list; the schema-driven document form is now the vertical's **one** remaining gap | the role exists and is built (F5) |
| **S3**                      | [`spec/ui-standards/custom-fields.md`](../../../spec/ui-standards/custom-fields.md) § The custom-fields tab | "one labelled row per definition in configured order" → the definitions in configured order **split down two columns** (reading down column one, then column two), wrapping to one stack when narrow; block still width-capped | F8. The read-only view already renders this, so the sentence is stale for both surfaces                              |
| **D**                       | [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md) § Patients                                                      | list the detail / modal ids the vertical places                                                                                                                                                                                | F10                                                                                                                  |

No `DIVERGENCES.md` entry is needed: none of these changes the app's behaviour or content relative to the reference app.

## Decisions — as ruled (2026-07-31)

1. **D1 — F8's blast radius: apply it globally.** The shared `CustomFieldsEditTab` takes the two-column layout for every host, with every affected surface listed under [App-wide check list](#app-wide-check-list-the-f8-blast-radius) below.
2. **D2 — keep the "Custom fields" heading.** The `FormSection title` stays above the two columns.
3. **F5 — done as its own step**, after review of the proposal. With it: the create modal is **one** width for every step (the `form` measure), which prompted **LIB-3**.
4. **LIB-3 — add the width presets to `Dialog`** rather than leave a bare `58` in the section. Applied.

## Boutique / uncovered elements

Everything in the vertical maps to a library component except these three, each recorded as a decision rather than a silent gap:

- **The wizard step rail** (`CreatePatientModal`) — **not uncovered after all**: the registry's determinate progress list (`ProgressList`) fills it, and it is now what the wizard renders (F5). **No inline `style` remains anywhere in the vertical.**
- **The Generate-button row offset** (`PatientDetailsForm.module.css`, N1) — a **deliberate documented exception**: a token-only, three-line, scoped CSS module doing what no component or prop offers (align an item to a `FormRow`'s control line rather than its label line). Reach-for order step 4, correctly used.
- **The schema-driven document form** — a **⛔ registry role awaiting a build**, as `spec/patients/ui-surface.md` already records. Nothing was invented for it: the vertical renders the built-in plain-path field set, which is the specified fallback.

## Library findings this migration surfaced

Neither is fixed here — changing shared code is its own signed-off change:

- **LIB-3 — `Dialog` had no width vocabulary, only a rem number** — so "make this dialog form-width" meant writing `58`, duplicating `--measure-form` in a section file. **Fixed under this migration with sign-off** (the one library change here): `Dialog` now takes `width="prose\|form\|wide"`, the same three content measures `ContentContainer`'s `size` names, delivered by a class+attribute rule in `Dialog.module.css`; `widthRem` stays for a bespoke width and still wins if both are passed. Registered in the [components registry](../../../spec/ui-standards/components.md) modal row, the [`UI_ELEMENTS`](../../ui/docs/UI_ELEMENTS.md) ledger, and a new **Width presets** card in `#/showcase/dialog`. The registry row also now states the trap: a wide dialog MUST NOT be narrowed by capping its content. **Second half of the same change (Carl, 2026-07-31):** the width presets initially missed the app's own responsive standard — [`breakpoints.ts`](../../ui/styles/breakpoints.ts) calls `navOverlay` (1024) "the 'narrow viewport' line … at which modal dialogs expand to full screen", but `Dialog` gated that on `size="large"`, justified in its CSS by "smaller dialogs … already fit a tablet-portrait viewport". That justification dies with the measures: `form` is 928px, so below the line it was an edge-to-edge card holding a 1rem margin. A measure now opts into the full-screen sheet alongside `size="large"`; a default or `widthRem` dialog still stays a centred card, since a confirmation has no business filling a tablet screen. Verified on the running app at 820×1180: the wizard is a proper sheet, no radius, actions pinned to the bottom edge.
- **LIB-1 — no way to align a non-field item to a `FormRow`'s control line.** A labelled field's control sits one label-line below the row's start, so a bare button beside it (the Code field's **Generate**) lands level with the label text. Patients is the only vertical with the pattern today, which is why it stays a CSS module (N1) rather than a library change — but a second occurrence should turn into a `FormRow` prop (an [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md)-style capability task), not a second copy of the calc.
- **LIB-2 — no width preset for a flag, chip-list or short-status column.** `getFlagCell` / `getChipListCell` / `getTextCell` set no `size`, so five patients columns carry a hand-tuned `remToPx(…)` at the call site (as names, items and locations already do). The durable fix is per-key entries in [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts)'s `CELL_DEF` (`isDeceased`, `programEnrolments`, `policyNumber`, `providerName`, `policyType`, `status`, `discountPercentage`) so the widths live in the one place the doc says they should. Deferred, not filed.
- **LIB-4 — two `ProgressList` nits the wizard exposed**, neither fixed here (both would change the sync modal too): the **active** step's marker ring stays the pale tone where the reference app paints it the strong one (there, the current step is both `completed` and `active`; ours treats the two as exclusive), and the component lives under `ui/sync/` though the role is generic and now has a non-sync consumer. Recorded as the two open nits in [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md), where the `WizardStepper` follow-up is now closed.
- **N5 — the shared activity-log panel** (`domain/activityLog/ActivityLogPanel`) still calls the bare `getDateCell()`, so the Log tab's Date column has no width preset. It belongs to whichever migration owns that shared panel; eight verticals share it.

## App-wide check list — the F8 blast radius

F8/F9 changed the **shared** `CustomFieldsEditTab`, and the shared-helper refactor touched `CustomFieldsView` too. Custom-field surfaces only render fields a deployment has configured for the scope, so a store with no configured fields shows the empty state and nothing to check — use a datafile that configures fields for the scope you're checking.

**Changed layout — the editable tab (two columns now, plus the `SaveButton`):**

| Vertical               | Where                                                                                        | Route                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Patients**           | detail → Custom fields tab                                                                   | `/{storeId}/dispensary/patients/{id}?tab=custom-fields` |
| **Inbound shipments**  | detail → Custom fields tab (also check the **toolbar promotion** still holds its own fields) | `/{storeId}/replenishment/inbound-shipment/{id}`        |
| **Outbound shipments** | detail → Custom fields tab (+ toolbar promotion)                                             | `/{storeId}/distribution/outbound-shipment/{id}`        |
| **Customer returns**   | detail → Custom fields tab (+ toolbar promotion)                                             | `/{storeId}/distribution/customer-return/{id}`          |
| **Supplier returns**   | detail → Custom fields tab (+ toolbar promotion)                                             | `/{storeId}/replenishment/supplier-return/{id}`         |
| **Prescriptions**      | detail → Custom fields tab (+ toolbar promotion)                                             | `/{storeId}/dispensary/prescription/{id}`               |

Check on each: two columns at a wide window, configured order reading **down column one then column two**, a single stack when the window is narrowed, one field configured ⇒ one column (no empty half), the **Save** button unchanged in behaviour (disabled until dirty, spinner while saving, discard prompt on leaving dirty), and a **locked** record (e.g. a Verified shipment) still showing disabled controls and **no** Save.

**Unchanged behaviour, refactored internals — the read-only tab** (now calls the same shared `splitIntoColumns`; it should look exactly as before):

| Vertical              | Where                           | Route                                             |
| --------------------- | ------------------------------- | ------------------------------------------------- |
| **Items**             | detail → Custom fields tab      | `/{storeId}/catalogue/items/{id}` (Custom fields) |
| **Names (suppliers)** | supplier detail → Custom fields | `/{storeId}/replenishment/suppliers/{id}`         |

## Verification

- `pnpm check` — **green** (types, stylelint, theme contract, page-CSS guard, browser floor).
- `pnpm test` — **green**, 122 files / 1186 tests.
- **Reactivity pass over the diff** (`check-reactivity`, the 12-pitfall KDD) — **clean, no findings**. Two candidates were checked and cleared: the new `FieldColumn` takes the `draft` **store proxy** as a prop and reads `props.draft[def.key]` inside JSX, so per-key tracking survives (no destructuring, and `setField` is a stable identity); and the `FilterBar` now passed as `DataTable`'s `filters` prop is resolved by the library through `children(() => props.filters)`, the sanctioned single-read form for a `JSX.Element` prop. `CustomFieldsView` also got marginally better: its column halves are now memoised instead of re-sliced on every read.

## Your visual pass

Static checks can't catch "compiles clean but looks wrong", so this part is yours — in **light and dark**, and at a wide window plus a narrowed one:

1. **Patients list** `/{storeId}/dispensary/patients` — the filter chips have **moved** from the app bar into the table's own toolbar: compare against [`#/showcase/table`](/) and the stocktakes list. Then the column widths (every column now has a preset default) and that each column still **drags** to resize; the Deceased flag and the program-enrolment chips at their new widths; Reset in the column menu inert until you change something.
2. **Patient detail → Details** `?tab=details` — the form's padding now comes from `ContentContainer padded`, which pads **inside** the 58rem measure rather than outside it, so the fields sit ~2.5rem narrower at a wide window. Check that against the stock detail form and [`#/showcase/form-layout`](/).
3. **Patient detail → Insurance / Programs / Encounters / Vaccinations** — column widths and resizing; the **Discount rate** column is now locale-formatted by the percentage cell (grouping, ≤2dp) and right-aligned with its header.
4. **Patient detail → Custom fields** — the new two columns, plus everything in the [app-wide list](#app-wide-check-list-the-f8-blast-radius) above.
5. **Create wizard** `New patient` — the new step rail (circled markers, connectors, the current step pulsing) and the **fixed form width** across all three steps: step ② is the one to judge, since its eight-column results table now lives in ~55rem instead of 96rem. Compare the rail with the customer-return wizards and with `#/showcase/dialog` › **Width presets**, which demos all three measures on one form. Also worth a look at a **narrowed window** (below tablet portrait): the modal should become a full-screen sheet rather than a near-edge card — I confirmed step ① at 820px but could not drive the harness on to step ②, so the results table's sheet is unverified.
6. **Fetch from central** (a central-only match row) — the candidate's four facts are now label-above read-only values in their own stack; check the rhythm against the confirmation banner below them and against [`#/showcase/side-panel`](/)'s labelled values.

Usual culprits to eyeball throughout: column widths + resizing, field/row spacing, filter chips (shrink-to-content, one clear affordance), empty states, and dialog-button tone.
