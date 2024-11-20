use repository::{ItemRow, RequisitionRow, RequisitionStatus, RequisitionType, StorageConnection};

use crate::{
    item::get_item,
    requisition::common::check_requisition_row_exists,
    requisition_line::common::{check_item_exists_in_requisition, check_requisition_line_exists},
};

use super::{InsertResponseRequisitionLine, OutError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertResponseRequisitionLine,
) -> Result<(RequisitionRow, ItemRow), OutError> {
    if (check_requisition_line_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionLineAlreadyExists);
    }

    let requisition_row = check_requisition_row_exists(connection, &input.requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.program_id.is_some() {
        return Err(OutError::CannotAddItemToProgramRequisition);
    }

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status == RequisitionStatus::Finalised {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if (check_item_exists_in_requisition(connection, &input.requisition_id, &input.item_id)?)
        .is_some()
    {
        return Err(OutError::ItemAlreadyExistInRequisition);
    }

    let item = get_item(connection, store_id.to_string(), &input.item_id)?
        .ok_or(OutError::ItemDoesNotExist)?;

    Ok((requisition_row, item.item_row))
}
