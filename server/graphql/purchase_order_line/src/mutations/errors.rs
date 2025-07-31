use async_graphql::*;

pub struct PurchaseOrderLineWithItemIdExists;
#[Object]
impl PurchaseOrderLineWithItemIdExists {
    pub async fn description(&self) -> &str {
        "Purchase order line already exists for this item"
    }
}

pub struct PackSizeCodeCombinationExists {
    pub item_code: String,
    pub requested_pack_size: f64,
}
#[Object]
impl PackSizeCodeCombinationExists {
    pub async fn description(&self) -> &str {
        "Purchase order line already exists for this item and pack size combination"
    }
    pub async fn item_code(&self) -> &str {
        self.item_code.as_str() // Placeholder, should return the actual item code
    }
    pub async fn requested_pack_size(&self) -> f64 {
        self.requested_pack_size
    }
}

pub struct CannnotFindItemByCode;
#[Object]
impl CannnotFindItemByCode {
    pub async fn description(&self) -> &str {
        "Cannot find item by code"
    }
}
