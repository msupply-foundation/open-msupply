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
    StockLocationChange,
    StockCostPriceChange,
    StockSellPriceChange,
    StockExpiryDateChange,
    StockBatchChange,
    StockOnHold,
    StockOffHold,
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

    pub async fn event(&self) -> &Option<String> {
        &self.row().event
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
        use ActivityLogNodeType as to;
        use ActivityLogType as from;

        match from {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
            from::InvoiceDeleted => to::InvoiceDeleted,
            from::InvoiceStatusAllocated => to::InvoiceStatusAllocated,
            from::InvoiceStatusPicked => to::InvoiceStatusPicked,
            from::InvoiceStatusShipped => to::InvoiceStatusShipped,
            from::InvoiceStatusDelivered => to::InvoiceStatusDelivered,
            from::InvoiceStatusVerified => to::InvoiceStatusVerified,
            from::StocktakeCreated => to::StocktakeCreated,
            from::StocktakeDeleted => to::StocktakeDeleted,
            from::StocktakeStatusFinalised => to::StocktakeStatusFinalised,
            from::RequisitionCreated => to::RequisitionCreated,
            from::RequisitionDeleted => to::RequisitionDeleted,
            from::RequisitionStatusSent => to::RequisitionStatusSent,
            from::RequisitionStatusFinalised => to::RequisitionStatusFinalised,
            from::StockLocationChange => to::StockLocationChange,
            from::StockCostPriceChange => to::StockCostPriceChange,
            from::StockSellPriceChange => to::StockSellPriceChange,
            from::StockExpiryDateChange => to::StockExpiryDateChange,
            from::StockBatchChange => to::StockBatchChange,
            from::StockOnHold => to::StockOnHold,
            from::StockOffHold => to::StockOffHold,
        }
    }

    pub fn to_domain(self) -> ActivityLogType {
        use ActivityLogNodeType as from;
        use ActivityLogType as to;

        match self {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
            from::InvoiceDeleted => to::InvoiceDeleted,
            from::InvoiceStatusAllocated => to::InvoiceStatusAllocated,
            from::InvoiceStatusPicked => to::InvoiceStatusPicked,
            from::InvoiceStatusShipped => to::InvoiceStatusShipped,
            from::InvoiceStatusDelivered => to::InvoiceStatusDelivered,
            from::InvoiceStatusVerified => to::InvoiceStatusVerified,
            from::StocktakeCreated => to::StocktakeCreated,
            from::StocktakeDeleted => to::StocktakeDeleted,
            from::StocktakeStatusFinalised => to::StocktakeStatusFinalised,
            from::RequisitionCreated => to::RequisitionCreated,
            from::RequisitionDeleted => to::RequisitionDeleted,
            from::RequisitionStatusSent => to::RequisitionStatusSent,
            from::RequisitionStatusFinalised => to::RequisitionStatusFinalised,
            from::StockLocationChange => to::StockLocationChange,
            from::StockCostPriceChange => to::StockCostPriceChange,
            from::StockSellPriceChange => to::StockSellPriceChange,
            from::StockExpiryDateChange => to::StockExpiryDateChange,
            from::StockBatchChange => to::StockBatchChange,
            from::StockOnHold => to::StockOnHold,
            from::StockOffHold => to::StockOffHold,
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
