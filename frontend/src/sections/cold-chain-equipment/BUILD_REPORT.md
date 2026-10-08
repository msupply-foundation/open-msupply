# Cold chain — Equipment — build report

Built from [`spec/cold-chain-equipment/`](../../../spec/cold-chain-equipment/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md).

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Two routed screens — the list and one asset's detail — serving **both** destinations (`cold-chain/equipment` and `manage/equipment`, the same tree mounted twice in `App.tsx`), plus five modals over them: create, import, status, temperature mapping, and the confirmations.

## Anchor coverage

`listState` = `list/listState.test.ts` · `createAsset` = `list/createAsset.test.ts` · `csv` = `list/equipmentToCsv.test.ts` · `assetEdit` = `detail/assetEdit.test.ts` · `properties` = `detail/assetProperties.test.ts` · `statusLog` = `detail/statusLog.test.ts` · `import` = `import/importParse.test.ts` · `equipment` = `equipment.test.ts` · `access` = `access.test.ts`. **live** = driven through the built screen against a real `remote_server` on the seeded `rspec-*` assets — see [Live verification](#live-verification).

| AC | Covered by |
| --- | --- |
| **OMS-REG-CCE-04.15** only the cold-chain class | `listState` — the class is merged in last and no user filter can widen it; **live** |
| **OMS-REG-CCE-04.16** the store restriction | `listState`; **live** (three store assets, no others) |
| **OMS-REG-CCE-07.22** delete refused across stores | _server-owned_ — see [exemptions](#exempt-but-listed) |
| **OMS-REG-CCE-06.10** update NOT refused across stores | _server-owned_ — no client path reaches it |
| **OMS-REG-CCE-05.24** locations uneditable on another store's asset | `assetEdit` — `locationIds` undefined, and the input omits it rather than sending `[]` |
| **OMS-REG-CCE-04.17** Manage lists every store | `listState` (no store filter sent) · `access` (central-gated); **live** (the destination is withheld off-central) |
| **OMS-REG-CCE-04.18** unscoped without the Store column | `listState`; the column's own gate is in `EquipmentList` |
| **OMS-REG-CCE-04.19** default order | `listState`; **live** (installation date ↑ on arrival) |
| **OMS-REG-CCE-04.20** sortable set | `listState` — `SORTABLE_KEYS` is exactly the three, and the columns read it; **live** |
| **OMS-REG-CCE-04.5 / OMS-REG-CCE-04.21 / OMS-REG-CCE-04.9** text filters | `listState` |
| **OMS-REG-CCE-04.3 / OMS-REG-CCE-04.22** category and its types | `listFilters` options are the category's; **live** (chips render) |
| **OMS-REG-CCE-04.23** a type outside the category is cleared | `listState` — TWO halves: `clearTypeOnCategoryChange` compares the filter being replaced (the loaded type list describes the category being LEFT, so it vouches for the wrong type), and `clearTypeOutsideCategory` catches a type arriving in the URL once that category's own list is ready |
| **OMS-REG-CCE-04.24 / OMS-REG-CCE-04.25** functional-status filter, and no match for an asset with none | `listState` |
| **OMS-REG-CCE-04.7 / OMS-REG-CCE-04.26 / OMS-REG-CCE-04.27** the three answers of the non-catalogue filter | `listState` (all three: `true`, `false`, and absent-on-All) · `equipment` (`isNonCatalogue`) · `listFilters` (the chip offers exactly the three) |
| **OMS-REG-CCE-04.28** empty state | _table-owned_ — the shared `emptyMessage`; **live** on a filtered-to-nothing list |
| **rules § reading the list:** page ≥ 1 row | `listState` (the client never sends < 1); the server rejection is _server-owned_ |
| **OMS-REG-CCE-04.29** row click opens the detail | **live** |
| **OMS-REG-CCE-04.30** store filter | `listFilters` (offered only where the column is) |
| **OMS-REG-CCE-05.9 / OMS-REG-CCE-05.10 / OMS-REG-CCE-05.11 / OMS-REG-CCE-05.12** identity uniqueness | _server-owned_; the create modal's own message for a duplicate asset number is in `CreateAssetModal` |
| **OMS-REG-CCE-05.13** create needs an asset number | `createAsset`; **live** (OK disabled) |
| **OMS-REG-CCE-05.14** clearing the asset number | `assetEdit` — sends `null`, never omits |
| **OMS-REG-CCE-05.1 / OMS-REG-CCE-05.3 / OMS-REG-CCE-05.2** the two create paths, and the landing | `createAsset` (both inputs); **live** (both modes render) |
| **OMS-REG-CCE-05.4** type needs a category | `createAsset`; **live** (the type select is disabled) |
| **OMS-REG-CCE-05.5** the switch clears the choice | `createAsset`, both directions; **live** |
| **OMS-REG-CCE-05.6** the opening status entry | `createAsset` (`buildCreatedLogInput`) |
| **OMS-REG-CCE-05.7** category and type fixed | `SummaryTab` renders them as labelled values; **live** |
| **OMS-REG-CCE-05.8** an unclassified insert | `createAsset` — `classId` is always sent, and the confirm gates on a catalogue item or a type |
| **OMS-REG-CCE-05.15 / OMS-REG-CCE-05.16 / OMS-REG-CCE-05.17** locations created at insert | _server-owned_ — the effect is inside `insertAsset`'s transaction; verified in the reverse-spec pass |
| **OMS-REG-CCE-05.18 / OMS-REG-CCE-05.19 / OMS-REG-CCE-05.23** assign, release, wholesale | `assetEdit`; **live** (the held location renders as a removable chip) |
| **OMS-REG-CCE-05.20/.22 / OMS-REG-CCE-05.21** the two location guards | _server-owned_; the picker makes OMS-REG-CCE-05.20/.22 unreachable — `SummaryTab` asks for `assignedToAsset: false` |
| **OMS-REG-CCE-05.22** the picker's option set | `SummaryTab` (the filter + the held ones added back) |
| **OMS-REG-CCE-06.11 / OMS-REG-CCE-06.12 / OMS-REG-CCE-06.13** the catalogue's value wins and is read-only | `properties`, incl. a catalogue key answered with `null`; **live** (18 rows, catalogue ones read-only) |
| **OMS-REG-CCE-06.14** each property once | `properties` — de-duplicated by key; **live** |
| **OMS-REG-CCE-06.15** no specification | `properties`; **live** |
| **OMS-REG-CCE-06.16** mapping dates read-only | `properties`; **live** (both render as labelled values) |
| **OMS-REG-CCE-06.17** an unanswered number is empty | `DetailsTab` (`undefined`, never `0`) — a fridge whose capacity is unknown is not a fridge that holds nothing; **live** |
| **OMS-REG-CCE-06.18** recording a status | `statusLog`; **live** |
| **OMS-REG-CCE-06.30** an entry with no status | `statusLog` (`canSubmitStatus`) — the confirming action is inert, so the rejection is unreachable from the screen |
| **OMS-REG-CCE-06.19** a status is required | `statusLog`; **live** (OK disabled) |
| **OMS-REG-CCE-06.20** the reasons offered | `statusLog`; **live** (only the two `NOT_FUNCTIONING` reasons) |
| **OMS-REG-CCE-06.21** changing the status clears the reason | `statusLog` |
| **OMS-REG-CCE-06.22** Not Functioning needs a reason | `statusLog`; **live** (OK stays disabled) |
| **OMS-REG-CCE-06.23** a mismatched reason | `statusLog` (unreachable from the screen — the picker offers one status's only) |
| **OMS-REG-CCE-06.24** a reason may demand observations | `statusLog`, incl. whitespace-only |
| **OMS-REG-CCE-06.25 / OMS-REG-CCE-06.26** never postdated, may be backdated | `statusLog` (the day comparison **and** the instant clamp); **live** (a 2020 mapping landed). The clamp leaves one window unfixed — for a user east of UTC, between their local midnight and 00:00Z the picked day has not begun in UTC at all, so no instant can both be ≤ now and land on it. Not a client bug to fix: it is what the server's date-from-an-instant derivation cannot represent (see [spec gaps](#spec-gaps-hit) 2) |
| **OMS-REG-CCE-06.27 / OMS-REG-CCE-06.28** the status is the latest entry's | _read-shape_ — `AssetNode.statusLog`; **live** (three different statuses on the list) |
| **OMS-REG-CCE-06.29** entries are never edited or deleted | _structural_ — no such mutation exists, so none is built |
| **OMS-REG-CCE-06.45** an entry's files | `StatusHistoryTab` renders them; the upload is in `UpdateStatusModal` |
| **OMS-REG-CCE-06.31 / OMS-REG-CCE-06.32** only a cold room maps | `equipment` (`isColdRoom`); **live**, both ways (split button vs plain) |
| **OMS-REG-CCE-06.33 / OMS-REG-CCE-06.34** the two mapping dates | `statusLog` (the input); **live** — a backdated mapping moved `initial_mapping_date` to `2020-01-15` and today's moved `most_recent_mapping_date` to today |
| **OMS-REG-CCE-06.35** other values survive the recalc | **live** — both storage capacities intact after two mappings |
| **OMS-REG-CCE-06.36 / OMS-REG-CCE-06.37** imported mapping dates | _server-owned_ (`insertAsset` writes the synthetic entries) |
| **OMS-REG-CCE-06.38 / OMS-REG-CCE-06.39** the history's kind filter, both ways | `statusLog` (`logKindFilter`); **live** (the cold room offers the third option) |
| **OMS-REG-CCE-06.40** a mapping never displaces the status | `statusLog` (`isMapping`) |
| **OMS-REG-CCE-06.41 / OMS-REG-CCE-06.43** documents | _shared surface_ — [`internal-orders`](../../../spec/internal-orders/ui-surface.md#documents-tab); `DocumentsTab` supplies only the table name and caps; **live** (upload, then the empty state once removed) |
| **OMS-REG-CCE-06.42** removal confirms first | `DocumentUploadPanel` (shared, see [shared code](#shared-code)); **live** — the remove button opens _Are you sure? / This will remove this document._, Cancel keeps the file and OK removes it |
| **OMS-REG-CCE-06.44** the catalogue half is empty | `DocumentsTab` (a list-only panel, `documents={[]}`); **live** — _Download catalogue documents_ beside the upload half, reading its empty state |
| **OMS-REG-CCE-06.1 / OMS-REG-CCE-06.2** the save follows the draft | `assetEdit` (twelve fields, one at a time); **live**, both directions |
| **OMS-REG-CCE-06.3** the confirmation | **live** — _Are you sure? / Are you ready to save changes?_ |
| **OMS-REG-CCE-06.4** discard on leave | `createConfirmOnLeave` (shared); wired in `EquipmentDetailView` |
| **OMS-REG-CCE-06.5 / OMS-REG-CCE-06.6** success, and the list reflecting it | **live** |
| **OMS-REG-CCE-06.8 / OMS-REG-CCE-06.7** the WHOLE draft is written | `assetEdit`; **live** — editing only the notes left the asset number, all three specification keys, the replacement flag, the serial, both dates and the location untouched |
| **OMS-REG-CCE-06.9** a rejected save | `EquipmentDetailView` stays put; the message is the global error path's |
| **OMS-REG-CCE-07.15 / OMS-REG-CCE-07.17 / OMS-REG-CCE-07.16** delete, one and many, and the return to the list | `DeleteAssetsAction` / the detail footer; **live** (the confirmation's copy) |
| **OMS-REG-CCE-07.18 / OMS-REG-CCE-07.19 / OMS-REG-CCE-07.20 / OMS-REG-CCE-07.21** delete semantics | _server-owned_ — soft delete, released locations, the resurrect; verified in the reverse-spec pass |
| **OMS-REG-CCE-07.1** only a CSV | `import`; the modal refuses before parsing — the zone's `onRejected` reports it, because a file the accept list refuses never reaches `onFiles` at all; **live** |
| **OMS-REG-CCE-07.2** a clean file parses | `import` |
| **OMS-REG-CCE-07.3 / OMS-REG-CCE-07.4 / OMS-REG-CCE-07.5** the three row errors | `import` (missing number, duplicate both ways, unmatched code) |
| **OMS-REG-CCE-07.6 / OMS-REG-CCE-07.7** soft dates | `import`, incl. the two-digit year and an impossible day |
| **OMS-REG-CCE-07.8** the status fallback | `import` |
| **OMS-REG-CCE-07.9** the run | `import` (`rowToInsertInput`); the batching is `EquipmentImportModal` |
| **OMS-REG-CCE-07.10 / OMS-REG-CCE-07.11** the failed rows and their export | `import` (`failedRowsToCsv`) — each row carries the SERVER's own message, and the file round-trips: a test parses it straight back in and asserts the dates and the replacement flag survive |
| **OMS-REG-CCE-07.12** the template | `import`, incl. that it round-trips through its own parser |
| **OMS-REG-CCE-07.13/.35** the export covers what the screen shows | `ExportEquipmentAction` sends `buildListFilter` — the same filter the list reads, store restriction included — and the list's sort, unpaginated |
| **OMS-REG-CCE-07.14** a column per specification key | `csv`, incl. the catalogue-wins rule |
| **OMS-REG-CCE-04.13/.14/.31/.32/.34–.36** scanning | _not built_ — see [exemptions](#exempt-but-listed) |
| **OMS-REG-CCE-04.35** locked fields read-only | `assetEdit` (`isLockedField`, incl. the server-admin override); `SummaryTab` renders the standing explanation |
| **OMS-REG-CCE-06.46 / OMS-REG-CCE-06.47 / OMS-REG-CCE-06.48** the activity log | _shared surface_ — `ActivityLogPanel`, passed `order="oldest-first"`; **live** (the trail renders with before/after values, oldest first) |
| **navigation gate:** read permission withheld | `access` — nav entry absent, route `denied`; the server refusal is _server-owned_ |
| **OMS-REG-CCE-05.25, OMS-REG-CCE-07.23** change permission withheld | `CreateAssetAction` / `ImportEquipmentAction` / `DeleteAssetsAction` / the detail's delete each check and explain |
| **OMS-REG-CCE-06.49** status permission withheld | `StatusActions` checks both permissions and explains |
| **startup gate:** unauthenticated | _owned by [`startup/`](../../../spec/startup/)_ |
| **precondition:** both permissions held | `access`; **live** (the whole screen) |
| **Flows** (the cases' flow scenarios) | composed of the anchors above; **live** for F5 (edit one field, lose nothing) and F3 (map a cold room) |

### Exempt but listed

- **OMS-REG-CCE-07.22, OMS-REG-CCE-06.10, rules § reading the list (server half), OMS-REG-CCE-05.9–.12, OMS-REG-CCE-05.15–.17, OMS-REG-CCE-05.20/.22, OMS-REG-CCE-05.21, OMS-REG-CCE-07.18–.21, OMS-REG-CCE-06.36, OMS-REG-CCE-06.37** — server behaviour with no client path to exercise, or an effect that happens inside a mutation's own transaction. Each was fired directly at the running server during the reverse-spec pass and is recorded in [`contract.md`](../../../spec/cold-chain-equipment/contract.md); none has a colocated test because there is nothing in this code to drive it.
- **OMS-REG-CCE-04.13/.14/.31–.36 (scanning)** — **built since**, on the shared scan layer (`src/domain/barcode`): the list's **Scan** page action (armed only when pressed), `list/assetScan.ts` (the resolver — an asset's own id, or a GS1 label via `assetFromGs1Data` — and the scanned-draft insert with its locks), and `list/createAssetScan.ts` (the flow: open a match, confirm and create a draft behind `ASSET_MUTATE_VIA_DATA_MATRIX`, inline notices). Covered by `list/assetScan.test.ts` and driven live with manual input: unknown id → notice; unmatched GS1 label → confirm → created with all four locks and a Functioning entry; same label again → opens it; a medicine GS1 label → notice, not the global error. Two deliberate departures from the current app: a label with no serial/part number (a top-level error on the wire) and a draft with no catalogue item (whose insert would fail as an unexplained storage error) both read as not found.
- **Unauthenticated access** — unauthenticated access is the shared startup gate, covered by that vertical.
- **The print action** — `Print asset label` renders and is wired to nothing: the label endpoint needs a configured label printer, which neither the probe stack nor the spec's own known gaps cover. Listed as a follow-up.

## Flags

### Spec gaps hit

1. **The CSV export ignored the screen, and this build reproduced it.** The spec recorded, as-is, that the export's filter was `classId` alone — dropping the active filters **and** the store restriction, so exporting from **Cold chain › Equipment** returned every cold-chain asset the server held, other stores' included. It was flagged here as the vertical's first candidate refinement, and the decision was taken on [#693](https://github.com/msupply-foundation/open-msupply-internal/issues/693), **in half**: the export now re-issues the list's active filters, but the team chose to keep it store-wide. So [rules › export](../../../spec/cold-chain-equipment/rules.md#export) still departs from [`ui-standards/list-views.md`](../../../spec/ui-standards/list-views.md#regions), now on the store scope alone rather than on both counts.
2. **The instant a picked mapping DAY travels as is unspecified.** The server derives the two mapping-date properties by formatting the entry's stored **UTC** datetime, so the day survives only if the instant sent lands on that UTC day. Sending local midnight — what the reference app does — misdates the property by one day for every user east of UTC; this build found that live (a mapping recorded on the 8th read back as the 7th) and now sends the picked day at **00:00 UTC**, clamped to now so the future-date guard cannot refuse it. `contract.md` should say which encoding is intended; a residual window (between local midnight and 00:00Z on the same day) is not representable at all in the server's date-from-an-instant derivation.
3. **The property-definition filter's shape is load-bearing and easy to get wrong.** `contract.md` says `equalAnyOrNull`; three `equalTo` clauses instead return only the properties scoped to all three of class, category and type at once — which is almost none, so the Details tab renders "No properties defined" for every asset. Built wrong first, caught live, fixed. Worth a line in the contract saying *why* the or-null form is required, not just that it is used.
4. **`ui-surface.md` S2.2 used to ask for two things at once** — recording, as-is, that the reference app renders read-only property rows as *disabled controls*, and in the same paragraph telling an implementation to follow the standard (a plain labelled value). A reader could take either. Resolved in the spec: the paragraph now states the standard's treatment and names the reference screen's as the difference it is.

### `⚠️ VERIFY` items encountered

None — the spec carries no `⚠️ VERIFY` markers.

### C2 (real-backend) status

**Met for every anchor with a client path**, bar the two families listed as exemptions. The whole vertical was driven against a real `remote_server` on seeded data rather than covered at the logic level alone — including four real writes (a whole-draft save, two temperature mappings, and the status-modal gating) — see [Live verification](#live-verification).

### Shared code changed

Thirteen changes reaching past this vertical, each additive:

- **`Dialog`'s body sets a fixed `--field-row-label`.** The var hook already existed in `FieldRow` for exactly this; the side and inset panels use it and a dialog did not, so every modal in the app was ragged. Affects every dialog that stacks `FieldRow`s — all of them for the better; `labelWidth="auto"` rows do not read the var and are untouched.
- **`FieldRow` gains `align`**, default `center` (unchanged). `first-line` baseline-aligns the label with a multi-line control's first line of text.
- **`DetailCard` gains `surface`**, default `raised` (unchanged). `bordered` trades the shadow for a hairline, for a long uniform run of cards; the two existing consumers keep the raised surface.
- **`DocumentUploadPanel` names its file-list columns only when there ARE files.** The header row sat outside the populated branch, so an empty list showed *File name / Date uploaded / Size* over nothing — which reads as a list that failed to load rather than one with no files in it. The panel's own spec puts the header in the populated state ([internal-orders › Documents tab](../../../spec/internal-orders/ui-surface.md#documents-tab)), and the reference screen shows none when empty.
- **`DocumentUploadPanel` confirms a removal before it happens.** The panel raises _Are you sure? / This will remove this document._ and hands `onDelete` only the confirmed removals; a cancel does nothing. The confirmation is specified once, at [`internal-orders` › S6](../../../spec/internal-orders/ui-surface.md#s6--confirmations--error-surfaces), and no consumer was asking it — so the guard on a destructive action was missing app-wide, in all five verticals that show documents. It belongs to the panel, not the caller: removing a file is the same question whatever record holds it, and a consumer cannot forget what it does not own.
- **`DocumentUploadPanel` gains `listHeading`**, default _Uploaded documents_ (unchanged). The catalogue half here lists a MODEL's documents, not the record's own, so it needs its own heading; the four existing consumers pass nothing.
- **`Dialog`'s label track is capped as a share of the row** — `min(10rem, 40%)`, not a flat `10rem`. A default-width dialog on a 320px screen is narrower than the label track plus the control's own 8rem minimum, and a fixed track there pushed the body wider than the dialog and scrolled it sideways (measured: `scrollWidth 293` vs `clientWidth 272`). The alignment holds everywhere it fits; the narrowest screens get a form that fits instead.
- **`toNameOption` is exported from the name domain module.** It already existed inside it, mapping a name node to the picker's option shape; a caller whose own record already fetched the name had no way to reach it and had to either fabricate the option's other fields or issue a second query for a label it already had. Structurally typed, so any selection carrying the fields can use it.
- **`utcDateTime` added to `intl`.** For a field LABELLED as UTC — an export column, a machine-read log line — where a localised time is wrong for every reader outside that zone. Fixed format, deliberately not locale-aware: the point of the value is to be the same for every reader.
- **`locations` (and the two volume-aware shapes beside it) select the location TYPE by name.** A picker offering cold storage must say what each place is — `+5°C` alone does not distinguish a fridge shelf from a cold room. Additive in all three (`domain/location`, `sections/stock`), and all three move together because they are passed to the same shared pickers, so one widening without the others breaks assignability.
- **`Timeline` / `TimelineItem` is a new shared component** (`ui/elements/display`) filling the new [record timeline](../../../spec/ui-standards/components.md#detail-views) role — a record's history as events on a rail. Nothing else consumes it yet; the activity-log panel is the obvious next one.
- **`parseCsv` hoisted to `src/domain/reportFiles/csv.ts`**, beside the `toCsv` it is the counterpart of, and re-exported from the barrel. It was a local export of the names vertical's `propertyImport.ts`; a second importer made it shared code sitting in the wrong place. `propertyImport` and its test now import it from the barrel; behaviour is byte-identical.
- **`locations` gains an optional `filter`**, and `fetchLocations` an optional second argument that forwards it. This field needs the store's locations that **no asset holds** (`assignedToAsset: false`), which is a filter the shared query never exposed. Omitted, the read is exactly what it always was — the four existing callers pass nothing and are untouched (three had to be re-wrapped from a bare `createResource(source, fetchLocations)` to `storeId => fetchLocations(storeId)`, because a resource fetcher's second argument is its own info object).
- **No new theme tokens.** The six functional statuses wear the semantic `--success-main` / `--warning-main` / `--error-main` / `--gray-main`; the existing `--status-*` tokens name the invoice lifecycle, which these are not.

### Registry roles used

All built (no ⛔ roles): standard list screen · data table (list) · filter bar · empty state · list pagination · bulk-action bar · page-level tabs · sectioned-form columns · form section · labelled field row · read-only labelled value · short text · multi-line · number · date · checkbox · switch · multi-select autocomplete · paginated async autocomplete · single-select · autocomplete · store lookup · donor lookup · file upload zone · record-documents panel · determinate progress list · status badge · boolean cell · status-transition split button · labelled action button · async/loading button · inline banner · modal dialog · confirmation dialog · blocking alert · popover / info tooltip · modal footer buttons · action footer.

### Deliberate differences

Each follows the spec rather than the reference screen, and each is worth a reviewer's eye:

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
- **The scan surface** (OMS-REG-CCE-04.13/.31/.32/.34, OMS-REG-CCE-04.14/.32, OMS-REG-CCE-04.36) once the scanner path exists here.
- **`Print asset label`** is wired to nothing — it needs the label-print endpoint and a configured printer.
- **The asset catalogue is not a domain module yet.** Four consumed reads (categories, types, catalogue items, properties) live in this vertical's own `catalogue.graphql`. When **Catalogue › Assets** is built they should move to `src/domain/assetCatalogue/`, which is where the spec already says they are owned.
- Blocked on no shared component.
