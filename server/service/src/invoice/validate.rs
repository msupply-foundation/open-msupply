use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RepositoryError,
    StorageConnection,
};

pub fn check_invoice_type(invoice: &InvoiceRow, r#type: InvoiceType) -> bool {
    if invoice.r#type == r#type {
        return true;
    }
    false
}

pub fn check_store(invoice: &InvoiceRow, store_id: &str) -> bool {
    if invoice.store_id == store_id {
        return true;
    }
    false
}

pub fn check_status_change(invoice: &InvoiceRow, status_option: Option<InvoiceStatus>) -> bool {
    if let Some(new_status) = status_option {
        if new_status != invoice.status {
            return true;
        }
    }
    false
}

pub fn can_cancel_invoice(invoice: &InvoiceRow) -> bool {
    if invoice.r#type != InvoiceType::Prescription {
        // Only a prescription can be cancelled at the moment
        return false;
    }

    if invoice.is_cancellation {
        // Can't cancel a cancellation!
        return false;
    }

    if invoice.status == InvoiceStatus::Cancelled {
        // Already cancelled
        return false;
    }

    if invoice.status != InvoiceStatus::Verified {
        // Can only cancel verified prescriptions
        return false;
    }

    true
}

pub fn check_invoice_is_editable(invoice: &InvoiceRow) -> bool {
    let status = invoice.status.clone();
    let is_editable = match &invoice.r#type {
        InvoiceType::OutboundShipment | InvoiceType::SupplierReturn => {
            matches!(
                status,
                InvoiceStatus::New | InvoiceStatus::Allocated | InvoiceStatus::Picked
            )
        }
        InvoiceType::InboundShipment | InvoiceType::CustomerReturn => {
            matches!(
                status,
                InvoiceStatus::New
                    | InvoiceStatus::Shipped
                    | InvoiceStatus::Delivered
                    | InvoiceStatus::Received
            )
        }
        InvoiceType::Prescription => {
            matches!(
                status,
                InvoiceStatus::New | InvoiceStatus::Allocated | InvoiceStatus::Picked
            )
        }
        InvoiceType::InventoryAddition | InvoiceType::InventoryReduction => {
            matches!(status, InvoiceStatus::New)
        }
        InvoiceType::Repack => false,
    };

    if is_editable {
        return true;
    }
    false
}

/// Stricter than [`check_invoice_is_editable`], for editing invoice *lines* rather than the
/// invoice itself.
///
/// Transfer-created inbound shipments and customer returns arrive already in Shipped status and
/// must still accept status changes (so the receiving store can move them to Delivered), but
/// their lines are the sending store's record of what was despatched and must not be edited
/// until the goods are delivered.
///
/// Externally-sourced (purchase order) inbounds have no linked invoice and stay editable at
/// Shipped, so the user can record what the supplier despatched.
pub fn check_invoice_lines_are_editable(invoice: &InvoiceRow) -> bool {
    if !check_invoice_is_editable(invoice) {
        return false;
    }

    match &invoice.r#type {
        InvoiceType::InboundShipment | InvoiceType::CustomerReturn => {
            !(invoice.status == InvoiceStatus::Shipped && invoice.linked_invoice_id.is_some())
        }
        _ => true,
    }
}

pub enum InvoiceRowStatusError {
    CannotChangeStatusOfInvoiceOnHold,
    CannotReverseInvoiceStatus,
}

pub fn check_invoice_status(
    invoice: &InvoiceRow,
    status_option: Option<InvoiceStatus>,
    on_hold_option: &Option<bool>,
) -> Result<(), InvoiceRowStatusError> {
    if let Some(new_status) = status_option {
        let existing_status: InvoiceStatus = invoice.status.clone();
        // When we update invoice, error will trigger if
        // * invoice is currently on hold and is not being change to be not on hold
        let is_not_on_hold = !invoice.on_hold || !on_hold_option.unwrap_or(true);

        if new_status != existing_status && !is_not_on_hold {
            return Err(InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold);
        }
        if new_status.index() < existing_status.index() {
            return Err(InvoiceRowStatusError::CannotReverseInvoiceStatus);
        }
    }
    Ok(())
}

pub fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<InvoiceRow>, RepositoryError> {
    InvoiceRowRepository::new(connection).find_one_by_id(id)
}

#[cfg(test)]
mod test {
    use repository::{InvoiceRow, InvoiceStatus, InvoiceType};

    use super::{check_invoice_is_editable, check_invoice_lines_are_editable};

    fn outbound(status: InvoiceStatus) -> InvoiceRow {
        InvoiceRow {
            r#type: InvoiceType::OutboundShipment,
            status,
            ..Default::default()
        }
    }

    /// An inbound shipment created by a transfer from another store's outbound shipment
    fn transferred_inbound(status: InvoiceStatus) -> InvoiceRow {
        InvoiceRow {
            r#type: InvoiceType::InboundShipment,
            linked_invoice_id: Some("outbound_shipment_id".to_string()),
            status,
            ..Default::default()
        }
    }

    /// An inbound shipment raised against a purchase order to an external supplier
    fn external_inbound(status: InvoiceStatus) -> InvoiceRow {
        InvoiceRow {
            r#type: InvoiceType::InboundShipment,
            purchase_order_id: Some("purchase_order_id".to_string()),
            status,
            ..Default::default()
        }
    }

    #[test]
    fn outbound_is_editable_only_before_shipped() {
        for status in [InvoiceStatus::New, InvoiceStatus::Allocated, InvoiceStatus::Picked] {
            assert!(
                check_invoice_is_editable(&outbound(status.clone())),
                "outbound should be editable at status {:?}",
                status
            );
        }
        for status in [
            InvoiceStatus::Shipped,
            InvoiceStatus::Delivered,
            InvoiceStatus::Received,
            InvoiceStatus::Verified,
            InvoiceStatus::Cancelled,
        ] {
            assert!(
                !check_invoice_is_editable(&outbound(status.clone())),
                "outbound should not be editable at status {:?}",
                status
            );
        }
    }

    #[test]
    fn transferred_inbound_lines_are_locked_while_shipped() {
        // The invoice itself stays editable at Shipped, otherwise the receiving store could
        // never move the transfer on to Delivered
        assert!(check_invoice_is_editable(&transferred_inbound(
            InvoiceStatus::Shipped
        )));
        assert!(!check_invoice_lines_are_editable(&transferred_inbound(
            InvoiceStatus::Shipped
        )));

        for status in [
            InvoiceStatus::New,
            InvoiceStatus::Delivered,
            InvoiceStatus::Received,
        ] {
            assert!(
                check_invoice_lines_are_editable(&transferred_inbound(status.clone())),
                "transferred inbound lines should be editable at status {:?}",
                status
            );
        }

        for status in [InvoiceStatus::Verified, InvoiceStatus::Cancelled] {
            assert!(
                !check_invoice_lines_are_editable(&transferred_inbound(status.clone())),
                "transferred inbound lines should not be editable at status {:?}",
                status
            );
        }
    }

    #[test]
    fn external_inbound_lines_stay_editable_while_shipped() {
        // An external inbound has no linked invoice, the user records what the supplier
        // despatched while the goods are in transit
        for status in [
            InvoiceStatus::New,
            InvoiceStatus::Shipped,
            InvoiceStatus::Delivered,
            InvoiceStatus::Received,
        ] {
            assert!(
                check_invoice_lines_are_editable(&external_inbound(status.clone())),
                "external inbound lines should be editable at status {:?}",
                status
            );
        }

        assert!(!check_invoice_lines_are_editable(&external_inbound(
            InvoiceStatus::Verified
        )));
    }

    #[test]
    fn outbound_line_editability_matches_invoice_editability() {
        // The extra Shipped rule is inbound only, outbound is unchanged
        for status in [
            InvoiceStatus::New,
            InvoiceStatus::Allocated,
            InvoiceStatus::Picked,
            InvoiceStatus::Shipped,
            InvoiceStatus::Verified,
        ] {
            let invoice = outbound(status.clone());
            assert_eq!(
                check_invoice_lines_are_editable(&invoice),
                check_invoice_is_editable(&invoice),
                "outbound line editability should match invoice editability at status {:?}",
                status
            );
        }
    }
}
