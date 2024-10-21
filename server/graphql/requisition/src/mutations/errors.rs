use async_graphql::*;

pub struct CannotDeleteRequisitionWithLines;
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &str {
        "Cannot delete requisitions with existing lines"
    }
}

pub struct MaxOrdersReachedForPeriod;

#[Object]
impl MaxOrdersReachedForPeriod {
    pub async fn description(&self) -> &str {
        "Maximum orders reached for program, order type and period"
    }
}
