use crate::invoice::inbound_shipment::check_other_party;
use domain::inbound_shipment::InsertInboundShipment;
use repository::repository::{InvoiceRepository, RepositoryError, StorageConnection};

use super::InsertInboundShipmentError;

pub fn validate(
    input: &InsertInboundShipment,
    connection: &StorageConnection,
) -> Result<(), InsertInboundShipmentError> {
    check_invoice_does_not_exists(&input.id, connection)?;
    check_other_party(Some(input.other_party_id.to_string()), connection)?;
    Ok(())
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
