use crate::invoice::check_invoice_exists;
use crate::invoice::inbound_shipment::check_inbound_shipment_mutation_permission;
use crate::purchase_order::validate::check_purchase_order_exists;
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
    user_id: &str,
    input: &InsertInboundShipment,
) -> Result<Name, InsertInboundShipmentError> {
    use InsertInboundShipmentError::*;

    let is_external = input.purchase_order_id.is_some();
    check_inbound_shipment_mutation_permission(connection, store_id, user_id, is_external)?;

    if (check_invoice_exists(&input.id, connection)?).is_some() {
        return Err(InvoiceAlreadyExists);
    }

    if let Some(purchase_order_id) = &input.purchase_order_id {
        if check_purchase_order_exists(purchase_order_id, connection)?.is_none() {
            return Err(PurchaseOrderDoesNotExist);
        }
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
        .query_by_filter(RequisitionFilter::new().id(EqualFilter::equal_to(id.to_string())))?
        .pop())
}
