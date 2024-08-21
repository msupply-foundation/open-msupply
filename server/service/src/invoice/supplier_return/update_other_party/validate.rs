use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{InvoiceRow, InvoiceType, Name, StorageConnection};

use super::{UpdateSupplierReturnOtherParty, UpdateSupplierReturnOtherPartyError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateSupplierReturnOtherParty,
) -> Result<(InvoiceRow, Option<Name>), UpdateSupplierReturnOtherPartyError> {
    use UpdateSupplierReturnOtherPartyError::*;

    let return_row = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&return_row, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&return_row, InvoiceType::SupplierReturn) {
        return Err(NotAnSupplierReturn);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(InvoiceIsNotEditable);
    }

    let other_party_id = match &patch.other_party_id {
        None => return Ok((return_row, None)),
        Some(other_party_id) => other_party_id,
    };

    // Other party check
    let other_party = check_other_party(
        connection,
        store_id,
        other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok((return_row, Some(other_party)))
}
