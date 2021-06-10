//! src/services/graphql/mutations.rs

use crate::database::{DatabaseConnection, ItemRow, RequisitionLineRow, RequisitionRow};
use crate::server::graphql::{InputRequisitionLine, Item, Requisition};

pub struct Mutations;
#[juniper::graphql_object(context = DatabaseConnection)]
impl Mutations {
    #[graphql(arguments(
        id(description = "id of the item"),
        item_name(description = "name of the item"),
    ))]
    async fn insert_item(database: &DatabaseConnection, id: String, item_name: String) -> Item {
        let item_row = ItemRow {
            id: id.clone(),
            item_name: item_name.clone(),
        };

        database
            .create_item(&item_row)
            .await
            .expect("Failed to insert item into database");

        Item { item_row }
    }

    #[graphql(arguments(
        id(description = "id of the requisition"),
        name_id(description = "id of the receiving store"),
        store_id(description = "id of the sending store"),
        requisition_lines(description = "requisition lines attached to the requisition")
    ))]
    async fn insert_requisition(
        database: &DatabaseConnection,
        id: String,
        name_id: String,
        store_id: String,
        requisition_lines: Vec<InputRequisitionLine>,
    ) -> Requisition {
        let requisition_row = RequisitionRow {
            id: id.clone(),
            name_id: name_id.clone(),
            store_id: store_id.clone(),
        };

        database
            .create_requisition(&requisition_row)
            .await
            .expect("Failed to insert requisition into database");

        let requisition_line_rows: Vec<RequisitionLineRow> = requisition_lines
            .clone()
            .into_iter()
            .map(|line| RequisitionLineRow {
                id: line.id,
                requisition_id: id.clone(),
                item_id: line.item_id,
                actual_quantity: line.actual_quantity,
                suggested_quantity: line.suggested_quantity,
            })
            .collect();

        for requisition_line_row in requisition_line_rows {
            database
                .create_requisition_line(&requisition_line_row)
                .await
                .expect("Failed to insert requisition_line into database")
        }

        Requisition { requisition_row }
    }
}
