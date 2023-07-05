use repository::Name;
use repository::StorageConnection;

use crate::invoice::check_invoice_does_not_exists;
use crate::invoice::InvoiceAlreadyExistsError;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertOutboundShipment, InsertOutboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundShipment,
) -> Result<Name, InsertOutboundShipmentError> {
    use InsertOutboundShipmentError::*;
    check_invoice_does_not_exists(&input.id, connection).map_err(|e| match e {
        InvoiceAlreadyExistsError::InvoiceAlreadyExists => InvoiceAlreadyExists,
        InvoiceAlreadyExistsError::RepositoryError(err) => DatabaseError(err),
    })?;

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
