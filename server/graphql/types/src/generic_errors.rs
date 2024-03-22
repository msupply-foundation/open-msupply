use crate::types::{InvoiceLineConnector, StockLineNode};
use async_graphql::*;
use repository::StockLine;

pub struct CannotDeleteInvoiceWithLines(pub InvoiceLineConnector);
#[Object]
impl CannotDeleteInvoiceWithLines {
    pub async fn description(&self) -> &str {
        "Cannot delete invoice with existing lines"
    }

    pub async fn lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}

pub struct StockLineReducedBelowZero(pub StockLineNode);

impl StockLineReducedBelowZero {
    pub fn from_domain(line: StockLine) -> Self {
        StockLineReducedBelowZero(StockLineNode::from_domain(line))
    }
}

#[Object]
impl StockLineReducedBelowZero {
    pub async fn description(&self) -> &str {
        "Stock line reduced below zero."
    }

    pub async fn stock_line(&self) -> &StockLineNode {
        &self.0
    }
}
