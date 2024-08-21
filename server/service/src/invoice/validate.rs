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
                InvoiceStatus::New | InvoiceStatus::Shipped | InvoiceStatus::Delivered
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
