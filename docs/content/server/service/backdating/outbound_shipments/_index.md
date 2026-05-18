+++
title = "Outbound shipment picked date"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Backdating: Outbound Shipment Picked Date

Issue: [#11061](https://github.com/msupply-foundation/open-msupply/issues/11061) · Epic: [#11056](https://github.com/msupply-foundation/open-msupply/issues/11056)

## Overview

Allow users to set a historical **picked date** on a new outbound shipment via `backdated_datetime`. Stock allocation then uses historical stock-on-hand — stock that arrived after the backdated date is excluded from the allocation UI.

## Design

- Can **only be set while the shipment is in New status** (before any status progression).
- Uses `backdated_datetime` on the invoice (the same field as prescriptions, so the backdating infrastructure is shared).
- If any lines exist when backdating, they are **deleted atomically** in `generate` — the user is warned with a confirmation dialog on the frontend before the request is sent.
- `handle_new_backdated_datetime()` sets `backdated_datetime` and replaces `allocated_datetime` / `picked_datetime` / `verified_datetime` with the backdated value (only if they were previously set).
- Historical stock filtering: `get_historical_stock_lines` excludes stock lines with ≤ 0 historical availability.
- Gated by the global `Backdating` preference.
- `Backdating.max_days` limits how far back the date can be set. `0` means unlimited.
- A stocktake warning is shown if a stocktake exists after the selected date.

## Backend validation (server-side enforced)

From [outbound_shipment/update/validate.rs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/invoice/outbound_shipment/update/validate.rs):

1. `Backdating.enabled` must be true → `CantBackDate("Backdating of shipments is not enabled")`
2. Invoice must be in `New` status → `CantBackDate("Can only backdate new outbound shipments")`
3. `backdated_datetime` must not be in the future → `CantBackDate("Cannot set date in the future")`
4. If `Backdating.max_days > 0`, must not be before `now - max_days` → `ExceedsMaximumBackdatingDays`

## Backend generate

When `backdated_datetime` is set ([outbound_shipment/update/generate.rs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/invoice/outbound_shipment/update/generate.rs)):

- `handle_new_backdated_datetime()` sets `invoice.backdated_datetime` and replaces allocated/picked/verified datetimes (when present) with the backdated value.
- All existing invoice lines for this invoice are added to `lines_to_trim` and deleted in the transaction, and `update_lines` is cleared so nothing is re-inserted.

## What works automatically

- **Stock allocation filtering** — `stock_out_line/insert/validate.rs` already calls `invoice_backdated_date()` and uses `get_historical_stock_line_available_quantity()`, so any invoice with `backdated_datetime` set will only allocate stock that existed at that date.
- **Historical SOH display** — `get_draft_stock_out_lines()` already passes `backdated_datetime` to `get_historical_stock_lines()`, so the allocation UI shows historical stock without further wiring.
- **Status datetime handling** — once `handle_new_backdated_datetime()` replaces the status timestamps, downstream picked/shipped/verified transitions behave naturally.

## Key files

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/outbound_shipment/update/mod.rs` | `backdated_datetime: Option<DateTime<Utc>>` field on `UpdateOutboundShipment`; `CantBackDate(String)` and `ExceedsMaximumBackdatingDays` error variants |
| `server/service/src/invoice/outbound_shipment/update/validate.rs` | Validation: preference enabled, New status only, not in future, within `max_days` |
| `server/service/src/invoice/outbound_shipment/update/generate.rs` | Calls `handle_new_backdated_datetime()`; collects all existing lines into `lines_to_trim` so they are deleted atomically; clears `update_lines` |
| `server/service/src/invoice/invoice_date_utils.rs` | Shared `handle_new_backdated_datetime()` |
| `server/graphql/invoice/src/mutations/outbound_shipment/update.rs` | `backdatedDatetime: DateTime<Utc>` on the GraphQL input; error mapping |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/invoices/src/OutboundShipment/DetailView/SidePanel/PickedDateInput.tsx` | Picked date picker in the Additional Info side panel; preference/status-dependent disabling; line-deletion confirmation; stocktake warning |
| `client/packages/invoices/src/OutboundShipment/api/api.ts` | `backdatedDatetime` passed via `toUpdate` |
| `client/packages/invoices/src/OutboundShipment/api/operations.graphql` | `backdatedDatetime` added to the `Outbound` fragment |

## User flow

1. Create a new outbound shipment (status = New).
2. If the `Backdating` preference is enabled, the **Picked date** field appears in the Additional Info side panel.
3. The date picker constrains to: not in the future, and not before `max_days` ago (when `max_days > 0`).
4. User picks a date in the past.
5. If lines already exist, a confirmation dialog warns they will be deleted.
6. If a stocktake exists on or after the chosen date, an additional warning is shown.
7. On confirm, the backend sets `backdated_datetime`, replaces status datetimes, and deletes any existing lines — all in the same transaction.
8. Allocation now shows only stock that existed at the picked date, with historical SOH values.
