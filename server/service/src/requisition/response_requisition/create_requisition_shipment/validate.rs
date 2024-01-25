use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    Requisition, StorageConnection,
};

use crate::requisition::requisition_supply_status::RequisitionLineSupplyStatus;
use crate::requisition::{
    common::check_requisition_exists, requisition_supply_status::get_requisitions_supply_statuses,
};

use super::{CreateRequisitionShipment, OutError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &CreateRequisitionShipment,
) -> Result<(Requisition, Vec<RequisitionLineSupplyStatus>), OutError> {
    let requisition = check_requisition_exists(connection, &input.response_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;
    let requisition_row = &requisition.requisition_row;
    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    let supply_statuses =
        get_requisitions_supply_statuses(connection, vec![requisition_row.id.clone()])?;

    let remaing_to_supply = RequisitionLineSupplyStatus::lines_remaining_to_supply(supply_statuses);

    if remaing_to_supply.len() == 0 {
        return Err(OutError::NothingRemainingToSupply);
    }

    Ok((requisition, remaing_to_supply))
}
