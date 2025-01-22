use crate::invoice::check_invoice_exists;
use crate::store_preference::get_store_preferences;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::Name;
use repository::StorageConnection;

use super::{InsertInboundShipment, InsertInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertInboundShipment,
) -> Result<Name, InsertInboundShipmentError> {
    use InsertInboundShipmentError::*;
    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

    let store_pref = get_store_preferences(connection, store_id)?;

    if input.requisition_id.is_some()
        && !store_pref.manually_link_internal_order_to_inbound_shipment
    {
        return Err(CannotLinkARequisitionToInboundShipment);
    }

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
