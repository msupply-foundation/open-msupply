use super::InsertResponseRequisitionLine;
use chrono::Utc;
use repository::{ItemRow, RequisitionLineRow, RequisitionRow};

pub fn generate(
    requisition_row: RequisitionRow,
    item_row: ItemRow,
    InsertResponseRequisitionLine {
        id,
        requisition_id: _,
        item_id: _,
    }: InsertResponseRequisitionLine,
) -> RequisitionLineRow {
    RequisitionLineRow {
        id: id.clone(),
        item_link_id: item_row.id,
        item_name: item_row.name,
        requisition_id: requisition_row.id,
        snapshot_datetime: Some(Utc::now().naive_utc()),
        // Default
        suggested_quantity: 0.0,
        requested_quantity: 0.0,
        initial_stock_on_hand_units: 0.0,
        available_stock_on_hand: 0.0,
        average_monthly_consumption: 0.0,
        supply_quantity: 0.0,
        incoming_units: 0.0,
        outgoing_units: 0.0,
        loss_in_units: 0.0,
        addition_in_units: 0.0,
        expiring_units: 0.0,
        days_out_of_stock: 0.0,
        option_id: None,
        comment: None,
        approved_quantity: 0.0,
        approval_comment: None,
    }
}
