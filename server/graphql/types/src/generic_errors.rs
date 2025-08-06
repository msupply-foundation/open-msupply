use crate::types::{InvoiceLineConnector, RequisitionLineNode, StockLineNode, StocktakeLineNode};
use async_graphql::*;
use repository::{RequisitionLine, StockLine, StocktakeLine};

pub struct CannotDeleteInvoiceWithLines(pub InvoiceLineConnector);
#[Object]
impl CannotDeleteInvoiceWithLines {
    pub async fn description(&self) -> &str {
        "Cannot delete invoice with existing lines"
    }

    pub async fn lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}

pub struct StockLineReducedBelowZero(pub StockLineNode);

impl StockLineReducedBelowZero {
    pub fn from_domain(line: StockLine) -> Self {
        StockLineReducedBelowZero(StockLineNode::from_domain(line))
    }
}

#[Object]
impl StockLineReducedBelowZero {
    pub async fn description(&self) -> &str {
        "Stock line reduced below zero."
    }

    pub async fn stock_line(&self) -> &StockLineNode {
        &self.0
    }
}

pub struct RequisitionReasonNotProvided(pub RequisitionLineNode);

impl RequisitionReasonNotProvided {
    pub fn from_domain(line: RequisitionLine) -> Self {
        RequisitionReasonNotProvided(RequisitionLineNode::from_domain(line))
    }
}

#[Object]
impl RequisitionReasonNotProvided {
    pub async fn description(&self) -> &str {
        "Requisition line reason not provided when suggested differs from requested"
    }

    pub async fn requisition_line(&self) -> &RequisitionLineNode {
        &self.0
    }
}

pub struct SnapshotCountCurrentCountMismatchLine(pub StocktakeLineNode);

impl SnapshotCountCurrentCountMismatchLine {
    pub fn from_domain(line: StocktakeLine) -> Self {
        SnapshotCountCurrentCountMismatchLine(StocktakeLineNode::from_domain(line))
    }
}

#[Object]
impl SnapshotCountCurrentCountMismatchLine {
    pub async fn description(&self) -> &str {
        "Snapshot count does not match current count."
    }

    pub async fn stocktake_line(&self) -> &StocktakeLineNode {
        &self.0
    }
}
