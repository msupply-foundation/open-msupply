use crate::invoice::check_other_party_id;
use repository::Name;
use repository::{InvoiceRepository, RepositoryError, StorageConnection};

use super::{InsertInboundShipment, InsertInboundShipmentError};

pub fn validate(
    input: &InsertInboundShipment,
    connection: &StorageConnection,
) -> Result<Name, InsertInboundShipmentError> {
    use InsertInboundShipmentError::*;
    check_invoice_does_not_exists(&input.id, connection)?;

    let other_party = check_other_party_id(connection, &input.other_party_id)?
        .ok_or(OtherPartyDoesNotExist {})?;

    if !other_party.is_supplier() {
        return Err(OtherPartyNotASupplier(other_party));
    }
    Ok(other_party)
}

fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertInboundShipmentError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(error) = result {
        Err(error.into())
    } else {
        Err(InsertInboundShipmentError::InvoiceAlreadyExists)
    }
}
