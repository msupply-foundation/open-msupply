//! src/services/graphql/queries.rs

use crate::database::schema::{ItemLineRow, ItemRow, NameRow, RequisitionRow, StoreRow};
use crate::database::DatabaseConnection;
use crate::server::graphql::{Item, ItemLine, Name, Requisition, Store};

use juniper::graphql_object;
pub struct Queries;
#[graphql_object(context = DatabaseConnection)]
impl Queries {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the name")))]
    pub async fn name(database: &DatabaseConnection, id: String) -> Name {
        let name_row: NameRow = database
            .get_name(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get name {}", id));

        Name { name_row }
    }

    #[graphql(arguments(id(description = "id of the store")))]
    pub async fn store(database: &DatabaseConnection, id: String) -> Store {
        let store_row: StoreRow = database
            .get_store(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        let name_row: NameRow = database
            .get_name(store_row.name_id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get name for store {}", id));

        Store {
            id: store_row.id,
            name: Name {
                id: name_row.id,
                name: name_row.name,
            },
        }
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(database: &DatabaseConnection, id: String) -> Requisition {
        let requisition_row: RequisitionRow = database
            .get_requisition(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition {
            id: requisition_row.id,
            name_id: requisition_row.name_id,
            store_id: requisition_row.store_id,
        }
    }

    #[graphql(arguments(id(description = "id of the item")))]
    pub async fn item(database: &DatabaseConnection, id: String) -> Item {
        let item_row: ItemRow = database
            .get_item(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        Item { item_row }
    }

    #[graphql(arguments(id(description = "id of the item line")))]
    pub async fn item_line(database: &DatabaseConnection, id: String) -> ItemLine {
        let item_line_row: ItemLineRow = database
            .get_item_line(id.to_string())
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        ItemLine {
            id: item_line_row.id,
            item_id: item_line_row.item_id,
            store_id: item_line_row.store_id,
            batch: item_line_row.batch,
            quantity: item_line_row.quantity,
        }
    }
}
