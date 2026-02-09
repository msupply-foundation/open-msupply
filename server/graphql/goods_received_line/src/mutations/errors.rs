use async_graphql::Object;

pub struct GoodsReceivedLineNotFound;
#[Object]
impl GoodsReceivedLineNotFound {
    pub async fn description(&self) -> &str {
        "Goods received line not found"
    }
}

pub struct GoodsReceivedDoesNotExist;
#[Object]
impl GoodsReceivedDoesNotExist {
    pub async fn description(&self) -> &str {
        "Goods received does not exist"
    }
}

pub struct GoodsReceivedLineWithIdExists;
#[Object]
impl GoodsReceivedLineWithIdExists {
    pub async fn description(&self) -> &str {
        "Goods received line already exists"
    }
}

pub struct PurchaseOrderNotFound;
#[Object]
impl PurchaseOrderNotFound {
    pub async fn description(&self) -> &str {
        "Purchase order does not exist"
    }
}

pub struct PurchaseOrderLineDoesNotExist;
#[Object]
impl PurchaseOrderLineDoesNotExist {
    pub async fn description(&self) -> &str {
        "Purchase order line does not exist"
    }
}
