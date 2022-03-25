use super::{ItemStatsNode, StockLineConnector};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::{
    loader::{
        ItemStatsLoaderInput, ItemsStatsForItemLoader, StockLineByItemAndStoreIdLoader,
        StockLineByItemAndStoreIdLoaderInput,
    },
    simple_generic_errors::InternalError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    schema::{ItemRow, ItemRowType},
    Item,
};
use service::ListResult;
use util::constants::default_amc_look_back_months;

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
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn is_visible(&self) -> bool {
        self.item.is_visible()
    }

    pub async fn unit_name(&self) -> Option<&str> {
        self.item.unit_name()
    }

    pub async fn r#type(&self) -> ItemNodeType {
        ItemNodeType::from_domain(&self.row().r#type)
    }

    pub async fn stats(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(default_with = "default_amc_look_back_months()")] amc_look_back_months: u32,
    ) -> Result<ItemStatsNode> {
        let loader = ctx.get_loader::<DataLoader<ItemsStatsForItemLoader>>();
        let result = loader
            .load_one(ItemStatsLoaderInput::new(
                &store_id,
                &self.row().id,
                amc_look_back_months,
            ))
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find item stats for item {} and store {}",
                    &self.row().id,
                    store_id
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
            .load_one(StockLineByItemAndStoreIdLoaderInput::new(
                &store_id,
                &self.row().id,
            ))
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

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ItemNodeType {
    Service,
    Stock,
    NonStock,
}

impl ItemNodeType {
    pub fn from_domain(from: &ItemRowType) -> ItemNodeType {
        match from {
            ItemRowType::Stock => ItemNodeType::Stock,
            ItemRowType::Service => ItemNodeType::Service,
            ItemRowType::NonStock => ItemNodeType::NonStock,
        }
    }

    pub fn to_domain(self) -> ItemRowType {
        match self {
            ItemNodeType::Stock => ItemRowType::Stock,
            ItemNodeType::Service => ItemRowType::Service,
            ItemNodeType::NonStock => ItemRowType::NonStock,
        }
    }
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

    pub fn row(&self) -> &ItemRow {
        &self.item.item_row
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
