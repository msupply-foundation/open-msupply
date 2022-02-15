use super::{OutError, UpdateRequestRequisition};
use crate::requisition::common::check_requisition_exists;
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
    Ok(requisition_row)
}
