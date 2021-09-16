use crate::database::repository::{
    ItemLineRepository, ItemRepository, NameRepository, RequisitionRepository, StoreRepository,
    TransactLineRepository, TransactRepository,
};
use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionRow, StoreRow, TransactLineRow, TransactRow,
};
use crate::server::service::graphql::schema::types::{
    Item, ItemLine, Name, Requisition, Store, Transact, TransactLine,
};
use crate::server::service::graphql::ContextExt;

use async_graphql::{Context, Object};

pub struct Queries;

#[Object]
impl Queries {
    #[allow(non_snake_case)]
    pub async fn apiVersion(&self) -> String {
        "1.0".to_string()
    }

    pub async fn name(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the name")] id: String,
    ) -> Name {
        let name_repository = ctx.get_repository::<NameRepository>();

        let name_row: NameRow = name_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get name {}", id));

        Name { name_row }
    }

    pub async fn store(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the store")] id: String,
    ) -> Store {
        let store_repository = ctx.get_repository::<StoreRepository>();

        let store_row: StoreRow = store_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        Store { store_row }
    }

    pub async fn transact(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the transact")] id: String,
    ) -> Transact {
        let transact_repository = ctx.get_repository::<TransactRepository>();

        let transact_row: TransactRow = transact_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact {}", id));

        Transact { transact_row }
    }

    pub async fn transact_line(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the transact line")] id: String,
    ) -> TransactLine {
        let transact_line_repository = ctx.get_repository::<TransactLineRepository>();

        let transact_line_row: TransactLineRow = transact_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact line {}", id));

        TransactLine { transact_line_row }
    }

    pub async fn requisition(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the requisition")] id: String,
    ) -> Requisition {
        let requisition_repository = ctx.get_repository::<RequisitionRepository>();

        let requisition_row: RequisitionRow = requisition_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition { requisition_row }
    }

    pub async fn item(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the item")] id: String,
    ) -> Item {
        let item_repository = ctx.get_repository::<ItemRepository>();

        let item_row: ItemRow = item_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item {}", id));

        Item { item_row }
    }

    pub async fn items(&self, ctx: &Context<'_>) -> Vec<Item> {
        let item_repository = ctx.get_repository::<ItemRepository>();

        let item_rows: Vec<ItemRow> = item_repository
            .find_all()
            .await
            .unwrap_or_else(|_| panic!("Failed to get items"));

        item_rows
            .into_iter()
            .map(|item_row| Item { item_row })
            .collect()
    }

    pub async fn item_line(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the item line")] id: String,
    ) -> ItemLine {
        let item_line_repository = ctx.get_repository::<ItemLineRepository>();

        let item_line_row: ItemLineRow = item_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get item line {}", id));

        ItemLine { item_line_row }
    }
}
