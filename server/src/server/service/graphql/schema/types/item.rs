use crate::database::loader::StockLineLoader;
use crate::domain::item::{Item, ItemFilter};
use crate::domain::{EqualFilter, SimpleStringFilter};
use crate::server::service::graphql::schema::types::StockLineQuery;
use crate::server::service::graphql::ContextExt;
use crate::service::{ListError, ListResult};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;

use super::{
    Connector, ConnectorErrorInterface, EqualFilterBoolInput, ErrorWrapper,
    SimpleStringFilterInput, SortInput, StockLineList,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::domain::item::ItemSortField")]
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

#[derive(PartialEq, Debug)]
pub struct ItemNode {
    item: Item,
}

#[Object]
impl ItemNode {
    pub async fn id(&self) -> &str {
        &self.item.id
    }

    pub async fn name(&self) -> &str {
        &self.item.name
    }

    pub async fn code(&self) -> &str {
        &self.item.code
    }

    pub async fn is_visible(&self) -> bool {
        self.item.is_visible
    }

    async fn available_batches(&self, ctx: &Context<'_>) -> StockLineList {
        let repository = ctx.get_loader::<DataLoader<StockLineLoader>>();
        let result = repository.load_one(self.item.id.clone()).await.unwrap();
        StockLineList {
            stock_lines: result.map_or(Vec::new(), |stock_lines| {
                stock_lines.into_iter().map(StockLineQuery::from).collect()
            }),
        }
    }
}

#[derive(Union)]
pub enum ItemsResponse {
    Error(ErrorWrapper<ConnectorErrorInterface>),
    Response(Connector<ItemNode>),
}

impl From<Result<ListResult<Item>, ListError>> for ItemsResponse {
    fn from(result: Result<ListResult<Item>, ListError>) -> Self {
        match result {
            Ok(response) => ItemsResponse::Response(response.into()),
            Err(error) => ItemsResponse::Error(error.into()),
        }
    }
}

impl From<Item> for ItemNode {
    fn from(item: Item) -> Self {
        ItemNode { item }
    }
}
