use repository::{RequisitionLineRow, RequisitionRow};

use crate::{
    requisition::request_requisition::generate_requisition_lines, service_provider::ServiceContext,
};

use super::{InsertResponseRequisitionLine, OutError};

pub fn generate(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: RequisitionRow,
    InsertResponseRequisitionLine {
        id,
        requisition_id: _,
        item_id,
        their_stock_on_hand,
        requested_quantity,
        supply_quantity,
        comment,
    }: InsertResponseRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let mut new_requisition_line =
        generate_requisition_lines(ctx, store_id, &requisition_row, vec![item_id])?
            .pop()
            .ok_or(OutError::CannotFindItemStatusForRequisitionLine)?;

    new_requisition_line.id = id;
    new_requisition_line.initial_stock_on_hand_units = their_stock_on_hand.unwrap_or(0.0);
    new_requisition_line.supply_quantity = supply_quantity.unwrap_or(0.0);
    new_requisition_line.requested_quantity = requested_quantity.unwrap_or(0.0);
    new_requisition_line.comment = comment.or(new_requisition_line.comment);

    Ok(new_requisition_line)
}
