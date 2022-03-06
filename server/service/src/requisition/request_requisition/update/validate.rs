use super::{OutError, UpdateRequestRequisition};
use crate::requisition::{
    common::check_requisition_exists,
    request_requisition::{check_other_party, OtherPartyErrors},
};
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

    check_other_party(connection, store_id, &other_party_id).map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotASupplier(name) => OutError::OtherPartyNotASupplier(name),
        OtherPartyErrors::OtherPartyIsNotAStore => OutError::OtherPartyIsNotAStore,
        OtherPartyErrors::OtherPartyIsThisStore => OutError::OtherPartyIsThisStore,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    Ok(requisition_row)
}
