+++
title = "Backdating"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Backdating

omSupply supports backdating invoice dates in a few targeted places so that historical operations can be recorded accurately. Each surface has its own rules — some are only allowed before lines exist, others are one-way moves to preserve ledger integrity.

All backdating is gated by the global `Backdating` preference, a combined struct:

```rust
pub struct BackdatingData {
    pub enabled: bool,
    pub max_days: i32,
}
```

- `enabled` — master switch. If false, backdating is rejected server-side everywhere.
- `max_days` — maximum days in the past a date may be set. `0` means unlimited.

The preference is loaded via `Backdating.load(connection, None)` and shared across all backdating features.

## Surfaces

- [Outbound shipment picked date](./outbound_shipments/) — set a historical picked date on a **new** outbound shipment; triggers historical stock allocation.
- [Inbound shipment received date](./inbound_shipments/) — move the received date of an already-received shipment **earlier** (never forward).

Prescriptions also use the shared `backdated_datetime` plumbing (`handle_new_backdated_datetime` in `invoice_date_utils.rs`) but are documented separately.

## Shared helpers

- `invoice_date_utils::handle_new_backdated_datetime` — sets `invoice.backdated_datetime` and replaces any existing `allocated_datetime` / `picked_datetime` / `verified_datetime` with the backdated value. If the backdated datetime is in the future, it is unset and status datetimes fall back to `now`.
- `ActivityLogType::InvoiceDateBackdated` — activity log entry written when a received date is backdated, recording old and new dates.
