use chrono::Utc;
use repository::{ItemRow, RequisitionLineRow, RequisitionRow};

use crate::requisition::request_requisition::{
    generate_suggested_quantity, GenerateSuggestedQuantity,
};

use super::InsertResponseRequisitionLine;

pub fn generate(
    requisition_row: RequisitionRow,
    item_row: ItemRow,
    InsertResponseRequisitionLine {
        id,
        requisition_id: _,
        item_id: _,
        supply_quantity,
        comment,
        stock_on_hand,
        requested_quantity,
        average_monthly_consumption,
        incoming_units,
        outgoing_units,
        loss_in_units,
        addition_in_units,
        expiring_units,
        days_out_of_stock,
        option_id,
    }: InsertResponseRequisitionLine,
) -> RequisitionLineRow {
    let suggested_quantity = generate_suggested_quantity(GenerateSuggestedQuantity {
        average_monthly_consumption: average_monthly_consumption.unwrap_or(0.0),
        available_stock_on_hand: stock_on_hand.unwrap_or(0.0),
        min_months_of_stock: requisition_row.min_months_of_stock,
        max_months_of_stock: requisition_row.max_months_of_stock,
    });

    RequisitionLineRow {
        id: id.clone(),
        item_link_id: item_row.id,
        item_name: item_row.name,
        requisition_id: requisition_row.id,
        requested_quantity: requested_quantity.unwrap_or(0.0),
        initial_stock_on_hand_units: stock_on_hand.unwrap_or(0.0),
        available_stock_on_hand: stock_on_hand.unwrap_or(0.0),
        average_monthly_consumption: average_monthly_consumption.unwrap_or(0.0),
        supply_quantity: supply_quantity.unwrap_or(0.0),
        incoming_units: incoming_units.unwrap_or(0.0),
        outgoing_units: outgoing_units.unwrap_or(0.0),
        loss_in_units: loss_in_units.unwrap_or(0.0),
        addition_in_units: addition_in_units.unwrap_or(0.0),
        expiring_units: expiring_units.unwrap_or(0.0),
        days_out_of_stock: days_out_of_stock.unwrap_or(0.0),
        suggested_quantity,
        option_id: option_id.clone(),
        comment,
        snapshot_datetime: Some(Utc::now().naive_utc()),
        // Default
        approved_quantity: 0.0,
        approval_comment: None,
    }
}
