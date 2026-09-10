# Cold chain — Equipment — build report

Built from [`spec/cold-chain-equipment/`](../../../spec/cold-chain-equipment/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md).

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Two routed screens — the list and one asset's detail — serving **both** destinations (`cold-chain/equipment` and `manage/equipment`, the same tree mounted twice in `App.tsx`), plus five modals over them: create, import, status, temperature mapping, and the confirmations.

## Anchor coverage

`listState` = `list/listState.test.ts` · `createAsset` = `list/createAsset.test.ts` · `csv` = `list/equipmentToCsv.test.ts` · `assetEdit` = `detail/assetEdit.test.ts` · `properties` = `detail/assetProperties.test.ts` · `statusLog` = `detail/statusLog.test.ts` · `import` = `import/importParse.test.ts` · `equipment` = `equipment.test.ts` · `access` = `access.test.ts`. **live** = driven through the built screen against a real `remote_server` on the seeded `rspec-*` assets — see [Live verification](#live-verification).

| AC | Covered by |
| --- | --- |
| **AC-S1** only the cold-chain class | `listState` — the class is merged in last and no user filter can widen it; **live** |
| **AC-S2** the store restriction | `listState`; **live** (three store assets, no others) |
| **AC-S3** delete refused across stores | _server-owned_ — see [exemptions](#exempt-but-listed) |
| **AC-S4** update NOT refused across stores | _server-owned_ — no client path reaches it |
| **AC-S5** locations uneditable on another store's asset | `assetEdit` — `locationIds` undefined, and the input omits it rather than sending `[]` |
| **AC-S6** Manage lists every store | `listState` (no store filter sent) · `access` (central-gated); **live** (the destination is withheld off-central) |
| **AC-S7** unscoped without the Store column | `listState`; the column's own gate is in `EquipmentList` |
| **AC-L1** default order | `listState`; **live** (installation date ↑ on arrival) |
| **AC-L2** sortable set | `listState` — `SORTABLE_KEYS` is exactly the three, and the columns read it; **live** |
| **AC-L3 / AC-L4 / AC-L11** text filters | `listState` |
| **AC-L5 / AC-L6** category and its types | `listFilters` options are the category's; **live** (chips render) |
| **AC-L7** a type outside the category is cleared | `listState` — incl. not clearing while the list is still loading |
| **AC-L8 / AC-L9** functional-status filter, and no match for an asset with none | `listState` |
| **AC-L10 / AC-L16 / AC-L17** the three answers of the non-catalogue filter | `listState` (all three: `true`, `false`, and absent-on-All) · `equipment` (`isNonCatalogue`) · `listFilters` (the chip offers exactly the three) |
| **AC-L12** empty state | _table-owned_ — the shared `emptyMessage`; **live** on a filtered-to-nothing list |
| **AC-L13** page ≥ 1 row | `listState` (the client never sends < 1); the server rejection is _server-owned_ |
| **AC-L14** row click opens the detail | **live** |
| **AC-L15** store filter | `listFilters` (offered only where the column is) |
| **AC-N1 / AC-N2 / AC-N3 / AC-N4** identity uniqueness | _server-owned_; the create modal's own message for a duplicate asset number is in `CreateAssetModal` |
| **AC-N5** create needs an asset number | `createAsset`; **live** (OK disabled) |
| **AC-N6** clearing the asset number | `assetEdit` — sends `null`, never omits |
| **AC-C1 / AC-C2** the two create paths | `createAsset` (both inputs); **live** (both modes render) |
| **AC-C3** type needs a category | `createAsset`; **live** (the type select is disabled) |
| **AC-C4** the switch clears the choice | `createAsset`, both directions; **live** |
| **AC-C5** the opening status entry | `createAsset` (`buildCreatedLogInput`) |
| **AC-C6** category and type fixed | `SummaryTab` renders them as labelled values; **live** |
| **AC-C7** an unclassified insert | `createAsset` — `classId` is always sent, and the confirm gates on a catalogue item or a type |
| **AC-P1 / AC-P2 / AC-P3** locations created at insert | _server-owned_ — the effect is inside `insertAsset`'s transaction; verified in the reverse-spec pass |
| **AC-P4 / AC-P5 / AC-P9** assign, release, wholesale | `assetEdit`; **live** (the held location renders as a removable chip) |
| **AC-P6 / AC-P7** the two location guards | _server-owned_; the picker makes AC-P6 unreachable — `SummaryTab` asks for `assignedToAsset: false` |
| **AC-P8** the picker's option set | `SummaryTab` (the filter + the held ones added back) |
| **AC-R1 / AC-R2 / AC-R3** the catalogue's value wins and is read-only | `properties`, incl. a catalogue key answered with `null`; **live** (18 rows, catalogue ones read-only) |
| **AC-R4** each property once | `properties` — de-duplicated by key; **live** |
| **AC-R5** no specification | `properties`; **live** |
| **AC-R6** mapping dates read-only | `properties`; **live** (both render as labelled values) |
| **AC-FS1** recording a status | `statusLog`; **live** |
| **AC-FS2** a status is required | `statusLog`; **live** (OK disabled) |
| **AC-FS3** the reasons offered | `statusLog`; **live** (only the two `NOT_FUNCTIONING` reasons) |
| **AC-FS4** changing the status clears the reason | `statusLog` |
| **AC-FS5** Not Functioning needs a reason | `statusLog`; **live** (OK stays disabled) |
| **AC-FS6** a mismatched reason | `statusLog` (unreachable from the screen — the picker offers one status's only) |
| **AC-FS7** a reason may demand observations | `statusLog`, incl. whitespace-only |
| **AC-FS8 / AC-FS9** never postdated, may be backdated | `statusLog` (the day comparison **and** the instant clamp); **live** (a 2020 mapping landed) |
| **AC-FS10 / AC-FS11** the status is the latest entry's | _read-shape_ — `AssetNode.statusLog`; **live** (three different statuses on the list) |
| **AC-FS12** entries are never edited or deleted | _structural_ — no such mutation exists, so none is built |
| **AC-FS13** an entry's files | `StatusHistoryTab` renders them; the upload is in `UpdateStatusModal` |
| **AC-M1 / AC-M2** only a cold room maps | `equipment` (`isColdRoom`); **live**, both ways (split button vs plain) |
| **AC-M3 / AC-M4** the two mapping dates | `statusLog` (the input); **live** — a backdated mapping moved `initial_mapping_date` to `2020-01-15` and today's moved `most_recent_mapping_date` to today |
| **AC-M5** other values survive the recalc | **live** — both storage capacities intact after two mappings |
| **AC-M6 / AC-M7** imported mapping dates | _server-owned_ (`insertAsset` writes the synthetic entries) |
| **AC-M8** the history's kind filter | `statusLog` (`logKindFilter`); **live** (the cold room offers the third option) |
| **AC-M9** a mapping never displaces the status | `statusLog` (`isMapping`) |
| **AC-D1 / AC-D2 / AC-D3** documents | _shared surface_ — [`internal-orders`](../../../spec/internal-orders/ui-surface.md#documents-tab); `DocumentsTab` supplies only the table name and caps; **live** (the panel renders with its empty state) |
| **AC-D4** the catalogue half is empty | _structural_ — not built, see [deliberate differences](#deliberate-differences) |
| **AC-E1 / AC-E2** the save follows the draft | `assetEdit` (twelve fields, one at a time); **live**, both directions |
| **AC-E3** the confirmation | **live** — _Are you sure? / Are you ready to save changes?_ |
| **AC-E4** discard on leave | `createConfirmOnLeave` (shared); wired in `EquipmentDetailView` |
| **AC-E5** success | **live** |
| **AC-E6 / AC-E7** the WHOLE draft is written | `assetEdit`; **live** — editing only the notes left the asset number, all three specification keys, the replacement flag, the serial, both dates and the location untouched |
| **AC-E8** a rejected save | `EquipmentDetailView` stays put; the message is the global error path's |
| **AC-X1 / AC-X2** delete, one and many | `DeleteAssetsAction` / the detail footer; **live** (the confirmation's copy) |
| **AC-X3 / AC-X4 / AC-X5 / AC-X6** delete semantics | _server-owned_ — soft delete, released locations, the resurrect; verified in the reverse-spec pass |
| **AC-I1** only a CSV | `import`; the modal refuses before parsing |
| **AC-I2** a clean file parses | `import` |
| **AC-I3 / AC-I4 / AC-I5** the three row errors | `import` (missing number, duplicate both ways, unmatched code) |
| **AC-I6 / AC-I7** soft dates | `import`, incl. the two-digit year and an impossible day |
| **AC-I8** the status fallback | `import` |
| **AC-I9** the run | `import` (`rowToInsertInput`); the batching is `EquipmentImportModal` |
| **AC-I10** the failed-rows export | `import` (`failedRowsToCsv`) |
| **AC-I11** the template | `import`, incl. that it round-trips through its own parser |
| **AC-Z1** the export covers the whole register | `ExportEquipmentAction` sends `classId` alone — see the [spec gaps](#spec-gaps-hit) |
| **AC-Z2** a column per specification key | `csv`, incl. the catalogue-wins rule |
| **AC-B1 – AC-B7** scanning | _not built_ — see [exemptions](#exempt-but-listed) |
| **AC-B5** locked fields read-only | `assetEdit` (`isLockedField`, incl. the server-admin override); `SummaryTab` renders the standing explanation |
| **AC-AL1 / AC-AL2 / AC-AL3** the activity log | _shared surface_ — `ActivityLogPanel`, passed `order="oldest-first"`; **live** (the trail renders with before/after values, oldest first) |
| **AC-G1** read permission withheld | `access` — nav entry absent, route `denied`; the server refusal is _server-owned_ |
| **AC-G2** change permission withheld | `CreateAssetAction` / `ImportEquipmentAction` / `DeleteAssetsAction` / the detail's delete each check and explain |
| **AC-G3** status permission withheld | `StatusActions` checks both permissions and explains |
| **AC-G4** unauthenticated | _owned by [`startup/`](../../../spec/startup/)_ |
| **AC-G5** both permissions held | `access`; **live** (the whole screen) |
| **AC-F1 – AC-F8** the flow scenarios | composed of the anchors above; **live** for F5 (edit one field, lose nothing) and F3 (map a cold room) |

### Exempt but listed

- **AC-S3, AC-S4, AC-L13 (server half), AC-N1–AC-N4, AC-P1–AC-P3, AC-P6, AC-P7, AC-X3–AC-X6, AC-M6, AC-M7** — server behaviour with no client path to exercise, or an effect that happens inside a mutation's own transaction. Each was fired directly at the running server during the reverse-spec pass and is recorded in [`contract.md`](../../../spec/cold-chain-equipment/contract.md); none has a colocated test because there is nothing in this code to drive it.
- **AC-B1 – AC-B7 (scanning)** — **deliberately omitted from this build.** The barcode/GS1 path needs a scanner the shared library gates on (`AddFromScannerButton` renders nothing without one), and the spec itself carries it as source-only, unexercised territory. The one half that IS built is the locked-field consequence (AC-B5), because a scanned asset arriving by sync must still render read-only here. Owed to a follow-up once the scanner surface exists.
- **AC-D4** — that the catalogue-documents half is empty is held by NOT building it; there is no code to test. See [deliberate differences](#deliberate-differences).
- **AC-G4** — unauthenticated access is the shared startup gate, covered by that vertical.
- **The print action** — `Print asset label` renders and is wired to nothing: the label endpoint needs a configured label printer, which neither the probe stack nor the spec's own known gaps cover. Listed as a follow-up.

## Flags

### Spec gaps hit

1. **The CSV export ignores the screen — and this build reproduces it.** [rules › export](../../../spec/cold-chain-equipment/rules.md#export) records, as-is, that the export's filter is `classId` alone: it drops the active filters **and** the store restriction, so a user on **Cold chain › Equipment** who filters to one fridge and exports gets every cold-chain asset the server holds, other stores' included. The spec knowingly overrides [`ui-standards/list-views.md`](../../../spec/ui-standards/list-views.md#regions) for it, so the build follows the spec — but this is **the vertical's first candidate spec refinement**, and the one a reviewer should look at first. Scoping the export to the list's own filter and store would be a two-line change here; it needs a spec decision, not a build decision.
2. **The instant a picked mapping DAY travels as is unspecified.** The server derives the two mapping-date properties by formatting the entry's stored **UTC** datetime, so the day survives only if the instant sent lands on that UTC day. Sending local midnight — what the reference app does — misdates the property by one day for every user east of UTC; this build found that live (a mapping recorded on the 8th read back as the 7th) and now sends the picked day at **00:00 UTC**, clamped to now so the future-date guard cannot refuse it. `contract.md` should say which encoding is intended; a residual window (between local midnight and 00:00Z on the same day) is not representable at all in the server's date-from-an-instant derivation.
3. **The property-definition filter's shape is load-bearing and easy to get wrong.** `contract.md` says `equalAnyOrNull`; three `equalTo` clauses instead return only the properties scoped to all three of class, category and type at once — which is almost none, so the Details tab renders "No properties defined" for every asset. Built wrong first, caught live, fixed. Worth a line in the contract saying *why* the or-null form is required, not just that it is used.
4. **`ui-surface.md` S2.2 asks for two things the standard forbids.** It records, as-is, that the reference app renders read-only property rows as *disabled controls*, then says an implementation follows the standard (a plain labelled value). This build follows the standard. Flagged only because the as-is note and the instruction sit in the same paragraph and a reader could take either.

### `⚠️ VERIFY` items encountered

None — the spec carries no `⚠️ VERIFY` markers.

### C2 (real-backend) status

**Met for every anchor with a client path**, bar the two families listed as exemptions. The whole vertical was driven against a real `remote_server` on seeded data rather than covered at the logic level alone — including four real writes (a whole-draft save, two temperature mappings, and the status-modal gating) — see [Live verification](#live-verification).

### Shared code changed

Five changes reaching past this vertical, each additive:

- **`Dialog`'s body sets a fixed `--field-row-label`.** The var hook already existed in `FieldRow` for exactly this; the side and inset panels use it and a dialog did not, so every modal in the app was ragged. Affects every dialog that stacks `FieldRow`s — all of them for the better; `labelWidth="auto"` rows do not read the var and are untouched.
- **`FieldRow` gains `align`**, default `center` (unchanged). `first-line` baseline-aligns the label with a multi-line control's first line of text.
- **`Timeline` / `TimelineItem` is a new shared component** (`ui/elements/display`) filling the new [record timeline](../../../spec/ui-standards/components.md#detail-views) role — a record's history as events on a rail. Nothing else consumes it yet; the activity-log panel is the obvious next one.


- **`parseCsv` hoisted to `src/domain/reportFiles/csv.ts`**, beside the `toCsv` it is the counterpart of, and re-exported from the barrel. It was a local export of the names vertical's `propertyImport.ts`; a second importer made it shared code sitting in the wrong place. `propertyImport` and its test now import it from the barrel; behaviour is byte-identical.
- **`locations` gains an optional `filter`**, and `fetchLocations` an optional second argument that forwards it. This field needs the store's locations that **no asset holds** (`assignedToAsset: false`), which is a filter the shared query never exposed. Omitted, the read is exactly what it always was — the four existing callers pass nothing and are untouched (three had to be re-wrapped from a bare `createResource(source, fetchLocations)` to `storeId => fetchLocations(storeId)`, because a resource fetcher's second argument is its own info object).
- **No new theme tokens.** The six functional statuses wear the semantic `--success-main` / `--warning-main` / `--error-main` / `--gray-main`; the existing `--status-*` tokens name the invoice lifecycle, which these are not.

### Registry roles used

All built (no ⛔ roles): standard list screen · data table (list) · filter bar · empty state · list pagination · bulk-action bar · page-level tabs · sectioned-form columns · form section · labelled field row · read-only labelled value · short text · multi-line · number · date · checkbox · switch · multi-select autocomplete · paginated async autocomplete · single-select · autocomplete · store lookup · donor lookup · file upload zone · record-documents panel · determinate progress list · status badge · boolean cell · status-transition split button · labelled action button · async/loading button · inline banner · modal dialog · confirmation dialog · blocking alert · popover / info tooltip · modal footer buttons · action footer.

### Deliberate differences

Each follows the spec rather than the reference screen, and each is worth a reviewer's eye:

- **The Documents tab has one half, not two.** The reference app renders a "Download catalogue documents" panel beside the upload half and hands it a hardcoded empty list; `AssetCatalogueItemNode` exposes no documents field, so it can never list anything ([contract ⚠️ wire trap](../../../spec/cold-chain-equipment/contract.md#documents)). Building a permanently-empty panel would be building the bug's furniture — the behaviour it produces, no catalogue documents ever, is unchanged.
- **Read-only property rows are labelled values, not disabled boxes.** Per [detail views › never-editable fields](../../../spec/ui-standards/detail-views.md#never-editable-fields-are-never-disabled-controls); the reference app disables the control instead.
- **The Cold chain section on the Summary tab is absent, not disabled, where the assignment is not the acting store's to change.** The section *is* the assignment; an uneditable one has nothing to say.
- **Nothing.** The status-history rail was briefly left unbuilt on the grounds that the registry named no role for it — the wrong read: the standard says a control the registry doesn't name is a **new registry row**, not a reason to drop the surface. The row exists now ([record timeline](../../../spec/ui-standards/components.md#detail-views)) and the surface is built.

## Live verification

Driven with Playwright against this build on a Vite dev server proxied to a real `remote_server` (sqlite, `000_demo1_rem`), on the seeded `rspec-cce-*` assets, their locations, status entries and mappings. The list, the detail screen and all five of its tabs, the create modal in both modes, the status modal's gating chain, the cold-room split button, two real temperature mappings, and one real whole-draft save. **No console or page errors at any point.**

The save is the one worth repeating: the asset carried an asset number, three specification keys, a replacement flag, a serial, two dates and a location; the probe edited **only** the notes and confirmed; every other value came back unchanged — against a server whose update erases four of them if they are omitted.

Accessibility (C4) checked from the rendered roles, not the DOM: the list is a real `table` with 12 `columnheader`s and its rows; the detail's tabs carry `aria-selected`; **zero** controls on the detail screen lack an accessible name; the save button is `disabled` until the draft differs.

## Post-build fixes

Found by the author driving the running screens, after the gates first went green:

1. **The list's filter chips lost focus mid-word.** `FilterBar` renders its chips with `<For each={activeFilters(props.filters, props.filter)}>`, and `activeFilters` is a plain `.filter()` — so `<For>` is keyed by each definition's object **identity**, and it re-reads `props.filters` on every filter change. The list was calling `equipmentFilters(...)` inline in JSX, which built a fresh array of fresh objects per read: every keystroke remounted every chip and the box being typed into was destroyed and recreated. Now memoised, so the array is built once (`showStore` is the only thing that can rebuild it, at most once). Reproduced and re-verified live — pre-fix, focus landed on `BODY` after the first character; post-fix a whole word types through. Guarded by `list/listFilters.test.ts`.
2. **The detail screen was composed wrong for the house layout.** `<Tabs>` sat inside the page body, so the tab strip rendered as content rather than as the header's bottom edge, and both form tabs used the label-leading `FieldRow` — the DIALOG row — instead of the detail-form anatomy. Now `<Tabs>` wraps `<Page>` with `<TabList>` as the Header's last child (`src/ui/CLAUDE.md`), and both tabs are `ContentContainer size="form" padded` → `FormColumns`/`FormColumn` → `FormSection`, with each control carrying its own label and short fields paired two-up in a `FormRow` — the composition the reference verticals use. Screen-compared against the Items detail view.
3. **Every dialog in the app had a ragged label column, this vertical's three included.** `FieldRow`'s label track is sized PER ROW, so one long label ("New functional status") shoves its own control clear of the column its siblings share. The side and inset panels each set a fixed `--field-row-label` for exactly this reason; a dialog body set none. Fixed at `Dialog`'s body rather than per modal, so every modal in the app aligns. `FieldRow` also gained an opt-in `align="first-line"` — a centred label floats in the middle of an empty `TextArea` and reads as unattached to it — used by this vertical's three multi-line rows. No existing consumer moves: the default is unchanged, and this vertical is the only one that puts a `TextArea` in a `FieldRow`.
4. **The Status history tab was hand-rolled, not composed.** Entries were flat stacked text with no rail and no card, so they ran together with no telling where one ended; the user line was a bespoke name-and-icon pair, which the registry names as a C3 look-alike. The entries now sit on a [record timeline](../../../spec/ui-standards/components.md#detail-views) — the role this build added rather than skipping the surface — and each is a [detail card](../../../spec/ui-standards/components.md#detail-views) — the role for several records of the same kind stacked as cards — with the date as its title, the status chip as its header-end action, `DetailRow`s for the fields, and `UserLabel` for the user. The read-only values go through `DetailRow`'s `control` slot as plain text, **not** its `value` prop, which renders a disabled `TextField` and would break [never-editable fields are never disabled controls](../../../spec/ui-standards/detail-views.md#never-editable-fields-are-never-disabled-controls).
5. **Import and Export wore each other's arrows.** Fixed at the library rather than per call site: `ImportIcon` / `ExportIcon` are now intent-named aliases in `src/ui/icons`, deciding the direction once (import takes the arrow INTO the tray, export the one out of it — matching the reference app), and the Import/Export call sites across the app point at them. `DownloadIcon` / `UploadIcon` keep their literal file meanings — downloading a report is not an export.

## Follow-ups

- **`e2e/TESTIDS.md` owes an Equipment section**, written with the suite. The screen-specific ids this build places: `new-asset-button`, `import-equipment-button`, `create-asset-modal`, `use-catalogue-toggle`, `category-select`, `type-select`, `catalogue-item-input`, `store-input`, `asset-number-input`, `notes-input`, `import-equipment-modal`, `import-file-input`, `download-template-button`, `import-upload-error`, `import-outcome`, `dialog-button-export`, `update-status-button`, `status-split-button-main` / `-dropdown` / `-option-*`, `update-status-modal`, `status-input`, `reason-input`, `observations-input`, `status-files-input`, `temperature-mapping-modal`, `mapping-observations-input`, `serial-input`, `location-input`, `donor-input`, `needs-replacement-checkbox`, `log-event-select`, `print-label-button`, `close-button`, `delete-button`, `save-button`, `asset-not-found`. Everything else is shared.
- **The scan surface** (AC-B1–AC-B4, AC-B6, AC-B7) once the scanner path exists here.
- **`Print asset label`** is wired to nothing — it needs the label-print endpoint and a configured printer.
- **The asset catalogue is not a domain module yet.** Four consumed reads (categories, types, catalogue items, properties) live in this vertical's own `catalogue.graphql`. When **Catalogue › Assets** is built they should move to `src/domain/assetCatalogue/`, which is where the spec already says they are owned.
- Blocked on no shared component.
