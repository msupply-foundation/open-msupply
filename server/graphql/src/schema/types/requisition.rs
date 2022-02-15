use self::dataloader::DataLoader;
use crate::{
    loader::{
        InvoiceByRequisitionIdLoader, NameByIdLoader, RequisitionLinesByRequisitionIdLoader,
        RequisitionsByIdLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use async_graphql::*;
use chrono::{DateTime, Utc};
use repository::{
    schema::{NameRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    Requisition,
};
use service::ListResult;
use StandardGraphqlError::*;

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
pub struct RequisitionNode {
    requisition: Requisition,
}

#[derive(SimpleObject)]
pub struct RequisitionConnector {
    total_count: u32,
    nodes: Vec<RequisitionNode>,
}

#[Object]
impl RequisitionNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> RequisitionNodeType {
        RequisitionNodeType::from_domain(&self.row().r#type)
    }

    pub async fn status(&self) -> RequisitionNodeStatus {
        RequisitionNodeStatus::from_domain(&self.row().status)
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.row().created_datetime.clone(), Utc)
    }

    /// Applicable to request requisition only
    pub async fn sent_datetime(&self) -> Option<DateTime<Utc>> {
        let sent_datetime = self.row().sent_datetime.clone();
        sent_datetime.map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        let finalised_datetime = self.row().finalised_datetime.clone();
        finalised_datetime.map(|v| DateTime::<Utc>::from_utc(v, Utc))
    }

    pub async fn requisition_number(&self) -> &i64 {
        &self.row().requisition_number
    }

    pub async fn colour(&self) -> &Option<String> {
        &self.row().colour
    }

    pub async fn their_reference(&self) -> &Option<String> {
        &self.row().their_reference
    }

    // TODO our reference ? How does their reference reflect in other half of requisition ?

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    /// Request Requisition: Supplying store (store that is supplying stock)
    /// Response Requisition: Customer store (store that is ordering stock)
    pub async fn other_party(&self, ctx: &Context<'_>) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader.load_one(self.row().name_id.clone()).await?;

        response_option.map(NameNode::from).ok_or(
            InternalError(format!(
                "Cannot find name ({}) linked to requisition ({})",
                &self.row().name_id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn other_party_name(&self) -> &str {
        &self.name_row().name
    }

    pub async fn other_party_id(&self) -> &str {
        &self.row().name_id
    }

    /// Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn max_months_of_stock(&self) -> &f64 {
        &self.row().max_months_of_stock
    }

    /// Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line
    pub async fn threshold_months_of_stock(&self) -> &f64 {
        &self.row().threshold_months_of_stock
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<RequisitionLineConnector> {
        let loader = ctx.get_loader::<DataLoader<RequisitionLinesByRequisitionIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(RequisitionLineConnector::from_vec(result))
    }

    /// Link to request requisition
    pub async fn request_requisition(&self, ctx: &Context<'_>) -> Result<Option<RequisitionNode>> {
        if &self.row().r#type == &RequisitionRowType::Request {
            return Ok(None);
        }

        let request_requisition_id = if let Some(id) = &self.row().linked_requisition_id {
            id
        } else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<RequisitionsByIdLoader>>();

        Ok(loader
            .load_one(request_requisition_id.clone())
            .await?
            .map(RequisitionNode::from_domain))
    }

    /// Response Requisition: Outbound Shipments linked requisition
    /// Request Requisition: Inbound Shipments linked to requisition
    pub async fn shipments(&self, ctx: &Context<'_>) -> Result<Connector<InvoiceNode>> {
        let loader = ctx.get_loader::<DataLoader<InvoiceByRequisitionIdLoader>>();
        let result_option = loader.load_one(self.row().id.clone()).await?;

        let list_result = result_option.unwrap_or(vec![]);

        Ok(list_result.into())
    }

    // % allocated ?
    // % shipped ?
    // lead time ?
}

impl RequisitionNode {
    pub fn from_domain(requisition: Requisition) -> RequisitionNode {
        RequisitionNode { requisition }
    }
}

impl RequisitionConnector {
    pub fn from_domain(requisitions: ListResult<Requisition>) -> RequisitionConnector {
        RequisitionConnector {
            total_count: requisitions.count,
            nodes: requisitions
                .rows
                .into_iter()
                .map(RequisitionNode::from_domain)
                .collect(),
        }
    }
}

impl RequisitionNodeType {
    pub fn to_domain(self) -> RequisitionRowType {
        use RequisitionNodeType::*;
        match self {
            Request => RequisitionRowType::Request,
            Response => RequisitionRowType::Response,
        }
    }

    pub fn from_domain(r#type: &RequisitionRowType) -> RequisitionNodeType {
        use RequisitionRowType::*;
        match r#type {
            Request => RequisitionNodeType::Request,
            Response => RequisitionNodeType::Response,
        }
    }
}

impl RequisitionNodeStatus {
    pub fn to_domain(self) -> RequisitionRowStatus {
        use RequisitionNodeStatus::*;
        match self {
            Draft => RequisitionRowStatus::Draft,
            New => RequisitionRowStatus::New,
            Sent => RequisitionRowStatus::Sent,
            Finalised => RequisitionRowStatus::Finalised,
        }
    }

    pub fn from_domain(status: &RequisitionRowStatus) -> RequisitionNodeStatus {
        use RequisitionRowStatus::*;
        match status {
            Draft => RequisitionNodeStatus::Draft,
            New => RequisitionNodeStatus::New,
            Sent => RequisitionNodeStatus::Sent,
            Finalised => RequisitionNodeStatus::Finalised,
        }
    }
}

impl RequisitionNode {
    pub fn row(&self) -> &RequisitionRow {
        &self.requisition.requisition_row
    }

    pub fn name_row(&self) -> &NameRow {
        &self.requisition.name_row
    }
}
