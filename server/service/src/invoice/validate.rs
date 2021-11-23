use crate::WithDBError;
use domain::{
    invoice::{InvoiceStatus, InvoiceType},
    invoice_line::{InvoiceLine, InvoiceLineFilter},
    Pagination,
};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus},
    InvoiceLineRepository, InvoiceRepository, RepositoryError, StorageConnection,
};

pub struct WrongInvoiceType;

pub fn check_invoice_type(
    invoice: &InvoiceRow,
    r#type: InvoiceType,
) -> Result<(), WrongInvoiceType> {
    if invoice.r#type != r#type.into() {
        Err(WrongInvoiceType {})
    } else {
        Ok(())
    }
}

pub struct InvoiceIsFinalised;

pub fn check_invoice_finalised(invoice: &InvoiceRow) -> Result<(), InvoiceIsFinalised> {
    if invoice.status == InvoiceRowStatus::Finalised {
        Err(InvoiceIsFinalised {})
    } else {
        Ok(())
    }
}
pub enum InvoiceStatusError {
    CannotChangeStatusOfInvoiceOnHold,
    CannotChangeInvoiceBackToDraft,
}

pub fn check_invoice_status(
    invoice: &InvoiceRow,
    status_option: &Option<InvoiceStatus>,
    on_hold_option: &Option<bool>,
) -> Result<(), InvoiceStatusError> {
    if let Some(new_status) = status_option {
        let existing_status: InvoiceStatus = invoice.status.clone().into();
        // When we update invoice, error will trigger if
        // * invoice is currently on hold and is not being change to be not on hold
        let is_not_on_hold = !invoice.on_hold || !on_hold_option.unwrap_or(true);

        if *new_status != existing_status && !is_not_on_hold {
            return Err(InvoiceStatusError::CannotChangeStatusOfInvoiceOnHold);
        }
        if *new_status == InvoiceStatus::Draft && existing_status == InvoiceStatus::Confirmed {
            return Err(InvoiceStatusError::CannotChangeInvoiceBackToDraft);
        }
    }

    Ok(())
}

pub struct InvoiceDoesNotExist;

pub fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, WithDBError<InvoiceDoesNotExist>> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    match result {
        Ok(invoice_row) => Ok(invoice_row),
        Err(RepositoryError::NotFound) => Err(WithDBError::err(InvoiceDoesNotExist)),
        Err(error) => Err(WithDBError::db(error)),
    }
}

pub struct InvoiceLinesExist(pub Vec<InvoiceLine>);

pub fn check_invoice_is_empty(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), WithDBError<InvoiceLinesExist>> {
    let lines = InvoiceLineRepository::new(connection)
        .query(
            Pagination::new(),
            Some(InvoiceLineFilter::new().match_invoice_id(id)),
            None,
        )
        .map_err(WithDBError::db)?;

    if lines.len() > 0 {
        Err(WithDBError::err(InvoiceLinesExist(lines)))
    } else {
        Ok(())
    }
}
