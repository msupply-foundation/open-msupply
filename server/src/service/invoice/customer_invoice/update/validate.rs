use crate::{
    database::{
        repository::{InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    },
    domain::{
        customer_invoice::UpdateCustomerInvoice, invoice::InvoiceStatus, name::NameFilter,
        Pagination,
    },
};

use super::UpdateCustomerInvoiceError;

pub fn validate(
    patch: &UpdateCustomerInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateCustomerInvoiceError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;
    check_invoice_status(patch, &invoice)?;
    check_other_party(&patch.other_party_id, connection)?;

    Ok(invoice)
}

fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateCustomerInvoiceError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(UpdateCustomerInvoiceError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

fn check_invoice_status(
    patch: &UpdateCustomerInvoice,
    invoice: &InvoiceRow,
) -> Result<(), UpdateCustomerInvoiceError> {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Confirmed, Some(InvoiceStatus::Draft)) => {
            Err(UpdateCustomerInvoiceError::CannotChangeInvoiceBackToDraft)
        }
        _ => Ok(()),
    }
}

fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), UpdateCustomerInvoiceError> {
    if invoice.r#type != InvoiceRowType::SupplierInvoice {
        Err(UpdateCustomerInvoiceError::NotASupplierInvoice)
    } else {
        Ok(())
    }
}

fn check_invoice_finalised(invoice: &InvoiceRow) -> Result<(), UpdateCustomerInvoiceError> {
    if invoice.status == InvoiceRowStatus::Finalised {
        Err(UpdateCustomerInvoiceError::InvoiceIsFinalised)
    } else {
        Ok(())
    }
}

pub fn check_other_party(
    id_option: &Option<String>,
    connection: &StorageConnection,
) -> Result<(), UpdateCustomerInvoiceError> {
    use UpdateCustomerInvoiceError::*;

    if let Some(id) = id_option {
        let repository = NameQueryRepository::new(&connection);

        let mut result = repository.query(
            Pagination::one(),
            Some(NameFilter::new().match_id(&id)),
            None,
        )?;

        if let Some(name) = result.pop() {
            if name.is_customer {
                Ok(())
            } else {
                Err(OtherPartyNotACustomer(name))
            }
        } else {
            Err(OtherPartyDoesNotExists)
        }
    } else {
        Ok(())
    }
}
