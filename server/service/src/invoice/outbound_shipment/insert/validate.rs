use repository::Name;
use repository::StorageConnection;

use crate::invoice::check_invoice_exists;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertOutboundShipment, InsertOutboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundShipment,
) -> Result<Name, InsertOutboundShipmentError> {
    use InsertOutboundShipmentError::*;
    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    // TODO add check that customer belongs to "this" store (from name_store_join?)
    // OtherPartyNotACustomerOfThisStore

    Ok(other_party)
}
