use crate::{loader::StockLineByItemIdLoader, ContextExt};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use domain::item::Item;

use super::{InternalError, ItemStats, StockLinesResponse};

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

    pub async fn unit_name(&self) -> &Option<String> {
        &self.item.unit_name
    }

    pub async fn stats(&self) -> Result<ItemStats> {
        todo!()
    }

    async fn available_batches(&self, ctx: &Context<'_>) -> StockLinesResponse {
        let loader = ctx.get_loader::<DataLoader<StockLineByItemIdLoader>>();
        match loader.load_one(self.item.id.to_string()).await {
            Ok(result_option) => {
                StockLinesResponse::Response(result_option.unwrap_or(Vec::new()).into())
            }
            Err(error) => StockLinesResponse::Error(error.into()),
        }
    }
}

#[derive(Union)]
pub enum ItemResponseError {
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct ItemError {
    pub error: ItemResponseError,
}

#[derive(Union)]
pub enum ItemResponse {
    Error(ItemError),
    Response(ItemNode),
}

impl From<Item> for ItemNode {
    fn from(item: Item) -> Self {
        ItemNode { item }
    }
}
