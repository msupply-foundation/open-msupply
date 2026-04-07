# Daily Tally Handover

Last updated: 2026-04-07

## Scope
This note tracks the completed Daily Tally fixes and current behavior for the Afghanistan Daily Tally workflow.

## Completed Changes

### 1) Confirm flow, navigation, and state reset
- Fixed confirm flow so submission does not stay on the new form state.
- On successful confirm, route goes back to Daily Tally list.
- Duplicate-warning modal flow was separated and fixed so it does not block save unexpectedly.

### 2) Patient input and simplified UI behavior
- Daily Tally patient entry is dropdown based (not search typing).
- Simplified mode checks were updated so coverage behavior follows simplified UI expectations.

### 3) Prescription creation reliability
- Restored required prescription payload fields (including prescription date).
- Added defensive line-allocation fallback to prevent false No lines failures when batch input is incomplete.
- Added validation for tiny used values that convert to zero packs.

### 4) SOH and batch display correctness
- Batch label no longer falls back to UUID in Daily Tally display.
- SOH uses decimal-safe values.
- SOH is computed from stock line sums so decimal pack values are preserved.

### 5) Wastage adjustment (stocktake) logic
- Uses one wastage adjustment stocktake per tally confirmation, not one per line.
- Ignores zero-wastage batch lines.
- Wastage calculations now use post-prescription stock as baseline:
  counted = (available - used) - wastage
- Added snapshotNumberOfPacks explicitly on inserted stocktake lines:
  snapshot is post-prescription quantity.

### 6) Reason-option enforcement for wastage lines
- Vaccine wastage requires reason_option:
  - type OPEN_VIAL_WASTAGE
  - reason Open vial wastage (case-insensitive text match)
- Non-vaccine wastage requires reason_option:
  - type NEGATIVE_INVENTORY_ADJUSTMENT
  - reason Damaged (case-insensitive text match)
- If required reason is missing, Daily Tally stops before save and shows alert.

### 7) Failure handling and rollback behavior
- Added response checks for stocktake line insert and stocktake finalise.
- If stocktake creation/finalisation fails, temporary stocktake is deleted.
- If prescription was already created and later step fails, prescription is deleted (compensating rollback).

### 8) Daily Tally list improvements
- Added clickable Prescription column.
- Added clickable Wastage Adjustment column (renamed from Stocktake).
- Matching between prescription and wastage adjustment improved:
  - stocktake comment now stores prescription token for direct matching
  - fallback matching uses nearest timestamp with one-to-one assignment

## Files Updated
- client/packages/invoices/src/DailyTally/DailyTallyView.tsx
- client/packages/invoices/src/DailyTally/DailyTallyListView.tsx
- client/packages/plugins/afghanistan-daily-tally/frontend/latest/src/plugin.tsx

## Current Expected Example
If stock is 16 packs, prescription uses 0.5 packs, and wastage is 0.5 packs:
- Snapshot should be 15.5
- Counted should be 15.0
- Difference should be -0.5

## Quick Validation Checklist
1. Create Daily Tally with used only, confirm prescription is created.
2. Create Daily Tally with wastage only, confirm wastage adjustment is created and finalised.
3. Create Daily Tally with both used and wastage, confirm snapshot uses post-prescription value.
4. Check list view links for Prescription and Wastage Adjustment.
5. Remove required reason option in test data and confirm pre-save validation blocks save.

## Notes
- This uses client-side compensating rollback (delete on failure), not a single DB transaction across prescription and stocktake.


## Todo list
1. While showing summary if we can show similar report like daily tally report which is very clear and user can compare what they have before they confirm and can be in big modal not small

2. It seems the available stock in prescription is shown after stock take which is wrong actually stock in prescription must show before stock take happens. Eg. if we ahve stock of 20 then in prescription it must show available stock 20 and used 0.5 and then in stock take it must show 19.5 snapshot and counted packs 19 and difference is 0.5