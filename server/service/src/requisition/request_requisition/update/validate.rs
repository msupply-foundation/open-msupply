use super::{OutError, UpdateRequestRequisition};
use crate::requisition::{common::check_requisition_exists, request_requisition::check_other_party_exists};
use repository::{
    schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    StorageConnection,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateRequestRequisition,
) -> Result<RequisitionRow, OutError> {
    let requisition_row = check_requisition_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    let other_party_id = match &input.other_party_id {
        None => return Ok(requisition_row),
        Some(other_party_id) => other_party_id,
    };

    let other_party = check_other_party_exists(connection, &other_party_id)?
        .ok_or(OutError::OtherPartyDoesNotExist)?;

    if !other_party.is_supplier() {
        return Err(OutError::OtherPartyNotASupplier(other_party));
    }

    let other_party_store_id = other_party
        .store_id()
        .ok_or(OutError::OtherPartyIsNotAStore)?;

    if store_id == other_party_store_id {
        return Err(OutError::OtherPartyIsThisStore);
    }

    Ok(requisition_row)
}
