use super::{LocationNode, NodeError};
use crate::{loader::LocationByIdLoader, ContextExt};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDate;
use domain::stock_line::StockLine;
use repository::StorageConnectionManager;
use service::{stock_line::get_stock_line, usize_to_u32, ListResult};

pub struct StockLineNode {
    pub stock_line: StockLine,
}

#[derive(SimpleObject)]
pub struct StockLineConnector {
    total_count: u32,
    nodes: Vec<StockLineNode>,
}

#[Object]
impl StockLineNode {
    pub async fn id(&self) -> &str {
        &self.stock_line.id
    }
    pub async fn item_id(&self) -> &str {
        &self.stock_line.item_id
    }
    pub async fn store_id(&self) -> &str {
        &self.stock_line.store_id
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.stock_line.batch
    }
    pub async fn pack_size(&self) -> i32 {
        self.stock_line.pack_size
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.stock_line.cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.stock_line.sell_price_per_pack
    }
    pub async fn available_number_of_packs(&self) -> i32 {
        self.stock_line.available_number_of_packs
    }
    pub async fn total_number_of_packs(&self) -> i32 {
        self.stock_line.total_number_of_packs
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.stock_line.expiry_date
    }
    pub async fn on_hold(&self) -> bool {
        self.stock_line.on_hold
    }
    pub async fn note(&self) -> &Option<String> {
        &self.stock_line.note
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.stock_line.location_id
    }
    pub async fn location_name(&self) -> &Option<String> {
        &self.stock_line.location_name
    }
    async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.stock_line.location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }
}

#[derive(Union)]
pub enum StockLinesResponse {
    Response(StockLineConnector),
}

#[derive(Union)]
pub enum StockLineResponse {
    Error(NodeError),
    Response(StockLineNode),
}

pub fn get_stock_line_response(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> StockLineResponse {
    match get_stock_line(connection_manager, id) {
        Ok(stock_line) => StockLineResponse::Response(StockLineNode::from_domain(stock_line)),
        Err(error) => StockLineResponse::Error(error.into()),
    }
}

impl StockLineNode {
    pub fn from_domain(stock_line: StockLine) -> StockLineNode {
        StockLineNode { stock_line }
    }
}

impl StockLineConnector {
    pub fn from_domain(stock_lines: ListResult<StockLine>) -> StockLineConnector {
        StockLineConnector {
            total_count: stock_lines.count,
            nodes: stock_lines
                .rows
                .into_iter()
                .map(StockLineNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(stock_lines: Vec<StockLine>) -> StockLineConnector {
        StockLineConnector {
            total_count: usize_to_u32(stock_lines.len()),
            nodes: stock_lines
                .into_iter()
                .map(StockLineNode::from_domain)
                .collect(),
        }
    }
}
