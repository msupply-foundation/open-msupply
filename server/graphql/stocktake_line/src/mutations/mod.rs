pub mod insert;
use async_graphql::Object;
pub use insert::*;

pub mod delete;
pub use delete::*;

pub mod update;
pub use update::*;
pub struct AdjustmentReasonNotProvided;

#[Object]
impl AdjustmentReasonNotProvided {
    pub async fn description(&self) -> &'static str {
        "Stocktake line has no adjustment reason"
    }
}
pub struct AdjustmentReasonNotValid;

#[Object]
impl AdjustmentReasonNotValid {
    pub async fn description(&self) -> &'static str {
        "Adjustment reason is not valid for adjustment direction"
    }
}
