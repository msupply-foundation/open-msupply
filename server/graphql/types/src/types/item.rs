use super::{ItemStatsNode, StockLineConnector};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDateTime;
use domain::item::Item;
use graphql_core::{
    loader::{
        IdAndStoreId, ItemStatsLoaderInput, ItemsStatsForItemLoader,
        StockLineByItemAndStoreIdLoader,
    },
    simple_generic_errors::InternalError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ItemNode {
    item: Item,
}

#[derive(SimpleObject)]
pub struct ItemConnector {
    total_count: u32,
    nodes: Vec<ItemNode>,
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

    async fn available_batches(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<StockLineConnector> {
        let loader = ctx.get_loader::<DataLoader<StockLineByItemAndStoreIdLoader>>();
        let result_option = loader
            .load_one(IdAndStoreId {
                id: self.item.id.clone(),
                store_id,
            })
            .await?;

        Ok(StockLineConnector::from_vec(
            result_option.unwrap_or(vec![]),
        ))
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

impl ItemNode {
    pub fn from_domain(item: Item) -> ItemNode {
        ItemNode { item }
    }
}

impl ItemConnector {
    pub fn from_domain(items: ListResult<Item>) -> ItemConnector {
        ItemConnector {
            total_count: items.count,
            nodes: items.rows.into_iter().map(ItemNode::from_domain).collect(),
        }
    }
}
