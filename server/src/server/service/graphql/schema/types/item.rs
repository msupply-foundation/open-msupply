use crate::database::repository::{
    EqualFilter, ItemAndMasterList, ItemFilter, ItemQueryRepository, ItemSort, ItemSortField,
    SimpleStringFilter, StockLineRepository,
};
use crate::server::service::graphql::schema::types::StockLineQuery;
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
use async_graphql::dataloader::DataLoader;
use async_graphql::{ComplexObject, Context, Enum, InputObject, Object, SimpleObject};

use super::{EqualFilterBoolInput, SimpleStringFilterInput, SortInput, StockLineList};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::database::repository::repository::ItemSortField")]
pub enum ItemSortFieldInput {
    Name,
    Code,
}
pub type ItemSortInput = SortInput<ItemSortFieldInput>;

#[derive(InputObject, Clone)]

pub struct ItemFilterInput {
    pub name: Option<SimpleStringFilterInput>,
    pub code: Option<SimpleStringFilterInput>,
    pub is_visible: Option<EqualFilterBoolInput>,
}

impl From<ItemFilterInput> for ItemFilter {
    fn from(f: ItemFilterInput) -> Self {
        ItemFilter {
            name: f.name.map(SimpleStringFilter::from),
            code: f.code.map(SimpleStringFilter::from),
            is_visible: f.is_visible.map(EqualFilter::from),
        }
    }
}

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
    pub filter: Option<ItemFilterInput>,
    pub sort: Option<Vec<ItemSortInput>>,
}

#[Object]
impl ItemList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<ItemQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<ItemQuery> {
        let repository = ctx.get_repository::<ItemQueryRepository>();

        let filter = self.filter.clone().map(ItemFilter::from);

        // Currently only one sort option is supported, use the first from the list.
        let first_sort = self
            .sort
            .as_ref()
            .map(|sort_list| sort_list.get(0))
            .flatten()
            .map(|opt| ItemSort {
                key: ItemSortField::from(opt.key),
                desc: opt.desc,
            });

        repository
            .all(&self.pagination, &filter, &first_sort)
            .unwrap()
            .into_iter()
            .map(ItemQuery::from)
            .collect()
    }
}
