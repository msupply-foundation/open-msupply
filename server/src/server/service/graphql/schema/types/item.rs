use crate::database::repository::{
    ItemQueryRepository, StockLineRepository, StorageConnectionManager,
};
use crate::server::service::graphql::{
    schema::{queries::pagination::Pagination, types::StockLineQuery},
    ContextExt,
};
use async_graphql::dataloader::DataLoader;
use async_graphql::{ComplexObject, Context, Object, SimpleObject};

use super::StockLineList;

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(complex)]
#[graphql(name = "Item")]
pub struct ItemQuery {
    pub id: String,
    pub name: String,
    pub code: String,
    // Is visible is from master list join
    pub is_visible: bool,
}

#[ComplexObject]
impl ItemQuery {
    async fn available_batches(&self, ctx: &Context<'_>) -> StockLineList {
        let repository = ctx.get_repository::<DataLoader<StockLineRepository>>();
        let result = repository.load_one(self.id.clone()).await.unwrap();
        StockLineList {
            stock_lines: result.map_or(Vec::new(), |stock_lines| {
                stock_lines.into_iter().map(StockLineQuery::from).collect()
            }),
        }
    }
}

pub struct ItemList {
    pub pagination: Option<Pagination>,
}

#[Object]
impl ItemList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let repository = ItemQueryRepository::new(&connection);
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<ItemQuery> {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let repository = ItemQueryRepository::new(&connection);
        repository.all(&self.pagination).unwrap()
    }
}
