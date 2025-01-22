use crate::invoice::check_invoice_exists;
use crate::store_preference::get_store_preferences;
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{
    EqualFilter, Name, RepositoryError, Requisition, RequisitionFilter, RequisitionRepository,
};
use repository::{RequisitionType, StorageConnection};

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

    if let Some(requisition_id) = &input.requisition_id {
        if !store_pref.manually_link_internal_order_to_inbound_shipment {
            return Err(CannotLinkARequisitionToInboundShipment);
        }

        let requisition = check_requisition_exists(connection, requisition_id)?
            .ok_or(RequisitionDoesNotExist)?
            .requisition_row;

        if requisition.r#type != RequisitionType::Request {
            return Err(NotAnInternalOrder);
        }

        if requisition.store_id != store_id {
            return Err(InternalOrderDoesNotBelongToStore);
        }
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

pub fn check_requisition_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<Requisition>, RepositoryError> {
    Ok(RequisitionRepository::new(connection)
        .query_by_filter(RequisitionFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}
