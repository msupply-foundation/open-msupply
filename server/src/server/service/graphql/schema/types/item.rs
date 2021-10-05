use crate::database::repository::{ItemAndMasterList, ItemQueryRepository, StockLineRepository};
use crate::server::service::graphql::schema::types::StockLineQuery;
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
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

impl From<ItemAndMasterList> for ItemQuery {
    fn from((item_row, _, master_list_name_join_option): ItemAndMasterList) -> Self {
        ItemQuery {
            id: item_row.id,
            name: item_row.name,
            code: item_row.code,
            is_visible: master_list_name_join_option.is_some(),
        }
    }
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
        let repository = ctx.get_repository::<ItemQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<ItemQuery> {
        let repository = ctx.get_repository::<ItemQueryRepository>();
        repository
            .all(&self.pagination, &None, &None)
            .unwrap()
            .into_iter()
            .map(ItemQuery::from)
            .collect()
    }
}
