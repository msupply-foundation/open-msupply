use crate::{
    database::{
        repository::{InvoiceRepository, RepositoryError, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus},
    },
    domain::invoice::InvoiceType,
    service::WithDBError,
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
