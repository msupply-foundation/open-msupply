//! src/services/graphql/mutations.rs

use crate::server::graphql::{InputRequisitionLine, Requisition, RequisitionLine};
use crate::database::{DatabaseConnection, RequisitionLineRow, RequisitionRow};

pub struct Mutations;
#[juniper::graphql_object(context = DatabaseConnection)]
impl Mutations {
    #[graphql(arguments(
        id(description = "id of the requisition"),
        from_id(description = "id of the sending store"),
        to_id(description = "id of the receiving store"),
        requisition_lines(description = "requisition lines attached to the requisition")
    ))]
    async fn insert_requisition(
        database: &DatabaseConnection,
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
            .create_requisition(&requisition_row)
            .await
            .expect("Failed to insert requisition into DatabaseConnection");

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
                .create_requisition_line(&requisition_line_row)
                .await
                .unwrap();
        }

        Requisition {
            id: requisition_row.id,
            from_id: requisition_row.from_id,
            to_id: requisition_row.to_id,
            requisition_lines,
        }
    }
}
