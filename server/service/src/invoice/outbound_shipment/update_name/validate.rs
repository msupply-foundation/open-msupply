use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{InvoiceRow, InvoiceRowType, Name, StorageConnection};

use super::{UpdateOutboundShipmentName, UpdateOutboundShipmentNameError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateOutboundShipmentName,
) -> Result<(InvoiceRow, Option<Name>), UpdateOutboundShipmentNameError> {
    use UpdateOutboundShipmentNameError::*;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(InvoiceIsNotEditable);
    }

    let other_party_id = match &patch.other_party_id {
        None => return Ok((invoice, None)),
        Some(other_party_id) => other_party_id,
    };

    // Other party check
    let other_party = check_other_party(
        connection,
        store_id,
        &other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok((invoice, Some(other_party)))
}
