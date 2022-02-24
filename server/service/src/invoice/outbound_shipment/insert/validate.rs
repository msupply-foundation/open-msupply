use repository::Name;
use repository::{InvoiceRepository, RepositoryError, StorageConnection};

use crate::invoice::check_other_party_id;

use super::{InsertOutboundShipment, InsertOutboundShipmentError};

pub fn validate(
    input: &InsertOutboundShipment,
    connection: &StorageConnection,
) -> Result<Name, InsertOutboundShipmentError> {
    use InsertOutboundShipmentError::*;
    check_invoice_does_not_exists(&input.id, connection)?;

    let other_party = check_other_party_id(connection, &input.other_party_id)?
        .ok_or(OtherPartyIdNotFound(input.id.clone()))?;

    if !other_party.is_customer() {
        return Err(OtherPartyNotACustomer(other_party));
    }

    // TODO check OtherPartyCannotBeThisStore

    // TODO add check that customer belongs to "this" store (from name_store_join?)
    // OtherPartyNotACustomerOfThisStore

    Ok(other_party)
}

pub fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertOutboundShipmentError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(error) = result {
        Err(error.into())
    } else {
        Err(InsertOutboundShipmentError::InvoiceAlreadyExists)
    }
}
