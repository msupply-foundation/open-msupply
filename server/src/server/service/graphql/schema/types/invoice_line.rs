use super::{Connector, ConnectorError};
use crate::domain::invoice_line::{InvoiceLine, StockLine};
use async_graphql::*;
use chrono::NaiveDate;

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
    pub async fn stock_line(&self) -> StockLineNode {
        self.invoice_line.stock_line.clone().into()
    }
}

pub struct StockLineNode {
    stock_line: StockLine,
}

#[Object]
impl StockLineNode {
    pub async fn available_number_of_packs(&self) -> i32 {
        self.stock_line.available_number_of_packs
    }
}

type CurrentConnector = Connector<InvoiceLineNode>;

#[derive(Union)]
pub enum InvoiceLinesResponse {
    Error(ConnectorError),
    Response(CurrentConnector),
}

impl<T, E> From<Result<T, E>> for InvoiceLinesResponse
where
    CurrentConnector: From<T>,
    ConnectorError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => InvoiceLinesResponse::Response(response.into()),
            Err(error) => InvoiceLinesResponse::Error(error.into()),
        }
    }
}

impl From<InvoiceLine> for InvoiceLineNode {
    /// number of pack available for a batch ("includes" numberOfPacks in this line)
    fn from(invoice_line: InvoiceLine) -> Self {
        InvoiceLineNode { invoice_line }
    }
}

impl From<StockLine> for StockLineNode {
    fn from(stock_line: StockLine) -> Self {
        StockLineNode { stock_line }
    }
}
