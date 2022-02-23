use super::{ItemNode, LocationNode, NodeError, StockLineNode};
use crate::{
    loader::{ItemLoader, LocationByIdLoader, StockLineByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use domain::invoice_line::{InvoiceLine, InvoiceLineType};
use repository::StorageConnectionManager;
use serde::Serialize;
use service::{invoice_line::get_invoice_line, usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum InvoiceLineNodeType {
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
}
impl InvoiceLineNodeType {
    pub fn from_domain(domain_type: &InvoiceLineType) -> Self {
        use InvoiceLineNodeType::*;
        match domain_type {
            InvoiceLineType::StockIn => StockIn,
            InvoiceLineType::StockOut => StockOut,
            InvoiceLineType::UnallocatedStock => UnallocatedStock,
            InvoiceLineType::Service => Service,
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
        &self.invoice_line.id
    }
    pub async fn invoice_id(&self) -> &str {
        &self.invoice_line.invoice_id
    }
    pub async fn item_id(&self) -> &str {
        &self.invoice_line.item_id
    }
    pub async fn item_name(&self) -> &str {
        &self.invoice_line.item_name
    }
    pub async fn item_code(&self) -> &str {
        &self.invoice_line.item_code
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.invoice_line.item_id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to invoice_line ({})",
                &self.invoice_line.item_id, &self.invoice_line.id
            ))
            .extend(),
        )
    }
    pub async fn pack_size(&self) -> i32 {
        self.invoice_line.pack_size
    }
    pub async fn number_of_packs(&self) -> i32 {
        self.invoice_line.number_of_packs
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.invoice_line.cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.invoice_line.sell_price_per_pack
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.invoice_line.batch
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.invoice_line.expiry_date
    }
    pub async fn note(&self) -> &Option<String> {
        &self.invoice_line.note
    }
    pub async fn location_name(&self) -> &Option<String> {
        &self.invoice_line.location_name
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.invoice_line.location_id
    }
    pub async fn r#type(&self) -> InvoiceLineNodeType {
        InvoiceLineNodeType::from_domain(&self.invoice_line.r#type)
    }
    async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.invoice_line.location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }
    async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        let stock_line_id = match &self.invoice_line.stock_line_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(stock_line_id.clone()).await?;

        Ok(result.map(StockLineNode::from_domain))
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

pub fn get_invoice_line_response(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> InvoiceLineResponse {
    match get_invoice_line(connection_manager, id) {
        Ok(invoice_line) => {
            InvoiceLineResponse::Response(InvoiceLineNode::from_domain(invoice_line))
        }
        Err(error) => InvoiceLineResponse::Error(error.into()),
    }
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
}
