use repository::Name;
use repository::{InvoiceRowRepository, RepositoryError, StorageConnection};

use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};

use super::{InsertOutboundShipment, InsertOutboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertOutboundShipment,
) -> Result<Name, InsertOutboundShipmentError> {
    use InsertOutboundShipmentError::*;
    check_invoice_does_not_exists(&input.id, connection)?;

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

pub fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertOutboundShipmentError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(error) = result {
        Err(error.into())
    } else {
        Err(InsertOutboundShipmentError::InvoiceAlreadyExists)
    }
}
