use async_graphql::*;

pub mod delete;
pub mod insert;
pub mod line;
pub mod update;

pub use delete::{
    DeleteInput, DeleteResponses, DeleteStockRelocationResponse, delete_stock_relocation,
    delete_stock_relocations,
};
pub use insert::{InsertInput, InsertResponse, insert_stock_relocation};
pub use line::{
    BatchLineInput, BatchLineResponse, DeleteLineResponse, UpsertLineInput, UpsertLineResponse,
    batch_stock_relocation_line,
};
pub use update::{UpdateInput, UpdateResponse, update_stock_relocation};

pub struct LocationOnHold {
    pub location_id: String,
}
#[Object]
impl LocationOnHold {
    pub async fn description(&self) -> &str {
        "Location is on hold."
    }
    pub async fn location_id(&self) -> &str {
        &self.location_id
    }
}

pub struct NotEnoughStock {
    pub stock_line_id: String,
}
#[Object]
impl NotEnoughStock {
    pub async fn description(&self) -> &str {
        "Not enough available stock to move."
    }
    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_id
    }
}
