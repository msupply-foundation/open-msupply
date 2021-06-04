//! src/graphql/mutations.rs

use crate::database::{Database, RequisitionLineRow, RequisitionRow};
use crate::graphql::{InputRequisitionLine, Requisition, RequisitionLine};

pub async fn mutate_requisition(
    database: &Database,
    id: String,
    from_id: String,
    to_id: String,
    requisition_lines: Vec<InputRequisitionLine>,
) -> Requisition {
    let requisition_row = RequisitionRow {
        id: id.clone(),
        from_id: from_id.clone(),
        to_id: to_id.clone(),
    };

    database
        .insert_requisition(&requisition_row)
        .await
        .expect("Failed to insert requisition into database");

    let requisition_lines: Vec<RequisitionLine> = requisition_lines
        .into_iter()
        .map(|line| RequisitionLine {
            id: line.id,
            item_name: line.item_name,
            item_quantity: line.item_quantity,
        })
        .collect();

    let requisition_line_rows: Vec<RequisitionLineRow> = requisition_lines
        .clone()
        .into_iter()
        .map(|line| RequisitionLineRow {
            id: line.id,
            requisition_id: id.clone(),
            item_name: line.item_name,
            item_quantity: line.item_quantity as f32,
        })
        .collect();

    for requisition_line_row in requisition_line_rows {
        database
            .insert_requisition_line(&requisition_line_row)
            .await
            .unwrap();
    }

    Requisition {
        id: requisition_row.id,
        from_id: requisition_row.from_id,
        to_id: requisition_row.to_id,
        requisition_lines: requisition_lines,
    }
}
