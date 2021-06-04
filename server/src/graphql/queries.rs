//! src/graphql/queries.rs

use crate::database::Database;
use crate::graphql::schema::{Requisition, RequisitionLine};

pub async fn query_requisition(database: &Database, id: String) -> Requisition {
    let requisition_row = database.select_requisition(id.to_string()).await.unwrap();
    let requisition_line_rows = database
        .select_requisition_lines(id.to_string())
        .await
        .unwrap();

    let requisition = Requisition {
        id: requisition_row.id,
        from_id: requisition_row.from_id,
        to_id: requisition_row.to_id,
        requisition_lines: requisition_line_rows
            .into_iter()
            .map(|line| RequisitionLine {
                id: line.id,
                item_name: line.item_name,
                item_quantity: line.item_quantity as f64,
            })
            .collect(),
    };

    requisition
}
