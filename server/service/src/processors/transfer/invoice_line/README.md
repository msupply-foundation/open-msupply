# Invoice Line Transfer Processor

## Overview

The Invoice Line Transfer Processor handles **individual line-level changes** during stock transfers between sites. It works alongside the [Invoice Transfer Processor](../invoice/README.md) to provide real-time synchronization of invoice lines.

## Architecture

### Separation of Concerns

| Processor | Triggers On | Responsibility |
|-----------|-------------|----------------|
| **Invoice Processor** | Invoice status changes | Creates/updates/deletes invoices, manages invoice metadata |
| **Line Processor** | Invoice line changes | Syncs individual line changes (quantity, batch, expiry) |

### When Does It Run?

The line processor processes changes when:
- ✅ Invoice status is **PICKED** (editable state)
- ✅ Line is added, updated, or deleted
- ✅ Linked inbound invoice exists
- ❌ **Does NOT run** when invoice is SHIPPED/VERIFIED/CANCELLED

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Outbound Shipment                         │
│                    (PICKED Status)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User edits line
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Invoice Line Service Layer                      │
│  (insert_stock_out_line / update_stock_out_line / delete)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Creates changelog
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Invoice Line Transfer Processor                    │
│              (UpdateInboundInvoiceLineProcessor)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─ UPSERT: Find or create inbound line
                            │          Update quantity/batch/expiry
                            │
                            └─ DELETE: Find matching inbound line
                                       Delete from inbound invoice
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Inbound Shipment                          │
│              (Lines synced in real-time)                     │
└─────────────────────────────────────────────────────────────┘
```

## Line Matching Logic

Lines are matched between outbound and inbound invoices using:

1. **Item ID** (`item_link_id`)
2. **Batch** (optional, can be `None`)
3. **Expiry Date** (optional, can be `None`)

```rust
fn lines_match(outbound: &InvoiceLineRow, inbound: &InvoiceLineRow) -> bool {
    outbound.item_link_id == inbound.item_link_id
        && outbound.batch == inbound.batch
        && outbound.expiry_date == inbound.expiry_date
}
```

## Validation Rules

The processor will **skip** processing if:

1. ❌ Outbound invoice status is not `PICKED`
2. ❌ No linked inbound invoice exists
3. ❌ Line type is `UnallocatedStock` (placeholder lines)
4. ❌ Operation type is not `UPSERT` or `DELETE`

## Example Scenarios

### Scenario 1: Add Line After Invoice Created

```
1. Create outbound shipment (ALLOCATED)
2. Pick shipment → Invoice processor creates inbound ✅
3. Add new line to outbound → Line processor creates inbound line ✅
4. Ship outbound → Invoice processor updates inbound status ✅
```

### Scenario 2: Update Line Quantity

```
1. Outbound line: 10 packs
2. User updates to 20 packs
3. Line processor finds matching inbound line
4. Updates inbound line: 10 → 20 packs ✅
```

### Scenario 3: Delete Line

```
1. Outbound has 3 lines
2. User deletes line 1
3. Line processor finds matching inbound line
4. Deletes inbound line
5. Inbound now has 2 lines ✅
```

## Relationship to Invoice Processor

### Before Line Processor (Old Behavior)

```
Invoice PICKED  → Create inbound + lines
Invoice SHIPPED → Regenerate ALL lines ❌
```

**Problem**: All lines dropped and recreated on status change, losing any manual edits.

### After Line Processor (New Behavior)

```
Invoice PICKED  → Create inbound + initial lines
Line changed    → Sync individual line changes ✅
Invoice SHIPPED → Update invoice status only ✅
```

**Benefit**: Real-time line sync, invoice processor only handles invoice metadata.

This happens in **both** invoice and line processors.

## Related Documentation

- [Invoice Transfer Processor](../invoice/README.md) - Invoice-level operations
- [Transfer Processors Overview](../README.md) - General processor architecture
- [Invoice Line Service](../../../invoice_line/README.md) - Service layer that triggers processors

## Code Structure

```
invoice_line/
├── mod.rs                              # Processor registration
├── update_inbound_invoice_line.rs      # Main processor logic
└── test.rs                             # Integration tests
```
