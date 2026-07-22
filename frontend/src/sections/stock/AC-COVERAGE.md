# Stock vertical — acceptance coverage

Maps every `AC-*` in [`spec/stock/acceptance.md`](../../../spec/stock/acceptance.md) to where it is checked. Two tiers, per the conformance contract in [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md):

- **unit** — a colocated `vitest` test (node env) over the pure client-side logic the screen computes (previews, error mapping, derivations, CSV, filtering). Named here.
- **e2e** — a behavioural criterion the server enforces; belongs in the deterministic Playwright suites under [`e2e/`](../../../e2e/README.md), exercised against the **real backend** (contract C2). Not authored in this pass — flagged as the remaining test work.
- **ui** — a static surface/gating/state assertion, verified against the running implementation (contract C4) — a11y tree + presence; can be scripted in `e2e/`.

Colocated unit tests: `stockCalc.test.ts`, `stockApi.test.ts`, `stockLocations.test.ts`, `list/stockToCsv.test.ts` (35 tests).

| AC                                         | Tier           | Where                                                                                                  |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------ |
| AC-L1 only packs-on-hand                   | e2e            | `hasPacksInStore: true` always sent (`StockList.flatVariables`/`ExportStockAction`)                    |
| AC-L2 search code/name/batch               | e2e            | `search.like` (`listFilters`) — server OR match                                                        |
| AC-L3 filters + URL persist                | ui/e2e         | `listFilters` (gating), `useUrlQueryState`                                                             |
| AC-L4 single-column sort, blanks last      | e2e            | one-entry `sort`; server nulls-last                                                                    |
| AC-L5 grouped-by-item                      | **unit** + e2e | `stockCalc.test.ts` (single-or-multiple, sums); grouped fetch e2e                                      |
| AC-L6 CSV export                           | **unit**       | `stockToCsv.test.ts`                                                                                   |
| AC-L7 row opens detail                     | ui             | `StockList.openLine` → stable `/inventory/stock/:id`                                                   |
| AC-L8 server pagination                    | e2e            | `page` offset/first; DataTable pagination                                                              |
| AC-D1 tabs + VVM gating                    | ui             | `StockLineDetailView.tabs`/`showVvmTab`                                                                |
| AC-D2 quantities read-only                 | ui             | detail form (quantities as disabled inputs)                                                            |
| AC-D3 dirty-state save                     | ui/e2e         | pre-save confirm + discard prompt + busy Save; `runUpdateStockLine`                                    |
| AC-D4 invalid-location warning             | ui             | `invalidLocation` banner                                                                               |
| AC-E1 partial update                       | **unit** + e2e | `buildPatch` (only-changed) — e2e confirms server; logic in view                                       |
| AC-E2 clearing optional fields             | e2e            | nullable wrappers in `buildPatch`                                                                      |
| AC-E3 future manufacture date              | ui + e2e       | `DateField max=today` pre-block; server `CannotSetManufactureDateInFuture`                             |
| AC-E4 location exists / type               | **unit** + e2e | `stockLocations.test.ts` (picker narrowing); server `LocationDoesNotExist`/`IncorrectLocationType`     |
| AC-E5 donor/manufacturer validity          | e2e            | server-enforced; `NameSearch` role filter                                                              |
| AC-E6 barcode link/unlink                  | e2e            | plain `barcode` scalar (`""` unlinks) in `buildPatch`                                                  |
| AC-E7 location change recorded             | e2e            | server side-effect                                                                                     |
| AC-E8 edits audited                        | e2e            | `activityLogs` (`ActivityLogPanel`)                                                                    |
| AC-E9 store isolation                      | **unit** + e2e | `stockApi.test.ts` (error→message); server `StockDoesNotBelongToStore`                                 |
| AC-V1 direct set no history                | e2e            | `updateStockLine.vvmStatusId` (not offered on S2 — field read-only)                                    |
| AC-V2 history entry stamps + records       | e2e            | `insertVvmStatusLog` (S6)                                                                              |
| AC-V3 active statuses; gated               | ui             | `VvmStatusSelect` (active only) + tab/field gating                                                     |
| AC-A1 addition applies                     | e2e            | `createInventoryAdjustment` ADDITION                                                                   |
| AC-A2 reduction applies                    | e2e            | `createInventoryAdjustment` REDUCTION                                                                  |
| AC-A3 amount positive                      | **unit** + e2e | `stockApi.test.ts` (`InvalidAdjustment`→msg); server rejects ≤0                                        |
| AC-A4 no reduction below zero              | **unit** + e2e | `stockApi.test.ts` (`StockLineReducedBelowZero`→msg)                                                   |
| AC-A5 on-hold may be reduced               | e2e            | server behaviour                                                                                       |
| AC-A6 residual tolerance                   | e2e            | server behaviour                                                                                       |
| AC-A7 reason required by direction         | **unit** + e2e | `stockApi.test.ts` (`AdjustmentReasonNotProvided`→msg)                                                 |
| AC-A8 reason matches direction             | **unit** + e2e | `stockApi.test.ts` (`AdjustmentReasonNotValid`→msg); `ReasonSelect kind`                               |
| AC-A9 no active reasons → none required    | e2e            | server behaviour                                                                                       |
| AC-A10 backdating gates                    | **unit** + e2e | `stockCalc.test.ts` (backdated instant), `stockApi.test.ts` (msgs)                                     |
| AC-A11 backdated reduction window          | **unit** + e2e | `stockCalc.test.ts`; server `LedgerWouldGoBelowZero`                                                   |
| AC-A12 preview + confirm gating            | **unit**       | `stockCalc.test.ts` (`adjustedQuantity`, `wouldGoBelowZero`)                                           |
| AC-N1 new line via addition                | e2e            | `insertStockLine`                                                                                      |
| AC-N2 pack bounds                          | ui + e2e       | pre-validation (`packSize>=1`, packs≥0); server `LineInsertError`                                      |
| AC-N3 duplicate identity                   | **unit** + e2e | `stockApi.test.ts` (`StockLineAlreadyExists`→msg)                                                      |
| AC-N4 positive reason if configured        | **unit** + e2e | `stockApi.test.ts` (new-stock override→msg)                                                            |
| AC-N5 entry gating + landing               | ui             | `canConfirm` (item+packSize+packQty); navigate to S2                                                   |
| AC-R1 split math                           | **unit** + e2e | `stockCalc.test.ts` (`repackNewPacks`)                                                                 |
| AC-R2 location only when chosen            | e2e            | `newLocationId` optional; server never inherits                                                        |
| AC-R3 whole packs only                     | **unit** + e2e | `stockCalc.test.ts` (`isWholePacks`), `stockApi.test.ts` (`CannotHaveFractionalPack`)                  |
| AC-R4 limited by availability              | **unit** + e2e | `stockApi.test.ts` (`StockLineReducedBelowZero`→repack msg)                                            |
| AC-R5 repack document                      | e2e            | `insertRepack` → VERIFIED invoice                                                                      |
| AC-R6 history lists from, hides created-by | e2e            | `repacksByStockLine` (server skips created-by)                                                         |
| AC-R7 full + same-size repack              | ui + e2e       | full-repack `ConfirmDialog` + navigate; same-size via `repackNewPacks`                                 |
| AC-G1 one entry per movement, units        | e2e            | `ledger` (units, signed, running balance)                                                              |
| AC-G2 entry content                        | ui/e2e         | `LedgerPanel` columns                                                                                  |
| AC-G3 order                                | ui             | `LedgerPanel` default `datetime` desc, sortable                                                        |
| AC-P1 VVM gates                            | ui             | column/filter/tab/field gating (`stockPreferences`)                                                    |
| AC-P2 doses context                        | ui             | dose sub-note on the list (`unitsCell`), the detail quantity fields (`qtyValue`), and the adjust tiles |
| AC-P3 donor gate                           | ui             | donor field `<Show>`                                                                                   |
| AC-P4 backdate control gate                | ui             | date control `<Show>` on `backdating.inventoryAdjustmentsEnabled`                                      |
| AC-B1 modal action lifecycle               | ui             | shared Dialog lifecycle (busy submit, close on ok, in-modal error, no toast)                           |
| AC-M1 adjust & new stock permission        | ui + e2e       | Adjust suppressed without `INVENTORY_ADJUSTMENT_MUTATE`; server enforces                               |
| AC-M2 repack permission                    | ui + e2e       | New repack gated on `CREATE_REPACK`; history stays viewable                                            |
| AC-M3 VVM permission                       | ui + e2e       | New/edit VVM gated on `VIEW_AND_EDIT_VVM_STATUS`                                                       |

## Notes / deferrals

- **Campaign/program field** (S2/S3) is built on the shared `CampaignOrProgramSelect` (`src/domain/campaign`) — one mutually-exclusive choice over the two wire fields, both nullable-update wrappers sent together on S2 saves. (The live backend's `StockLineFilterInput` still lacks `campaignId` — a list-filter drift from the pinned schema, not a field concern.)
- **Barcode scan affordance** (S2) is omitted — scanner discovery is owned by [`android/`](../../../spec/android) and unavailable on web; the barcode text field is present.
- **Repack "created-by" source-batch note** (S5) is omitted — not directly queryable.
- **Item-name → catalogue link** (S2) is plain text — the catalogue route is owned elsewhere.
- The **behavioural (e2e) rows are the remaining test work**: authoring Playwright specs under `e2e/` that drive the running app against the real backend, per the test-id contract already emitted by the screens.
