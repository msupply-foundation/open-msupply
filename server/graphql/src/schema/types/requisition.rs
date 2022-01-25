use async_graphql::*;
use chrono::{DateTime, Utc};

use super::{Connector, InvoiceNode, NameNode, RequisitionLineConnector};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum RequisitionNodeType {
    /// Requisition created by store that is ordering stock
    Request,
    /// Supplying store requisition in response to request requisition
    Response,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum RequisitionNodeStatus {
    /// New requisition when manually created
    Draft,
    /// New requisition when automatically created, only applicable to response requisition when it's duplicated in supplying store from request requisition
    New,
    /// Request requisition is sent and locked for future editing, only applicable to request requisition
    Sent,
    /// Response requisition: When supplier finished fulfilling requisition, locked for future editing
    /// Request requisition: When response requisition is finalised
    Finalised,
}

#[derive(PartialEq, Debug)]
pub struct RequisitionNode {}

#[Object]
impl RequisitionNode {
    pub async fn id(&self) -> &str {
        todo!()
    }

    pub async fn r#type(&self) -> &RequisitionNodeType {
        todo!()
    }

    pub async fn status(&self) -> &RequisitionNodeStatus {
        todo!()
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        todo!()
    }

    /// Applicable to request requisition only
    pub async fn sent_datetime(&self) -> Option<DateTime<Utc>> {
        todo!()
    }

    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        todo!()
    }

    /// Link to request requisition, for request requisition it's the same as current node
    pub async fn request_requisition(&self) -> Result<RequisitionNode> {
        todo!()
    }

    pub async fn requisition_number(&self) -> u32 {
        todo!()
    }

    pub async fn color(&self) -> &Option<String> {
        todo!()
    }

    pub async fn their_reference(&self) -> &Option<String> {
        todo!()
    }

    // TODO our reference ? How does their reference reflect in other half of requisition ?

    pub async fn comment(&self) -> &Option<String> {
        todo!()
    }

    /// Request Requisition: Supplying store (store that is supplying stock)
    /// Response Requisition: Customer store (store that is ordering stock)
    pub async fn other_party(&self, _ctx: &Context<'_>) -> Result<NameNode> {
        todo!()
    }

    pub async fn other_party_name(&self) -> &str {
        todo!()
    }

    pub async fn other_party_id(&self) -> &str {
        todo!()
    }

    /// Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn max_months_of_stock(&self) -> f64 {
        todo!()
    }

    /// Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn threshold_months_of_stock(&self) -> f64 {
        todo!()
    }

    pub async fn lines(&self, _ctx: &Context<'_>) -> Result<RequisitionLineConnector> {
        todo!()
    }

    /// Response Requisition: Outbound Shipments linked requisition
    /// Request Requisition: Inbound Shipments linked to requisition
    pub async fn shipments(&self, _ctx: &Context<'_>) -> Result<Connector<InvoiceNode>> {
        todo!()
    }

    // % allocated ?
    // % shipped ?
    // lead time ?
}
