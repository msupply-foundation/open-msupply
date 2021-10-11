use crate::{
    database::repository::{
        InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection,
    },
    domain::{name::NameFilter, supplier_invoice::InsertSupplierInvoice, Pagination},
};

use super::InsertSupplierInvoiceError;

pub fn validate(
    input: &InsertSupplierInvoice,
    connection: &StorageConnection,
) -> Result<(), InsertSupplierInvoiceError> {
    check_invoice_does_not_exists(&input.id, connection)?;
    check_other_party(&input.other_party_id, connection)
}

pub fn check_invoice_does_not_exists(
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

pub fn check_other_party(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertSupplierInvoiceError> {
    use InsertSupplierInvoiceError::*;
    let repository = NameQueryRepository::new(&connection);

    let mut result = repository.query(
        Pagination::one(),
        Some(NameFilter::new().match_id(&id)),
        None,
    )?;

    if let Some(name) = result.pop() {
        if name.is_supplier {
            Ok(())
        } else {
            Err(OtherPartyNotASupplier(name))
        }
    } else {
        Err(OtherPartyDoesNotExists)
    }
}
