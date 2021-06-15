use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionRow, StoreRow, TransactLineRow, TransactRow,
};
use crate::database::DatabaseConnection;
use crate::server::graphql::{Item, ItemLine, Name, Requisition, Store, Transact, TransactLine};

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
            .get_name(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name {}", id));

        Name { name_row }
    }

    #[graphql(arguments(id(description = "id of the store")))]
    pub async fn store(database: &DatabaseConnection, id: String) -> Store {
        let store_row: StoreRow = database
            .get_store(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        Store { store_row }
    }

    #[graphql(arguments(id(description = "id of the transact")))]
    pub async fn transact(database: &DatabaseConnection, id: String) -> Transact {
        let transact_row: TransactRow = database
            .get_transact(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact {}", id));

        Transact { transact_row }
    }

    #[graphql(arguments(id(description = "id of the transact line")))]
    pub async fn transact_line(database: &DatabaseConnection, id: String) -> TransactLine {
        let transact_line_row: TransactLineRow = database
            .get_transact_line(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact line {}", id));

        TransactLine { transact_line_row }
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(database: &DatabaseConnection, id: String) -> Requisition {
        let requisition_row: RequisitionRow = database
            .get_requisition(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition { requisition_row }
    }

    #[graphql(arguments(id(description = "id of the item")))]
    pub async fn item(database: &DatabaseConnection, id: String) -> Item {
        let item_row: ItemRow = database
            .get_item(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        Item { item_row }
    }

    #[graphql(arguments(id(description = "id of the item line")))]
    pub async fn item_line(database: &DatabaseConnection, id: String) -> ItemLine {
        let item_line_row: ItemLineRow = database
            .get_item_line(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        ItemLine { item_line_row }
    }
}
