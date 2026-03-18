use crate::{
    requisition::request_requisition::generate_requisition_lines,
    requisition_line::request_requisition_line::{insert::OutError, InsertRequestRequisitionLine},
    service_provider::ServiceContext,
};
use repository::{RequisitionLineRow, RequisitionRow};

pub fn generate(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    InsertRequestRequisitionLine {
        id,
        requisition_id: _,
        item_id,
    }: InsertRequestRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let mut requisition_line =
        generate_requisition_lines(ctx, store_id, requisition_row, vec![item_id], None)?
            .pop()
            .ok_or(OutError::CannotFindItemStatusForRequisitionLine)?;

    requisition_line.id = id;

    Ok(requisition_line)
}
