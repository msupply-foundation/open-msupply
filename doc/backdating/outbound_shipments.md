# Backdating: Outbound Shipment Picked Date (#11061)

Epic: #11056
Milestone: V2.18.0

## Overview

Allow users to set a historical **Picked date** on new outbound shipments via `backdated_datetime`. Stock allocation automatically filters by historical availability — stock that arrived after the backdated date is excluded from the allocation UI.

## Design

- Can **only be set on New** outbound shipments (before any status progression)
- Uses `backdated_datetime` (same field as prescriptions) to reuse existing backdating infrastructure
- If lines exist when backdating, they are **deleted atomically** (user is warned with confirmation dialog)
- `handle_new_backdated_datetime()` sets `backdated_datetime` and replaces allocated/picked/verified status timestamps
- Historical stock filtering: `get_historical_stock_lines` excludes stock lines with <= 0 historical availability
- Gated by the `AllowBackdatingOfShipments` global preference (#11060)
- `MaximumBackdatingDays` preference limits how far back the date can be set
- Stocktake warning shown if a stocktake exists after the selected date

## Backend Validation (server-side enforced)

1. `AllowBackdatingOfShipments` preference must be enabled (`CantBackDate`)
2. Shipment must be in New status (`CantBackDate`)
3. Date must not be in the future (`CantBackDate`)
4. Respects `MaximumBackdatingDays` preference (`ExceedsMaximumBackdatingDays`)

## Backend Generate

When backdated_datetime is set:
- `invoice.backdated_datetime` is updated
- `invoice.allocated_datetime`, `invoice.picked_datetime`, and `invoice.verified_datetime` are replaced with the backdated date (if they were set)
- Existing invoice lines are deleted if any exist (validated/warned on frontend, deleted atomically in generate)

## What works automatically

- **Stock allocation filtering**: `stock_out_line/insert/validate.rs` already calls `invoice_backdated_date()` and uses `get_historical_stock_line_available_quantity()` — works for any invoice with `backdated_datetime`
- **Historical SOH display**: `get_draft_stock_out_lines()` already passes `backdated_datetime` to `get_historical_stock_lines()` — allocation UI shows historical stock automatically
- **Status datetime handling**: `handle_new_backdated_datetime()` replaces picked/allocated/verified timestamps

## Files Changed

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/outbound_shipment/update/mod.rs` | `backdated_datetime: Option<NaiveDate>` field; `CantBackDate` and `ExceedsMaximumBackdatingDays` error variants |
| `server/service/src/invoice/outbound_shipment/update/validate.rs` | Validation: preference enabled, New status only, not future, max backdating days |
| `server/service/src/invoice/outbound_shipment/update/generate.rs` | Calls `handle_new_backdated_datetime()`, deletes existing lines atomically |
| `server/service/src/invoice/invoice_date_utils.rs` | Shared `handle_new_backdated_datetime()` (moved from prescription module); `is_date_in_future()` helper |
| `server/graphql/invoice/src/mutations/outbound_shipment/update.rs` | `backdated_datetime: Option<NaiveDate>` on GraphQL input, error mapping |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/invoices/src/OutboundShipment/DetailView/SidePanel/PickedDateInput.tsx` | Picked date picker in Additional Info section with preference/status-dependent disabling, line deletion confirmation, stocktake warning |
| `client/packages/invoices/src/OutboundShipment/api/api.ts` | `backdatedDatetime` in `toUpdate` parser |
| `client/packages/invoices/src/OutboundShipment/api/operations.graphql` | `backdatedDatetime` added to `Outbound` fragment |

## User Flow

1. Create a new outbound shipment (status = New)
2. If `AllowBackdatingOfShipments` preference is enabled, "Picked date" field appears in Additional Info (side panel)
3. Date picker constrains to: not in the future, not before `MaximumBackdatingDays` ago
4. User picks a date in the past
5. If lines exist, confirmation dialog warns they will be deleted
6. If stocktake exists after the chosen date, additional warning shown
7. On confirm, backend sets `backdated_datetime`, replaces status timestamps, deletes any existing lines
8. Allocation UI now shows only stock that existed at the picked date, with historical SOH values
