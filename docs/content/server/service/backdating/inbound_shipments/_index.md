+++
title = "Inbound shipment received date"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Backdating: Inbound Shipment Received Date

Issue: [#11062](https://github.com/msupply-foundation/open-msupply/issues/11062) · Epic: [#11056](https://github.com/msupply-foundation/open-msupply/issues/11056)

## Overview

Allow users to backdate the **received date** on an inbound shipment that has already been received. The date can only be moved earlier, never forward — this prevents ledger inconsistencies from stock being "ungrown" into the future.

## Design

- The received date can **only be moved earlier** than the current received date. Forward moves are rejected.
- **No lines are deleted** — existing invoice lines and resulting stock lines are preserved.
- Other invoice datetimes (`shipped_datetime`, `delivered_datetime`, `created_datetime`) are **intentionally left untouched**. The resulting out-of-order dates are the signal that the received date was backdated.
- Location movements belonging to stock lines from this invoice have their `enter_datetime` updated to the new received date; if `exit_datetime` was set, it is also updated.
- Only editable when the shipment is in `Received` or `Verified` status.
- Gated by the global `Backdating` preference (`enabled` + `max_days`).
- The frontend sends `DateTime<Utc>` (full ISO datetime with timezone via `.toISOString()`) so there is no naive-date timezone ambiguity.
- On backdating, an `InvoiceDateBackdated` activity log entry is written with the old and new received dates.
- The user is shown a confirmation warning that the change is one-way before it is applied.
- A stocktake warning is shown if a stocktake exists after the selected date.

## Backend validation (server-side enforced)

From [inbound_shipment/update/validate.rs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/invoice/inbound_shipment/update/validate.rs):

1. `Backdating.enabled` must be true → `BackdatingNotEnabled`
2. Invoice status must be `Received` or `Verified` → `CanOnlyBackdateReceivedShipments`
3. New datetime (UTC) must be strictly earlier than the current `received_datetime` → `CannotMoveReceivedDateForward`
4. If `Backdating.max_days > 0`, must not be before `now - max_days` → `ExceedsMaximumBackdatingDays`

## Backend generate

From [inbound_shipment/update/generate.rs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/invoice/inbound_shipment/update/generate.rs):

- `invoice.received_datetime` is updated (stored as `NaiveDateTime` via `.naive_utc()`).
- All stock lines linked to invoice lines of this invoice (StockIn lines) are queried, and every `location_movement` for those stock lines has its `enter_datetime` (and `exit_datetime`, when set) updated to the new received date. These are returned as `backdate_location_movements` and upserted in the transaction.
- `shipped_datetime`, `delivered_datetime`, and `created_datetime` are **not** modified.

The `InvoiceDateBackdated` activity log entry is written at the top-level update in [inbound_shipment/update/mod.rs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/invoice/inbound_shipment/update/mod.rs), capturing the pre-update `received_datetime` and the new value (both formatted as `%Y-%m-%d`).

## Key files

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/inbound_shipment/update/mod.rs` | `received_datetime: Option<DateTime<Utc>>` field; new error variants; upsert of `backdate_location_movements`; `InvoiceDateBackdated` activity log entry |
| `server/service/src/invoice/inbound_shipment/update/validate.rs` | Validation: preference enabled, received/verified status, strictly earlier (UTC datetime comparison), within `max_days` |
| `server/service/src/invoice/inbound_shipment/update/generate.rs` | Updates `received_datetime` via `.naive_utc()`; collects location movement rows to update `enter_datetime` / `exit_datetime` |
| `server/repository/src/db_diesel/activity_log_row.rs` | `InvoiceDateBackdated` activity log type |
| `server/graphql/types/src/types/activity_log.rs` | `InvoiceDateBackdated` GraphQL enum variant |
| `server/graphql/invoice/src/mutations/inbound_shipment/update.rs` | `receivedDatetime: DateTime<Utc>` on the GraphQL input; error mapping |
| `server/repository/src/migrations/v2_18_00/add_invoice_date_backdated_activity_log_type.rs` | Postgres migration for the `InvoiceDateBackdated` enum value |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/invoices/src/InboundShipment/DetailView/ReceivedDateInput.tsx` | Received date picker in the toolbar; sends `DateTime` via `.toISOString()`; `maxDate` is the current received date (server-side check enforces strictly earlier) |
| `client/packages/invoices/src/InboundShipment/api/api.ts` | `receivedDatetime` in `toUpdate` |
| `client/packages/invoices/src/InboundShipment/api/operations.graphql` | `stocktakeCountAfterDate` query for the stocktake warning |
| `client/packages/common/src/authentication/api/operations.graphql` | `backdating` preference query (combined struct) |
| `client/packages/common/src/intl/locales/en/common.json` | Translations including `log.invoice-date-backdated` |

## User flow

1. Shipment is received (status = `Received`); `received_datetime` is set automatically.
2. If the `Backdating` preference is enabled, the **Received date** field appears in the toolbar.
3. The date picker constrains to: earlier than the current received date, and not before `max_days` ago (+1 day buffer so the boundary date isn't rejected by the server's UTC check).
4. User picks an earlier date.
5. A confirmation dialog warns the change is one-way and shows the selected date.
6. If a stocktake exists on or after the chosen date, an additional warning is shown with the date.
7. On confirm, the backend:
   - Updates `received_datetime`.
   - Updates `enter_datetime` (and `exit_datetime` if set) on location movements for stock lines from this invoice.
   - Writes an `InvoiceDateBackdated` activity log entry.
