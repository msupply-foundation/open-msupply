# Backdating: Inbound Shipment Received Date (#11062)

Epic: #11056
Milestone: V2.18.0

## Overview

Allow users to backdate the Received date on inbound shipments that have already been received. The date can only be moved earlier, never forward — this prevents ledger inconsistencies.

## Design

- Date can **only be moved earlier** than the current received date, never forward
- **No line deletion** — existing lines and stock are preserved
- When backdating, **shipped**, **delivered**, and **created (new)** dates are automatically moved back if they are after the new received date
- Location movement `enter_datetime` values are updated to reflect the new date
- Only editable when the shipment is in **Received** or **Verified** status
- Gated by the `AllowBackdatingOfShipments` global preference (#11060)
- `MaximumBackdatingDays` preference limits how far back the date can be set
- User is warned (with the selected date shown) that the change is one-way before confirming
- Stocktake warning shown if a stocktake exists after the selected date
- An `InvoiceDateBackdated` activity log entry is created recording the old and new dates

## Backend Validation (server-side enforced)

1. Shipment must be in Received or Verified status (`CanOnlyBackdateReceivedShipments`)
2. New date must be strictly earlier than current received_datetime (`CannotMoveReceivedDateForward`)
3. Respects `MaximumBackdatingDays` preference (`ExceedsMaximumBackdatingDays`)

## Backend Generate

When received_datetime is backdated:
- `invoice.received_datetime` is updated
- `invoice.shipped_datetime` is moved back if after the new received date
- `invoice.delivered_datetime` is moved back if after the new received date
- `invoice.created_datetime` is moved back if after the new received date
- Location movements for stock lines from this invoice have their `enter_datetime` updated to the new date
- An `InvoiceDateBackdated` activity log entry is created with the old and new received dates

## Files Changed

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/inbound_shipment/update/mod.rs` | `received_datetime` field; error variants; `backdate_location_movements` handling; activity log entry for backdating |
| `server/service/src/invoice/inbound_shipment/update/validate.rs` | Validation: received status, only earlier, not future, max backdating days |
| `server/service/src/invoice/inbound_shipment/update/generate.rs` | Updates `received_datetime`, moves shipped/delivered/created dates back, updates location movement `enter_datetime` values |
| `server/graphql/invoice/src/mutations/inbound_shipment/update.rs` | `received_datetime` on GraphQL input, error mapping |
| `server/repository/src/db_diesel/activity_log_row.rs` | `InvoiceDateBackdated` activity log type |
| `server/graphql/types/src/types/activity_log.rs` | `InvoiceDateBackdated` GraphQL enum variant |
| `server/repository/src/migrations/v2_18_00/` | Postgres migration for `InvoiceDateBackdated` enum value |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/invoices/src/InboundShipment/DetailView/ReceivedDateInput.tsx` | Received date picker with one-way warning + stocktake warning (both showing selected date) |
| `client/packages/invoices/src/InboundShipment/api/api.ts` | `receivedDatetime` in `toUpdate` parser |
| `client/packages/invoices/src/InboundShipment/api/operations.graphql` | `stocktakeCountAfterDate` query |
| `client/packages/common/src/authentication/api/operations.graphql` | Added `allowBackdatingOfShipments` and `maximumBackdatingDays` to preferences query |
| `client/packages/common/src/intl/locales/en/common.json` | Translation strings including `log.invoice-date-backdated` |

## User Flow

1. Shipment is received (status = Received), received_datetime set automatically
2. If `AllowBackdatingOfShipments` preference is enabled, "Received date" field appears in toolbar
3. Date picker constrains to: earlier than current received date, not before `MaximumBackdatingDays` ago
4. User picks an earlier date
5. Confirmation dialog warns this is a one-way change and shows the selected date
6. If stocktake exists after the chosen date, additional warning shown with the date
7. On confirm, backend updates invoice received_datetime, moves shipped/delivered/created dates back as needed, updates location movement enter_datetimes, and creates an activity log entry
