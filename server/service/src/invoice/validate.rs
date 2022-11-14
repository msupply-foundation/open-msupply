use crate::WithDBError;
use repository::EqualFilter;
use repository::{
    InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceRowStatus, InvoiceRowType, RepositoryError, StorageConnection,
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
        InvoiceRowType::OutboundShipment => match status {
            InvoiceRowStatus::New => true,
            InvoiceRowStatus::Allocated => true,
            InvoiceRowStatus::Picked => true,
            InvoiceRowStatus::Shipped => false,
            InvoiceRowStatus::Delivered => false,
            InvoiceRowStatus::Verified => false,
        },
        InvoiceRowType::InboundShipment => match status {
            InvoiceRowStatus::New => true,
            InvoiceRowStatus::Shipped => true,
            InvoiceRowStatus::Delivered => true,
            InvoiceRowStatus::Allocated => false,
            InvoiceRowStatus::Picked => false,
            InvoiceRowStatus::Verified => false,
        },
        InvoiceRowType::InventoryAdjustment => false,
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

pub struct InvoiceDoesNotExist;

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

pub struct InvoiceLinesExist(pub Vec<InvoiceLine>);

pub fn check_invoice_is_empty(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), WithDBError<InvoiceLinesExist>> {
    let lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(id)))
        .map_err(WithDBError::db)?;

    if lines.len() > 0 {
        Err(WithDBError::err(InvoiceLinesExist(lines)))
    } else {
        Ok(())
    }
}
