//! src/services/graphql/queries.rs

use crate::database::DatabaseConnection;
use crate::server::graphql::{Item, ItemLine, Requisition, RequisitionLine};

use juniper::graphql_object;
pub struct Queries;
#[graphql_object(context = DatabaseConnection)]
impl Queries {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(database: &DatabaseConnection, id: String) -> Requisition {
        let requisition_row = database
            .get_requisition(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        let requisition_line_rows = database
            .get_requisition_lines(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get lines for requisition {}", id));

        Requisition {
            id: requisition_row.id,
            from_id: requisition_row.name_id,
            to_id: requisition_row.store_id,
            requisition_lines: requisition_line_rows
                .into_iter()
                .map(|line| RequisitionLine {
                    id: line.id,
                    item_id: line.item_id,
                    item_quantity: line.item_quantity as f64,
                })
                .collect(),
        }
    }

    #[graphql(arguments(id(description = "id of the item")))]
    pub async fn item(database: &DatabaseConnection, id: String) -> Item {
        let item_row = database
            .get_item(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        Item {
            id: item_row.id,
            name: item_row.item_name,
        }
    }

    #[graphql(arguments(id(description = "id of the item line")))]
    pub async fn item_line(database: &DatabaseConnection, id: String) -> ItemLine {
        let item_line_row = database
            .get_item_line(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        ItemLine {
            id: item_line_row.id,
            batch: item_line_row.batch,
            quantity: item_line_row.quantity as f64,
        }
    }
}
