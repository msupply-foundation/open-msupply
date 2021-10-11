use crate::{
    database::{
        repository::{InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    },
    domain::{
        invoice::InvoiceStatus, name::NameFilter, supplier_invoice::UpdateSupplierInvoice,
        Pagination,
    },
};

use super::UpdateSupplierInvoiceError;

pub fn validate(
    patch: &UpdateSupplierInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateSupplierInvoiceError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_status(patch, &invoice)?;
    check_other_party(&patch.other_party_id, connection)?;

    Ok(invoice)
}

pub fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateSupplierInvoiceError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateSupplierInvoiceError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

pub fn check_invoice_status(
    patch: &UpdateSupplierInvoice,
    invoice: &InvoiceRow,
) -> Result<(), UpdateSupplierInvoiceError> {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Finalised, _) => Err(UpdateSupplierInvoiceError::CannotEditFinalised),
        (InvoiceRowStatus::Confirmed, Some(InvoiceStatus::Draft)) => {
            Err(UpdateSupplierInvoiceError::CannotChangeInvoiceBackToDraft)
        }
        _ => Ok(()),
    }
}

pub fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateSupplierInvoiceError> {
    if invoice.r#type != InvoiceRowType::SupplierInvoice {
        Err(UpdateSupplierInvoiceError::NotASupplierInvoice)
    } else {
        Ok(())
    }
}

pub fn check_other_party(
    id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), UpdateSupplierInvoiceError> {
    use UpdateSupplierInvoiceError::*;

    if let Some(id) = id_option {
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
    } else {
        Ok(())
    }
}
