use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, RepositoryError,
    StorageConnection,
};

pub fn check_invoice_type(invoice: &InvoiceRow, r#type: InvoiceRowType) -> bool {
    if invoice.r#type == r#type {
        return true;
    }
    return false;
}

pub fn check_store(invoice: &InvoiceRow, store_id: &str) -> bool {
    if invoice.store_id == store_id {
        return true;
    }
    return false;
}

pub fn check_status_change(invoice: &InvoiceRow, status_option: Option<InvoiceRowStatus>) -> bool {
    if let Some(new_status) = status_option {
        if new_status != invoice.status {
            return true;
        }
    }
    return false;
}

pub fn check_invoice_is_editable(invoice: &InvoiceRow) -> bool {
    let status = InvoiceRowStatus::from(invoice.status.clone());
    let is_editable = match &invoice.r#type {
        InvoiceRowType::OutboundShipment | InvoiceRowType::OutboundReturn => match status {
            InvoiceRowStatus::New => true,
            InvoiceRowStatus::Allocated => true,
            InvoiceRowStatus::Picked => true,
            InvoiceRowStatus::Shipped => false,
            InvoiceRowStatus::Delivered => false,
            InvoiceRowStatus::Verified => false,
        },
        InvoiceRowType::InboundShipment | InvoiceRowType::InboundReturn => match status {
            InvoiceRowStatus::New => true,
            InvoiceRowStatus::Shipped => true,
            InvoiceRowStatus::Delivered => true,
            InvoiceRowStatus::Allocated => false,
            InvoiceRowStatus::Picked => false,
            InvoiceRowStatus::Verified => false,
        },
        InvoiceRowType::Prescription => match status {
            InvoiceRowStatus::New => true,
            InvoiceRowStatus::Allocated => true,
            InvoiceRowStatus::Picked => true,
            InvoiceRowStatus::Shipped => false,
            InvoiceRowStatus::Delivered => false,
            InvoiceRowStatus::Verified => false,
        },
        InvoiceRowType::InventoryAddition
        | InvoiceRowType::InventoryReduction
        | InvoiceRowType::Repack => false,
    };

    if is_editable {
        return true;
    }
    return false;
}

pub enum InvoiceRowStatusError {
    CannotChangeStatusOfInvoiceOnHold,
    CannotReverseInvoiceStatus,
}

pub fn check_invoice_status(
    invoice: &InvoiceRow,
    status_option: Option<InvoiceRowStatus>,
    on_hold_option: &Option<bool>,
) -> Result<(), InvoiceRowStatusError> {
    if let Some(new_status) = status_option {
        let existing_status: InvoiceRowStatus = invoice.status.clone().into();
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

pub enum InvoiceAlreadyExistsError {
    InvoiceAlreadyExists,
    RepositoryError(RepositoryError),
}

pub fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<InvoiceRow>, RepositoryError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(invoice_row) => Ok(Some(invoice_row)),
        Err(RepositoryError::NotFound) => Ok(None),
        Err(error) => Err(error),
    }
}

pub fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InvoiceAlreadyExistsError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(err) = result {
        Err(InvoiceAlreadyExistsError::RepositoryError(err.into()))
    } else {
        Err(InvoiceAlreadyExistsError::InvoiceAlreadyExists)
    }
}
