use async_graphql::Object;

pub mod delete;
pub mod insert;
pub mod update;

pub struct AdjustmentReasonNotProvided;

#[Object]
impl AdjustmentReasonNotProvided {
    pub async fn description(&self) -> &str {
        "Stocktake line has no adjustment reason"
    }
}
pub struct AdjustmentReasonNotValid;

#[Object]
impl AdjustmentReasonNotValid {
    pub async fn description(&self) -> &str {
        "Adjustment reason is not valid for adjustment direction"
    }
}
