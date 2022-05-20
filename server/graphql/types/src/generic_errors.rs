use crate::types::InvoiceLineConnector;
use async_graphql::*;

pub struct CannotDeleteInvoiceWithLines(pub InvoiceLineConnector);
#[Object]
impl CannotDeleteInvoiceWithLines {
    pub async fn description(&self) -> &'static str {
        "Cannot delete invoice with existing lines"
    }

    pub async fn lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}
