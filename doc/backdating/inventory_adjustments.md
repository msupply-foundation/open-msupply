# Backdating: Inventory Adjustments (#11063)

Epic: #11056
Milestone: V2.18.0

## Overview

Allow users to set a historical date when creating inventory adjustments. The adjustment is validated against historical stock levels to ensure the ledger never goes below zero at any point between the backdated date and now.

## Design

- Date can be set on new inventory adjustments (both additions and reductions)
- For reductions, the **minimum available stock** across the entire timeline from the backdated date to now is checked — this prevents temporary dips below zero even if stock was later replenished
- The `verified_datetime` is set to the backdated datetime instead of now
- Gated by the `Backdating` preference (`inventoryAdjustmentsEnabled` field)
- `maxDays` field limits how far back the date can be set
- Frontend sends `DateTime<Utc>` (full ISO datetime with timezone) — no naive date timezone ambiguity

## Backend Validation (server-side enforced)

1. Backdated datetime must be in the past (`CannotSetDateInFuture`)
2. Respects `maxDays` preference (`ExceedsMaximumBackdatingDays`)
3. For reductions: historical minimum available across the timeline must not go below zero after the adjustment (`LedgerGoesBelowZero`)

## Backend Generate

When `backdated_datetime` is set:
- Invoice is created and immediately verified as normal
- `verified_datetime` is set to the backdated datetime (via `.naive_utc()`) instead of now
- `backdated_datetime` is stored on the invoice row (via `.naive_utc()`)

## Historical Stock Check

The `get_historical_stock_line_available_quantity` function calculates the **minimum** available stock across the window from the backdated date to now:

1. Starts from the current available packs
2. Walks backwards through all stock movements in the window (sorted newest-first)
3. Undoes each movement, tracking the minimum value seen
4. Returns the minimum — this is the tightest constraint

This means a backdated reduction of N packs only succeeds if there were at least N packs available at **every point** in the timeline, not just at the backdated date.

## Files Changed

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/inventory_adjustment/adjust_existing_stock/insert.rs` | `backdated_datetime: Option<DateTime<Utc>>` field; sets `verified_datetime` and `backdated_datetime` on invoice row |
| `server/service/src/invoice/inventory_adjustment/adjust_existing_stock/validate.rs` | Validation: not future, max days, ledger check for reductions |
| `server/graphql/inventory_adjustment/mutations/insert.rs` | `backdated_datetime: Option<DateTime<Utc>>` on GraphQL input, passes through to service |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/system/src/Stock/Components/InventoryAdjustment/AdjustmentForm.tsx` | Date picker gated by `backdating.inventoryAdjustmentsEnabled`; sends `.toISOString()` |

## User Flow

1. If `Backdating` preference has `inventoryAdjustmentsEnabled`, a date picker appears on the inventory adjustment form
2. Date picker constrains to: not in the future, not before `maxDays` ago
3. User picks a date and enters the adjustment amount
4. Backend validates the reduction won't cause stock to dip below zero at any point in the timeline
5. On success, the adjustment is created with `verified_datetime` and `backdated_datetime` set to the chosen date
