use crate::{
    loader::{
        IdAndStoreId, ItemStatsLoaderInput, ItemsStatsForItemLoader,
        StockLineByItemAndStoreIdLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDateTime;
use domain::item::Item;

use super::{InternalError, ItemStatsNode, StockLinesResponse};

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

    pub async fn stats(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        look_back_datetime: Option<NaiveDateTime>,
    ) -> Result<ItemStatsNode> {
        let loader = ctx.get_loader::<DataLoader<ItemsStatsForItemLoader>>();
        let result = loader
            .load_one(ItemStatsLoaderInput {
                store_id: store_id.clone(),
                look_back_datetime,
                item_id: (&self.item.id).clone(),
            })
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find item stats for item {} and store {}",
                    &self.item.id, store_id
                ))
                .extend(),
            )?;

        Ok(ItemStatsNode::from_domain(result))
    }

    async fn available_batches(&self, ctx: &Context<'_>, store_id: String) -> StockLinesResponse {
        let loader = ctx.get_loader::<DataLoader<StockLineByItemAndStoreIdLoader>>();
        match loader
            .load_one(IdAndStoreId {
                id: self.item.id.clone(),
                store_id,
            })
            .await
        {
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
