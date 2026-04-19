# Backdating: Inventory Adjustments (#11063)

Epic: #11056
Milestone: V2.18.0

## Overview

Allow users to set a historical date when creating inventory adjustments. The adjustment is validated against historical stock levels to ensure the ledger never goes below zero at any point between the backdated date and now. The UI shows historical available packs and packs on hand for the selected date.

## Design

- Date can be set on new inventory adjustments (both additions and reductions)
- For reductions, the **minimum available stock** across the entire timeline from the backdated date to now is checked — this prevents temporary dips below zero even if stock was later replenished
- The `verified_datetime` is set to the backdated datetime instead of now
- Gated by the `Backdating` preference (`inventoryAdjustmentsEnabled` field)
- `maxDays` field limits how far back the date can be set
- Frontend sends `DateTime<Utc>` (full ISO datetime with timezone) — no naive date timezone ambiguity
- When a backdated date is selected, the adjustment stats update to show **historical** values:
  - **Available packs** shows `min_available` — the minimum available across the timeline (safe reduction limit)
  - **Packs on hand** shows the actual total at the historical date
  - The "Current" label changes to "Historical"

## Backend Validation (server-side enforced)

1. `Backdating` preference must have `inventoryAdjustmentsEnabled` (`BackdatingNotEnabled`)
2. Backdated datetime must be in the past (`CannotSetDateInFuture`)
3. Respects `maxDays` preference (`ExceedsMaximumBackdatingDays`)
4. For reductions: historical minimum available across the timeline must not go below zero after the adjustment (`LedgerGoesBelowZero`)

## Backend Generate

When `backdated_datetime` is set:
- Invoice is created and immediately verified as normal
- `verified_datetime` is set to the backdated datetime (via `.naive_utc()`) instead of now
- `backdated_datetime` is stored on the invoice row (via `.naive_utc()`)

## Historical Stock Check

The `get_historical_stock_lines_available_quantity` function returns two values per stock line:

- **`min_available`**: The minimum available stock at any point in the window from the backdated date to now. Used for validation (reduction must not exceed this) and displayed as "Available packs" in the UI.
- **`total`**: The actual total packs on hand at the historical date. Displayed as "Packs on hand" in the UI.

The algorithm:
1. Starts from current available/total packs
2. Walks backwards through all stock movements in the window (sorted newest-first)
3. Undoes each movement, tracking both the running total and the minimum available seen
4. Returns both values

This means a backdated reduction of N packs only succeeds if there were at least N packs available at **every point** in the timeline, not just at the backdated date.

## Files Changed

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/stock_line/historical_stock.rs` | `HistoricalQuantities` struct with `min_available` and `total`; `get_historical_stock_lines` now sets both `available_number_of_packs` and `total_number_of_packs` |
| `server/service/src/invoice/inventory_adjustment/adjust_existing_stock/insert.rs` | `backdated_datetime: Option<DateTime<Utc>>` field; `BackdatingNotEnabled` error; sets `verified_datetime` and `backdated_datetime` on invoice row |
| `server/service/src/invoice/inventory_adjustment/adjust_existing_stock/validate.rs` | Validation: preference enabled, not future, max days, ledger check for reductions |
| `server/graphql/inventory_adjustment/mutations/insert.rs` | `backdated_datetime: Option<DateTime<Utc>>` on GraphQL input, passes through to service |
| `server/service/src/invoice_line/get_draft_outbound_lines.rs` | Updated to use `HistoricalQuantities.min_available` |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/system/src/Stock/Components/InventoryAdjustment/AdjustmentForm.tsx` | Date picker gated by `backdating.inventoryAdjustmentsEnabled`; sends `.toISOString()` |
| `client/packages/system/src/Stock/Components/InventoryAdjustment/InventoryAdjustmentModal.tsx` | Fetches `historicalStockLines` when backdated date selected; passes historical values and loading state to stats |
| `client/packages/system/src/Stock/Components/InventoryAdjustment/AdjustmentStats.tsx` | Shows historical available/total when backdating; "Current" label becomes "Historical"; loading state support |
| `client/packages/system/src/Item/api/hooks/useHistoricalStockLines/useHistoricalStockLines.tsx` | Added `enabled` and `keepPreviousData` options |

## User Flow

1. If `Backdating` preference has `inventoryAdjustmentsEnabled`, a date picker appears on the inventory adjustment form
2. Date picker constrains to: not in the future, not before `maxDays` ago
3. User picks a date — stats update to show historical available packs and packs on hand, label changes to "Historical"
4. User enters the adjustment amount — "Adjusted" column updates to show projected value
5. If reduction would cause stock to dip below zero at any point in the timeline, error shown and save disabled
6. Backend validates the reduction against historical minimum available
7. On success, the adjustment is created with `verified_datetime` and `backdated_datetime` set to the chosen date
