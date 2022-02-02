use async_graphql::*;

pub struct CannotDeleteRequisitionWithLines;
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &'static str {
        "Cannot delete requisitions with existing lines"
    }
}

pub struct CannotEditRequisition;
#[Object]
impl CannotEditRequisition {
    pub async fn description(&self) -> &'static str {
        "Cannot edit requisition"
    }
}
