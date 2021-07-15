use crate::database::repository::{
    ItemLineRepository, ItemRepository, NameRepository, RequisitionRepository, StoreRepository,
    TransactLineRepository, TransactRepository,
};
use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionRow, StoreRow, TransactLineRow, TransactRow,
};
use crate::server::data::RepositoryRegistry;
use crate::server::service::graphql::schema::types::{
    Item, ItemLine, Name, Requisition, Store, Transact, TransactLine,
};

use juniper;

pub struct Queries;

#[juniper::graphql_object(context = RepositoryRegistry)]
impl Queries {
    pub fn apiVersion() -> String {
        "1.0".to_string()
    }

    #[graphql(arguments(id(description = "id of the name")))]
    pub async fn name(registry: &RepositoryRegistry, id: String) -> Name {
        let name_repository = registry.get::<NameRepository>();

        let name_row: NameRow = name_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name {}", id));

        Name { name_row }
    }

    #[graphql(arguments(id(description = "id of the store")))]
    pub async fn store(registry: &RepositoryRegistry, id: String) -> Store {
        let store_repository = registry.get::<StoreRepository>();

        let store_row: StoreRow = store_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        Store { store_row }
    }

    #[graphql(arguments(id(description = "id of the transact")))]
    pub async fn transact(registry: &RepositoryRegistry, id: String) -> Transact {
        let transact_repository = registry.get::<TransactRepository>();

        let transact_row: TransactRow = transact_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact {}", id));

        Transact { transact_row }
    }

    #[graphql(arguments(id(description = "id of the transact line")))]
    pub async fn transact_line(registry: &RepositoryRegistry, id: String) -> TransactLine {
        let transact_line_repository = registry.get::<TransactLineRepository>();

        let transact_line_row: TransactLineRow = transact_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact line {}", id));

        TransactLine { transact_line_row }
    }

    #[graphql(arguments(id(description = "id of the requisition")))]
    pub async fn requisition(registry: &RepositoryRegistry, id: String) -> Requisition {
        let requisition_repository = registry.get::<RequisitionRepository>();

        let requisition_row: RequisitionRow = requisition_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition { requisition_row }
    }

    #[graphql(arguments(id(description = "id of the item")))]
    pub async fn item(registry: &RepositoryRegistry, id: String) -> Item {
        let item_repository = registry.get::<ItemRepository>();

        let item_row: ItemRow = item_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        Item { item_row }
    }

    #[graphql(arguments(id(description = "id of the item line")))]
    pub async fn item_line(registry: &RepositoryRegistry, id: String) -> ItemLine {
        let item_line_repository = registry.get::<ItemLineRepository>();

        let item_line_row: ItemLineRow = item_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        ItemLine { item_line_row }
    }
}
