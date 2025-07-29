use async_graphql::*;

pub struct PurchaseOrderLineWithItemIdExists;
#[Object]
impl PurchaseOrderLineWithItemIdExists {
    pub async fn description(&self) -> &str {
        "Purchase order line already exists for this item"
    }
}
