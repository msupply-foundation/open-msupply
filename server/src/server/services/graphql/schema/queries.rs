use crate::database;
use crate::server::services::graphql;

use juniper;

pub struct Queries;

#[juniper::graphql_object(context = database::connection::DatabaseConnection)]
impl Queries {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the name")))]
    pub async fn name(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::Name {
        let name_row: database::schema::NameRow = database
            .get_name_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name {}", id));

        graphql::schema::types::Name { name_row }
    }

    #[graphql(arguments(id(description = "id of the store")))]
    pub async fn store(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::Store {
        let store_row: database::schema::StoreRow = database
            .get_store_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        graphql::schema::types::Store { store_row }
    }

    #[graphql(arguments(id(description = "id of the transact")))]
    pub async fn transact(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::Transact {
        let transact_row: database::schema::TransactRow = database
            .get_transact_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact {}", id));

        graphql::schema::types::Transact { transact_row }
    }

    #[graphql(arguments(id(description = "id of the transact line")))]
    pub async fn transact_line(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::TransactLine {
        let transact_line_row: database::schema::TransactLineRow = database
            .get_transact_line_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact line {}", id));

        graphql::schema::types::TransactLine { transact_line_row }
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::Requisition {
        let requisition_row: database::schema::RequisitionRow = database
            .get_requisition_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        graphql::schema::types::Requisition { requisition_row }
    }

    #[graphql(arguments(id(description = "id of the item")))]
    pub async fn item(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::Item {
        let item_row: database::schema::ItemRow = database
            .get_item_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        graphql::schema::types::Item { item_row }
    }

    #[graphql(arguments(id(description = "id of the item line")))]
    pub async fn item_line(
        database: &database::connection::DatabaseConnection,
        id: String,
    ) -> graphql::schema::types::ItemLine {
        let item_line_row: database::schema::ItemLineRow = database
            .get_item_line_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        graphql::schema::types::ItemLine { item_line_row }
    }
}
