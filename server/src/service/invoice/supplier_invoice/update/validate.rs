use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceRow, InvoiceRowStatus},
    },
    domain::{
        invoice::{InvoiceStatus, InvoiceType},
        supplier_invoice::UpdateSupplierInvoice,
    },
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type,
        supplier_invoice::check_other_party, InvoiceDoesNotExist, InvoiceIsFinalised,
        OtherPartyError, WrongInvoiceType,
    },
};

use super::UpdateSupplierInvoiceError;

pub fn validate(
    patch: &UpdateSupplierInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, UpdateSupplierInvoiceError> {
    let invoice = check_invoice_exists(&patch.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::SupplierInvoice)?;
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

impl From<OtherPartyError> for UpdateSupplierInvoiceError {
    fn from(error: OtherPartyError) -> Self {
        use UpdateSupplierInvoiceError::*;
        match error {
            OtherPartyError::NotASupplier(name) => OtherPartyNotASupplier(name),
            OtherPartyError::DoesNotExist => OtherPartyDoesNotExist,
            OtherPartyError::DatabaseError(error) => DatabaseError(error),
        }
    }
}

impl From<WrongInvoiceType> for UpdateSupplierInvoiceError {
    fn from(_: WrongInvoiceType) -> Self {
        UpdateSupplierInvoiceError::NotASupplierInvoice
    }
}

impl From<InvoiceIsFinalised> for UpdateSupplierInvoiceError {
    fn from(_: InvoiceIsFinalised) -> Self {
        UpdateSupplierInvoiceError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for UpdateSupplierInvoiceError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        UpdateSupplierInvoiceError::InvoiceDoesNotExist
    }
}
