use domain::{name::NameFilter, outbound_shipment::InsertOutboundShipment};
use repository::{InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection};

use super::InsertOutboundShipmentError;

pub fn validate(
    input: &InsertOutboundShipment,
    connection: &StorageConnection,
) -> Result<(), InsertOutboundShipmentError> {
    check_invoice_does_not_exists(&input.id, connection)?;
    check_other_party_id(input, connection)?;

    // TODO check OtherPartyCannotBeThisStore

    // TODO add check that customer belongs to "this" store (from name_store_join?)
    // OtherPartyNotACustomerOfThisStore

    Ok(())
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

pub fn check_other_party_id(
    input: &InsertOutboundShipment,
    connection: &StorageConnection,
) -> Result<(), InsertOutboundShipmentError> {
    use InsertOutboundShipmentError::*;
    let repository = NameQueryRepository::new(&connection);

    let other_party_id = &input.other_party_id;
    let mut result =
        repository.query_by_filter(NameFilter::new().id(|f| f.equal_to(&other_party_id)))?;

    if let Some(name) = result.pop() {
        if name.is_customer {
            Ok(())
        } else {
            Err(OtherPartyNotACustomer(name))
        }
    } else {
        Err(OtherPartyIdNotFound(other_party_id.to_string()))
    }
}
