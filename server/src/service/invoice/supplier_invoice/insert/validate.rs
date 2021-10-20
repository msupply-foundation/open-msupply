use crate::{
    database::repository::{InvoiceRepository, RepositoryError, StorageConnection},
    domain::supplier_invoice::InsertSupplierInvoice,
    service::invoice::supplier_invoice::check_other_party,
};

use super::InsertSupplierInvoiceError;

pub fn validate(
    input: &InsertSupplierInvoice,
    connection: &StorageConnection,
) -> Result<(), InsertSupplierInvoiceError> {
    check_invoice_does_not_exists(&input.id, connection)?;
    check_other_party(Some(input.other_party_id.to_string()), connection)?;
    Ok(())
}

fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertSupplierInvoiceError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(error) = result {
        Err(error.into())
    } else {
        Err(InsertSupplierInvoiceError::InvoiceAlreadyExists)
    }
}
