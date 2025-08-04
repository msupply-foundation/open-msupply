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

pub struct CannotEditPurchaseOrder;
#[Object]
impl CannotEditPurchaseOrder {
    pub async fn description(&self) -> &str {
        "Cannot edit purchase order"
    }
}
