use std::collections::HashMap;

use repository::{
    InvoiceLineRowRepository, InvoiceLineType, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    RepositoryError, StockLineRowRepository, StorageConnection,
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

#[derive(Debug, PartialEq)]
pub enum AdjustStockError {
    DatabaseError(RepositoryError),
    InvoiceLineDoesNotExist,
    InvoiceDoesNotExist,
    /// Invoice line is an UnallocatedStock placeholder on an OutboundShipment
    InvoiceLineIsPlaceholder(String),
    /// Invoice line has no associated stock_line_id
    InvoiceLineHasNoStockLine(String),
    /// The referenced stock_line row was not found in the database
    StockLineDoesNotExist(String),
    /// Adjustment would make available or total stock negative
    StockWouldGoBelowZero {
        stock_line_id: String,
        field: String,
    },
    /// The (invoice_type, status) combination is not valid (n/a in the table)
    InvalidStatusForInvoiceType {
        invoice_type: InvoiceType,
        status: InvoiceStatus,
    },
}

impl From<RepositoryError> for AdjustStockError {
    fn from(error: RepositoryError) -> Self {
        AdjustStockError::DatabaseError(error)
    }
}

// ---------------------------------------------------------------------------
// Direction: does this invoice type increase or decrease stock?
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StockDirection {
    Increase,
    Decrease,
}

fn stock_direction(invoice_type: &InvoiceType, is_cancellation: bool) -> StockDirection {
    use InvoiceType::*;
    match (invoice_type, is_cancellation) {
        (Prescription, true) => StockDirection::Increase,
        (OutboundShipment, _) | (InventoryReduction, _) | (SupplierReturn, _)
        | (Prescription, false) => StockDirection::Decrease,
        (InventoryAddition, _) | (InboundShipment, _) | (CustomerReturn, _) => {
            StockDirection::Increase
        }
        // Repack doesn't fit the simple model; treat as no-op direction (callers
        // should never hit this because adjustment_flags returns None for Repack).
        _ => StockDirection::Decrease,
    }
}

// ---------------------------------------------------------------------------
// Adjustment flags: what gets adjusted at a given (type, status)?
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AdjustmentFlags {
    adjust_available: bool,
    adjust_total: bool,
}

/// Returns `None` when the (type, status) pair is n/a — meaning that status
/// is not applicable for that invoice type and should be treated as an error
/// if encountered.
///
/// Returns `Some(flags)` with the booleans indicating whether available and/or
/// total stock should be adjusted when a line value changes at this status.
fn adjustment_flags(
    invoice_type: &InvoiceType,
    status: &InvoiceStatus,
    is_cancellation: bool,
) -> Option<AdjustmentFlags> {
    use InvoiceStatus::*;
    use InvoiceType::*;

    let both = Some(AdjustmentFlags {
        adjust_available: true,
        adjust_total: true,
    });
    let avail_only = Some(AdjustmentFlags {
        adjust_available: true,
        adjust_total: false,
    });
    let neither = Some(AdjustmentFlags {
        adjust_available: false,
        adjust_total: false,
    });

    match (invoice_type, is_cancellation, status) {
        // ----- Outbound Shipment (decrease) -----
        (OutboundShipment, _, New | Allocated) => avail_only,
        (OutboundShipment, _, Picked | Shipped) => both,
        (OutboundShipment, _, Delivered | Received | Verified) => neither,

        // ----- Inventory Reduction (decrease) -----
        (InventoryReduction, _, Delivered | Verified) => both,

        // ----- Supplier Return (decrease) -----
        (SupplierReturn, _, New) => avail_only,
        (SupplierReturn, _, Picked | Shipped | Delivered) => both,
        (SupplierReturn, _, Received | Verified) => neither,

        // ----- Inventory Addition (increase) -----
        (InventoryAddition, _, Verified) => both,

        // ----- Inbound Shipment (increase) -----
        (InboundShipment, _, Received | Verified) => both,

        // ----- Customer Return (increase) -----
        (CustomerReturn, _, Received | Verified) => both,

        // ----- Prescription — normal (decrease) -----
        (Prescription, false, New) => avail_only,
        (Prescription, false, Picked | Shipped) => both,
        (Prescription, false, Received | Verified) => neither,

        // ----- Prescription — cancellation (increase) -----
        (Prescription, true, New) => avail_only,
        (Prescription, true, Picked) => both,
        (Prescription, true, Verified | Cancelled) => both,

        // Everything else is n/a
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Public function 1: invoice_line_adjust_stock
// ---------------------------------------------------------------------------

/// Adjusts stock on the stock_line linked to the given invoice line so that
/// the ledger stays consistent with the new `number_of_packs` value.
///
/// This function does **not** open its own transaction — the caller must wrap
/// it in `connection.transaction_sync()`.
///
/// `status_override` is used only when called from [`invoice_adjust_status`] to
/// specify the *new* status that will be applied after this call.  When `None`,
/// the invoice's current status is used.
pub fn invoice_line_adjust_stock(
    connection: &StorageConnection,
    invoice_line_id: &str,
    new_number_of_packs: f64,
    status_override: Option<&InvoiceStatus>,
) -> Result<(), AdjustStockError> {
    // 1. Fetch invoice line
    let invoice_line = InvoiceLineRowRepository::new(connection)
        .find_one_by_id(invoice_line_id)?
        .ok_or(AdjustStockError::InvoiceLineDoesNotExist)?;

    // 2. Fetch parent invoice
    let invoice = InvoiceRowRepository::new(connection)
        .find_one_by_id(&invoice_line.invoice_id)?
        .ok_or(AdjustStockError::InvoiceDoesNotExist)?;

    // 3. Reject placeholder lines on outbound shipments
    if invoice_line.r#type == InvoiceLineType::UnallocatedStock
        && invoice.r#type == InvoiceType::OutboundShipment
    {
        return Err(AdjustStockError::InvoiceLineIsPlaceholder(
            invoice_line.id.clone(),
        ));
    }

    // 4. Determine effective status
    let effective_status = status_override.unwrap_or(&invoice.status);

    // 5. Look up adjustment flags
    let flags =
        adjustment_flags(&invoice.r#type, effective_status, invoice.is_cancellation).ok_or(
            AdjustStockError::InvalidStatusForInvoiceType {
                invoice_type: invoice.r#type.clone(),
                status: effective_status.clone(),
            },
        )?;

    // 6. Calculate the difference
    let diff = new_number_of_packs - invoice_line.number_of_packs;

    // 7. If neither flag is set, just update the line and return
    if !flags.adjust_available && !flags.adjust_total {
        let mut updated_line = invoice_line;
        updated_line.number_of_packs = new_number_of_packs;
        InvoiceLineRowRepository::new(connection).upsert_one(&updated_line)?;
        return Ok(());
    }

    // 8. We need a stock line
    let stock_line_id = invoice_line
        .stock_line_id
        .as_ref()
        .ok_or_else(|| AdjustStockError::InvoiceLineHasNoStockLine(invoice_line.id.clone()))?;

    let mut stock_line = StockLineRowRepository::new(connection)
        .find_one_by_id(stock_line_id)?
        .ok_or_else(|| AdjustStockError::StockLineDoesNotExist(stock_line_id.clone()))?;

    // 9. Compute the signed delta based on direction
    let direction = stock_direction(&invoice.r#type, invoice.is_cancellation);
    let signed_delta = match direction {
        StockDirection::Decrease => -diff,
        StockDirection::Increase => diff,
    };

    // 10. Apply to available
    if flags.adjust_available {
        let new_available = stock_line.available_number_of_packs + signed_delta;
        if new_available < 0.0 {
            return Err(AdjustStockError::StockWouldGoBelowZero {
                stock_line_id: stock_line.id.clone(),
                field: "available_number_of_packs".to_string(),
            });
        }
        stock_line.available_number_of_packs = new_available;
    }

    // 11. Apply to total
    if flags.adjust_total {
        let new_total = stock_line.total_number_of_packs + signed_delta;
        if new_total < 0.0 {
            return Err(AdjustStockError::StockWouldGoBelowZero {
                stock_line_id: stock_line.id.clone(),
                field: "total_number_of_packs".to_string(),
            });
        }
        stock_line.total_number_of_packs = new_total;
        // Keep total_volume in sync
        stock_line.total_volume = stock_line.total_number_of_packs * stock_line.volume_per_pack;
    }

    // 12. Persist stock line then invoice line
    StockLineRowRepository::new(connection).upsert_one(&stock_line)?;

    let mut updated_line = invoice_line;
    updated_line.number_of_packs = new_number_of_packs;
    InvoiceLineRowRepository::new(connection).upsert_one(&updated_line)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Public function 2: invoice_adjust_status
// ---------------------------------------------------------------------------

/// Adjusts stock for *all* lines of an invoice when its status changes.
///
/// Uses the transition table to decide, per-field (available / total), whether
/// the status change requires stock to be updated.  Only transitions from
/// "not tracked" (false/n/a) → "tracked" (true) cause an adjustment.
///
/// This function does **not** open its own transaction — the caller must wrap
/// it in `connection.transaction_sync()`.
pub fn invoice_adjust_status(
    connection: &StorageConnection,
    invoice_id: &str,
    new_status: InvoiceStatus,
) -> Result<(), AdjustStockError> {
    // 1. Fetch invoice
    let mut invoice = InvoiceRowRepository::new(connection)
        .find_one_by_id(invoice_id)?
        .ok_or(AdjustStockError::InvoiceDoesNotExist)?;

    let is_cancel = invoice.is_cancellation;

    // 2. Determine what changed between old and new flags
    let old_flags = adjustment_flags(&invoice.r#type, &invoice.status, is_cancel);
    let new_flags = adjustment_flags(&invoice.r#type, &new_status, is_cancel);

    let transition = compute_transition(old_flags, new_flags);

    // 3. Validate: n/a → true or true → n/a is an error
    if transition.error_available || transition.error_total {
        return Err(AdjustStockError::InvalidStatusForInvoiceType {
            invoice_type: invoice.r#type.clone(),
            status: new_status,
        });
    }

    // 4. If no stock updates are needed, just update the status and return
    if !transition.apply_available && !transition.apply_total {
        invoice.status = new_status;
        InvoiceRowRepository::new(connection).upsert_one(&invoice)?;
        return Ok(());
    }

    // 5. Batch-fetch all invoice lines for this invoice
    let lines = InvoiceLineRowRepository::new(connection)
        .find_many_by_invoice_id(invoice_id)?;

    // 6. Filter to stock-affecting lines only (StockIn / StockOut)
    let stock_lines_needed: Vec<_> = lines
        .iter()
        .filter(|l| {
            l.r#type == InvoiceLineType::StockIn || l.r#type == InvoiceLineType::StockOut
        })
        .collect();

    // 7. Batch-fetch all referenced stock lines
    let stock_line_ids: Vec<String> = stock_lines_needed
        .iter()
        .filter_map(|l| l.stock_line_id.clone())
        .collect();

    let fetched_stock_lines =
        StockLineRowRepository::new(connection).find_many_by_ids(&stock_line_ids)?;

    let mut stock_map: HashMap<String, _> = fetched_stock_lines
        .into_iter()
        .map(|sl| (sl.id.clone(), sl))
        .collect();

    // 8. Compute direction once (same for all lines of this invoice)
    let direction = stock_direction(&invoice.r#type, is_cancel);

    // 9. For each line, apply the full number_of_packs to stock
    for invoice_line in &stock_lines_needed {
        let stock_line_id = invoice_line
            .stock_line_id
            .as_ref()
            .ok_or_else(|| {
                AdjustStockError::InvoiceLineHasNoStockLine(invoice_line.id.clone())
            })?;

        let stock_line = stock_map.get_mut(stock_line_id).ok_or_else(|| {
            AdjustStockError::StockLineDoesNotExist(stock_line_id.clone())
        })?;

        let amount = invoice_line.number_of_packs;
        let signed_amount = match direction {
            StockDirection::Decrease => -amount,
            StockDirection::Increase => amount,
        };

        if transition.apply_available {
            let new_val = stock_line.available_number_of_packs + signed_amount;
            if new_val < 0.0 {
                return Err(AdjustStockError::StockWouldGoBelowZero {
                    stock_line_id: stock_line.id.clone(),
                    field: "available_number_of_packs".to_string(),
                });
            }
            stock_line.available_number_of_packs = new_val;
        }

        if transition.apply_total {
            let new_val = stock_line.total_number_of_packs + signed_amount;
            if new_val < 0.0 {
                return Err(AdjustStockError::StockWouldGoBelowZero {
                    stock_line_id: stock_line.id.clone(),
                    field: "total_number_of_packs".to_string(),
                });
            }
            stock_line.total_number_of_packs = new_val;
            stock_line.total_volume =
                stock_line.total_number_of_packs * stock_line.volume_per_pack;
        }
    }

    // 10. Batch-persist all modified stock lines
    let stock_line_repo = StockLineRowRepository::new(connection);
    for stock_line in stock_map.values() {
        stock_line_repo.upsert_one(stock_line)?;
    }

    // 11. Update invoice status and persist
    invoice.status = new_status;
    InvoiceRowRepository::new(connection).upsert_one(&invoice)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Transition logic helpers
// ---------------------------------------------------------------------------

struct StatusTransition {
    /// Should we apply available adjustments for all lines?
    apply_available: bool,
    /// Should we apply total adjustments for all lines?
    apply_total: bool,
    /// Was there an invalid transition for available? (n/a ↔ true)
    error_available: bool,
    /// Was there an invalid transition for total? (n/a ↔ true)
    error_total: bool,
}

/// Compare the old and new adjustment flags to determine what needs to happen.
///
/// | Old        | New        | Result          |
/// |------------|------------|-----------------|
/// | false      | true       | Apply           |
/// | true       | true       | No-op           |
/// | false      | false      | No-op           |
/// | true       | false      | No-op (*)       |
/// | None (n/a) | true       | Error           |
/// | true       | None (n/a) | Error           |
/// | None       | None       | No-op           |
/// | None       | false      | No-op           |
/// | false      | None       | No-op           |
///
/// (*) true→false shouldn't normally happen, but we treat it as no-op rather
/// than error since the stock is already accounted for.
fn compute_transition(
    old_flags: Option<AdjustmentFlags>,
    new_flags: Option<AdjustmentFlags>,
) -> StatusTransition {
    let (old_avail, old_total, old_is_na) = match old_flags {
        Some(f) => (f.adjust_available, f.adjust_total, false),
        None => (false, false, true),
    };
    let (new_avail, new_total, new_is_na) = match new_flags {
        Some(f) => (f.adjust_available, f.adjust_total, false),
        None => (false, false, true),
    };

    StatusTransition {
        apply_available: !old_avail && new_avail,
        apply_total: !old_total && new_total,
        error_available: (old_is_na && new_avail) || (old_avail && new_is_na),
        error_total: (old_is_na && new_total) || (old_total && new_is_na),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ===== stock_direction tests =====

    #[test]
    fn test_stock_direction() {
        assert_eq!(
            stock_direction(&InvoiceType::OutboundShipment, false),
            StockDirection::Decrease
        );
        assert_eq!(
            stock_direction(&InvoiceType::InventoryReduction, false),
            StockDirection::Decrease
        );
        assert_eq!(
            stock_direction(&InvoiceType::SupplierReturn, false),
            StockDirection::Decrease
        );
        assert_eq!(
            stock_direction(&InvoiceType::Prescription, false),
            StockDirection::Decrease
        );
        assert_eq!(
            stock_direction(&InvoiceType::Prescription, true),
            StockDirection::Increase
        );
        assert_eq!(
            stock_direction(&InvoiceType::InventoryAddition, false),
            StockDirection::Increase
        );
        assert_eq!(
            stock_direction(&InvoiceType::InboundShipment, false),
            StockDirection::Increase
        );
        assert_eq!(
            stock_direction(&InvoiceType::CustomerReturn, false),
            StockDirection::Increase
        );
    }

    // ===== adjustment_flags tests =====

    fn avail_only() -> Option<AdjustmentFlags> {
        Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: false,
        })
    }
    fn both() -> Option<AdjustmentFlags> {
        Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        })
    }
    fn neither() -> Option<AdjustmentFlags> {
        Some(AdjustmentFlags {
            adjust_available: false,
            adjust_total: false,
        })
    }

    #[test]
    fn test_outbound_shipment_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::OutboundShipment;
        assert_eq!(adjustment_flags(&t, &New, false), avail_only());
        assert_eq!(adjustment_flags(&t, &Allocated, false), avail_only());
        assert_eq!(adjustment_flags(&t, &Picked, false), both());
        assert_eq!(adjustment_flags(&t, &Shipped, false), both());
        assert_eq!(adjustment_flags(&t, &Delivered, false), neither());
        assert_eq!(adjustment_flags(&t, &Received, false), neither());
        assert_eq!(adjustment_flags(&t, &Verified, false), neither());
        assert_eq!(adjustment_flags(&t, &Cancelled, false), None);
    }

    #[test]
    fn test_inventory_reduction_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::InventoryReduction;
        assert_eq!(adjustment_flags(&t, &New, false), None);
        assert_eq!(adjustment_flags(&t, &Delivered, false), both());
        assert_eq!(adjustment_flags(&t, &Verified, false), both());
        assert_eq!(adjustment_flags(&t, &Picked, false), None);
    }

    #[test]
    fn test_supplier_return_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::SupplierReturn;
        assert_eq!(adjustment_flags(&t, &New, false), avail_only());
        assert_eq!(adjustment_flags(&t, &Picked, false), both());
        assert_eq!(adjustment_flags(&t, &Shipped, false), both());
        assert_eq!(adjustment_flags(&t, &Delivered, false), both());
        assert_eq!(adjustment_flags(&t, &Received, false), neither());
        assert_eq!(adjustment_flags(&t, &Verified, false), neither());
    }

    #[test]
    fn test_inventory_addition_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::InventoryAddition;
        assert_eq!(adjustment_flags(&t, &New, false), None);
        assert_eq!(adjustment_flags(&t, &Verified, false), both());
    }

    #[test]
    fn test_inbound_shipment_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::InboundShipment;
        assert_eq!(adjustment_flags(&t, &New, false), None);
        assert_eq!(adjustment_flags(&t, &Shipped, false), None);
        assert_eq!(adjustment_flags(&t, &Delivered, false), None);
        assert_eq!(adjustment_flags(&t, &Received, false), both());
        assert_eq!(adjustment_flags(&t, &Verified, false), both());
    }

    #[test]
    fn test_customer_return_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::CustomerReturn;
        assert_eq!(adjustment_flags(&t, &New, false), None);
        assert_eq!(adjustment_flags(&t, &Received, false), both());
        assert_eq!(adjustment_flags(&t, &Verified, false), both());
    }

    #[test]
    fn test_prescription_normal_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::Prescription;
        assert_eq!(adjustment_flags(&t, &New, false), avail_only());
        assert_eq!(adjustment_flags(&t, &Picked, false), both());
        assert_eq!(adjustment_flags(&t, &Shipped, false), both());
        assert_eq!(adjustment_flags(&t, &Received, false), neither());
        assert_eq!(adjustment_flags(&t, &Verified, false), neither());
    }

    #[test]
    fn test_prescription_cancellation_flags() {
        use InvoiceStatus::*;
        let t = InvoiceType::Prescription;
        assert_eq!(adjustment_flags(&t, &New, true), avail_only());
        assert_eq!(adjustment_flags(&t, &Picked, true), both());
        assert_eq!(adjustment_flags(&t, &Verified, true), both());
        assert_eq!(adjustment_flags(&t, &Cancelled, true), both());
    }

    // ===== compute_transition tests =====

    #[test]
    fn test_transition_false_to_true_applies() {
        let old = Some(AdjustmentFlags {
            adjust_available: false,
            adjust_total: false,
        });
        let new = Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        });
        let t = compute_transition(old, new);
        assert!(t.apply_available);
        assert!(t.apply_total);
        assert!(!t.error_available);
        assert!(!t.error_total);
    }

    #[test]
    fn test_transition_true_to_true_noop() {
        let old = Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        });
        let new = Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        });
        let t = compute_transition(old, new);
        assert!(!t.apply_available);
        assert!(!t.apply_total);
        assert!(!t.error_available);
        assert!(!t.error_total);
    }

    #[test]
    fn test_transition_false_to_false_noop() {
        let old = Some(AdjustmentFlags {
            adjust_available: false,
            adjust_total: false,
        });
        let new = Some(AdjustmentFlags {
            adjust_available: false,
            adjust_total: false,
        });
        let t = compute_transition(old, new);
        assert!(!t.apply_available);
        assert!(!t.apply_total);
    }

    #[test]
    fn test_transition_na_to_true_errors() {
        let old = None;
        let new = Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        });
        let t = compute_transition(old, new);
        assert!(t.error_available);
        assert!(t.error_total);
    }

    #[test]
    fn test_transition_true_to_na_errors() {
        let old = Some(AdjustmentFlags {
            adjust_available: true,
            adjust_total: true,
        });
        let new = None;
        let t = compute_transition(old, new);
        assert!(t.error_available);
        assert!(t.error_total);
    }

    #[test]
    fn test_transition_na_to_na_noop() {
        let t = compute_transition(None, None);
        assert!(!t.apply_available);
        assert!(!t.apply_total);
        assert!(!t.error_available);
        assert!(!t.error_total);
    }

    #[test]
    fn test_transition_avail_only_to_both_applies_total() {
        // e.g. OutboundShipment: New (avail only) → Picked (both)
        let old = avail_only();
        let new = both();
        let t = compute_transition(old, new);
        assert!(!t.apply_available); // was already true
        assert!(t.apply_total); // false → true
        assert!(!t.error_available);
        assert!(!t.error_total);
    }

    #[test]
    fn test_transition_na_to_false_noop() {
        let old = None;
        let new = Some(AdjustmentFlags {
            adjust_available: false,
            adjust_total: false,
        });
        let t = compute_transition(old, new);
        assert!(!t.apply_available);
        assert!(!t.apply_total);
        assert!(!t.error_available);
        assert!(!t.error_total);
    }
}
