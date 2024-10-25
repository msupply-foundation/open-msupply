use async_graphql::*;

pub struct CannotDeleteRequisitionWithLines;
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &str {
        "Cannot delete requisitions with existing lines"
    }
}

pub struct RequisitionLineWithItemIdExists;
#[Object]
impl RequisitionLineWithItemIdExists {
    pub async fn description(&self) -> &str {
        "Requisition line already exists for this item"
    }
}
