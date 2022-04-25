use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::Name;
use repository::{InvoiceRowRepository, RepositoryError, StorageConnection};

use super::{InsertInboundShipment, InsertInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertInboundShipment,
) -> Result<Name, InsertInboundShipmentError> {
    use InsertInboundShipmentError::*;
    check_invoice_does_not_exists(&input.id, connection)?;

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok(other_party)
}

fn check_invoice_does_not_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), InsertInboundShipmentError> {
    let result = InvoiceRowRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        Ok(())
    } else if let Err(error) = result {
        Err(error.into())
    } else {
        Err(InsertInboundShipmentError::InvoiceAlreadyExists)
    }
}
