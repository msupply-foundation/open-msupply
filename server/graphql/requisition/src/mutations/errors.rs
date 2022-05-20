use async_graphql::*;

pub struct CannotDeleteRequisitionWithLines;
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &'static str {
        "Cannot delete requisitions with existing lines"
    }
}
