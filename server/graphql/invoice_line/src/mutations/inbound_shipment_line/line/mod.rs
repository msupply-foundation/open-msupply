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

pub struct TransferredShipment;
#[Object]
impl TransferredShipment {
    pub async fn description(&self) -> &str {
        "Cannot delete an inbound shipment transferred from another store"
    }
}
