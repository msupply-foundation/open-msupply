use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDateTime;
use graphql_core::{
    loader::{StoreByIdLoader, UserLoader},
    ContextExt,
};
use repository::{unknown_user, ActivityLog, ActivityLogRow, ActivityLogType};
use service::ListResult;

use super::{StoreNode, UserNode};

#[derive(PartialEq, Debug)]
pub struct ActivityLogNode {
    activity_log: ActivityLog,
}

#[derive(SimpleObject)]
pub struct ActivityLogConnector {
    total_count: u32,
    nodes: Vec<ActivityLogNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ActivityLogNodeType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceDeleted,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusVerified,
    StocktakeCreated,
    StocktakeDeleted,
    StocktakeStatusFinalised,
    RequisitionCreated,
    RequisitionDeleted,
    RequisitionStatusSent,
    RequisitionStatusFinalised,
}

#[Object]
impl ActivityLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> ActivityLogNodeType {
        ActivityLogNodeType::from_domain(&self.row().r#type)
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }

    pub async fn record_id(&self) -> &Option<String> {
        &self.row().record_id
    }

    pub async fn datetime(&self) -> &NaiveDateTime {
        &self.row().datetime
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user_id = match &self.row().user_id {
            Some(user_id) => user_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(user_id.clone())
            .await?
            .unwrap_or(unknown_user());

        Ok(Some(UserNode::from_domain(result)))
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();

        let store_id = match &self.row().store_id {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let result = loader.load_one(store_id.clone()).await?.unwrap();

        Ok(Some(StoreNode::from_domain(result)))
    }
}

impl ActivityLogNode {
    pub fn from_domain(activity_log: ActivityLog) -> Self {
        ActivityLogNode { activity_log }
    }

    pub fn row(&self) -> &ActivityLogRow {
        &self.activity_log.activity_log_row
    }
}

impl ActivityLogNodeType {
    pub fn from_domain(from: &ActivityLogType) -> ActivityLogNodeType {
        match from {
            ActivityLogType::UserLoggedIn => ActivityLogNodeType::UserLoggedIn,
            ActivityLogType::InvoiceCreated => ActivityLogNodeType::InvoiceCreated,
            ActivityLogType::InvoiceDeleted => ActivityLogNodeType::InvoiceDeleted,
            ActivityLogType::InvoiceStatusAllocated => ActivityLogNodeType::InvoiceStatusAllocated,
            ActivityLogType::InvoiceStatusPicked => ActivityLogNodeType::InvoiceStatusPicked,
            ActivityLogType::InvoiceStatusShipped => ActivityLogNodeType::InvoiceStatusShipped,
            ActivityLogType::InvoiceStatusDelivered => ActivityLogNodeType::InvoiceStatusDelivered,
            ActivityLogType::InvoiceStatusVerified => ActivityLogNodeType::InvoiceStatusVerified,
            ActivityLogType::StocktakeCreated => ActivityLogNodeType::StocktakeCreated,
            ActivityLogType::StocktakeDeleted => ActivityLogNodeType::StocktakeDeleted,
            ActivityLogType::StocktakeStatusFinalised => {
                ActivityLogNodeType::StocktakeStatusFinalised
            }
            ActivityLogType::RequisitionCreated => ActivityLogNodeType::RequisitionCreated,
            ActivityLogType::RequisitionDeleted => ActivityLogNodeType::RequisitionDeleted,
            ActivityLogType::RequisitionStatusSent => ActivityLogNodeType::RequisitionStatusSent,
            ActivityLogType::RequisitionStatusFinalised => {
                ActivityLogNodeType::RequisitionStatusFinalised
            }
        }
    }

    pub fn to_domain(self) -> ActivityLogType {
        match self {
            ActivityLogNodeType::UserLoggedIn => ActivityLogType::UserLoggedIn,
            ActivityLogNodeType::InvoiceCreated => ActivityLogType::InvoiceCreated,
            ActivityLogNodeType::InvoiceDeleted => ActivityLogType::InvoiceDeleted,
            ActivityLogNodeType::InvoiceStatusAllocated => ActivityLogType::InvoiceStatusAllocated,
            ActivityLogNodeType::InvoiceStatusPicked => ActivityLogType::InvoiceStatusPicked,
            ActivityLogNodeType::InvoiceStatusShipped => ActivityLogType::InvoiceStatusShipped,
            ActivityLogNodeType::InvoiceStatusDelivered => ActivityLogType::InvoiceStatusDelivered,
            ActivityLogNodeType::InvoiceStatusVerified => ActivityLogType::InvoiceStatusVerified,
            ActivityLogNodeType::StocktakeCreated => ActivityLogType::StocktakeCreated,
            ActivityLogNodeType::StocktakeDeleted => ActivityLogType::StocktakeDeleted,
            ActivityLogNodeType::StocktakeStatusFinalised => {
                ActivityLogType::StocktakeStatusFinalised
            }
            ActivityLogNodeType::RequisitionCreated => ActivityLogType::RequisitionCreated,
            ActivityLogNodeType::RequisitionDeleted => ActivityLogType::RequisitionDeleted,
            ActivityLogNodeType::RequisitionStatusSent => ActivityLogType::RequisitionStatusSent,
            ActivityLogNodeType::RequisitionStatusFinalised => {
                ActivityLogType::RequisitionStatusFinalised
            }
        }
    }
}

impl ActivityLogConnector {
    pub fn from_domain(activity_logs: ListResult<ActivityLog>) -> ActivityLogConnector {
        ActivityLogConnector {
            total_count: activity_logs.count,
            nodes: activity_logs
                .rows
                .into_iter()
                .map(|activity_log| ActivityLogNode::from_domain(activity_log))
                .collect(),
        }
    }
}
