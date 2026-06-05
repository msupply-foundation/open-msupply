use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, NaiveDate, Utc};
use graphql_core::loader::LocationByIdLoader;
use graphql_core::ContextExt;
use graphql_types::types::LocationNode;
use repository::{StockRelocation, StockRelocationRow};
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
    Suggested,
    Finalised,
}

#[Object]
impl StockRelocationNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .finalised_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn status(&self) -> StockRelocationNodeStatus {
        StockRelocationNodeStatus::from(self.row().status.clone())
    }
    pub async fn number_of_packs(&self) -> f64 {
        self.row().from_number_of_packs
    }
    pub async fn item_code(&self) -> &str {
        &self.stock_relocation.item_row.code
    }
    pub async fn item_name(&self) -> &str {
        &self.stock_relocation.item_row.name
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.stock_relocation.from_stock_line_row.batch
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.stock_relocation.from_stock_line_row.expiry_date
    }
    pub async fn from_stock_line_id(&self) -> &str {
        &self.row().from_stock_line_id
    }
    pub async fn to_stock_line_id(&self) -> &Option<String> {
        &self.row().to_stock_line_id
    }
    pub async fn from_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.row().from_location_id).await
    }
    pub async fn to_location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        location_node(ctx, &self.row().to_location_id).await
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
