use super::{ItemNode, LocationNode};
use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    loader::{ItemLoader, LocationByIdLoader},
    simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{ItemRow, StockLine, StockLineRow};
use service::{
    service_provider::ServiceContext, stock_line::query::get_stock_line, usize_to_u32, ListResult,
};

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
        &self.row().id
    }
    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.row().batch
    }
    pub async fn pack_size(&self) -> f64 {
        self.row().pack_size
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.row().cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.row().sell_price_per_pack
    }
    pub async fn available_number_of_packs(&self) -> f64 {
        self.row().available_number_of_packs
    }
    pub async fn total_number_of_packs(&self) -> f64 {
        self.row().total_number_of_packs
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.row().expiry_date
    }
    pub async fn on_hold(&self) -> bool {
        self.row().on_hold
    }
    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.row().location_id
    }
    pub async fn location_name(&self) -> Option<&str> {
        self.stock_line.location_name()
    }
    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.row().location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.item_row().id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to stock_line ({})",
                &self.item_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }
    pub async fn supplier_name(&self) -> Option<&str> {
        self.stock_line.supplier_name()
    }

    pub async fn barcode(&self) -> Option<&str> {
        self.stock_line.barcode()
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

pub fn get_stock_line_response(ctx: &ServiceContext, id: String) -> StockLineResponse {
    match get_stock_line(ctx, id) {
        Ok(stock_line) => StockLineResponse::Response(StockLineNode::from_domain(stock_line)),
        Err(error) => StockLineResponse::Error(error.into()),
    }
}

impl StockLineNode {
    pub fn from_domain(stock_line: StockLine) -> StockLineNode {
        StockLineNode { stock_line }
    }

    pub fn row(&self) -> &StockLineRow {
        &self.stock_line.stock_line_row
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.stock_line.item_row
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
