use crate::types::{InvoiceLineConnector, NameNode};
use async_graphql::*;

pub struct OtherPartyNotASupplier(pub NameNode);
#[Object]
impl OtherPartyNotASupplier {
    pub async fn description(&self) -> &'static str {
        "Other party name is not a supplier"
    }

    pub async fn other_party(&self) -> &NameNode {
        &self.0
    }
}

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
