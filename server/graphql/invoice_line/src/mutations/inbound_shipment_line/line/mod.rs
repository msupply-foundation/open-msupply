use async_graphql::*;

pub mod delete;
pub mod insert;
pub mod update;
pub mod zero_line_quantity;

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &'static str {
        "Batch is already reserved/issued"
    }
}

pub struct InvoiceWasCreatedAfterStore;
#[Object]
impl InvoiceWasCreatedAfterStore {
    pub async fn description(&self) -> &'static str {
        "Invoice was created after store"
    }
}
