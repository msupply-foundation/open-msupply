use async_graphql::*;

use crate::schema::types::RequisitionLineConnector;

pub struct CannotDeleteRequisitionWithLines(pub RequisitionLineConnector);
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &'static str {
        "Cannot delete requisitions with existing lines"
    }

    pub async fn lines(&self) -> &RequisitionLineConnector {
        &self.0
    }
}

pub struct CannotEditRequisition;
#[Object]
impl CannotEditRequisition {
    pub async fn description(&self) -> &'static str {
        "Cannot edit requisition"
    }
}
