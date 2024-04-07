use async_graphql::*;

pub mod delete;
pub mod insert;
pub mod update;

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &str {
        "Batch is already reserved/issued"
    }
}
