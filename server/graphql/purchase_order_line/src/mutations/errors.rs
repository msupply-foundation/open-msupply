use async_graphql::Object;

pub struct PurchaseOrderLineNotFound;
#[Object]
impl PurchaseOrderLineNotFound {
    pub async fn description(&self) -> &str {
        "Purchase order line not found"
    }
}

pub struct UpdatedLineDoesNotExist;
#[Object]
impl UpdatedLineDoesNotExist {
    pub async fn description(&self) -> &str {
        "Updated line does not exist"
    }
}

pub struct PurchaseOrderDoesNotExist;
#[Object]
impl PurchaseOrderDoesNotExist {
    pub async fn description(&self) -> &str {
        "Purchase order does not exist"
    }
}

pub struct PurchaseOrderLineWithIdExists;
#[Object]
impl PurchaseOrderLineWithIdExists {
    pub async fn description(&self) -> &str {
        "Purchase order line already exists"
    }
}

pub struct PackSizeCodeCombinationExists {
    pub item_code: String,
    pub requested_pack_size: f64,
}
#[Object]
impl PackSizeCodeCombinationExists {
    pub async fn description(&self) -> &str {
        "combination already exists for this item and pack size"
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

pub struct CannotEditRequestedQuantity;
#[Object]
impl CannotEditRequestedQuantity {
    pub async fn description(&self) -> &str {
        "Cannot edit requested quantity"
    }
}
pub struct CannotEditAdjustedQuantity;
#[Object]
impl CannotEditAdjustedQuantity {
    pub async fn description(&self) -> &str {
        "Cannot edit adjusted quantity"
    }
}
