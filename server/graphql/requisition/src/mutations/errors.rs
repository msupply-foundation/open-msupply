use async_graphql::*;

pub struct CannotDeleteRequisitionWithLines;
#[Object]
impl CannotDeleteRequisitionWithLines {
    pub async fn description(&self) -> &str {
        "Cannot delete requisitions with existing lines"
    }
}

pub struct MaxOrdersReachedForPeriod;

#[Object]
impl MaxOrdersReachedForPeriod {
    pub async fn description(&self) -> &str {
        "Maximum orders reached for program, order type and period"
    }
}

// response requisition errors

pub struct FinalisedRequisition;
#[Object]
impl FinalisedRequisition {
    pub async fn description(&self) -> &str {
        "Response requisition has already been finalised"
    }
}

pub struct TransferredRequisition;
#[Object]
impl TransferredRequisition {
    pub async fn description(&self) -> &str {
        "Cannot delete a response requisition transferred from a request requisition"
    }
}

pub struct RequisitionWithShipment;
#[Object]
impl RequisitionWithShipment {
    pub async fn description(&self) -> &str {
        "Cannot delete a response requisition once a shipment has been generated"
    }
}

pub struct LineDeleteError;
#[Object]
impl LineDeleteError {
    pub async fn description(&self) -> &str {
        "Failed to delete lines of requisition"
    }
}

pub struct ValueTypeNotCorrect;
#[Object]
impl ValueTypeNotCorrect {
    pub async fn description(&self) -> &str {
        "Value type for indicator value not correct"
    }
}
