use async_graphql::*;

pub mod delete;
pub mod insert;
pub mod insert_from_internal_order;
pub mod update;

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &str {
        "Batch is already reserved/issued"
    }
}

pub struct LineLinkedToTransferredInvoice;
#[Object]
impl LineLinkedToTransferredInvoice {
    pub async fn description(&self) -> &str {
        "Cannot delete line generated from a generated invoice"
    }
}
