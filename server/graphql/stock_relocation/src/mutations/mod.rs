use async_graphql::*;

pub mod insert;

pub use insert::{insert_stock_relocation, InsertInput, InsertResponse};

pub struct StockLineOnHold {
    pub stock_line_id: String,
}
#[Object]
impl StockLineOnHold {
    pub async fn description(&self) -> &str {
        "Stock line is on hold and cannot be moved."
    }
    pub async fn stock_line_id(&self) -> &str {
        &self.stock_line_id
    }
}

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
