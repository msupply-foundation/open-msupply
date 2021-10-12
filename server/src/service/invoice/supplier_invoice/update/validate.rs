use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceRow, InvoiceRowStatus},
    },
    domain::{invoice::InvoiceStatus, supplier_invoice::UpdateSupplierInvoice},
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type,
        supplier_invoice::check_other_party, CommonError, OtherPartyError,
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
    check_invoice_finalised(&invoice)?;
    check_invoice_status(patch, &invoice)?;
    check_other_party(patch.other_party_id.clone(), connection)?;

    Ok(invoice)
}

fn check_invoice_status(
    patch: &UpdateSupplierInvoice,
    invoice: &InvoiceRow,
) -> Result<(), UpdateSupplierInvoiceError> {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Confirmed, Some(InvoiceStatus::Draft)) => {
            Err(UpdateSupplierInvoiceError::CannotChangeInvoiceBackToDraft)
        }
        _ => Ok(()),
    }
}

impl From<CommonError> for UpdateSupplierInvoiceError {
    fn from(error: CommonError) -> Self {
        use UpdateSupplierInvoiceError::*;
        match error {
            CommonError::InvoiceDoesNotExists => InvoiceDoesNotExists,
            CommonError::DatabaseError(error) => DatabaseError(error),
            CommonError::InvoiceIsFinalised => CannotEditFinalised,
            CommonError::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}

impl From<OtherPartyError> for UpdateSupplierInvoiceError {
    fn from(error: OtherPartyError) -> Self {
        use UpdateSupplierInvoiceError::*;
        match error {
            OtherPartyError::NotASupplier(name) => OtherPartyNotASupplier(name),
            OtherPartyError::DoesNotExist => OtherPartyDoesNotExists,
            OtherPartyError::DatabaseError(error) => DatabaseError(error),
        }
    }
}
