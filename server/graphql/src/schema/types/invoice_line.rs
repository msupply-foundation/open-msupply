use super::{Connector, ConnectorError, NodeError, StockLineResponse};
use crate::{loader::StockLineByIdLoader, ContextExt};
use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use domain::invoice_line::InvoiceLine;
use repository::repository::StorageConnectionManager;
use service::invoice_line::get_invoice_line;

pub struct InvoiceLineNode {
    invoice_line: InvoiceLine,
}

#[Object]
impl InvoiceLineNode {
    pub async fn id(&self) -> &str {
        &self.invoice_line.id
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
    async fn stock_line(&self, ctx: &Context<'_>) -> Option<StockLineResponse> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        match &self.invoice_line.stock_line_id {
            Some(invoice_line_id) => match loader.load_one(invoice_line_id.clone()).await {
                Ok(response) => {
                    response.map(|stock_line| StockLineResponse::Response(stock_line.into()))
                }
                Err(error) => Some(StockLineResponse::Error(error.into())),
            },
            None => None,
        }
    }
}

type CurrentConnector = Connector<InvoiceLineNode>;

#[derive(Union)]
pub enum InvoiceLinesResponse {
    Error(ConnectorError),
    Response(CurrentConnector),
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
        Ok(invoice_line) => InvoiceLineResponse::Response(invoice_line.into()),
        Err(error) => InvoiceLineResponse::Error(error.into()),
    }
}

impl From<Vec<InvoiceLine>> for InvoiceLinesResponse {
    fn from(result: Vec<InvoiceLine>) -> Self {
        let nodes: CurrentConnector = result.into();
        nodes.into()
    }
}

impl From<InvoiceLine> for InvoiceLineNode {
    /// number of pack available for a batch ("includes" numberOfPacks in this line)
    fn from(invoice_line: InvoiceLine) -> Self {
        InvoiceLineNode { invoice_line }
    }
}
