use super::{ItemNode, LocationNode, StockLineNode};
use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use graphql_core::{
    loader::{ItemLoader, LocationByIdLoader, StockLineByIdLoader},
    simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    schema::{InvoiceLineRow, InvoiceLineRowType},
    InvoiceLine,
};
use serde::Serialize;
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum InvoiceLineNodeType {
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
}
impl InvoiceLineNodeType {
    pub fn from_domain(domain_type: &InvoiceLineRowType) -> Self {
        use InvoiceLineNodeType::*;
        match domain_type {
            InvoiceLineRowType::StockIn => StockIn,
            InvoiceLineRowType::StockOut => StockOut,
            InvoiceLineRowType::UnallocatedStock => UnallocatedStock,
            InvoiceLineRowType::Service => Service,
        }
    }
}

pub struct InvoiceLineNode {
    invoice_line: InvoiceLine,
}

#[derive(SimpleObject)]
pub struct InvoiceLineConnector {
    total_count: u32,
    nodes: Vec<InvoiceLineNode>,
}

#[Object]
impl InvoiceLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn invoice_id(&self) -> &str {
        &self.row().invoice_id
    }
    // Item
    pub async fn item_id(&self) -> &str {
        &self.row().item_id
    }
    pub async fn item_name(&self) -> &str {
        &self.row().item_name
    }
    pub async fn item_code(&self) -> &str {
        &self.row().item_code
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.row().item_id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to invoice_line ({})",
                &self.row().item_id,
                &self.row().id
            ))
            .extend(),
        )
    }
    // Quantity
    pub async fn pack_size(&self) -> i32 {
        self.row().pack_size
    }
    pub async fn number_of_packs(&self) -> i32 {
        self.row().number_of_packs
    }
    // Batch
    pub async fn batch(&self) -> &Option<String> {
        &self.row().batch
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.row().expiry_date
    }
    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        let stock_line_id = match &self.row().stock_line_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(stock_line_id.clone()).await?;

        Ok(result.map(StockLineNode::from_domain))
    }
    // Price
    pub async fn total_before_tax(&self) -> f64 {
        self.row().total_before_tax
    }
    pub async fn total_after_tax(&self) -> f64 {
        self.row().total_after_tax
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.row().cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.row().sell_price_per_pack
    }

    pub async fn text_percentage(&self) -> &Option<f64> {
        &self.row().tax
    }
    // Location
    pub async fn location_name(&self) -> Option<&str> {
        self.invoice_line.location_name()
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.row().location_id
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
    // Other
    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }
}

#[derive(Union)]
pub enum InvoiceLinesResponse {
    Response(InvoiceLineConnector),
}

#[derive(Union)]
pub enum InvoiceLineResponse {
    Error(NodeError),
    Response(InvoiceLineNode),
}

impl InvoiceLineConnector {
    pub fn from_domain(invoice_lines: ListResult<InvoiceLine>) -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: invoice_lines.count,
            nodes: invoice_lines
                .rows
                .into_iter()
                .map(InvoiceLineNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(invoice_lines: Vec<InvoiceLine>) -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: usize_to_u32(invoice_lines.len()),
            nodes: invoice_lines
                .into_iter()
                .map(InvoiceLineNode::from_domain)
                .collect(),
        }
    }

    pub fn empty() -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: 0,
            nodes: vec![],
        }
    }
}

impl InvoiceLineNode {
    pub fn from_domain(invoice_line: InvoiceLine) -> InvoiceLineNode {
        InvoiceLineNode { invoice_line }
    }

    pub fn row(&self) -> &InvoiceLineRow {
        &self.invoice_line.invoice_line_row
    }
}
