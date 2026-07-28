# Stock vertical — behaviour coverage (C1 traceability)

Maps every behaviour in [`spec/stock/cases/`](../../../spec/stock/cases/) to where it is verified, per the conformance contract in [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md#the-conformance-contract). The retired `AC-*` criteria and where each went are in [`spec/stock/acceptance.md`](../../../spec/stock/acceptance.md).

Tiers:

- **unit** — a colocated `vitest` test (node env) over the pure client-side logic the screen computes (previews, error mapping, derivations, CSV, picker narrowing). Named here.
- **e2e** — a behavioural outcome the server enforces; belongs in the deterministic Playwright suites under [`e2e/`](../../../e2e/README.md), exercised against the **real backend** (contract C2). **Not authored yet** — this is the remaining test work, tracked as step 4 of [`spec/stock/TESTING-PLAN.md`](../../../spec/stock/TESTING-PLAN.md).
- **ui** — a static surface/gating/state assertion, verified against the running implementation (contract C4) — a11y tree + presence; scriptable in `e2e/`.
- **exempt** — out of scope, with the reason stated (C1 requires these be named, never silently dropped).

Colocated unit tests: `stockCalc.test.ts`, `stockApi.test.ts`, `stockLocations.test.ts`, `detail/stockEdit.test.ts`, `list/newStockEntry.test.ts`, `list/stockToCsv.test.ts` (68 tests).

## OMS-REG-INV-02 — View Stock and Stock Line Details

| Behaviour                                       | Tier           | Where                                                                                                                      |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.1` packs-on-hand only                         | e2e            | `hasPacksInStore: true` always sent (`StockList.variables` / `ExportStockAction`)                                          |
| `.2` search by code                             | e2e            | `search.like` (`listFilters`) — server OR match                                                                            |
| `.3` search by name                             | e2e            | as `.2`                                                                                                                    |
| `.21` search by batch                           | e2e            | as `.2`                                                                                                                    |
| `.4` location filter                            | e2e            | `location.codeOrName.like` (`listFilters`)                                                                                 |
| `.5` expiry range filter                        | e2e            | `expiryDate` from/to (`listFilters`)                                                                                       |
| `.22` master-list filter                        | e2e            | `masterList.id.equalTo` (`listFilters`), gated on the store having master lists                                            |
| `.6` filters combine                            | e2e            | server AND of the filter object                                                                                            |
| `.7` clearing restores                          | e2e            | `stripEmpty` drops cleared keys                                                                                            |
| `.23` filters persist in URL                    | ui + e2e       | `useUrlQueryState`                                                                                                         |
| `.24` single-column sort                        | e2e            | one-entry `sort` variable                                                                                                  |
| `.25` ascending dates, blanks last              | e2e            | server nulls-last                                                                                                          |
| `.19` rows-per-page                             | e2e            | `first`/`page` offset; `DataTable` pagination                                                                              |
| `.20` no duplicate/skipped rows                 | e2e            | as `.19`                                                                                                                   |
| `.26` card header identity                      | ui             | `CARD_GROUPS` + per-column `headerPosition` (`StockList.columns`)                                                          |
| `.27` card always-shown fields                  | ui             | per-column `cardGroup: 'shown'`                                                                                            |
| `.28` More-details disclosure                   | ui             | per-column `cardGroup: 'more'`                                                                                             |
| `.29` cards follow column visibility            | ui             | `DataTable` card view reads the visible column set                                                                         |
| `.30` cards below the breakpoint                | ui             | `DataTable` responsive switch                                                                                              |
| `.8` export produces a CSV                      | **unit** + e2e | `list/stockToCsv.test.ts`; the all-pages fetch is e2e                                                                      |
| `.9` cancelling the export dialog               | **exempt**     | current app only — this app's export downloads directly via `saveBlob`, with no chooser to cancel. Out of the shared suite |
| `.10` row opens detail at a stable URL          | ui             | `StockList.openLine` → `/inventory/stock/:id`                                                                              |
| `.31` Details / Log / Ledger tabs               | ui             | `StockLineDetailView.tabs`                                                                                                 |
| `.11` pack quantity shown                       | ui             | detail form                                                                                                                |
| `.12` cost price shown                          | ui             | detail form                                                                                                                |
| `.13` batch details shown                       | ui             | detail form                                                                                                                |
| `.32` quantities read-only                      | ui             | quantities rendered as disabled inputs                                                                                     |
| `.33` attributes editable                       | ui             | detail form field set                                                                                                      |
| `.38` invalid-location warning                  | **unit** + ui  | `detail/stockEdit.test.ts` (`invalidLocation`); the banner is the surface                                                  |
| `.34` Save disabled until dirty                 | ui             | dirty-state gate on the Save button                                                                                        |
| `.35` pre-save confirmation + busy              | ui             | `ConfirmDialog` → `doSave`; async Save button                                                                              |
| `.15` a saved edit persists                     | e2e            | `updateStockLine`                                                                                                          |
| `.16` re-opened line shows saved values         | e2e            | refetch after save                                                                                                         |
| `.36` failed save keeps edits, inline, no toast | ui + e2e       | inline failure notice; `stockApi` never toasts                                                                             |
| `.14` cancel closes without saving              | ui             | Cancel/Close footer button                                                                                                 |
| `.37` discard prompt when dirty                 | ui             | discard `ConfirmDialog`                                                                                                    |
| `.39` partial update                            | **unit** + e2e | `detail/stockEdit.test.ts` (`buildPatch` sends only changed fields); e2e confirms the server                               |
| `.40` clearing optional fields                  | **unit** + e2e | `detail/stockEdit.test.ts` (nullable wrappers; a cleared field distinguished from an untouched one)                        |
| `.17` On Hold on records the batch as held      | **unit** + e2e | `detail/stockEdit.test.ts` (`onHold` sent only when toggled); server persists                                              |
| `.18` On Hold off records it as no longer held  | **unit** + e2e | as `.17` — the same patch field, the other direction                                                                       |
| `.41` future manufacture date rejected          | ui + e2e       | `DateField max=today` pre-block; server `CannotSetManufactureDateInFuture`                                                 |
| `.42` unknown location rejected                 | e2e            | server `LocationDoesNotExist`                                                                                              |
| `.43` wrong location type rejected              | **unit** + e2e | `stockLocations.test.ts` (picker narrowing); server `IncorrectLocationType`                                                |
| `.44` donor / manufacturer validity             | e2e            | server-enforced; `NameSearch` role filter                                                                                  |
| `.45` barcode links the GTIN                    | **unit** + e2e | `detail/stockEdit.test.ts` (plain scalar sent); the GTIN association is server-side                                        |
| `.46` emptied barcode unlinks                   | **unit** + e2e | `detail/stockEdit.test.ts` (`""` sent, not a null wrapper)                                                                 |
| `.47` location change recorded                  | e2e            | server side-effect (location movement)                                                                                     |
| `.48` edits audited with a diff                 | e2e            | `activityLogs` (`ActivityLogPanel`)                                                                                        |
| `.49` store isolation                           | **unit** + e2e | `stockApi.test.ts` (`StockDoesNotBelongToStore` → message); server-enforced                                                |
| `.50` ledger entry content                      | ui + e2e       | `LedgerPanel` columns                                                                                                      |
| `.51` newest-first default                      | ui             | `LedgerPanel` default `datetime` desc                                                                                      |
| `.52` ledger columns sortable                   | ui             | `LedgerPanel` sort                                                                                                         |
| `.53` ledger read-only                          | ui             | no edit affordance on the panel                                                                                            |
| `.54` dose context                              | **unit** + ui  | `stockCalc.test.ts` (`doseEquivalent` — the gate and the arithmetic); the suffix is the surface                            |
| `.55` donor field gate                          | ui             | donor field `<Show>` on `allowTrackingOfStockByDonor`                                                                      |

## OMS-REG-SMV-02 — Ledger Updates via Inventory Adjustment

| Behaviour                                      | Tier           | Where                                                                                                                                                                                                                                  |
| ---------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.1` addition raises the quantity              | e2e            | `createInventoryAdjustment` ADDITION                                                                                                                                                                                                   |
| `.2` reflected in the views                    | e2e            | list / catalogue refetch                                                                                                                                                                                                               |
| `.3` ledger entry of type Inventory Adjustment | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.4` positive signed quantity                  | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.16` finalised addition document              | e2e            | server document, verified now                                                                                                                                                                                                          |
| `.9` reduction lowers the quantity             | e2e            | `createInventoryAdjustment` REDUCTION                                                                                                                                                                                                  |
| `.11` reflected in the views                   | e2e            | as `.2`                                                                                                                                                                                                                                |
| `.12` negative signed quantity                 | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.17` finalised reduction document             | e2e            | as `.16`                                                                                                                                                                                                                               |
| `.18` non-positive amount rejected             | **unit** + e2e | `stockApi.test.ts` (`InvalidAdjustment` → message); server rejects ≤ 0                                                                                                                                                                 |
| `.19` no reduction below zero                  | **unit** + e2e | `stockApi.test.ts` (`StockLineReducedBelowZero` → message)                                                                                                                                                                             |
| `.20` on-hold stock may be reduced             | e2e            | server behaviour                                                                                                                                                                                                                       |
| `.21` residual tolerance                       | e2e            | server behaviour (0.001 packs)                                                                                                                                                                                                         |
| `.10` reason required by direction             | **unit** + e2e | `stockApi.test.ts` (`AdjustmentReasonNotProvided` → message)                                                                                                                                                                           |
| `.22` wrong-direction reason rejected          | **unit** + e2e | `stockApi.test.ts` (`AdjustmentReasonNotValid` → message); `ReasonSelect kind`                                                                                                                                                         |
| `.23` wastage reasons on a reduction           | e2e            | server behaviour; `ReasonSelect kind`                                                                                                                                                                                                  |
| `.24` no active reasons → none required        | e2e            | server behaviour                                                                                                                                                                                                                       |
| `.25` backdating preference gate               | **unit** + e2e | `stockApi.test.ts` (`BackdatingNotEnabled` → message)                                                                                                                                                                                  |
| `.26` future date rejected                     | **unit** + e2e | `stockApi.test.ts` (`CannotSetDateInFuture` → message)                                                                                                                                                                                 |
| `.27` beyond max-days rejected                 | **unit** + e2e | `stockApi.test.ts` (`ExceedsMaximumBackdatingDays` → message)                                                                                                                                                                          |
| `.28` backdated reduction window guard         | **unit** + e2e | `stockApi.test.ts` (`LedgerWouldGoBelowZero` → message); server checks the window minimum                                                                                                                                              |
| `.29` stamped at the backdated moment          | **unit** + e2e | `stockCalc.test.ts` (`backdatedDatetime` — day end for a reduction, day start for an addition)                                                                                                                                         |
| `.30` preview of current → adjusted            | **unit**       | `stockCalc.test.ts` (`adjustedQuantity`, `signedAdjustment`)                                                                                                                                                                           |
| `.31` confirm disabled at zero                 | **unit** + ui  | `stockCalc.test.ts`; `AdjustModal` gate                                                                                                                                                                                                |
| `.32` confirm disabled below zero              | **unit** + ui  | `stockCalc.test.ts` (`wouldGoBelowZero`); inline banner                                                                                                                                                                                |
| `.5` new line from an addition                 | e2e            | `insertStockLine`                                                                                                                                                                                                                      |
| `.6` pack quantity mandatory                   | ui + e2e       | `canConfirm` (`NewStockModal`)                                                                                                                                                                                                         |
| `.7` new line quantity matches entry           | e2e            | `insertStockLine`                                                                                                                                                                                                                      |
| `.8` ledger entry for the new line             | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.33` introduced by a finalised addition       | e2e            | server document                                                                                                                                                                                                                        |
| `.34` pack bounds                              | **unit** + e2e | `list/newStockEntry.test.ts` (`packSizeValid`, `packsValid`); server `LineInsertError`                                                                                                                                                 |
| `.35` duplicate identity rejected              | **unit** + e2e | `stockApi.test.ts` (`StockLineAlreadyExists` → message)                                                                                                                                                                                |
| `.36` positive reason required if configured   | **unit** + e2e | `list/newStockEntry.test.ts` (the gate), `stockApi.test.ts` (the rejection → message)                                                                                                                                                  |
| `.37` confirm gating                           | **unit** + ui  | `list/newStockEntry.test.ts` (`canConfirmNewStock`)                                                                                                                                                                                    |
| `.38` navigates to the new line                | ui             | navigate to `/inventory/stock/:id`                                                                                                                                                                                                     |
| `.13` one entry per movement                   | e2e            | `ledger` across every movement source                                                                                                                                                                                                  |
| `.14` signed unit quantities                   | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.15` running balance walks                    | e2e            | `ledger`                                                                                                                                                                                                                               |
| `.45` ledger balance equals stock on hand      | e2e            | **no test yet** — minted from exploratory run 2026-07-29 (STOCK-20260729-F2's gap candidate); assert on a line the test creates and moves, never on pre-existing stock (the reference datafile carries a historical mis-ledgering bug) |
| `.39` dose context on the adjust tiles         | **unit** + ui  | `stockCalc.test.ts` (`doseEquivalent`); the tiles are the surface                                                                                                                                                                      |
| `.40` donor field in new stock                 | ui             | donor field `<Show>` (`NewStockModal`)                                                                                                                                                                                                 |
| `.41` backdate control gate                    | ui             | date control `<Show>` on `backdating.inventoryAdjustmentsEnabled`                                                                                                                                                                      |
| `.42` adjustment permission                    | ui + e2e       | Adjust suppressed without `INVENTORY_ADJUSTMENT_MUTATE`; server enforces                                                                                                                                                               |
| `.43` modal busy → closes on success           | ui             | shared Dialog lifecycle                                                                                                                                                                                                                |
| `.44` modal keeps error inline, no toast       | ui + **unit**  | shared Dialog lifecycle; `stockApi.test.ts` (identifier → message key)                                                                                                                                                                 |

## OMS-REG-SMV-08 — Stock Changes via Repack

| Behaviour                                          | Tier           | Where                                                                                 |
| -------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `.1` original leaves the list                      | e2e            | `insertRepack`                                                                        |
| `.2` new line at the new pack size                 | e2e            | `insertRepack`                                                                        |
| `.3` negative ledger entry (original)              | e2e            | `ledger`                                                                              |
| `.4` positive ledger entry (new)                   | e2e            | `ledger`                                                                              |
| `.5` net balance unchanged                         | e2e            | `ledger`                                                                              |
| `.21` navigation offered after a full repack       | ui             | full-repack `ConfirmDialog` + navigate (`RepackModal`)                                |
| `.6` remainder stays at the original size          | e2e            | `insertRepack`                                                                        |
| `.7` new line holds the repacked packs             | **unit** + e2e | `stockCalc.test.ts` (`repackNewPacks`)                                                |
| `.8` total units unchanged                         | e2e            | server split                                                                          |
| `.9` negative entry for the repacked quantity only | e2e            | `ledger`                                                                              |
| `.12` prices and volume scale with the ratio       | e2e            | server split                                                                          |
| `.13` batch / expiry / attributes inherited        | e2e            | server split                                                                          |
| `.14` new line takes the chosen location           | e2e            | `newLocationId`                                                                       |
| `.15` no location when none chosen                 | e2e            | server never inherits                                                                 |
| `.22` same-size repack relocates                   | **unit** + e2e | `stockCalc.test.ts` (`repackNewPacks` conserves the count)                            |
| `.16` fractional conversion rejected               | **unit** + e2e | `stockCalc.test.ts` (`isWholePacks`), `stockApi.test.ts` (`CannotHaveFractionalPack`) |
| `.17` limited by availability                      | **unit** + e2e | `stockApi.test.ts` (`StockLineReducedBelowZero` → repack message)                     |
| `.18` finalised repack document                    | e2e            | `insertRepack` → VERIFIED invoice                                                     |
| `.19` history lists repacks-from                   | e2e            | `repacksByStockLine`                                                                  |
| `.20` created-by repack hidden                     | e2e            | server skips created-by                                                               |
| `.10` repack permission                            | ui + e2e       | New repack gated on `CREATE_REPACK`                                                   |
| `.11` history viewable without it                  | ui + e2e       | history stays rendered                                                                |

## OMS-REG-INV-06 — VVM Status Management on Stock Lines

| Behaviour                                    | Tier     | Where                                                                   |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `.1` direct set changes the status           | e2e      | `updateStockLine.vvmStatusId` (new-stock path)                          |
| `.2` direct set writes no history            | e2e      | `vvmStatusLogs` stays empty                                             |
| `.3` entry records author and time           | e2e      | `insertVvmStatusLog`                                                    |
| `.4` entry stamps the line                   | e2e      | `insertVvmStatusLog` side-effect                                        |
| `.5` comment editable                        | e2e      | `updateVvmStatusLog`                                                    |
| `.6` status not editable                     | ui       | status control fixed in edit mode (`VvmStatusEntryModal`)               |
| `.7` only active statuses offered            | ui       | `VvmStatusSelect` (active only)                                         |
| `.8` history tab gate                        | ui       | `showVvmTab` (vaccine + `manageVvmStatusForStock`)                      |
| `.9` list column gate                        | ui       | column gating on `stockPreferences`                                     |
| `.10` list filter gate                       | ui       | `listFilters` field gating                                              |
| `.13` filtering by VVM status                | e2e      | `vvmStatusId` filter                                                    |
| `.11` status field gate, read-only on detail | ui       | field `<Show>` on either preference; read-only in `StockLineDetailView` |
| `.12` VVM permission                         | ui + e2e | New/edit gated on `VIEW_AND_EDIT_VVM_STATUS`; server enforces           |

## Summary

| Tier                                                | Behaviours             |
| --------------------------------------------------- | ---------------------- |
| unit (colocated vitest, alone or with another tier) | 33                     |
| e2e (server-enforced outcome)                       | 95                     |
| ui (surface / gating / state)                       | 47                     |
| exempt                                              | 1 (`OMS-REG-INV-02.9`) |

Counts overlap — a behaviour verified at two tiers is listed under both. Total distinct behaviours: **135**.

## Notes / deferrals

- **The e2e rows are the remaining test work**: authoring `e2e/specs/stock-regression.spec.ts` against the running app and the real backend, per the test-id contract. Sequenced in [`spec/stock/TESTING-PLAN.md`](../../../spec/stock/TESTING-PLAN.md).
- **Grouped-by-item view** — deferred ([D63](../../../spec/DIVERGENCES.md)); no behaviour exists for it, and the retired `AC-L5` holds the reservation.
- **Campaign/program field** (S2/S3) is built on the shared `CampaignOrProgramSelect` (`src/domain/campaign`) — one mutually-exclusive choice over the two wire fields, both nullable-update wrappers sent together on S2 saves. (The live backend's `StockLineFilterInput` still lacks `campaignId` — a list-filter drift from the pinned schema, not a field concern.) No behaviour asserts the mutual exclusion; it is carried as a gap probe in [`exploratory/workflows/stock.md`](../../../exploratory/workflows/stock.md).
- **Barcode scan affordance** (S2) is omitted — scanner discovery is owned by [`android/`](../../../spec/android) and unavailable on web; the barcode text field is present.
- **Repack "created-by" source-batch note** (S5) is omitted — not directly queryable.
- **Item-name → catalogue link** (S2) is plain text — the catalogue route is owned elsewhere.
- **Item-variant selection** in the new-stock flow has no behaviour; carried as a gap probe in the exploratory workflow.
