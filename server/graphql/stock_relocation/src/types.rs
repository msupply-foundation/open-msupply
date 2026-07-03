use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::loader::{
    LocationByIdLoader, StockLineByIdLoader, StockRelocationLinesByRelocationIdLoader, UserLoader,
};
use graphql_core::ContextExt;
use graphql_types::types::{LocationNode, StockLineNode, UserNode};
use repository::{StockRelocation, StockRelocationLineRow, StockRelocationRow};
use service::ListResult;

pub struct StockRelocationNode {
    pub stock_relocation: StockRelocation,
}

#[derive(SimpleObject)]
pub struct StockRelocationConnector {
    pub total_count: u32,
    pub nodes: Vec<StockRelocationNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::stock_relocation_row::StockRelocationStatus")]
pub enum StockRelocationNodeStatus {
    New,
    Confirmed,
    Finalised,
}

#[Object]
impl StockRelocationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }
    pub async fn stock_movement_number(&self) -> i64 {
        self.row().stock_movement_number
    }
    pub async fn status(&self) -> StockRelocationNodeStatus {
        StockRelocationNodeStatus::from(self.row().status.clone())
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn created_by(&self) -> &str {
        &self.row().created_by
    }
    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        Ok(loader
            .load_one(self.row().created_by.clone())
            .await?
            .map(UserNode::from_domain))
    }
    pub async fn confirmed_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .confirmed_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .finalised_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }
    pub async fn lines(&self, ctx: &Context<'_>) -> Result<StockRelocationLineConnector> {
        let loader = ctx.get_loader::<DataLoader<StockRelocationLinesByRelocationIdLoader>>();
        let lines = loader
            .load_one(self.row().id.clone())
            .await?
            .unwrap_or_default();
        Ok(StockRelocationLineConnector::from_vec(lines))
    }
    pub async fn line_count(&self, ctx: &Context<'_>) -> Result<u32> {
        let loader = ctx.get_loader::<DataLoader<StockRelocationLinesByRelocationIdLoader>>();
        let lines = loader
            .load_one(self.row().id.clone())
            .await?
            .unwrap_or_default();
        Ok(lines.len() as u32)
    }
}

impl StockRelocationNode {
    pub fn from_domain(stock_relocation: StockRelocation) -> StockRelocationNode {
        StockRelocationNode { stock_relocation }
    }

    pub fn row(&self) -> &StockRelocationRow {
        &self.stock_relocation.stock_relocation_row
    }
}

impl StockRelocationConnector {
    pub fn from_domain(relocations: ListResult<StockRelocation>) -> StockRelocationConnector {
        StockRelocationConnector {
            total_count: relocations.count,
            nodes: relocations
                .rows
                .into_iter()
                .map(StockRelocationNode::from_domain)
                .collect(),
        }
    }
}

pub struct StockRelocationLineNode {
    pub line: StockRelocationLineRow,
}

#[derive(SimpleObject)]
pub struct StockRelocationLineConnector {
    pub total_count: u32,
    pub nodes: Vec<StockRelocationLineNode>,
}

#[Object]
impl StockRelocationLineNode {
    pub async fn id(&self) -> &str {
        &self.line.id
    }
    pub async fn stock_relocation_id(&self) -> &str {
        &self.line.stock_relocation_id
    }
    pub async fn stock_line_id(&self) -> &str {
        &self.line.stock_line_id
    }
    pub async fn destination_stock_line_id(&self) -> &Option<String> {
        &self.line.destination_stock_line_id
    }
    pub async fn number_of_packs(&self) -> f64 {
        self.line.number_of_packs
    }
    pub async fn source_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.line.source_location_id).await
    }
    pub async fn destination_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.line.destination_location_id).await
    }
    /// The source stock line
    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();
        Ok(loader
            .load_one(self.line.stock_line_id.clone())
            .await?
            .map(StockLineNode::from_domain))
    }
}

impl StockRelocationLineNode {
    pub fn from_domain(line: StockRelocationLineRow) -> StockRelocationLineNode {
        StockRelocationLineNode { line }
    }
}

impl StockRelocationLineConnector {
    pub fn from_vec(lines: Vec<StockRelocationLineRow>) -> StockRelocationLineConnector {
        StockRelocationLineConnector {
            total_count: lines.len() as u32,
            nodes: lines
                .into_iter()
                .map(StockRelocationLineNode::from_domain)
                .collect(),
        }
    }
}

async fn location_node(
    ctx: &Context<'_>,
    location_id: &Option<String>,
) -> Result<Option<LocationNode>> {
    let Some(location_id) = location_id else {
        return Ok(None);
    };
    let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();
    Ok(loader
        .load_one(location_id.clone())
        .await?
        .map(LocationNode::from_domain))
}
