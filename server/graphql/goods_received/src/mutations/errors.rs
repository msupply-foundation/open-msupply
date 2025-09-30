use async_graphql::Object;
pub struct GoodsReceivedEmpty;

#[Object]
impl GoodsReceivedEmpty {
    pub async fn description(&self) -> &str {
        "Goods received is empty"
    }
}

pub struct PurchaseOrderNotFinalised;

#[Object]
impl PurchaseOrderNotFinalised {
    pub async fn description(&self) -> &str {
        "Purchase order is not finalised"
    }
}

pub struct NoAuthorisedLines;

#[Object]
impl NoAuthorisedLines {
    pub async fn description(&self) -> &str {
        "No authorised lines found in goods received"
    }
}
