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
