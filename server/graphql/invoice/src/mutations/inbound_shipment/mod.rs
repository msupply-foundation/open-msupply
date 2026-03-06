use async_graphql::*;

pub mod delete;
pub mod insert;
pub mod update;

pub mod add_from_master_list;
pub use add_from_master_list::*;

pub struct CannotReceiveWithPendingLines;
#[Object]
impl CannotReceiveWithPendingLines {
    pub async fn description(&self) -> &str {
        "Cannot mark invoice as received while it has pending lines."
    }
}
