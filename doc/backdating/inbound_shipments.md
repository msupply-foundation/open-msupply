# Backdating: Inbound Shipment Received Date (#11062)

Epic: #11056
Milestone: V2.18.0

## Overview

Allow users to backdate the Received date on inbound shipments that have already been received. The date can only be moved earlier, never forward — this prevents ledger inconsistencies.

## Design

- Date can **only be moved earlier** than the current received date, never forward
- **No line deletion** — existing lines and stock are preserved
- Location movement `enter_datetime` values are updated to reflect the new date
- Only editable when the shipment is in **Received** or **Verified** status
- Gated by the `AllowBackdatingOfShipments` global preference (#11060)
- `MaximumBackdatingDays` preference limits how far back the date can be set
- User is warned that the change is one-way before confirming
- Stocktake warning shown if a stocktake exists after the selected date

## Backend Validation (server-side enforced)

1. Shipment must be in Received or Verified status (`CanOnlyBackdateReceivedShipments`)
2. New date must not be in the future (`CannotSetReceivedDateInFuture`)
3. New date must be strictly earlier than current received_datetime (`CannotMoveReceivedDateForward`)
4. New date must not be before delivered_datetime (`CannotPutReceivedDateBeforeDeliveredDate`)

## Backend Generate

When received_datetime is backdated:
- `invoice.received_datetime` is updated
- Location movements for stock lines from this invoice have their `enter_datetime` updated to the new date

## Files Changed

### Backend (Rust)

| File | Change |
|------|--------|
| `server/service/src/invoice/inbound_shipment/update/mod.rs` | `received_datetime` field; error variants `CanOnlyBackdateReceivedShipments`, `CannotMoveReceivedDateForward`, etc.; `backdate_location_movements` handling |
| `server/service/src/invoice/inbound_shipment/update/validate.rs` | Validation: received status, only earlier, not before delivered, not future |
| `server/service/src/invoice/inbound_shipment/update/generate.rs` | Updates `received_datetime` and location movement `enter_datetime` values |
| `server/graphql/invoice/src/mutations/inbound_shipment/update.rs` | `received_datetime` on GraphQL input, error mapping |

### Frontend (TypeScript)

| File | Change |
|------|--------|
| `client/packages/invoices/src/InboundShipment/DetailView/Toolbar.tsx` | Received date picker: only shown when received + preference enabled; maxDate = current received date; minDate from preference; one-way warning + stocktake warning |
| `client/packages/invoices/src/InboundShipment/api/api.ts` | `receivedDatetime` in `toUpdate` parser |
| `client/packages/invoices/src/InboundShipment/api/operations.graphql` | `stocktakeCountAfterDate` query |
| `client/packages/common/src/authentication/api/operations.graphql` | Added `allowBackdatingOfShipments` and `maximumBackdatingDays` to preferences query |
| `client/packages/common/src/intl/locales/en/common.json` | Translation strings |

## User Flow

1. Shipment is received (status = Received), received_datetime set automatically
2. If `AllowBackdatingOfShipments` preference is enabled, "Received date" field appears in toolbar
3. Date picker constrains to: earlier than current received date, not before `MaximumBackdatingDays` ago
4. User picks an earlier date
5. Confirmation dialog warns this is a one-way change
6. If stocktake exists after the chosen date, additional warning shown
7. On confirm, backend updates invoice received_datetime and location movement enter_datetimes
