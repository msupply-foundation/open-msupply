//! src/services/graphql/mutations.rs

use crate::database::{DatabaseConnection, ItemRow, RequisitionLineRow, RequisitionRow};
use crate::server::graphql::{InputRequisitionLine, Item, Requisition, RequisitionLine};

pub struct Mutations;
#[juniper::graphql_object(context = DatabaseConnection)]
impl Mutations {
    #[graphql(arguments(
        id(description = "id of the item"),
        name(description = "name of the item"),
    ))]
    async fn insert_item(database: &DatabaseConnection, id: String, name: String) -> Item {
        let item_row = ItemRow {
            id: id.clone(),
            item_name: name.clone(),
        };

        database
            .create_item(&item_row)
            .await
            .expect("Failed to insert item into database");

        Item {
            id: item_row.id,
            name: item_row.item_name,
        }
    }

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
            name_id: from_id.clone(),
            store_id: to_id.clone(),
        };

        database
            .create_requisition(&requisition_row)
            .await
            .expect("Failed to insert requisition into DatabaseConnection");

        let requisition_lines: Vec<RequisitionLine> = requisition_lines
            .into_iter()
            .map(|line| RequisitionLine {
                id: line.id,
                item_id: line.item_id,
                item_quantity: line.item_quantity,
            })
            .collect();

        let requisition_line_rows: Vec<RequisitionLineRow> = requisition_lines
            .clone()
            .into_iter()
            .map(|line| RequisitionLineRow {
                id: line.id,
                requisition_id: id.clone(),
                item_id: line.item_id,
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
            from_id: requisition_row.name_id,
            to_id: requisition_row.store_id,
            requisition_lines,
        }
    }
}
