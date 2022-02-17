use async_graphql::*;

pub mod delete;

pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &'static str {
        "Batch is already reserved/issued"
    }
}
